const { apiGet, apiPost, apiPatch } = require('../utils/network-api');

const SUBDOMAIN = process.env.NEXHEALTH_SUBDOMAIN;
const LOCATION_ID = process.env.NEXHEALTH_LOCATION_ID;

exports.bookAppointmentService = async (
    patient,
    appointment_type,
    selected_date_time,
    note,
    is_new_patient,
    provider_id
) => {
    // const { lid, pid, slots } = selected_date_time;
    // const end_time = new Date(
    //     new Date(slots[0].time).getTime() + appointment_type.minutes * 60000
    // ).toISOString();

    return apiPost(
        `/appointments?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&notify_patient=false`,
        {
            appt: {
                patient_id: patient.id,
                provider_id: provider_id,
                start_time: selected_date_time.start_time,
                operatory_id: selected_date_time.operatory_id,
                end_time: selected_date_time.end_time,
                // appointment_type_id: appointment_type_obj.id,
                note: note || '',
                unavailable: false,
                is_guardian: false,
                is_new_clients_patient: is_new_patient,
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

exports.getAppointmentType = async (req, res) => {
    try {
        const endpoint = `/appointment_types?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&include[]=name&include[]=minutes`;
        const response = await apiGet(endpoint);

        return response.data;
    } catch (error) {
        console.log('Error -----', error);
        return null;
    }
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

exports.getAppointmentsByDetails = async (patientId) => {
    try {
        const start = new Date().toISOString();
        const end = new Date();
        end.setMonth(end.getMonth() + 5);
        const endISOString = end.toISOString();

        const endpoint = `/appointments?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&start=${start}&end=${endISOString}&patient_id=${patientId}`;

        const response = await apiGet(endpoint);
        console.log(
            'Appointments fetched by patient ID ===== \n',
            response.data
        );
        return response.data || null; // Return the appointment data if found
    } catch (error) {
        throw new Error(`Error fetching appointments: ${error.message}`);
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

exports.findAppointmentType = async (appointment_type_id) => {
    const response = await apiGet(
        `/appointment_types?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}`
    );

    if (!response || !response.data) return null; // Handle edge cases

    const matchedAppointmentType = response.data.find(
        (type) => type.id === appointment_type_id
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

exports.findSelectedAppointmentSlot = async (
    provider_id,
    start_time,
    end_time,
    operatory_id
) => {
    try {
        const endpoint = `/appointment_slots?subdomain=${SUBDOMAIN}&start_date=${start_time}&days=1&pids[]=${provider_id}&lids[]=${LOCATION_ID}&operatory_ids[]=${operatory_id}`;

        const response = await apiGet(endpoint);
        console.log(
            'API Response:',
            JSON.stringify(response?.data?.slots, null, 2)
        ); // Debugging
        const slots =
            response.data?.slots ||
            response?.slots ||
            response.data?.data?.slots;

        console.log('Looking for:', { start_time, end_time, operatory_id });

        const slot = slots.find((slot) => {
            if (!slot.time || !slot.end_time || !slot.operatory_id)
                return false; // Prevent undefined errors

            const slotStartTime = new Date(slot.time).toISOString();
            const slotEndTime = new Date(slot.end_time).toISOString();
            const expectedStartTime = new Date(start_time).toISOString();
            const expectedEndTime = new Date(end_time).toISOString();

            console.log('Comparing Slot:', {
                slotStartTime,
                expectedStartTime,
                slotEndTime,
                expectedEndTime,
                slotOperatory: slot.operatory_id,
                expectedOperatory: Number(operatory_id),
            });

            return (
                slotStartTime === expectedStartTime &&
                slotEndTime === expectedEndTime &&
                Number(slot.operatory_id) === Number(operatory_id)
            );
        });

        if (!slot) {
            console.error('❌ Error: No matching slot found!');
            throw new Error('No matching slot found for the given criteria');
        }

        console.log('✅ Matching Slot Found:', slot);
        return slot;
    } catch (error) {
        throw new Error(
            `Error finding selected appointment slot: ${error.message}`
        );
    }
};
