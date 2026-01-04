<?php
/**
 * Tenant Details API (SuperAdmin Only)
 * 
 * Purpose: Get comprehensive tenant information including stats and timeline
 * Method: GET
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=overview: Get tenant summary with quick stats
 * - action=timeline: Get paginated activity timeline
 */

require_once '../../config/config.php';
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
$action = isset($_GET['action']) ? $_GET['action'] : 'overview';

if ($method === 'GET') {
    if ($action === 'overview') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // Fetch tenant summary
        $tenant_stmt = $conn->prepare("
            SELECT 
                id, shop_name, shop_address, shop_phone, shop_email,
                business_capital, status, plan_type, trial_ends_at,
                subscription_ends_at, email_verified, created_at, updated_at,
                last_login_at, total_logins, storage_used_mb, api_calls_today,
                subscription_plan, mrr
            FROM tenants 
            WHERE id = ?
        ");
        if (!$tenant_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
            exit;
        }
        
        $tenant_stmt->bind_param("i", $tenant_id);
        $tenant_stmt->execute();
        $tenant_result = $tenant_stmt->get_result();
        
        if ($tenant_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Tenant not found']);
            exit;
        }
        
        $tenant = $tenant_result->fetch_assoc();
        $tenant_stmt->close();
        
        // Calculate days remaining if on trial
        $days_remaining = null;
        if ($tenant['trial_ends_at']) {
            $trial_end = new DateTime($tenant['trial_ends_at']);
            $now = new DateTime();
            $diff = $now->diff($trial_end);
            $days_remaining = $diff->invert ? 0 : $diff->days;
        }
        $tenant['days_remaining'] = $days_remaining;
        
        // Quick Stats
        $stats = [];
        
        // Total Users
        $users_stmt = $conn->prepare("
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                   SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users,
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users
            FROM users WHERE tenant_id = ?
        ");
        $users_stmt->bind_param("i", $tenant_id);
        $users_stmt->execute();
        $users_result = $users_stmt->get_result();
        $stats['users'] = $users_result->fetch_assoc();
        $users_stmt->close();
        
        // Total Inventory
        $inventory_stmt = $conn->prepare("
            SELECT COUNT(*) as total_items,
                   SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as total_quantity,
                   SUM(CASE WHEN status = 'in_stock' THEN cost_price ELSE 0 END) as total_value
            FROM inventory WHERE tenant_id = ?
        ");
        $inventory_stmt->bind_param("i", $tenant_id);
        $inventory_stmt->execute();
        $inventory_result = $inventory_stmt->get_result();
        $stats['inventory'] = $inventory_result->fetch_assoc();
        $inventory_stmt->close();
        
        // Monthly Sales (last 30 days)
        $sales_stmt = $conn->prepare("
            SELECT COUNT(*) as transaction_count,
                   COALESCE(SUM(total_amount), 0) as total_sales,
                   COALESCE(AVG(total_amount), 0) as avg_transaction
            FROM transactions 
            WHERE tenant_id = ? 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $sales_stmt->bind_param("i", $tenant_id);
        $sales_stmt->execute();
        $sales_result = $sales_stmt->get_result();
        $stats['sales'] = $sales_result->fetch_assoc();
        $sales_stmt->close();
        
        // Active Support Tickets
        $tickets_stmt = $conn->prepare("
            SELECT COUNT(*) as active_tickets,
                   SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
                   SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_tickets
            FROM support_tickets 
            WHERE tenant_id = ? 
            AND status NOT IN ('resolved', 'closed')
        ");
        $tickets_stmt->bind_param("i", $tenant_id);
        $tickets_stmt->execute();
        $tickets_result = $tickets_stmt->get_result();
        $stats['tickets'] = $tickets_result->fetch_assoc();
        $tickets_stmt->close();
        
        // Recent Activity Timeline (last 10 entries)
        $timeline_stmt = $conn->prepare("
            SELECT 
                al.id, al.action, al.entity_type, al.entity_id, 
                al.user_id, al.details, al.ip_address, al.created_at,
                u.username
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = ?
            ORDER BY al.created_at DESC 
            LIMIT 10
        ");
        if (!$timeline_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
            exit;
        }

        $timeline_stmt->bind_param("i", $tenant_id);
        $timeline_stmt->execute();
        $timeline_result = $timeline_stmt->get_result();
        
        $timeline = [];
        while ($row = $timeline_result->fetch_assoc()) {
            $timeline[] = $row;
        }
        $timeline_stmt->close();
        
        echo json_encode([
            'success' => true,
            'tenant' => $tenant,
            'stats' => $stats,
            'timeline' => $timeline
        ]);
        
    } elseif ($action === 'timeline') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $offset = ($page - 1) * $limit;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // Get total count
        $count_stmt = $conn->prepare("SELECT COUNT(*) as total FROM activity_logs WHERE tenant_id = ?");
        $count_stmt->bind_param("i", $tenant_id);
        $count_stmt->execute();
        $count_result = $count_stmt->get_result();
        $total = $count_result->fetch_assoc()['total'];
        $count_stmt->close();
        
        // Get paginated timeline
        $timeline_stmt = $conn->prepare("
            SELECT 
                al.id, al.action, al.entity_type, al.entity_id, 
                al.user_id, al.details, al.ip_address, al.created_at,
                u.username
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = ?
            ORDER BY al.created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $timeline_stmt->bind_param("iii", $tenant_id, $limit, $offset);
        $timeline_stmt->execute();
        $timeline_result = $timeline_stmt->get_result();
        
        $timeline = [];
        while ($row = $timeline_result->fetch_assoc()) {
            $timeline[] = $row;
        }
        $timeline_stmt->close();
        
        echo json_encode([
            'success' => true,
            'timeline' => $timeline,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
