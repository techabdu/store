<?php
/**
 * Tenant Notifications API (SuperAdmin Only)
 * 
 * Purpose: Manage system-generated and manual notifications for specific tenants
 * Method: GET (list), POST (resolve, create)
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=list: Get unresolved notifications for a tenant
 * - action=resolve: Mark a notification as resolved (POST)
 * - action=create: Create a manual notification (POST)
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
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

if ($method === 'GET') {
    if ($action === 'list') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // Get unresolved notifications
        $stmt = $conn->prepare("
            SELECT 
                n.id, n.notification_type, n.severity, n.title, n.message, 
                n.is_resolved, n.created_at, n.resolved_at,
                u.username as resolved_by_name
            FROM tenant_notifications n
            LEFT JOIN users u ON n.resolved_by = u.id
            WHERE n.tenant_id = ? AND n.is_resolved = 0
            ORDER BY n.created_at DESC
        ");
        
        $stmt->bind_param("i", $tenant_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $notifications = [];
        while ($row = $result->fetch_assoc()) {
            $notifications[] = $row;
        }
        $stmt->close();
        
        echo json_encode([
            'success' => true,
            'notifications' => $notifications
        ]);
        exit;
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'resolve') {
        $notification_id = isset($data['notification_id']) ? intval($data['notification_id']) : 0;
        
        if ($notification_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'notification_id is required']);
            exit;
        }
        
        $admin_id = $_SESSION['user_id'];
        
        $stmt = $conn->prepare("
            UPDATE tenant_notifications 
            SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
            WHERE id = ?
        ");
        $stmt->bind_param("ii", $admin_id, $notification_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true, 
                'message' => 'Notification marked as resolved'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to resolve notification']);
        }
        $stmt->close();
        exit;
        
    } elseif ($action === 'create') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $type = isset($data['notification_type']) ? $data['notification_type'] : 'info';
        $severity = isset($data['severity']) ? $data['severity'] : 'medium';
        $title = isset($data['title']) ? trim($data['title']) : '';
        $message = isset($data['message']) ? trim($data['message']) : '';
        
        if ($tenant_id <= 0 || empty($title) || empty($message)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing required fields']);
            exit;
        }
        
        $stmt = $conn->prepare("
            INSERT INTO tenant_notifications 
            (tenant_id, notification_type, severity, title, message)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("issss", $tenant_id, $type, $severity, $title, $message);
        
        if ($stmt->execute()) {
            $notification_id = $stmt->insert_id;
            
            // Log to activity logs
            $admin_id = $_SESSION['user_id'];
            $activity_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, 'notification_created', 'tenant', ?, ?)
            ");
            $details = "Notification '$title' created by SuperAdmin";
            $activity_stmt->bind_param("iiis", $tenant_id, $admin_id, $notification_id, $details);
            $activity_stmt->execute();
            $activity_stmt->close();

            echo json_encode([
                'success' => true,
                'message' => 'Notification created successfully',
                'notification_id' => $notification_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create notification']);
        }
        $stmt->close();
        exit;
    }
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
?>
