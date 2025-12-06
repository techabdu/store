<?php
// backend/debug_session.php
// This script helps debug session and CORS issues

header('Content-Type: text/plain');

echo "Debug Session & CORS Script\n";
echo "===========================\n\n";

// 1. Check PHP session configuration
echo "=== PHP Session Configuration ===\n";
echo "session.cookie_secure: " . ini_get('session.cookie_secure') . "\n";
echo "session.cookie_httponly: " . ini_get('session.cookie_httponly') . "\n";
echo "session.cookie_samesite: " . ini_get('session.cookie_samesite') . "\n";
echo "session.use_strict_mode: " . ini_get('session.use_strict_mode') . "\n";
echo "session.gc_maxlifetime: " . ini_get('session.gc_maxlifetime') . "\n";
echo "session.cookie_lifetime: " . ini_get('session.cookie_lifetime') . "\n\n";

// 2. Check HTTPS
echo "=== HTTPS Status ===\n";
$isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
echo "HTTPS Enabled: " . ($isHttps ? 'YES' : 'NO') . "\n";
echo "\$_SERVER['HTTPS']: " . ($_SERVER['HTTPS'] ?? 'NOT SET') . "\n";
echo "\$_SERVER['SERVER_PORT']: " . ($_SERVER['SERVER_PORT'] ?? 'NOT SET') . "\n\n";

// 3. Check request headers
echo "=== Request Headers ===\n";
echo "HTTP_ORIGIN: " . ($_SERVER['HTTP_ORIGIN'] ?? 'NOT SET') . "\n";
echo "HTTP_HOST: " . ($_SERVER['HTTP_HOST'] ?? 'NOT SET') . "\n";
echo "HTTP_REFERER: " . ($_SERVER['HTTP_REFERER'] ?? 'NOT SET') . "\n";
echo "REQUEST_METHOD: " . ($_SERVER['REQUEST_METHOD'] ?? 'NOT SET') . "\n\n";

// 4. Check config.php
require_once 'config/config.php';
echo "=== Config.php Values ===\n";
echo "FRONTEND_URL: " . FRONTEND_URL . "\n";
echo "BACKEND_URL: " . BACKEND_URL . "\n";
echo "API_URL: " . API_URL . "\n\n";

// 5. Test session
echo "=== Session Test ===\n";
if (session_status() === PHP_SESSION_NONE) {
    session_start();
    echo "Session started successfully\n";
} else {
    echo "Session already active\n";
}
echo "Session ID: " . session_id() . "\n";
echo "Session Status: " . session_status() . " (1=disabled, 2=active)\n";
echo "Session Data: " . json_encode($_SESSION) . "\n\n";

// 6. Check cookies
echo "=== Cookies Received ===\n";
if (empty($_COOKIE)) {
    echo "NO COOKIES RECEIVED\n";
} else {
    foreach ($_COOKIE as $key => $value) {
        if (strpos($key, 'PHPSESSID') !== false) {
            echo "$key: " . substr($value, 0, 10) . "... (length: " . strlen($value) . ")\n";
        } else {
            echo "$key: $value\n";
        }
    }
}
echo "\n";

// 7. Recommendations
echo "=== Recommendations ===\n";
if (!$isHttps) {
    echo "[WARNING] HTTPS is not detected. session.cookie_secure should be 0.\n";
}
if (ini_get('session.cookie_samesite') !== 'None' && $isHttps) {
    echo "[WARNING] For cross-origin requests with credentials, session.cookie_samesite should be 'None'.\n";
}
if (empty($_COOKIE)) {
    echo "[ERROR] No cookies received. This is the root cause of 401 errors.\n";
    echo "  Possible causes:\n";
    echo "  - CORS headers not allowing credentials\n";
    echo "  - Frontend not sending withCredentials: true\n";
    echo "  - SameSite cookie policy blocking cookies\n";
}
?>
