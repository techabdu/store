<?php
/**
 * Environment Configuration
 * Automatically detects development vs production environment
 * and sets appropriate URLs for frontend, backend, and API
 */

require_once __DIR__ . '/constants.php';

// Load environment variables if not already loaded
function loadConfigEnv() {
    $envPath = __DIR__ . '/../.env';
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                // Remove quotes if present
                if (preg_match('/^"(.*)"$/', $value, $matches)) {
                    $value = $matches[1];
                } elseif (preg_match("/^'(.*)'$/", $value, $matches)) {
                    $value = $matches[1];
                }
                if (getenv($name) === false) {
                    putenv(sprintf('%s=%s', $name, $value));
                    $_ENV[$name] = $value;
                }
            }
        }
    }
}

loadConfigEnv();

// Detect environment based on HTTP_HOST
$isProduction = !in_array($_SERVER['HTTP_HOST'] ?? 'localhost', ['localhost', '127.0.0.1']);

// Set frontend URL from environment or detect based on production status
$frontendUrl = getenv('FRONTEND_URL');
if (!$frontendUrl) {
    if ($isProduction) {
        $httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = ['https://prhub.shop', 'https://www.prhub.shop'];
        $frontendUrl = in_array($httpOrigin, $allowedOrigins) ? $httpOrigin : 'https://prhub.shop';
    } else {
        $frontendUrl = 'http://localhost:5173';
    }
}
define('FRONTEND_URL', rtrim($frontendUrl, '/'));

// Set backend URL from environment or detect
$backendUrl = getenv('BACKEND_URL');
if (!$backendUrl) {
    $backendUrl = $isProduction ? 'https://prhub.shop/backend' : 'http://localhost/store/backend';
}
define('BACKEND_URL', rtrim($backendUrl, '/'));

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
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// Generate unique Request-ID for tracing
if (!isset($_SERVER['HTTP_X_REQUEST_ID'])) {
    $_SERVER['HTTP_X_REQUEST_ID'] = bin2hex(random_bytes(16));
}
header("X-Request-ID: " . $_SERVER['HTTP_X_REQUEST_ID']);
