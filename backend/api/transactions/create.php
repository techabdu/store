<?php
/**
 * Transaction Create API
 * POST endpoint to create new transactions (sales and swaps)
 * Accessible by: User, Admin, SuperAdmin
 */

header('Content-Type: application/json');
// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/activity_log.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Check authentication
checkAuth();

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['customer_name']) || trim($input['customer_name']) === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Customer name is required']);
    exit;
}

if (!isset($input['items']) || !is_array($input['items']) || empty($input['items'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'At least one item is required']);
    exit;
}

if (!isset($input['payment_method']) || !in_array($input['payment_method'], ['cash', 'card', 'transfer', 'mixed'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid payment method']);
    exit;
}

// Extract input
$customerName = trim($input['customer_name']);
$customerPhone = isset($input['customer_phone']) ? trim($input['customer_phone']) : null;
$customerAddress = isset($input['customer_address']) ? trim($input['customer_address']) : null;
$paymentMethod = $input['payment_method'];
$items = $input['items'];
$userId = $_SESSION['user_id'];

// Start transaction
$conn->begin_transaction();

try {
    $totalAmount = 0;
    $saleItems = [];
    $tradeInItems = [];
    
    // Validate and categorize items
    foreach ($items as $item) {
        if (!isset($item['type']) || !in_array($item['type'], ['sale', 'trade_in'])) {
            throw new Exception("Invalid item type");
        }
        
        if ($item['type'] === 'sale') {
            // For sales, inventory_id must exist and be in_stock
            if (!isset($item['inventory_id']) || !is_numeric($item['inventory_id'])) {
                throw new Exception("Invalid inventory ID for sale item");
            }
            
            $inventoryId = intval($item['inventory_id']);
            
            // Check if item exists and is in stock
            $checkStmt = $conn->prepare("SELECT * FROM inventory WHERE id = ? AND status = 'in_stock'");
            $checkStmt->bind_param("i", $inventoryId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows === 0) {
                throw new Exception("Inventory item $inventoryId not found or not in stock");
            }
            
            $inventoryItem = $result->fetch_assoc();
            $checkStmt->close();
            
            $saleItems[] = [
                'inventory_id' => $inventoryId,
                'price' => $inventoryItem['price']
            ];
            
            $totalAmount += $inventoryItem['price'];
            
        } else if ($item['type'] === 'trade_in') {
            // For trade-ins, we need to create a new inventory item first
            if (!isset($item['brand']) || !isset($item['model']) || !isset($item['imei']) || !isset($item['trade_in_value'])) {
                throw new Exception("Missing required fields for trade-in item");
            }
            
            $brand = trim($item['brand']);
            $model = trim($item['model']);
            $imei = trim($item['imei']);
            $color = isset($item['color']) ? trim($item['color']) : '';
            $storage = isset($item['storage']) ? trim($item['storage']) : '';
            $tradeInValue = floatval($item['trade_in_value']);
            
            // Validate IMEI format
            if (!preg_match('/^[0-9]{15}$/', $imei)) {
                throw new Exception("Invalid IMEI format for trade-in: $imei");
            }
            
            // Check if IMEI already exists
            $checkImeiStmt = $conn->prepare("SELECT id FROM inventory WHERE imei = ?");
            $checkImeiStmt->bind_param("s", $imei);
            $checkImeiStmt->execute();
            $imeiResult = $checkImeiStmt->get_result();
            
            if ($imeiResult->num_rows > 0) {
                throw new Exception("Trade-in IMEI already exists: $imei");
            }
            $checkImeiStmt->close();
            
            // Insert trade-in item into inventory
            $insertInventoryStmt = $conn->prepare(
                "INSERT INTO inventory (brand, model, imei, color, storage, condition_status, price, cost_price, status, created_by, tenant_id) 
                 VALUES (?, ?, ?, ?, ?, 'used', ?, 0, 'in_stock', ?, ?)"
            );
            
            $insertInventoryStmt->bind_param(
                "sssssdii",
                $brand,
                $model,
                $imei,
                $color,
                $storage,
                $tradeInValue,
                $userId,
                $_SESSION['tenant_id']
            );
            
            if (!$insertInventoryStmt->execute()) {
                throw new Exception("Failed to add trade-in item to inventory");
            }
            
            $tradeInInventoryId = $conn->insert_id;
            $insertInventoryStmt->close();
            
            $tradeInItems[] = [
                'inventory_id' => $tradeInInventoryId,
                'price' => -$tradeInValue // Negative because it's a credit
            ];
            
            $totalAmount -= $tradeInValue;
        }
    }
    
    // Ensure total amount is not negative
    if ($totalAmount < 0) {
        throw new Exception("Total amount cannot be negative");
    }
    
    // Insert transaction
    $transactionStmt = $conn->prepare(
        "INSERT INTO transactions (user_id, customer_name, customer_phone, customer_address, total_amount, payment_method, tenant_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    
    $transactionStmt->bind_param(
        "isssdsi",
        $userId,
        $customerName,
        $customerPhone,
        $customerAddress,
        $totalAmount,
        $paymentMethod,
        $_SESSION['tenant_id']
    );
    
    if (!$transactionStmt->execute()) {
        throw new Exception("Failed to create transaction");
    }
    
    $transactionId = $conn->insert_id;
    $transactionStmt->close();
    
    // Insert transaction items and update inventory status for sales
    $itemStmt = $conn->prepare(
            "INSERT INTO transaction_items (transaction_id, inventory_id, price, type, tenant_id) VALUES (?, ?, ?, ?, ?)"
    );
    
    // Process sale items
    foreach ($saleItems as $saleItem) {
        $type = 'sale';
        $itemStmt->bind_param(
            "iidsi",
            $transactionId,
            $saleItem['inventory_id'],
            $saleItem['price'],
            $type,
            $_SESSION['tenant_id']
        );
        
        if (!$itemStmt->execute()) {
            throw new Exception("Failed to add sale item to transaction");
        }
        
        // Update inventory status to sold
        $updateStmt = $conn->prepare("UPDATE inventory SET status = 'sold' WHERE id = ?");
        $updateStmt->bind_param("i", $saleItem['inventory_id']);
        $updateStmt->execute();
        $updateStmt->close();
    }
    
    // Process trade-in items
    foreach ($tradeInItems as $tradeInItem) {
        $type = 'trade_in';
        $itemStmt->bind_param(
            "iidsi",
            $transactionId,
            $tradeInItem['inventory_id'],
            $tradeInItem['price'],
            $type,
            $_SESSION['tenant_id']
        );
        
        if (!$itemStmt->execute()) {
            throw new Exception("Failed to add trade-in item to transaction");
        }
    }
    
    $itemStmt->close();
    
    // Log activity
    logActivity(
        $userId,
        'transaction_create',
        json_encode([
            'transaction_id' => $transactionId,
            'customer_name' => $customerName,
            'total_amount' => $totalAmount,
            'sale_items' => count($saleItems),
            'trade_in_items' => count($tradeInItems)
        ])
    );
    
    // Commit transaction
    $conn->commit();
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Transaction created successfully',
        'transaction_id' => $transactionId,
        'total_amount' => $totalAmount
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    error_log("Transaction create error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
