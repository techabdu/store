<?php
/**
 * User Impersonation API (SuperAdmin Only)
 * 
 * Purpose: Allow SuperAdmin to impersonate tenant users for troubleshooting
 * Method: POST
 * Authentication: Required (SuperAdmin only)
 * 
 * SECURITY CRITICAL:
 * - All impersonation sessions are logged
 * - SuperAdmin cannot impersonate another SuperAdmin
 * - Reason is mandatory
 * - Original session is preserved and restored on exit
 * 
 * Actions:
 * - action=start: Start impersonation session
 * - action=end: End impersonation and restore original session
 */

require_once '../../config/config.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

global $conn;

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Only POST method allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($action === 'start') {
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
    $reason = isset($data['reason']) ? trim($data['reason']) : '';
    
    if ($user_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'user_id is required']);
        exit;
    }
    
    if (empty($reason)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Reason for impersonation is required']);
        exit;
    }
    
    // Check if already impersonating
    if (isset($_SESSION['impersonating']) && $_SESSION['impersonating'] === true) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Already in an impersonation session. Exit current session first.']);
        exit;
    }
    
    // Get target user details
    $user_stmt = $conn->prepare("
        SELECT id, username, email, role, status, tenant_id, shop_id
        FROM users 
        WHERE id = ?
    ");
    
    if (!$user_stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
        exit;
    }
    
    $user_stmt->bind_param("i", $user_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    
    if ($user_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    $target_user = $user_result->fetch_assoc();
    $user_stmt->close();
    
    // SECURITY: Cannot impersonate another SuperAdmin
    if ($target_user['role'] === 'superadmin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot impersonate another SuperAdmin']);
        exit;
    }
    
    // SECURITY: Target user must be active
    if ($target_user['status'] !== 'active') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot impersonate inactive user']);
        exit;
    }
    
    // Store original session data
    $original_user_id = $_SESSION['user_id'];
    $original_role = $_SESSION['role'];
    $original_tenant_id = $_SESSION['tenant_id'] ?? null;
    
    // Get IP address
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    // Log impersonation start
    $log_stmt = $conn->prepare("
        INSERT INTO tenant_impersonation_logs 
        (superadmin_id, tenant_id, impersonated_user_id, ip_address, reason)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $log_stmt->bind_param("iiiss", 
        $original_user_id, 
        $target_user['tenant_id'], 
        $user_id, 
        $ip_address, 
        $reason
    );
    
    if (!$log_stmt->execute()) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to log impersonation: ' . $log_stmt->error]);
        exit;
    }
    
    $impersonation_log_id = $conn->insert_id;
    $log_stmt->close();
    
    // Switch session to target user
    $_SESSION['impersonating'] = true;
    $_SESSION['original_user_id'] = $original_user_id;
    $_SESSION['original_role'] = $original_role;
    $_SESSION['original_tenant_id'] = $original_tenant_id;
    $_SESSION['impersonation_log_id'] = $impersonation_log_id;
    $_SESSION['impersonation_started_at'] = time();
    
    // Set new session data
    $_SESSION['user_id'] = $target_user['id'];
    $_SESSION['role'] = $target_user['role'];
    $_SESSION['tenant_id'] = $target_user['tenant_id'];
    $_SESSION['current_shop_id'] = $target_user['shop_id'];
    
    // Regenerate session ID for security
    session_regenerate_id(true);
    
    // Log activity in target tenant
    $activity_stmt = $conn->prepare("
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, 'impersonation_started', 'user', ?, ?)
    ");
    $details = "SuperAdmin impersonation started. Reason: $reason";
    $activity_stmt->bind_param("iiis", $target_user['tenant_id'], $original_user_id, $user_id, $details);
    $activity_stmt->execute();
    $activity_stmt->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Impersonation started successfully',
        'impersonating' => [
            'user_id' => $target_user['id'],
            'username' => $target_user['username'],
            'email' => $target_user['email'],
            'role' => $target_user['role'],
            'tenant_id' => $target_user['tenant_id']
        ],
        'impersonation_log_id' => $impersonation_log_id
    ]);
    
} elseif ($action === 'end') {
    
    // Check if currently impersonating
    if (!isset($_SESSION['impersonating']) || $_SESSION['impersonating'] !== true) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Not currently impersonating']);
        exit;
    }
    
    // Get impersonation details before restoring
    $impersonation_log_id = $_SESSION['impersonation_log_id'] ?? null;
    $impersonated_user_id = $_SESSION['user_id'];
    $impersonated_tenant_id = $_SESSION['tenant_id'];
    $started_at = $_SESSION['impersonation_started_at'] ?? time();
    
    // Calculate duration
    $duration_seconds = time() - $started_at;
    
    // Restore original session
    $original_user_id = $_SESSION['original_user_id'];
    $original_role = $_SESSION['original_role'];
    $original_tenant_id = $_SESSION['original_tenant_id'];
    
    $_SESSION['user_id'] = $original_user_id;
    $_SESSION['role'] = $original_role;
    $_SESSION['tenant_id'] = $original_tenant_id;
    
    // Clear impersonation flags
    unset($_SESSION['impersonating']);
    unset($_SESSION['original_user_id']);
    unset($_SESSION['original_role']);
    unset($_SESSION['original_tenant_id']);
    unset($_SESSION['impersonation_log_id']);
    unset($_SESSION['impersonation_started_at']);
    unset($_SESSION['current_shop_id']);
    
    // Regenerate session ID for security
    session_regenerate_id(true);
    
    // Update impersonation log with end time and duration
    if ($impersonation_log_id) {
        $update_log_stmt = $conn->prepare("
            UPDATE tenant_impersonation_logs 
            SET ended_at = CURRENT_TIMESTAMP, duration_seconds = ?
            WHERE id = ?
        ");
        $update_log_stmt->bind_param("ii", $duration_seconds, $impersonation_log_id);
        $update_log_stmt->execute();
        $update_log_stmt->close();
    }
    
    // Log activity in impersonated tenant
    $activity_stmt = $conn->prepare("
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, 'impersonation_ended', 'user', ?, ?)
    ");
    $details = "SuperAdmin impersonation ended. Duration: " . gmdate("H:i:s", $duration_seconds);
    $activity_stmt->bind_param("iiis", $impersonated_tenant_id, $original_user_id, $impersonated_user_id, $details);
    $activity_stmt->execute();
    $activity_stmt->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Impersonation ended successfully',
        'duration_seconds' => $duration_seconds,
        'restored_to' => [
            'user_id' => $original_user_id,
            'role' => $original_role
        ]
    ]);
    
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action. Use: start or end']);
}
?>
