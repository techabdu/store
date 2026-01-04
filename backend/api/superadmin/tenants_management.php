<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php'; // Should contain setCorsHeaders()
require_once __DIR__ . '/../../helpers/EventLogger.php';
require_once __DIR__ . '/../../middleware/api_logger.php';

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/role.php';

// Set CORS headers
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

$db = new Database();
$conn = $db->connect();

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'list':
            handleList($conn);
            break;
        case 'detail':
            handleDetail($conn);
            break;
        case 'update_status':
            handleUpdateStatus($conn);
            break;
        case 'update_plan':
            handleUpdatePlan($conn);
            break;
        case 'impersonate':
            handleImpersonate($conn);
            break;
        default:
            throw new Exception("Invalid action specified");
    }
} catch (Exception $e) {
    EventLogger::logError('error', $e->getMessage(), ['action' => $action]);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// -----------------------------------------------------------------------------
// Action Handlers
// -----------------------------------------------------------------------------

function handleList($conn) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $perContext = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 50;
    $offset = ($page - 1) * $perContext;
    
    $status = $_GET['status'] ?? '';
    $plan = $_GET['plan'] ?? '';
    $search = $_GET['search'] ?? '';
    
    // Build Query
    $whereClauses = ["1=1"];
    $params = [];
    $types = "";
    
    if (!empty($status)) {
        $whereClauses[] = "t.status = ?";
        $params[] = $status;
        $types .= "s";
    }
    
    if (!empty($plan)) {
        if ($plan === 'trial') {
             $whereClauses[] = "t.subscription_plan = 'trial'"; 
        } else {
             $whereClauses[] = "t.subscription_plan = ?";
             $params[] = $plan;
             $types .= "s";
        }
    }
    
    if (!empty($search)) {
        $whereClauses[] = "(t.shop_name LIKE ? OR t.shop_email LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= "ss";
    }
    
    $whereSql = implode(" AND ", $whereClauses);
    
    // Count total
    $countSql = "SELECT COUNT(*) as total FROM tenants t WHERE $whereSql";
    $stmt = $conn->prepare($countSql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $totalResult = $stmt->get_result()->fetch_assoc();
    $total = $totalResult['total'];
    $totalPages = ceil($total / $perContext);
    
    // Select Data
    $sql = "SELECT t.*, 
            (SELECT COUNT(*) FROM shops s WHERE s.tenant_id = t.id) as shop_count,
            (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count
            FROM tenants t 
            WHERE $whereSql 
            ORDER BY t.created_at DESC 
            LIMIT ? OFFSET ?";
            
    $params[] = $perContext;
    $params[] = $offset;
    $types .= "ii";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tenants = [];
    while ($row = $result->fetch_assoc()) {
        $tenants[] = $row;
    }
    
    // Stats
    $statsSql = "SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN subscription_plan = 'trial' THEN 1 ELSE 0 END) as trial,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
        FROM tenants";
    $statsResult = $conn->query($statsSql)->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'data' => [
            'tenants' => $tenants,
            'pagination' => [
                'page' => $page,
                'total' => $total,
                'per_page' => $perContext,
                'total_pages' => $totalPages
            ],
            'stats' => $statsResult
        ]
    ]);
}

function handleDetail($conn) {
    if (!isset($_GET['id'])) throw new Exception("ID required");
    $id = (int)$_GET['id'];
    
    // 1. Tenant Info
    $stmt = $conn->prepare("SELECT * FROM tenants WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $tenant = $stmt->get_result()->fetch_assoc();
    
    if (!$tenant) {
        http_response_code(404);
        throw new Exception("Tenant not found");
    }
    
    // 2. Subscription History
    $histStmt = $conn->prepare("SELECT * FROM subscription_history WHERE tenant_id = ? ORDER BY changed_at DESC LIMIT 10");
    $histStmt->bind_param("i", $id);
    $histStmt->execute();
    $history = $histStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // 3. Health Score
    $scoreStmt = $conn->prepare("SELECT * FROM retailer_health_scores WHERE tenant_id = ? ORDER BY calculated_at DESC LIMIT 1");
    $scoreStmt->bind_param("i", $id);
    $scoreStmt->execute();
    $health = $scoreStmt->get_result()->fetch_assoc();
    
    // 4. Feature Usage (Last 5 actions)
    $usageStmt = $conn->prepare("SELECT * FROM feature_usage WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5");
    $usageStmt->bind_param("i", $id);
    $usageStmt->execute();
    $usage = $usageStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'tenant' => $tenant,
            'subscription_history' => $history,
            'health_score' => $health,
            'recent_activity' => $usage
        ]
    ]);
}

