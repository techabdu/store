<?php
/**
 * CSRF Protection Helpers
 */

if (session_status() === PHP_SESSION_NONE) {
    // Start session if not already started, with secure cookie params if possible
    // Note: auth.php usually handles session start with params
    session_start();
}

/**
 * Generate CSRF Token
 * 
 * @return string The valid CSRF token
 */
function generateCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF Token
 * 
 * @param string|null $token Token to verify
 * @return bool True if valid
 */
function verifyCsrfToken($token) {
    if (empty($token)) {
        return false;
    }
    
    if (!isset($_SESSION['csrf_token'])) {
        return false; // No token in session
    }
    
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Polyfill for getallheaders if not exists (e.g. FPM/Nginx)
 */
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

/**
 * Middleware to require CSRF token
 * Exits with 403 if invalid
 */
function requireCsrf() {
    $headers = getallheaders();
    
    // Case-insensitive header lookup
    $token = null;
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'x-csrf-token') {
            $token = $value;
            break;
        }
    }
    
    // Fallback to POST data
    if (!$token) {
        $token = $_POST['csrf_token'] ?? null;
    }
    
    if (!$token || !verifyCsrfToken($token)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Invalid CSRF token']);
        exit;
    }
}
?>
