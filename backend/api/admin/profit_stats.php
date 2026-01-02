<?php
/**
 * Admin Profit Stats API
 * GET endpoint to retrieve daily and monthly profit statistics
 * Accessible by: Admin, SuperAdmin
 * 
 * Profit Calculation: 
 * For each transaction, profit = total_amount - SUM(cost_price of all items sold)
 */

header('Content-Type: application/json');

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
checkAuth();

// Check role - allow admin and superadmin only
checkRole(['admin', 'superadmin']);

try {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    $tenantId = $_SESSION['tenant_id'];
    
    // Calculate Daily Profit (today) - now filtered by shop_id
    $dailyProfitQuery = "
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(SUM(total_cogs), 0) as total_cost
        FROM transactions
        WHERE DATE(created_at) = CURDATE()
        AND shop_id = ?
        AND transaction_type = 'sale'
    ";
    
    $dailyStmt = $conn->prepare($dailyProfitQuery);
    if (!$dailyStmt) {
        throw new Exception("Failed to prepare daily profit query: " . $conn->error);
    }
    $dailyStmt->bind_param("i", $shopId);
    if (!$dailyStmt->execute()) {
        throw new Exception("Failed to execute daily profit query: " . $dailyStmt->error);
    }
    $dailyResult = $dailyStmt->get_result()->fetch_assoc();
    $dailyStmt->close();
    
    $dailyProfit = $dailyResult['total_revenue'] - $dailyResult['total_cost'];
    
    // Calculate Monthly Profit (current month) - now filtered by shop_id
    $monthlyProfitQuery = "
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(SUM(total_cogs), 0) as total_cost
        FROM transactions
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND shop_id = ?
        AND transaction_type = 'sale'
    ";
    
    $monthlyStmt = $conn->prepare($monthlyProfitQuery);
    if (!$monthlyStmt) {
        throw new Exception("Failed to prepare monthly profit query: " . $conn->error);
    }
    $monthlyStmt->bind_param("i", $shopId);
    if (!$monthlyStmt->execute()) {
        throw new Exception("Failed to execute monthly profit query: " . $monthlyStmt->error);
    }
    $monthlyResult = $monthlyStmt->get_result()->fetch_assoc();
    $monthlyStmt->close();
    
    $monthlyProfit = $monthlyResult['total_revenue'] - $monthlyResult['total_cost'];
    
    // Store daily profit record - now with shop_id (upsert)
    $today = date('Y-m-d');
    $transactionCountQuery = "
        SELECT COUNT(id) as count
        FROM transactions
        WHERE DATE(created_at) = CURDATE()
        AND shop_id = ?
    ";
    
    $countStmt = $conn->prepare($transactionCountQuery);
    if (!$countStmt) {
        throw new Exception("Failed to prepare transaction count query: " . $conn->error);
    }
    $countStmt->bind_param("i", $shopId);
    if (!$countStmt->execute()) {
        throw new Exception("Failed to execute transaction count query: " . $countStmt->error);
    }
    $countResult = $countStmt->get_result()->fetch_assoc();
    $transactionCount = $countResult['count'];
    $countStmt->close();
    
    // Upsert profit record - now with shop_id
    $upsertQuery = "
        INSERT INTO profit_records (tenant_id, shop_id, date, daily_profit, transaction_count)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            daily_profit = VALUES(daily_profit),
            transaction_count = VALUES(transaction_count),
            updated_at = CURRENT_TIMESTAMP
    ";
    
    $upsertStmt = $conn->prepare($upsertQuery);
    if (!$upsertStmt) {
        throw new Exception("Failed to prepare upsert query: " . $conn->error);
    }
    $upsertStmt->bind_param("iisdi", $tenantId, $shopId, $today, $dailyProfit, $transactionCount);
    if (!$upsertStmt->execute()) {
        throw new Exception("Failed to execute upsert query: " . $upsertStmt->error);
    }
    $upsertStmt->close();
    
    // Return profit statistics
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'daily_profit' => (float)$dailyProfit,
            'monthly_profit' => (float)$monthlyProfit
        ],
        'shop_id' => $shopId
    ]);
    
} catch (Exception $e) {
    error_log("Profit stats error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to retrieve profit statistics'
    ]);
}

$conn->close();