function handleUpdateStatus($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') throw new Exception("Method not allowed");
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id = $input['id'] ?? null;
    $status = $input['status'] ?? null; // active, suspended
    
    if (!$id || !$status) throw new Exception("ID and status required");
    
    // Validate status
    if (!in_array($status, ['active', 'suspended', 'pending', 'trial'])) {
        throw new Exception("Invalid status");
    }
    
    $stmt = $conn->prepare("UPDATE tenants SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $id);
    $stmt->execute();
    
    // Log
    EventLogger::logActivity('tenant_status_update', $_SESSION['user_id'], $id, ['new_status' => $status]);
    
    echo json_encode(['success' => true]);
}

function handleUpdatePlan($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') throw new Exception("Method not allowed");
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id = $input['id'] ?? null;
    $plan = $input['plan'] ?? null;
    $mrr = $input['mrr'] ?? 0.00;
    
    if (!$id || !$plan) throw new Exception("ID and plan required");
    
    // Get current plan
    $currStmt = $conn->prepare("SELECT subscription_plan, mrr FROM tenants WHERE id = ?");
    $currStmt->bind_param("i", $id);
    $currStmt->execute();
    $current = $currStmt->get_result()->fetch_assoc();
    
    if (!$current) throw new Exception("Tenant not found");
    
    // Determine change type
    $changeType = 'upgrade'; // default simplified logic
    if ($current['subscription_plan'] == $plan) {
         // Just price change?
         $changeType = 'reactivation'; // or just update
    }
    
    // Update tenant
    $stmt = $conn->prepare("UPDATE tenants SET subscription_plan = ?, mrr = ? WHERE id = ?");
    $stmt->bind_param("sdi", $plan, $mrr, $id);
    $stmt->execute();
    
    // Log history
    $histStmt = $conn->prepare("INSERT INTO subscription_history (tenant_id, from_plan, to_plan, from_mrr, to_mrr, change_type) VALUES (?, ?, ?, ?, ?, ?)");
    $histStmt->bind_param("issdds", $id, $current['subscription_plan'], $plan, $current['mrr'], $mrr, $changeType);
    $histStmt->execute();
    
    EventLogger::logActivity('tenant_plan_update', $_SESSION['user_id'], $id, ['plan' => $plan, 'mrr' => $mrr]);
    
    echo json_encode(['success' => true]);
}

function handleImpersonate($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Method not allowed");
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    
    if (!$id) throw new Exception("ID required");
    
    // Find an admin user for this tenant
    $stmt = $conn->prepare("SELECT * FROM users WHERE tenant_id = ? AND role = 'admin' LIMIT 1");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $targetUser = $stmt->get_result()->fetch_assoc();
    
    if (!$targetUser) throw new Exception("No admin user found for this tenant to impersonate");
    
    // Store current session
    $_SESSION['original_admin'] = [
        'user_id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'role' => $_SESSION['role'],
        'tenant_id' => $_SESSION['tenant_id'],
        'shop_id' => $_SESSION['user_shop_id'] // note key diff in login.php
    ];
    
    // Switch Identity
    $_SESSION['user_id'] = $targetUser['id'];
    $_SESSION['username'] = $targetUser['username'];
    $_SESSION['role'] = $targetUser['role'];
    $_SESSION['tenant_id'] = $targetUser['tenant_id'];
    $_SESSION['user_shop_id'] = $targetUser['shop_id'];
    $_SESSION['is_impersonating'] = true;
    
    EventLogger::logActivity('impersonation_start', $_SESSION['original_admin']['user_id'], $id, ['target_user' => $targetUser['username']]);
    
    echo json_encode(['success' => true, 'redirect' => '/admin/dashboard']);
}
