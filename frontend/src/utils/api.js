import axios from 'axios';

// Detect environment based on hostname
export const isProduction = window.location.hostname !== 'localhost';

export const SERVER_URL = isProduction
    ? 'https://prhub.shop'
    : 'http://localhost';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: `${SERVER_URL}${isProduction ? '' : '/store'}/backend/api`,
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

        return Promise.reject(error);
    }
);

export default api;
