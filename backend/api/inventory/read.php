<?php
/**
 * Inventory Read API
 * GET endpoint to retrieve inventory items with filtering
 * Accessible by: User, Admin, SuperAdmin
 */

header('Content-Type: application/json');
// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Check authentication
checkAuth();

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

// Get filter parameters
$status = isset($_GET['status']) ? $_GET['status'] : 'in_stock';
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

try {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    // Build query with filters - now filtering by shop_id
    $query = "SELECT 
                i.id,
                i.brand,
                i.model,
                i.imei,
                i.vendor,
                i.color,
                i.storage,
                i.condition_status,
                i.price,
                i.cost_price,
                i.status,
                i.created_at,
                i.updated_at,
                u.username as created_by_username
              FROM inventory i
              LEFT JOIN users u ON i.created_by = u.id
              WHERE i.shop_id = ?"; // Filter by shop_id for branch isolation
    
    $params = [$shopId]; // Add shop_id to parameters
    $types = 'i'; // Type for shop_id
    
    // Filter by status
    if ($status !== 'all') {
        $query .= " AND i.status = ?";
        $params[] = $status;
        $types .= 's';
    }
    
    // Search filter (brand, model, IMEI, vendor, color, or storage)
    if (!empty($search)) {
        $query .= " AND (i.brand LIKE ? OR i.model LIKE ? OR i.imei LIKE ? OR i.vendor LIKE ? OR i.color LIKE ? OR i.storage LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= 'ssssss';
    }
    
    // Order by most recent first
    $query .= " ORDER BY i.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= 'ii';
    
    // Prepare and execute
    $stmt = $conn->prepare($query);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $inventory = [];
    while ($row = $result->fetch_assoc()) {
        $inventory[] = $row;
    }
    
    // Get total count for pagination
    $countQuery = "SELECT COUNT(*) as total FROM inventory i WHERE i.shop_id = ?";
    $countParams = [$shopId];
    $countTypes = 'i';
    
    if ($status !== 'all') {
        $countQuery .= " AND i.status = ?";
        $countParams[] = $status;
        $countTypes .= 's';
    }
    
    if (!empty($search)) {
        $countQuery .= " AND (i.brand LIKE ? OR i.model LIKE ? OR i.imei LIKE ? OR i.vendor LIKE ? OR i.color LIKE ? OR i.storage LIKE ?)";
        $searchParam = "%$search%";
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countTypes .= 'ssssss';
    }
    
    $countStmt = $conn->prepare($countQuery);
    if (!empty($countParams)) {
        $countStmt->bind_param($countTypes, ...$countParams);
    }
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $totalCount = $countResult->fetch_assoc()['total'];
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'inventory' => $inventory,
        'total' => $totalCount,
        'limit' => $limit,
        'offset' => $offset,
        'shop_id' => $shopId
    ]);
    
    $stmt->close();
    $countStmt->close();
    
} catch (Exception $e) {
    error_log("Inventory read error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve inventory']);
}

$conn->close();
