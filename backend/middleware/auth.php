<?php
require_once __DIR__ . '/../config/database.php';

/**
 * Start session securely if not already started
 */
if (session_status() === PHP_SESSION_NONE) {
    // Set session configuration
    ini_set('session.gc_maxlifetime', 172800); // 48 hours
    ini_set('session.cookie_lifetime', 172800);
    ini_set('session.cookie_httponly', 1);
    
    // Secure cookie only if HTTPS is enabled
    $isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    ini_set('session.cookie_secure', $isHttps ? 1 : 0);
    
    ini_set('session.use_strict_mode', 1);
    
    session_start();
}

/**
 * Check if user is authenticated and session is valid
 * 
 * @return array|void Returns user data if valid, or exits with 401
 */
function checkAuth() {
    global $conn;
    
    // Check if user_id is in session
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized: No session']);
        exit;
    }
    
    // Check session timeout (48 hours)
    $timeout_duration = 172800;
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $timeout_duration) {
        session_unset();
        session_destroy();
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Session expired']);
        exit;
    }
    
    // Update last activity
    $_SESSION['last_activity'] = time();
    
    // Verify user exists and is active
    $stmt = $conn->prepare("SELECT id, username, role, status FROM users WHERE id = ?");
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        session_unset();
        session_destroy();
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    $user = $result->fetch_assoc();
    
    if ($user['status'] !== 'active') {
        session_unset();
        session_destroy();
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Account inactive']);
        exit;
    }
    
    return $user;
}
?>
