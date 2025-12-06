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
    
    // Set SameSite=None for HTTPS to allow cross-origin cookies
    // This is required for production where frontend and backend may be on different subdomains
    if ($isHttps) {
        ini_set('session.cookie_samesite', 'None');
    } else {
        ini_set('session.cookie_samesite', 'Lax');
    }
    
    ini_set('session.use_strict_mode', 1);
    
    session_start();
}

/**
 * Check if user is authenticated and session is valid
 * Also verifies tenant status and stores tenant_id in session
 * 
 * @return array|void Returns user data if valid, or exits with 401/403
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
    
    // Verify user exists and is active, and get tenant_id
    $stmt = $conn->prepare("SELECT id, username, role, status, tenant_id FROM users WHERE id = ?");
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
    
    // Store tenant_id in session if not already set
    if (!isset($_SESSION['tenant_id']) || $_SESSION['tenant_id'] !== $user['tenant_id']) {
        $_SESSION['tenant_id'] = $user['tenant_id'];
    }
    
    // Verify tenant status (skip for superadmin)
    if ($user['role'] !== 'superadmin') {
        $tenantStmt = $conn->prepare("SELECT status, plan_type, trial_ends_at FROM tenants WHERE id = ?");
        $tenantStmt->bind_param("i", $user['tenant_id']);
        $tenantStmt->execute();
        $tenantResult = $tenantStmt->get_result();
        
        if ($tenantResult->num_rows === 0) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Tenant not found']);
            exit;
        }
        
        $tenant = $tenantResult->fetch_assoc();
        
        // Check tenant status
        if ($tenant['status'] === 'suspended') {
            session_unset();
            session_destroy();
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Your shop has been suspended. Please contact support.']);
            exit;
        }
        
        if ($tenant['status'] === 'pending') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Please verify your email to activate your account.']);
            exit;
        }
        
        // Check trial expiration
        if ($tenant['status'] === 'trial' && $tenant['trial_ends_at']) {
            $trialEnds = strtotime($tenant['trial_ends_at']);
            if (time() > $trialEnds) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Your free trial has expired. Please subscribe to continue.']);
                exit;
            }
        }
    }
    
    return $user;
}
?>
