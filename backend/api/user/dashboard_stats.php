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
        'monthly_sales' => 0,
        'monthly_expenses' => 0,
        'weekly_sales_count' => 0
    ];

    // 1. Total Inventory in Stock - filtered by shop_id
    $inventoryQuery = "SELECT COUNT(*) as count FROM inventory WHERE status = 'in_stock' AND shop_id = ?";
    $inventoryStmt = $conn->prepare($inventoryQuery);
    $inventoryStmt->bind_param("i", $shopId);
    $inventoryStmt->execute();
    $inventoryResult = $inventoryStmt->get_result();
    if ($inventoryResult) {
        $stats['inventory_count'] = $inventoryResult->fetch_assoc()['count'];
    }
    $inventoryStmt->close();

    // 2. Total Monthly Sales - filtered by shop_id
    // Using current month and year
    $salesQuery = "SELECT SUM(total_amount) as total FROM transactions 
                   WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
                   AND YEAR(created_at) = YEAR(CURRENT_DATE())
                   AND shop_id = ?";
    $salesStmt = $conn->prepare($salesQuery);
    $salesStmt->bind_param("i", $shopId);
    $salesStmt->execute();
    $salesResult = $salesStmt->get_result();
    if ($salesResult) {
        $row = $salesResult->fetch_assoc();
        $stats['monthly_sales'] = $row['total'] ?? 0;
    }
    $salesStmt->close();

    // 3. Monthly Expenses Logged - filtered by shop_id
    $expensesQuery = "SELECT SUM(amount) as total FROM expenses 
                      WHERE MONTH(date) = MONTH(CURRENT_DATE()) 
                      AND YEAR(date) = YEAR(CURRENT_DATE())
                      AND shop_id = ?";
    $expensesStmt = $conn->prepare($expensesQuery);
    $expensesStmt->bind_param("i", $shopId);
    $expensesStmt->execute();
    $expensesResult = $expensesStmt->get_result();
    if ($expensesResult) {
        $row = $expensesResult->fetch_assoc();
        $stats['monthly_expenses'] = $row['total'] ?? 0;
    }
    $expensesStmt->close();

    // 4. Activity This Week (Number of sales) - filtered by shop_id
    // YEARWEEK(date, 1) uses Monday as the first day of the week
    $weeklyActivityQuery = "SELECT COUNT(*) as count FROM transactions 
                            WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURRENT_DATE(), 1)
                            AND shop_id = ?";
    $weeklyActivityStmt = $conn->prepare($weeklyActivityQuery);
    $weeklyActivityStmt->bind_param("i", $shopId);
    $weeklyActivityStmt->execute();
    $weeklyActivityResult = $weeklyActivityStmt->get_result();
    if ($weeklyActivityResult) {
        $stats['weekly_sales_count'] = $weeklyActivityResult->fetch_assoc()['count'];
    }
    $weeklyActivityStmt->close();

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
