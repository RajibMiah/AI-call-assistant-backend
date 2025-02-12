const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.NEXHEALTH_API_URL;
const SUBDOMAIN = process.env.NEXHEALTH_SUBDOMAIN;
const API_TOKEN = process.env.NEXHEALTH_API_KEY;
const LOCATION_ID = process.env.NEXHEALTH_LOCATION_ID;

let bearerToken = null;

// 📌 Authenticate and get a Bearer Token
const authenticate = async () => {
    try {
        console.log("API URL", `${API_URL}/authenticates`, "api token", API_TOKEN);

        // Send the API key directly in the Authorization header
        const response = await axios.post(`${API_URL}/authenticates`, {}, {
            headers: {
                'Accept': 'application/vnd.Nexhealth+json;version=2',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `${API_TOKEN}` // Correct header format: no 'APIToken' prefix
            }
        });

        bearerToken = response.data.data.token;
        console.log("✅ NexHealth Authentication Successful.");
        return bearerToken;
    } catch (error) {
        console.error("❌ Error Authenticating:", error.response?.data || error.message);
        throw new Error("Authentication failed");
    }
};

// 📌 Axios client with dynamic token injection
const getApiClient = async () => {
    if (!bearerToken) await authenticate();
    console.log("bearer token" , bearerToken);
    return axios.create({
        baseURL: API_URL,
        headers: {
            'Accept': 'application/vnd.Nexhealth+json;version=2',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${bearerToken}`,
        }
    });
};

// 📌 Generic GET request handler
const apiGet = async (endpoint) => {
    try {
        const apiClient = await getApiClient();
        const response = await apiClient.get(endpoint);
        return response.data;
    } catch (error) {
       
        console.error(`❌ Error in GET ${endpoint}:`, error.response?.data || error.message);
        throw error.response ? error.response.data : error;
    }
};

// 📌 Generic POST request handler
const apiPost = async (endpoint, data) => {
    try {
        const apiClient = await getApiClient();
        const response = await apiClient.post(endpoint, data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error in POST ${endpoint}:`, error.response?.data || error.message);
        throw error.response ? error.response.data : error;
    }
};

// 📌 Generic PATCH request handler
const apiPatch = async (endpoint, data) => {
    try {
        const apiClient = await getApiClient();  // Get the axios client with Bearer token
        const response = await apiClient.patch(endpoint, data);  // Send the PATCH request with the provided endpoint and data
        return response.data;  // Return the response data from the API
    } catch (error) {
        console.error(`❌ Error in PATCH ${endpoint}:`, error.response?.data || error.message);
        throw error.response ? error.response.data : error;  // Throw error if something goes wrong
    }
};


// 📌 Book an appointment
exports.bookAppointment = async (patientId, providerId, startTime, operatoryId, note = "") => {
    return apiPost(`/appointments?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&notify_patient=false`, {
        appt: { 
            patient_id: patientId, provider_id: providerId, start_time: startTime, operatory_id: operatoryId, note }
    });
};

// 📌 Get Providers
exports.getProviders = async () => {
    return apiGet(`/providers?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&per_page=1`);
};

// 📌 Get Patients (Search by Phone Number)
exports.getPatientsByPhone = async (phoneNumber) => {
    const patients = await apiGet(`/patients?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}`);
    return patients.patients?.find(p => p.patient.bio.phone_number === phoneNumber) || null;
};

// 📌 Find the patient by details (email, phone, first_name, last_name)
exports.findPatientByDetails = async (email, phone_number, first_name, last_name) => {
    try {
        const apiClient = await getApiClient();
        const endpoint = `/patients?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&email=${email}&phone_number=${phone_number}&first_name=${first_name}&last_name=${last_name}`;
        const response = await apiClient.get(endpoint);

        return response.data.patients.length > 0 ? response.data.patients[0] : null;
    } catch (error) {
        throw new Error(`Error fetching patient: ${error.message}`);
    }
};

exports.getAppointmentsByPatientId = async (appointmentId) => {
    try {
        const apiClient = await getApiClient();
        const endpoint = `/appointments/${appointmentId}?subdomain=${SUBDOMAIN}&include[]=patient&include[]=patient`; 

        const response = await apiClient.get(endpoint);

        return response.data.appointment || null;  // Return the appointment data if found
    } catch (error) {
        throw new Error(`Error fetching appointment: ${error.message}`);
    }
};



// 📌 Find appointment by patient ID
exports.findAppointmentByPatient = async (patientId, appointmentId) => {
    try {
        const apiClient = await getApiClient();
        const endpoint = `/appointments/${appointmentId}?subdomain=${process.env.NEXHEALTH_SUBDOMAIN}&patient_id=${patientId}`;
        const response = await apiClient.get(endpoint);
        
        return response.data.appointment || null;
    } catch (error) {
        throw new Error(`Error fetching appointment: ${error.message}`);
    }
};

// 📌 Register a new patient
exports.registerPatient = async (providerId, firstName, lastName, email, dateOfBirth, phoneNumber) => {
    return apiPost(`/patients?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}`, {
        provider: { provider_id: providerId },
        patient: { first_name: firstName, last_name: lastName, email, bio: { date_of_birth: dateOfBirth, phone_number: phoneNumber } }
    });
};

// 📌 Get All Operatories
exports.getOperatories = async (page = 1, perPage = 5, searchName = "", foreignId = "", updatedSince = "") => {
    let url = `/operatories?subdomain=${SUBDOMAIN}&location_id=${LOCATION_ID}&page=${page}&per_page=${perPage}&include[]=appt_categories`;
    if (searchName) url += `&search_name=${searchName}`;
    if (foreignId) url += `&foreign_id=${foreignId}`;
    if (updatedSince) url += `&updated_since=${updatedSince}`;

    return apiGet(url);
};

// 📌 Get Operatory By ID
exports.getOperatoryById = async (operatoryId) => {
    return apiGet(`/operatories/${operatoryId}?subdomain=${SUBDOMAIN}&include[]=appt_categories`);
};


// Fetch available appointment slots from the third-party API

exports.getAvailableSlots = async (startDate, days, lids, pids) => {
    try {
        // const apiClient = await getApiClient();
        const endpoint = `/appointment_slots?subdomain=${SUBDOMAIN}&start_date=${startDate}&days=${days}&lids[]=${lids.join(',')}&pids[]=${pids.join(',')}`;
        console.log("endpoint" , endpoint);
        const response = await apiGet(endpoint);
        return response.data || [];  // Assuming the third-party API returns available slots in this field
    } catch (error) {
        console.error(`❌ Error fetching available slots: ${error.response?.data || error.message}`);
        throw new Error("Error fetching available slots");
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
                confirmed: false
            }
        };

        const response = await apiPatch(endpoint, cancelData);
        return response.data;
    } catch (error) {
        throw new Error(`Error canceling appointment: ${error.message}`);
    }
};
