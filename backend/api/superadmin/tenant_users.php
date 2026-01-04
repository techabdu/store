<?php
/**
 * Tenant Users API (SuperAdmin Only)
 * 
 * Purpose: Manage and view users within a specific tenant
 * Method: GET (list, activity_logs, login_analytics), POST (suspend, activate)
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=list: Get all users for a tenant
 * - action=activity_logs: Get filtered activity logs for tenant users
 * - action=login_analytics: Get login statistics
 * - action=suspend_user: Suspend a specific user (POST)
 * - action=activate_user: Activate a suspended user (POST)
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
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

if ($method === 'GET') {
    if ($action === 'list') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $role = isset($_GET['role']) ? trim($_GET['role']) : '';
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // Build query
        $where = "WHERE u.tenant_id = ?";
        $params = [$tenant_id];
        $types = "i";
        
        if (!empty($search)) {
            $where .= " AND (u.username LIKE ? OR u.email LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $types .= "ss";
        }
        
        if (!empty($role) && $role !== 'all') {
            $where .= " AND u.role = ?";
            $params[] = $role;
            $types .= "s";
        }
        
        // Count total for pagination
        $count_stmt = $conn->prepare("SELECT COUNT(*) as total FROM users u $where");
        $count_stmt->bind_param($types, ...$params);
        $count_stmt->execute();
        $total_count = $count_stmt->get_result()->fetch_assoc()['total'];
        $count_stmt->close();
        
        // Get paginated users
        $query = "
            SELECT 
                u.id, u.username, u.email, u.role, u.status,
                u.shop_id, u.created_at, u.updated_at,
                s.shop_name,
                (SELECT MAX(created_at) FROM activity_logs WHERE user_id = u.id) as last_activity
            FROM users u
            LEFT JOIN shops s ON u.shop_id = s.id
            $where
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;
        $types .= "ii";
        
        $users_stmt = $conn->prepare($query);
        if (!$users_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
            exit;
        }
        
        $users_stmt->bind_param($types, ...$params);
        $users_stmt->execute();
        $users_result = $users_stmt->get_result();
        
        $users = [];
        while ($row = $users_result->fetch_assoc()) {
            $users[] = $row;
        }
        $users_stmt->close();
        
        // Role breakdown stats (global for this tenant)
        $role_stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin,
                SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as suspended
            FROM users 
            WHERE tenant_id = ?
        ");
        $role_stmt->bind_param("i", $tenant_id);
        $role_stmt->execute();
        $role_breakdown = $role_stmt->get_result()->fetch_assoc();
        $role_stmt->close();
        
        echo json_encode([
            'success' => true,
            'users' => $users,
            'breakdown' => $role_breakdown,
            'pagination' => [
                'total' => (int)$total_count,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total_count / $limit)
            ]
        ]);
        
    } elseif ($action === 'activity_logs') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        $action_filter = isset($_GET['action_filter']) ? $_GET['action_filter'] : '';
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $offset = ($page - 1) * $limit;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // Build query
        $query = "
            SELECT 
                al.id, al.action, al.entity_type, al.entity_id,
                al.user_id, al.details, al.ip_address, al.created_at,
                u.username, u.role
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = ?
        ";
        
        $params = [$tenant_id];
        $types = "i";
        
        if ($user_id > 0) {
            $query .= " AND al.user_id = ?";
            $params[] = $user_id;
            $types .= "i";
        }
        
        if (!empty($action_filter)) {
            $query .= " AND al.action LIKE ?";
            $params[] = "%$action_filter%";
            $types .= "s";
        }
        
        $query .= " ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        $types .= "ii";
        
        $logs_stmt = $conn->prepare($query);
        if (!$logs_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
            exit;
        }
        
        $logs_stmt->bind_param($types, ...$params);
        $logs_stmt->execute();
        $logs_result = $logs_stmt->get_result();
        
        $logs = [];
        while ($row = $logs_result->fetch_assoc()) {
            $logs[] = $row;
        }
        $logs_stmt->close();
        
        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'pagination' => [
                'page' => $page,
                'limit' => $limit
            ]
        ]);
        
    } elseif ($action === 'login_analytics') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // Get login frequency (last 30 days)
        $login_freq_stmt = $conn->prepare("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as login_count
            FROM activity_logs
            WHERE tenant_id = ? 
            AND action = 'user_login'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        $login_freq_stmt->bind_param("i", $tenant_id);
        $login_freq_stmt->execute();
        $login_freq_result = $login_freq_stmt->get_result();
        
        $login_frequency = [];
        while ($row = $login_freq_result->fetch_assoc()) {
            $login_frequency[] = $row;
        }
        $login_freq_stmt->close();
        
        // Failed login attempts
        $failed_logins_stmt = $conn->prepare("
            SELECT COUNT(*) as failed_count
            FROM activity_logs
            WHERE tenant_id = ? 
            AND action = 'login_failed'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $failed_logins_stmt->bind_param("i", $tenant_id);
        $failed_logins_stmt->execute();
        $failed_result = $failed_logins_stmt->get_result();
        $failed_count = $failed_result->fetch_assoc()['failed_count'];
        $failed_logins_stmt->close();
        
        // Most active users
        $active_users_stmt = $conn->prepare("
            SELECT 
                u.id, u.username, u.role,
                COUNT(al.id) as activity_count
            FROM users u
            LEFT JOIN activity_logs al ON u.id = al.user_id
            WHERE u.tenant_id = ?
            AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY u.id
            ORDER BY activity_count DESC
            LIMIT 10
        ");
        $active_users_stmt->bind_param("i", $tenant_id);
        $active_users_stmt->execute();
        $active_users_result = $active_users_stmt->get_result();
        
        $most_active_users = [];
        while ($row = $active_users_result->fetch_assoc()) {
            $most_active_users[] = $row;
        }
        $active_users_stmt->close();
        
        echo json_encode([
            'success' => true,
            'login_frequency' => $login_frequency,
            'failed_logins' => $failed_count,
            'most_active_users' => $most_active_users
        ]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'suspend_user') {
        $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
        $reason = isset($data['reason']) ? trim($data['reason']) : '';
        
        if ($user_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid user_id is required']);
            exit;
        }
        
        // Verify user is not a superadmin
        $check_stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
        $check_stmt->bind_param("i", $user_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }
        
        $user_role = $check_result->fetch_assoc()['role'];
        if ($user_role === 'superadmin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Cannot suspend SuperAdmin users']);
            exit;
        }
        $check_stmt->close();
        
        // Suspend user
        $suspend_stmt = $conn->prepare("UPDATE users SET status = 'inactive' WHERE id = ?");
        $suspend_stmt->bind_param("i", $user_id);
        
        if ($suspend_stmt->execute()) {
            // Log the action
            $log_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                SELECT tenant_id, ?, 'user_suspended', 'user', ?, ?
                FROM users WHERE id = ? LIMIT 1
            ");
            $log_stmt->bind_param("iisi", $_SESSION['user_id'], $user_id, $reason, $user_id);
            $log_stmt->execute();
            $log_stmt->close();
            
            echo json_encode(['success' => true, 'message' => 'User suspended successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to suspend user']);
        }
        $suspend_stmt->close();
        
    } elseif ($action === 'activate_user') {
        $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
        
        if ($user_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid user_id is required']);
            exit;
        }
        
        // Activate user
        $activate_stmt = $conn->prepare("UPDATE users SET status = 'active' WHERE id = ?");
        $activate_stmt->bind_param("i", $user_id);
        
        if ($activate_stmt->execute()) {
            // Log the action
            $log_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id)
                SELECT tenant_id, ?, 'user_activated', 'user', ?
                FROM users WHERE id = ? LIMIT 1
            ");
            $log_stmt->bind_param("iii", $_SESSION['user_id'], $user_id, $user_id);
            $log_stmt->execute();
            $log_stmt->close();
            
            echo json_encode(['success' => true, 'message' => 'User activated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to activate user']);
        }
        $activate_stmt->close();
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
