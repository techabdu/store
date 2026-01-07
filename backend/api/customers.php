<?php
require_once '../config/config.php';
require_once '../config/database.php';
require_once '../middleware/api_logger.php'; // API request logging
require_once '../middleware/auth.php';
require_once '../middleware/role.php';
require_once '../helpers/sanitize.php';
require_once '../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Set headers
header("Content-Type: application/json; charset=UTF-8");
// Verify authentication
$user_data = checkAuth();

// Verify admin role (or superadmin)
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Access denied"]);
    exit();
}

// Get current shop context
$shopId = getCurrentShopId();
if ($shopId === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
    exit();
}

// Use the $conn variable from database.php
$db = $conn;

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'get_customers') {
    try {
        // Aggregate customers from transactions for current shop
        // Group by customer_name and customer_phone to get unique customers
        // Calculate total purchases and total spent for each customer
        $query = "SELECT 
                    customer_name, 
                    customer_phone, 
                    customer_address,
                    COUNT(DISTINCT id) as total_purchases,
                    SUM(total_amount) as total_spent,
                    MAX(created_at) as last_purchase_date
                  FROM transactions
                  WHERE shop_id = ? AND customer_name IS NOT NULL AND customer_name != ''
                  GROUP BY customer_name, customer_phone, customer_address
                  ORDER BY last_purchase_date DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bind_param("i", $shopId);
        $stmt->execute();
        $customers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $customers,
            "shop_id" => $shopId
        ]);
    } catch (Exception $e) {
        error_log("Error fetching customers: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "An internal error occurred while fetching customers."
        ]);
    }
} elseif ($action === 'get_customer_details') {
    $name = isset($_GET['name']) ? sanitizeInput($_GET['name']) : '';
    $phone = isset($_GET['phone']) ? sanitizeInput($_GET['phone']) : '';

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Customer name is required"]);
        exit();
    }

    try {
        // Get all transactions for this customer within current shop
        $query = "SELECT 
                    t.id as transaction_id,
                    t.created_at as purchase_date,
                    t.total_amount,
                    ti.price as item_price,
                    i.brand,
                    i.model,
                    i.imei,
                    i.color,
                    i.storage,
                    i.condition_status
                  FROM transactions t
                  JOIN transaction_items ti ON t.id = ti.transaction_id
                  JOIN inventory i ON ti.inventory_id = i.id
                  WHERE t.shop_id = ? AND t.customer_name = ?
                  AND (
                      (? <> '' AND t.customer_phone = ?) 
                      OR 
                      (? = '' AND (t.customer_phone IS NULL OR t.customer_phone = ''))
                  )
                  ORDER BY t.created_at DESC";
        
        $stmt = $db->prepare($query);
        // Bind parameters: shop_id (i), name (s), phone (s), phone (s), phone (s)
        $stmt->bind_param("issss", $shopId, $name, $phone, $phone, $phone);
        
        $stmt->execute();
        $history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $history
        ]);

    } catch (Exception $e) {
        error_log("Error fetching customer details: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "An internal error occurred while fetching customer details."
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid action"]);
}


