import axios from 'axios';

// Detect environment based on hostname
const isProduction = window.location.hostname !== 'localhost';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: isProduction
        ? 'https://salsabeelistore.shop/backend/api'  // Production URL
        : 'http://localhost/store/backend/api',        // Local XAMPP
    withCredentials: true, // Important for cookies/sessions
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor for global error handling (optional but good practice)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // You could handle 401s globally here if needed
        return Promise.reject(error);
    }
);

export default api;
