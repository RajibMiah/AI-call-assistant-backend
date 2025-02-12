const { apiGet, apiPost, apiPatch } = require('../utils/network-api');

const SUBDOMAIN = process.env.NEXHEALTH_SUBDOMAIN;
const LOCATION_ID = process.env.NEXHEALTH_LOCATION_ID;

exports.bookAppointmentService = async (
    patient,
    provider_id,
    start_time,
    operatory_id,
    appointment_type,
    note
) => {
    const end_time = new Date(
        new Date(start_time).getTime() + appointment_type.minutes * 60000
    ).toISOString();

    return apiPost(
        `/appointments?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&notify_patient=false`,
        {
            appt: {
                patient_id: patient.id,
                provider_id: provider_id,
                start_time: new Date(start_time).toISOString(),
                operatory_id: operatory_id,
                end_time: end_time,
                // appointment_type_id: appointment_type.id,
                note: note || '',
                unavailable: false,
                is_guardian: false,
                is_new_clients_patient: false,
                referrer: '',
                patient: {
                    first_name: patient.first_name,
                    last_name: patient.last_name,
                    bio: {
                        date_of_birth: patient.bio.date_of_birth,
                        gender: patient.bio.gender || '',
                    },
                },
                confirmed: false,
                patient_confirmed: false,
                patient_missed: false,
                cancelled: false,
                paid: false,
                checkin_at: null,
            },
        }
    );
};

// 📌 Get Providers
exports.getProviders = async () => {
    return apiGet(
        `/providers?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}`
    );
};

// 📌 Get Patients (Search by Phone Number)
exports.getPatientsByPhone = async (phoneNumber) => {
    const patients = await apiGet(
        `/patients?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}`
    );
    return (
        patients.patients?.find(
            (p) => p.patient.bio.phone_number === phoneNumber
        ) || null
    );
};

// 📌 Find the patient by details (email, phone, first_name, last_name)
exports.findPatientByDetails = async (
    email,
    phone_number,
    first_name,
    last_name
) => {
    try {
        const endpoint = `/patients?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&email=${email}&phone_number=${phone_number}&name=${
            first_name + ' ' + last_name
        }`;
        const response = await apiGet(endpoint);

        return response &&
            response.data &&
            response.data.patients &&
            response.data.patients.length > 0
            ? response.data.patients[0]
            : null;
    } catch (error) {
        console.error('Error fetching patient:', error.message);
        return null;
    }
};

exports.getAppointmentsByPatientId = async (appointmentId) => {
    try {
        const endpoint = `/appointments/${appointmentId}?subdomain=${SUBDOMAIN}&include[]=patient&include[]=patient`;

        const response = await apiGet(endpoint);

        return response.data.appointment || null; // Return the appointment data if found
    } catch (error) {
        throw new Error(`Error fetching appointment: ${error.message}`);
    }
};

// 📌 Find appointment by patient ID
exports.findAppointmentByPatient = async (patientId, appointmentId) => {
    try {
        const endpoint = `/appointments/${appointmentId}?subdomain=${process.env.NEXHEALTH_SUBDOMAIN}&patient_id=${patientId}`;
        const response = await apiGet(endpoint);

        return response.data.appointment || null;
    } catch (error) {
        throw new Error(`Error fetching appointment: ${error.message}`);
    }
};

// 📌 Register a new patient
exports.registerPatient = async (
    providerId,
    firstName,
    lastName,
    email,
    dateOfBirth,
    phoneNumber
) => {
    return apiPost(
        `/patients?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}`,
        {
            provider: { provider_id: providerId },
            patient: {
                first_name: firstName,
                last_name: lastName,
                email,
                bio: { date_of_birth: dateOfBirth, phone_number: phoneNumber },
            },
        }
    );
};

exports.findAppointmentType = async (appointmentName) => {
    const response = await apiGet(
        `/appointment_types?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}`
    );

    if (!response || !response.data) return null; // Handle edge cases

    const matchedAppointmentType = response.data.find(
        (type) => type.name.toLowerCase() === appointmentName.toLowerCase()
    );

    return matchedAppointmentType ? matchedAppointmentType : null;
};

// 📌 Get All Operatories
exports.getOperatories = async (
    page = 1,
    perPage = 5,
    searchName = '',
    foreignId = '',
    updatedSince = ''
) => {
    let url = `/operatories?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&page=${page}&per_page=${perPage}&include[]=appt_categories`;
    if (searchName) url += `&search_name=${searchName}`;
    if (foreignId) url += `&foreign_id=${foreignId}`;
    if (updatedSince) url += `&updated_since=${updatedSince}`;

    return apiGet(url);
};

// 📌 Get Operatory By ID
exports.getOperatoryById = async (operatoryId) => {
    return apiGet(
        `/operatories/${operatoryId}?subdomain=${SUBDOMAIN}&include[]=appt_categories`
    );
};

// Fetch available appointment slots from the third-party API

exports.getAvailableSlots = async (startDate, days, lids, pids) => {
    try {
        // const apiClient = await getApiClient();
        const endpoint = `/appointment_slots?subdomain=${SUBDOMAIN}&start_date=${startDate}&days=${days}&lids[]=${lids.join(
            ','
        )}&pids[]=${pids.join(',')}`;
        console.log('endpoint', endpoint);
        const response = await apiGet(endpoint);
        return response.data || []; // Assuming the third-party API returns available slots in this field
    } catch (error) {
        console.error(
            `❌ Error fetching available slots: ${
                error.response?.data || error.message
            }`
        );
        throw new Error('Error fetching available slots');
    }
};

// 📌 Cancel the appointment by ID
exports.cancelAppointment = async (appointmentId) => {
    try {
        // Update the endpoint with the subdomain query parameter
        const endpoint = `/appointments/${appointmentId}?subdomain=${SUBDOMAIN}`;

        const cancelData = {
            appt: {
                cancelled: true,
                confirmed: false,
            },
        };

        const response = await apiPatch(endpoint, cancelData);
        return response.data;
    } catch (error) {
        throw new Error(`Error canceling appointment: ${error.message}`);
    }
};
