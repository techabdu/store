<?php
/**
 * Activity Logs API
 * GET endpoint to retrieve activity logs based on user role
 * Accessible by: User, Admin, SuperAdmin
 */

require_once '../config/config.php';
require_once '../config/database.php';
require_once '../middleware/api_logger.php'; // API request logging
require_once '../middleware/auth.php';
require_once '../middleware/role.php';
require_once '../helpers/activity_log.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
$currentUser = checkAuth();

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

try {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

    // getActivityLogs helper handles role-based filtering:
    // - User: sees own logs
    // - Admin: sees logs for their tenant
    // - SuperAdmin: sees own logs
    $logs = getActivityLogs($currentUser['id'], $currentUser['role'], $_SESSION['tenant_id'], $limit, $offset);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'logs' => $logs
    ]);

} catch (Exception $e) {
    error_log("Activity logs error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve activity logs']);
}


?>
