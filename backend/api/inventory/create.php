<?php
/**
 * Inventory Create API
 * POST endpoint to add new inventory items
 * Accessible by: User, Admin, SuperAdmin
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/activity_log.php';

// Check authentication
checkAuth();

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
$brand = trim($input['brand']);
$model = trim($input['model']);
$imei = trim($input['imei']);
$color = isset($input['color']) ? trim($input['color']) : '';
$storage = isset($input['storage']) ? trim($input['storage']) : '';
$condition = isset($input['condition_status']) ? $input['condition_status'] : 'new';
$price = floatval($input['price']);
$costPrice = floatval($input['cost_price']);
$status = isset($input['status']) ? $input['status'] : 'in_stock';
$createdBy = $_SESSION['user_id'];

// Validate IMEI format (basic validation - 15 digits)
if (!preg_match('/^[0-9]{15}$/', $imei)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid IMEI format. Must be 15 digits.']);
    exit;
}

// Validate price values
if ($price <= 0 || $costPrice <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Price and cost price must be greater than 0']);
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
    // Check if IMEI already exists
    $checkStmt = $conn->prepare("SELECT id FROM inventory WHERE imei = ?");
    $checkStmt->bind_param("s", $imei);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'IMEI already exists in inventory']);
        $checkStmt->close();
        exit;
    }
    $checkStmt->close();
    
    // Insert new inventory item with tenant_id
    $stmt = $conn->prepare(
        "INSERT INTO inventory (brand, model, imei, color, storage, condition_status, price, cost_price, status, tenant_id, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    $stmt->bind_param(
        "ssssssddsii",
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
    error_log("Inventory create error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to add inventory item']);
}

$conn->close();
