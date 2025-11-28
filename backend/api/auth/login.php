<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/activity_log.php';
require_once __DIR__ . '/../../classes/SecurityMonitor.php';

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get JSON input
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->username) || !isset($data->password) || empty(trim($data->username)) || empty(trim($data->password))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Username and password are required']);
    exit;
}

$username = trim($data->username);
$password = trim($data->password);

// Check user in database
$stmt = $conn->prepare("SELECT id, username, password_hash, role, status FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Log failed login attempt
    $securityMonitor = new SecurityMonitor();
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $securityMonitor->logFailedLogin($username, $ip, $userAgent);
    
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
    exit;
}

$user = $result->fetch_assoc();

// Verify password
if (!password_verify($password, $user['password_hash'])) {
    // Log failed login attempt
    $securityMonitor = new SecurityMonitor();
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $securityMonitor->logFailedLogin($username, $ip, $userAgent);
    
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
    exit;
}

// Check status
if ($user['status'] !== 'active') {
    // Log failed login attempt (inactive account)
    $securityMonitor = new SecurityMonitor();
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $securityMonitor->logFailedLogin($username, $ip, $userAgent);
    
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Account is inactive. Please contact support.']);
    exit;
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.gc_maxlifetime', 172800);
    ini_set('session.cookie_lifetime', 172800);
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 0); // Set to 1 if HTTPS
    ini_set('session.use_strict_mode', 1);
    session_start();
}

session_regenerate_id(true); // Prevent session fixation

$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['role'] = $user['role'];
$_SESSION['last_activity'] = time();

// Log activity
logActivity($user['id'], 'login', 'User logged in');

// Return success
http_response_code(200);
echo json_encode([
    'success' => true,
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'role' => $user['role']
    ]
]);
?>
