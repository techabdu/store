<?php
/**
 * User Profit Stats API
 * GET endpoint to retrieve daily and monthly profit statistics
 * Accessible by: User, Admin, SuperAdmin
 * 
 * Profit Calculation: 
 * For each transaction, profit = total_amount - SUM(cost_price of all items sold)
 */

header('Content-Type: application/json');

require_once '../../config/config.php';
require_once '../../config/database.php';
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

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

try {
    // Get current shop context for multi-branch support
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    // Calculate Daily Profit (today) - filtered by shop_id
    $dailyProfitQuery = "
        SELECT 
            COALESCE(SUM(t.total_amount), 0) as total_revenue,
            COALESCE(SUM(i.cost_price), 0) as total_cost
        FROM transactions t
        INNER JOIN transaction_items ti ON t.id = ti.transaction_id
        INNER JOIN inventory i ON ti.inventory_id = i.id
        WHERE DATE(t.created_at) = CURDATE()
        AND t.shop_id = ?
        AND ti.type = 'sale'
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
    
    // Calculate Monthly Profit (current month) - filtered by shop_id
    $monthlyProfitQuery = "
        SELECT 
            COALESCE(SUM(t.total_amount), 0) as total_revenue,
            COALESCE(SUM(i.cost_price), 0) as total_cost
        FROM transactions t
        INNER JOIN transaction_items ti ON t.id = ti.transaction_id
        INNER JOIN inventory i ON ti.inventory_id = i.id
        WHERE MONTH(t.created_at) = MONTH(CURRENT_DATE())
        AND YEAR(t.created_at) = YEAR(CURRENT_DATE())
        AND t.shop_id = ?
        AND ti.type = 'sale'
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
