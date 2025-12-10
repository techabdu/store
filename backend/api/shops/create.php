<?php
/**
 * Shop Create API
 * POST endpoint to create a new branch shop
 * Accessible by: Admin (owner only), SuperAdmin
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';
require_once '../../helpers/activity_log.php';
require_once '../../helpers/sanitize.php';
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

// Check role - only admins and superadmins can create shops
checkRole(['admin', 'superadmin']);

// Verify CSRF
requireCsrf();

// Only owners can create new branches (not branch managers)
if ($user['role'] === 'admin' && !isOwner()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Only business owners can create new branches']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['shop_name']) || trim($input['shop_name']) === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Shop name is required']);
    exit;
}

// Extract and sanitize input
$shopName = sanitizeInput($input['shop_name']);
$shopAddress = isset($input['shop_address']) ? sanitizeInput($input['shop_address']) : null;
$shopPhone = isset($input['shop_phone']) ? sanitizeInput($input['shop_phone']) : null;
$shopEmail = isset($input['shop_email']) ? sanitizeEmail($input['shop_email']) : null;
$businessCapital = isset($input['business_capital']) ? floatval($input['business_capital']) : 0.00;
$lowStockThreshold = isset($input['low_stock_threshold']) ? intval($input['low_stock_threshold']) : 5;

// Determine tenant_id
$tenantId = $_SESSION['tenant_id'];

// SuperAdmin can specify tenant_id
if ($user['role'] === 'superadmin' && isset($input['tenant_id'])) {
    $tenantId = intval($input['tenant_id']);
    
    // Verify tenant exists
    $checkTenant = $conn->prepare("SELECT id FROM tenants WHERE id = ?");
    $checkTenant->bind_param("i", $tenantId);
    $checkTenant->execute();
    if ($checkTenant->get_result()->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Tenant not found']);
        $checkTenant->close();
        exit;
    }
    $checkTenant->close();
}

try {
    // Check if shop name already exists for this tenant
    $checkName = $conn->prepare("SELECT id FROM shops WHERE shop_name = ? AND tenant_id = ?");
    $checkName->bind_param("si", $shopName, $tenantId);
    $checkName->execute();
    if ($checkName->get_result()->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'A branch with this name already exists']);
        $checkName->close();
        exit;
    }
    $checkName->close();
    
    // Check if this is the first shop (should be marked as main branch)
    $checkFirst = $conn->prepare("SELECT COUNT(*) as count FROM shops WHERE tenant_id = ?");
    $checkFirst->bind_param("i", $tenantId);
    $checkFirst->execute();
    $firstResult = $checkFirst->get_result()->fetch_assoc();
    $isMainBranch = ($firstResult['count'] == 0) ? 1 : 0;
    $checkFirst->close();
    
    // Insert new shop
    $stmt = $conn->prepare("
        INSERT INTO shops (tenant_id, shop_name, shop_address, shop_phone, shop_email, business_capital, low_stock_threshold, status, is_main_branch)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    ");
    $stmt->bind_param(
        "issssdii",
        $tenantId,
        $shopName,
        $shopAddress,
        $shopPhone,
        $shopEmail,
        $businessCapital,
        $lowStockThreshold,
        $isMainBranch
    );
    
    if ($stmt->execute()) {
        $shopId = $conn->insert_id;
        $stmt->close();
        
        // Log activity
        logActivity(
            $_SESSION['user_id'],
            'shop_create',
            json_encode([
                'shop_id' => $shopId,
                'shop_name' => $shopName
            ])
        );
        
        // Return the created shop
        $newShop = getShopById($shopId);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Branch created successfully',
            'shop' => $newShop
        ]);
    } else {
        throw new Exception("Failed to insert shop: " . $stmt->error);
    }
    
} catch (Exception $e) {
    error_log("Shop create error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to create branch']);
}

$conn->close();
?>
