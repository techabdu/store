<?php
/**
 * Debug Session Endpoint - TEMPORARY FOR DEBUGGING
 * DELETE THIS FILE AFTER FIXING THE ISSUE
 * 
 * This endpoint helps diagnose session and configuration issues
 * without requiring authentication.
 */

// Basic CORS headers for debugging
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

$debug = [];

// 1. Check if config.php exists
$configPath = __DIR__ . '/../config/config.php';
$debug['config_exists'] = file_exists($configPath);

// 2. Check if setCorsHeaders function exists
if ($debug['config_exists']) {
    require_once $configPath;
    $debug['setCorsHeaders_exists'] = function_exists('setCorsHeaders');
} else {
    $debug['setCorsHeaders_exists'] = false;
}

// 3. Check session configuration
$debug['session'] = [
    'status' => session_status(),
    'status_meaning' => [
        0 => 'PHP_SESSION_DISABLED',
        1 => 'PHP_SESSION_NONE', 
        2 => 'PHP_SESSION_ACTIVE'
    ][session_status()] ?? 'UNKNOWN',
    'save_path' => session_save_path() ?: ini_get('session.save_path'),
    'save_path_writable' => is_writable(session_save_path() ?: ini_get('session.save_path') ?: sys_get_temp_dir()),
];

// 4. Check if session_helper works
$helperPath = __DIR__ . '/../helpers/session_helper.php';
$debug['session_helper_exists'] = file_exists($helperPath);

// 5. Try to start session
try {
    if (session_status() === PHP_SESSION_NONE) {
        // Use same settings as session_helper.php
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $isProduction = strpos($host, 'prhub.shop') !== false;
        $secure = $isProduction || 
                  (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                  (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        
        $cookieDomain = $isProduction ? '.prhub.shop' : '';
        
        session_set_cookie_params([
            'lifetime' => 172800,
            'path' => '/',
            'domain' => $cookieDomain,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $isProduction ? 'None' : 'Lax'
        ]);
        
        session_name('SALSABEELSESSID');
        session_start();
        
        $debug['session_started'] = true;
        $debug['session_id'] = session_id();
        $debug['session_data'] = [
            'user_id_set' => isset($_SESSION['user_id']),
            'user_id' => $_SESSION['user_id'] ?? null,
            'tenant_id' => $_SESSION['tenant_id'] ?? null,
            'last_activity' => $_SESSION['last_activity'] ?? null,
        ];
    } else {
        $debug['session_started'] = 'already_active';
        $debug['session_id'] = session_id();
    }
} catch (Exception $e) {
    $debug['session_error'] = $e->getMessage();
}

// 6. Check request headers
$debug['request'] = [
    'http_host' => $_SERVER['HTTP_HOST'] ?? 'not_set',
    'is_https' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                  (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https'),
    'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'not_set',
    'cookie_header' => isset($_SERVER['HTTP_COOKIE']) ? 'present (' . strlen($_SERVER['HTTP_COOKIE']) . ' chars)' : 'not_present',
];

// 7. Check cookie settings
$debug['cookie_params'] = session_get_cookie_params();

// 8. Check PHP version
$debug['php_version'] = phpversion();

// 9. Check if database connection works
try {
    require_once __DIR__ . '/../config/database.php';
    $debug['database_connected'] = ($conn !== null && !$conn->connect_error);
} catch (Exception $e) {
    $debug['database_error'] = $e->getMessage();
}

// 10. Check for .env file
$debug['env_file_exists'] = file_exists(__DIR__ . '/../.env');

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Debug information - DELETE THIS FILE AFTER DEBUGGING',
    'debug' => $debug,
    'timestamp' => date('Y-m-d H:i:s T')
], JSON_PRETTY_PRINT);
?>
