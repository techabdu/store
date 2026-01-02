<?php
/**
 * Transaction Create API
 * POST endpoint to create new transactions (sales and swaps)
 * Accessible by: User, Admin, SuperAdmin
 */

header('Content-Type: application/json');

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/activity_log.php';
require_once '../../helpers/shop_helper.php';
require_once '../../helpers/customer_analytics.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Handle OPTIONS request for CORS preflight
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
    // Get current shop context
    $shopId = requireShopContext();
    
    $totalAmount = 0;
    $saleItems = [];
    $tradeInItems = [];
    
    // Validate and categorize items
    foreach ($items as $item) {
        if (!isset($item['type']) || !in_array($item['type'], ['sale', 'trade_in', 'manual'])) {
            throw new Exception("Invalid item type");
        }
        
        if ($item['type'] === 'sale') {
            // For sales, inventory_id must exist and be in_stock
            if (!isset($item['inventory_id']) || !is_numeric($item['inventory_id'])) {
                throw new Exception("Invalid inventory ID for sale item");
            }
            
            $inventoryId = intval($item['inventory_id']);
            
            // Check if item exists, is in stock, and belongs to current shop
            $checkStmt = $conn->prepare("SELECT * FROM inventory WHERE id = ? AND status = 'in_stock' AND shop_id = ?");
            $checkStmt->bind_param("ii", $inventoryId, $shopId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows === 0) {
                throw new Exception("Inventory item $inventoryId not found or not in stock in this branch");
            }
            
            $inventoryItem = $result->fetch_assoc();
            $checkStmt->close();

            // NEW: Prevent selling items already listed on marketplace
            if ($inventoryItem['is_listed']) {
                throw new Exception("Item '{$inventoryItem['brand']} {$inventoryItem['model']}' ({$inventoryItem['imei']}) is currently listed on the Marketplace. Please remove the listing before selling in-store.");
            }
            
            // Use custom price if provided, otherwise use inventory price
            $salePrice = isset($item['customPrice']) && is_numeric($item['customPrice']) 
                ? floatval($item['customPrice']) 
                : floatval($inventoryItem['price']);
            
            // Validate that custom price is positive
            if ($salePrice <= 0) {
                throw new Exception("Sale price must be greater than zero");
            }
            
            // Store cost price for later COGS calculation
            $saleItems[] = [
                'inventory_id' => $inventoryId,
                'price' => $salePrice,
                'cost_price' => floatval($inventoryItem['cost_price'])
            ];
            
            $totalAmount += $salePrice;
            
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
            
            // Check if IMEI already exists within current shop AND is currently available (in_stock or returned)
            // We allow trading in devices that were previously sold (status='sold')
            $checkImeiStmt = $conn->prepare("SELECT id FROM inventory WHERE imei = ? AND shop_id = ? AND status IN ('in_stock', 'returned')");
            $checkImeiStmt->bind_param("si", $imei, $shopId);
            $checkImeiStmt->execute();
            $imeiResult = $checkImeiStmt->get_result();
            
            if ($imeiResult->num_rows > 0) {
                throw new Exception("Trade-in IMEI already exists in this branch: $imei");
            }
            $checkImeiStmt->close();
            
            // Insert trade-in item into inventory with shop_id
            // FIX: Set cost_price to tradeInValue
            $insertInventoryStmt = $conn->prepare(
                "INSERT INTO inventory (brand, model, imei, color, storage, condition_status, price, cost_price, status, created_by, tenant_id, shop_id) 
                 VALUES (?, ?, ?, ?, ?, 'used', ?, ?, 'in_stock', ?, ?, ?)"
            );
            
            $insertInventoryStmt->bind_param(
                "sssssddiii",
                $brand,
                $model,
                $imei,
                $color,
                $storage,
                $tradeInValue,
                $tradeInValue, // cost_price = tradeInValue
                $userId,
                requireTenantContext(),
                $shopId
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
        } else if ($item['type'] === 'manual') {
            // Manual items don't need inventory check
            $price = isset($item['price']) ? floatval($item['price']) : 0;
            $description = isset($item['description']) ? trim($item['description']) : 'Manual entry';
            
            if ($price <= 0) {
                // throw new Exception("Manual entry price must be positive"); 
                // Actually for manual debt, maybe they want to log 0 paid? No, this is the total amount part.
            }

            $manualItems[] = [
                'price' => $price,
                'description' => $description
            ];
            $totalAmount += $price;
        }
    }
    
    // Initialize manualItems if not set
    if (!isset($manualItems)) $manualItems = [];
    
    // NEW: Calculate COGS and Gross Profit for accounting
    $totalCOGS = 0;
    $totalGrossRevenue = 0;
    
    foreach ($saleItems as $saleItem) {
        $totalCOGS += $saleItem['cost_price'];
        $totalGrossRevenue += $saleItem['price'];
    }
    
    foreach ($manualItems as $manualItem) {
        $totalGrossRevenue += $manualItem['price'];
    }
    
    $grossProfit = $totalGrossRevenue - $totalCOGS;
    
    // Insert transaction with shop_id, including COGS and Profit
    $transactionStmt = $conn->prepare(
        "INSERT INTO transactions (user_id, customer_name, customer_phone, customer_address, total_amount, total_cogs, gross_profit, payment_method, tenant_id, shop_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    $transactionStmt->bind_param(
        "isssdddssi",
        $userId,
        $customerName,
        $customerPhone,
        $customerAddress,
        $totalAmount,
        $totalCOGS,
        $grossProfit,
        $paymentMethod,
        requireTenantContext(),
        $shopId
    );
    
    if (!$transactionStmt->execute()) {
        throw new Exception("Failed to create transaction");
    }
    
    $transactionId = $conn->insert_id;
    $transactionStmt->close();
    
    // Insert transaction items and update inventory status for sales
    $itemStmt = $conn->prepare(
            "INSERT INTO transaction_items (transaction_id, inventory_id, price, type, description, tenant_id, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    
    // Process sale items
    foreach ($saleItems as $saleItem) {
        $type = 'sale';
        $desc = null;
        $itemStmt->bind_param(
            "iidssii",
            $transactionId,
            $saleItem['inventory_id'],
            $saleItem['price'],
            $type,
            $desc,
            requireTenantContext(),
            $shopId
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
        $desc = null;
        $itemStmt->bind_param(
            "iidssii",
            $transactionId,
            $tradeInItem['inventory_id'],
            $tradeInItem['price'],
            $type,
            $desc,
            requireTenantContext(),
            $shopId
        );
        
        if (!$itemStmt->execute()) {
            throw new Exception("Failed to add trade-in item to transaction");
        }
    }

    // Process manual items
    foreach ($manualItems as $manualItem) {
        $type = 'manual';
        $inventoryId = null;
        $itemStmt->bind_param(
            "iidssii",
            $transactionId,
            $inventoryId,
            $manualItem['price'],
            $type,
            $manualItem['description'],
            requireTenantContext(),
            $shopId
        );
        
        if (!$itemStmt->execute()) {
            throw new Exception("Failed to add manual item to transaction");
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

    // NEW: Update Customer Analytics
    if ($customerPhone) {
        updateCustomerAnalytics($conn, $shopId, requireTenantContext(), $customerPhone, $customerName, $totalAmount);
        updateCustomerDebtMetrics($conn, $shopId, $customerPhone, 0); // Recalculate debt metrics to impact LTV
    }
    
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
