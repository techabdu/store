<?php
/**
 * Shop Switch API
 * POST endpoint to switch current shop context for owners
 * Accessible by: Admin (owner only)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';
require_once '../../helpers/activity_log.php';
require_once '../../helpers/csrf.php';

// Set CORS headers
setCorsHeaders();
header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
$user = checkAuth();

// Check role - only admins can switch shops (and must be owners)
checkRole(['admin']);

// Verify CSRF
requireCsrf();

// Verify user is an owner (can access multiple shops)
if (!isOwner()) {
    http_response_code(403);
    echo json_encode([
        'success' => false, 
        'error' => 'Only business owners can switch between branches. You are assigned to a specific branch.'
    ]);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Shop ID is required
if (!isset($input['shop_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Shop ID is required']);
    exit;
}

$shopId = intval($input['shop_id']);

// Verify the shop belongs to user's tenant
if (!verifyShopAccess($shopId)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'You do not have access to this branch']);
    exit;
}

// Get shop details
$shop = getShopById($shopId);
if (!$shop) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Branch not found']);
    exit;
}

// Check shop status
if ($shop['status'] !== 'active') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Cannot switch to a suspended branch']);
    exit;
}

try {
    // Update session
    if (setCurrentShop($shopId)) {
        // Log activity
        logActivity(
            $_SESSION['user_id'],
            'shop_switch',
            json_encode([
                'shop_id' => $shopId,
                'shop_name' => $shop['shop_name']
            ])
        );
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Switched to branch: {$shop['shop_name']}",
            'shop' => [
                'id' => (int)$shop['id'],
                'shop_name' => $shop['shop_name'],
                'shop_address' => $shop['shop_address'],
                'shop_phone' => $shop['shop_phone'],
                'shop_email' => $shop['shop_email'],
                'business_capital' => (float)$shop['business_capital'],
                'is_main_branch' => (bool)$shop['is_main_branch']
            ]
        ]);
    } else {
        throw new Exception("Failed to set current shop in session");
    }
    
} catch (Exception $e) {
    error_log("Shop switch error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to switch branch']);
}

$conn->close();
?>
