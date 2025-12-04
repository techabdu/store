<?php
/**
 * Environment Configuration
 * Automatically detects development vs production environment
 * and sets appropriate URLs for frontend, backend, and API
 */

// Detect environment based on HTTP_HOST
// Development: localhost or 127.0.0.1
// Production: any other domain (e.g., prhub.shop)
$isProduction = !in_array($_SERVER['HTTP_HOST'] ?? 'localhost', ['localhost', '127.0.0.1']);

// Set frontend URL based on environment
define('FRONTEND_URL', $isProduction 
    ? 'https://prhub.shop' 
    : 'http://localhost:5173'
);

// Set backend URL based on environment
define('BACKEND_URL', $isProduction 
    ? 'https://prhub.shop/backend' 
    : 'http://localhost/store/backend'
);

// Set API URL based on environment
define('API_URL', BACKEND_URL . '/api');

/**
 * Get CORS origin for current environment
 * 
 * @return string The allowed CORS origin URL
 */
function getCorsOrigin() {
    return FRONTEND_URL;
}

/**
 * Set standard CORS headers for API responses
 * This function should be called at the beginning of all API endpoints
 * 
 * @return void
 */
function setCorsHeaders() {
    header("Access-Control-Allow-Origin: " . FRONTEND_URL);
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
