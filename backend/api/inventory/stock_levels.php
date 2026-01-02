<?php
/**
 * Stock Levels API
 * GET endpoint to retrieve stock count aggregated by brand and model
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

try {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    // Aggregation query
    $query = "SELECT 
                brand, 
                model, 
                COUNT(*) as quantity 
              FROM inventory 
              WHERE shop_id = ? AND status = 'in_stock' 
              GROUP BY brand, model 
              ORDER BY brand, model";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $result = $stmt->get_result();

    $stock_levels = [];
    while ($row = $result->fetch_assoc()) {
        $stock_levels[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'stock_levels' => $stock_levels,
        'shop_id' => $shopId
    ]);
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log("Stock levels error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve stock levels']);
}

$conn->close();
