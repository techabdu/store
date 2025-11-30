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

// Check rate limit
$securityMonitor = new SecurityMonitor();
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if ($securityMonitor->isRateLimited($ip, $username)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many failed attempts. Please try again later.']);
    exit;
}

try {
    // Check user in database
    $stmt = $conn->prepare("SELECT id, username, password_hash, role, status FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        // Log failed login attempt
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
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $securityMonitor->logFailedLogin($username, $ip, $userAgent);
        
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        exit;
    }

    // Check status
    if ($user['status'] !== 'active') {
        // Log failed login attempt (inactive account)
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $securityMonitor->logFailedLogin($username, $ip, $userAgent);
        
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Account is inactive. Please contact support.']);
        exit;
    }

    // Get tenant information (if user is not superadmin)
    $tenant_id = null;
    $tenant_status = null;
    $email_verified = null;
    
    if ($user['role'] !== 'superadmin') {
        $tenantStmt = $conn->prepare("SELECT u.tenant_id, t.status, t.email_verified FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.id = ?");
        $tenantStmt->bind_param("i", $user['id']);
        $tenantStmt->execute();
        $tenantResult = $tenantStmt->get_result();
        
        if ($tenantResult->num_rows > 0) {
            $tenantData = $tenantResult->fetch_assoc();
            $tenant_id = $tenantData['tenant_id'];
            $tenant_status = $tenantData['status'];
            $email_verified = $tenantData['email_verified'];
            
            // Check if email is verified
            if (!$email_verified) {
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'error' => 'Please verify your email address before logging in. Check your inbox for the verification link.'
                ]);
                exit;
            }
            
            // Check tenant status
            if ($tenant_status === 'suspended') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Your shop account has been suspended. Please contact support.']);
                exit;
            }
            
            if ($tenant_status === 'pending') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Your shop account is pending activation. Please verify your email.']);
                exit;
            }
        }
    }

    // Start session
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.gc_maxlifetime', 172800);
        ini_set('session.cookie_lifetime', 172800);
        ini_set('session.cookie_httponly', 1);
        
        // Secure cookie only if HTTPS is enabled
        $isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
        ini_set('session.cookie_secure', $isHttps ? 1 : 0);
        
        ini_set('session.use_strict_mode', 1);
        session_start();
    }

    session_regenerate_id(true); // Prevent session fixation

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['tenant_id'] = $tenant_id;
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

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred']);
    exit;
}
?>
