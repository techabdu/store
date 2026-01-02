<?php
/**
 * User Dashboard Stats API
 * GET endpoint to retrieve dashboard metrics
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
    // Get current shop context for multi-branch support
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }

    $stats = [
        'inventory_count' => 0,
        'weekly_sales_count' => 0,
        'daily_profit' => 0,
        'monthly_profit' => 0,
        'monthly_sales' => 0,
        'monthly_expenses' => 0
    ];

    // 1. Total Inventory - filtered by shop_id
    $inventoryQuery = "SELECT COUNT(*) as count FROM inventory WHERE status = 'in_stock' AND shop_id = ?";
    $stmt = $conn->prepare($inventoryQuery);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stats['inventory_count'] = $stmt->get_result()->fetch_assoc()['count'] ?? 0;
    $stmt->close();

    // 2. Daily Stats (Sales, COGS, Expenses)
    // Sales & COGS
    $dailySalesQ = "SELECT COALESCE(SUM(total_amount), 0) as sales, COALESCE(SUM(total_cogs), 0) as cogs 
                    FROM transactions 
                    WHERE DATE(created_at) = CURRENT_DATE() AND shop_id = ?";
    $stmt = $conn->prepare($dailySalesQ);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $dailySales = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Expenses
    $dailyExpQ = "SELECT COALESCE(SUM(amount), 0) as expenses 
                  FROM expenses 
                  WHERE DATE(date) = CURRENT_DATE() AND shop_id = ?";
    $stmt = $conn->prepare($dailyExpQ);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $dailyExp = $stmt->get_result()->fetch_assoc()['expenses'];
    $stmt->close();

    // Calculate Daily Profit: (Sales - COGS) - Expenses
    $stats['daily_profit'] = ($dailySales['sales'] - $dailySales['cogs']) - $dailyExp;

    // 3. Monthly Stats (Sales, COGS, Expenses)
    // Sales & COGS
    $monthlySalesQ = "SELECT COALESCE(SUM(total_amount), 0) as sales, COALESCE(SUM(total_cogs), 0) as cogs 
                      FROM transactions 
                      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
                      AND YEAR(created_at) = YEAR(CURRENT_DATE()) 
                      AND shop_id = ?";
    $stmt = $conn->prepare($monthlySalesQ);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $monthlySales = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Expenses
    $monthlyExpQ = "SELECT COALESCE(SUM(amount), 0) as expenses 
                    FROM expenses 
                    WHERE MONTH(date) = MONTH(CURRENT_DATE()) 
                    AND YEAR(date) = YEAR(CURRENT_DATE()) 
                    AND shop_id = ?";
    $stmt = $conn->prepare($monthlyExpQ);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $monthlyExp = $stmt->get_result()->fetch_assoc()['expenses'];
    $stmt->close();

    $stats['monthly_sales'] = $monthlySales['sales'];
    $stats['monthly_expenses'] = $monthlyExp;
    // Calculate Monthly Profit
    $stats['monthly_profit'] = ($monthlySales['sales'] - $monthlySales['cogs']) - $monthlyExp;

    // 4. Activity This Week
    $weeklyActivityQuery = "SELECT COUNT(*) as count FROM transactions 
                            WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURRENT_DATE(), 1)
                            AND shop_id = ?";
    $stmt = $conn->prepare($weeklyActivityQuery);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stats['weekly_sales_count'] = $stmt->get_result()->fetch_assoc()['count'] ?? 0;
    $stmt->close();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'shop_id' => $shopId
    ]);

} catch (Exception $e) {
    error_log("Dashboard stats error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve dashboard statistics']);
}

$conn->close();
