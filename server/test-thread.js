// server/test-thread.js

require('dotenv').config();

const axios = require('axios');

const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;

// CHANGE THIS LINE:
const API_VERSION = '2024-05-01-preview'; // <-- THIS IS THE CORRECT API VERSION BASED ON YOUR OWN "SAMPLE CODE"

const url = `${AZURE_OPENAI_ENDPOINT}/openai/assistants/${API_VERSION}/threads`;

console.log('Calling:', url);

axios.post(
    url,
    {},
    {
        headers: {
            'api-key': AZURE_OPENAI_KEY,
            'Content-Type': 'application/json'
        }
    }
)
.then((res) => {
    console.log('Thread created:', res.data);
})
.catch((err) => {
    if (err.response) {
        console.error('Error Status:', err.response.status);
        console.error('Error Data:', err.response.data);
        console.error('Error Headers:', err.response.headers);
    } else if (err.request) {
        console.error('Error Request:', err.request);
    } else {
        console.error('Error Message:', err.message);
    }
    console.error('Error Config:', err.config);
});