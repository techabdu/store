<?php
/**
 * Inventory Create API
 * POST endpoint to add new inventory items
 * Accessible by: User, Admin, SuperAdmin
 */

require_once '../../config/database.php';
require_once '../../config/config.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/activity_log.php';
require_once '../../helpers/validate.php';
require_once '../../helpers/sanitize.php';
require_once '../../helpers/csrf.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers using centralized config (Handles OPTIONS preflight)
setCorsHeaders();

header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
checkAuth();

// Verify CSRF
requireCsrf();

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$requiredFields = ['brand', 'model', 'imei', 'price', 'cost_price'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || trim($input[$field]) === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
        exit;
    }
}

// Extract and sanitize input
$brand = sanitizeInput($input['brand']);
$model = sanitizeInput($input['model']);
$imei = sanitizeInput($input['imei']);
$color = isset($input['color']) ? sanitizeInput($input['color']) : '';
$storage = isset($input['storage']) ? sanitizeInput($input['storage']) : '';
$condition = isset($input['condition_status']) ? $input['condition_status'] : 'new';
$price = floatval($input['price']);
$costPrice = floatval($input['cost_price']);
$status = isset($input['status']) ? $input['status'] : 'in_stock';
$createdBy = $_SESSION['user_id'];

// Validate IMEI format
if (!validateIMEI($imei)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid IMEI format. Must be 15 digits.']);
    exit;
}

// Validate price values
if (!validatePositiveNumber($price) || !validatePositiveNumber($costPrice)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Price and cost price must be positive numbers']);
    exit;
}

// Validate condition
if (!in_array($condition, ['new', 'used'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid condition. Must be "new" or "used"']);
    exit;
}

// Validate status
if (!in_array($status, ['in_stock', 'sold', 'returned'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid status']);
    exit;
}

try {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    // Check if IMEI already exists within current shop (branch level)
    $checkStmt = $conn->prepare("SELECT id FROM inventory WHERE imei = ? AND shop_id = ?");
    $checkStmt->bind_param("si", $imei, $shopId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'IMEI already exists in this branch inventory']);
        $checkStmt->close();
        exit;
    }
    $checkStmt->close();
    
    // Insert new inventory item with tenant_id and shop_id
    $stmt = $conn->prepare(
        "INSERT INTO inventory (brand, model, imei, color, storage, condition_status, price, cost_price, status, tenant_id, shop_id, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    $stmt->bind_param(
        "ssssssddsiii",
        $brand,
        $model,
        $imei,
        $color,
        $storage,
        $condition,
        $price,
        $costPrice,
        $status,
        $_SESSION['tenant_id'],
        $shopId,
        $createdBy
    );
    
    if ($stmt->execute()) {
        $inventoryId = $conn->insert_id;
        
        // Log activity
        logActivity(
            $_SESSION['user_id'],
            'inventory_create',
            "Added new inventory: $brand $model (IMEI: $imei)"
        );
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Inventory item added successfully',
            'inventory_id' => $inventoryId
        ]);
    } else {
        throw new Exception("Failed to insert inventory item");
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    debugLog("EXCEPTION: " . $e->getMessage());
    error_log("Inventory create error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to add inventory item: ' . $e->getMessage()]);
}

$conn->close();
