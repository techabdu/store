import axios from 'axios';
import { notifyError } from './notificationHelper';

// Detect environment based on hostname
export const isProduction = window.location.hostname !== 'localhost';

// SERVER_URL is the base server domain (used for images and absolute paths)
export const SERVER_URL = isProduction ? 'https://prhub.shop' : 'http://localhost';

// API_BASE_URL is the full path to the API
// If VITE_API_URL is provided in .env, use it; otherwise construct it
export const API_BASE_URL = import.meta.env.VITE_API_URL || `${SERVER_URL}${isProduction ? '' : '/store'}/backend/api`;

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Important for cookies/sessions
    headers: {
        'Content-Type': 'application/json',
    },
});

// CSRF Token Management
let csrfToken = null;
let csrfPromise = null;

const fetchCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    if (csrfPromise) return csrfPromise;

    // Use a separate instance or the same one? Same is fine as long as GET doesn't trigger loop
    // But we need to be careful.
    csrfPromise = axios.get(`${api.defaults.baseURL}/auth/csrf-token.php`, {
        withCredentials: true
    }).then(res => {
        if (res.data.success) {
            csrfToken = res.data.csrf_token;
        }
        csrfPromise = null;
        return csrfToken;
    }).catch(err => {
        csrfPromise = null;
        console.error("Failed to fetch CSRF token", err);
        return null;
    });

    return csrfPromise;
};

// Generic request interceptor to add CSRF token
api.interceptors.request.use(async (config) => {
    // Only add token for state-changing methods
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
        const token = await fetchCsrfToken();
        if (token) {
            config.headers['X-CSRF-Token'] = token;
        }
    }

    // Fix for FormData upload issues
    // If saving FormData, let browser handle Content-Type (boundary)
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Add response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 403 CSRF error - retry once
        if (error.response?.status === 403 &&
            error.response.data?.error === 'Invalid CSRF token' &&
            !originalRequest._retry) {

            originalRequest._retry = true;
            csrfToken = null; // Clear invalid token
            const newToken = await fetchCsrfToken();

            if (newToken) {
                originalRequest.headers['X-CSRF-Token'] = newToken;
                return api(originalRequest);
            }
        }

        // Global Error Handling
        if (error.response) {
            const status = error.response.status;
            const errorMsg = error.response.data?.error || error.response.data?.message || 'A server error occurred';

            // Don't show global notification for 401 (handled by AuthContext/ProtectedRoute)
            // or 403 CSRF (handled by retry logic below)
            if (status !== 401 && !(status === 403 && error.response.data?.error === 'Invalid CSRF token')) {
                notifyError(errorMsg);
            }
        } else if (error.request) {
            // Network error
            notifyError('No response from server. Please check your internet connection.');
        } else {
            // Something else went wrong
            notifyError('An unexpected error occurred.');
        }

        return Promise.reject(error);
    }
);

export default api;
