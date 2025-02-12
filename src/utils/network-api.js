const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.NEXHEALTH_API_URL;
const API_TOKEN = process.env.NEXHEALTH_API_KEY;

let bearerToken = null;

// 📌 Authenticate and get a Bearer Token
const authenticate = async () => {
    try {
        console.log(
            'API URL',
            `${API_URL}/authenticates`,
            'api token',
            API_TOKEN
        );

        // Send the API key directly in the Authorization header
        const response = await axios.post(
            `${API_URL}/authenticates`,
            {},
            {
                headers: {
                    Accept: 'application/vnd.Nexhealth+json;version=2',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `${API_TOKEN}`, // Correct header format: no 'APIToken' prefix
                },
            }
        );

        bearerToken = response.data.data.token;
        console.log('✅ NexHealth Authentication Successful.');
        return bearerToken;
    } catch (error) {
        console.error(
            '❌ Error Authenticating:',
            error.response?.data || error.message
        );
        throw new Error('Authentication failed');
    }
};

// 📌 Axios client with dynamic token injection
const getApiClient = async () => {
    if (!bearerToken) await authenticate();

    return axios.create({
        baseURL: API_URL,
        headers: {
            Accept: 'application/vnd.Nexhealth+json;version=2',
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${bearerToken}`,
        },
    });
};

// 📌 Generic GET request handler
exports.apiGet = async (endpoint) => {
    try {
        const apiClient = await getApiClient();
        const response = await apiClient.get(endpoint);
        return response.data;
    } catch (error) {
        console.error(
            `❌ Error in GET ${endpoint}:`,
            error.response?.data || error.message
        );
        throw error.response ? error.response.data : error;
    }
};

// 📌 Generic POST request handler
exports.apiPost = async (endpoint, data) => {
    try {
        const apiClient = await getApiClient();
        const response = await apiClient.post(endpoint, data);
        return response.data;
    } catch (error) {
        console.error(
            `❌ Error in POST ${endpoint}:`,
            error.response?.data || error.message
        );
        throw error.response ? error.response.data : error;
    }
};

// 📌 Generic PATCH request handler
exports.apiPatch = async (endpoint, data) => {
    try {
        const apiClient = await getApiClient(); // Get the axios client with Bearer token
        const response = await apiClient.patch(endpoint, data); // Send the PATCH request with the provided endpoint and data
        return response.data; // Return the response data from the API
    } catch (error) {
        console.error(
            `❌ Error in PATCH ${endpoint}:`,
            error.response?.data || error.message
        );
        throw error.response ? error.response.data : error; // Throw error if something goes wrong
    }
};
