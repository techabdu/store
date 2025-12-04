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

require_once '../../config/database.php';

// Set CORS headers using centralized config
setCorsHeaders();
require_once '../../config/config.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';

// Check authentication
checkAuth();

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

try {
    $stats = [
        'inventory_count' => 0,
        'monthly_sales' => 0,
        'monthly_expenses' => 0,
        'weekly_sales_count' => 0
    ];

    // 1. Total Inventory in Stock
    $inventoryQuery = "SELECT COUNT(*) as count FROM inventory WHERE status = 'in_stock' AND tenant_id = ?";
    $inventoryStmt = $conn->prepare($inventoryQuery);
    $inventoryStmt->bind_param("i", $_SESSION['tenant_id']);
    $inventoryStmt->execute();
    $inventoryResult = $inventoryStmt->get_result();
    if ($inventoryResult) {
        $stats['inventory_count'] = $inventoryResult->fetch_assoc()['count'];
    }
    $inventoryStmt->close();

    // 2. Total Monthly Sales
    // Using current month and year
    $salesQuery = "SELECT SUM(total_amount) as total FROM transactions 
                   WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
                   AND YEAR(created_at) = YEAR(CURRENT_DATE())
                   AND tenant_id = ?";
    $salesStmt = $conn->prepare($salesQuery);
    $salesStmt->bind_param("i", $_SESSION['tenant_id']);
    $salesStmt->execute();
    $salesResult = $salesStmt->get_result();
    if ($salesResult) {
        $row = $salesResult->fetch_assoc();
        $stats['monthly_sales'] = $row['total'] ?? 0;
    }
    $salesStmt->close();

    // 3. Monthly Expenses Logged
    $expensesQuery = "SELECT SUM(amount) as total FROM expenses 
                      WHERE MONTH(date) = MONTH(CURRENT_DATE()) 
                      AND YEAR(date) = YEAR(CURRENT_DATE())
                      AND tenant_id = ?";
    $expensesStmt = $conn->prepare($expensesQuery);
    $expensesStmt->bind_param("i", $_SESSION['tenant_id']);
    $expensesStmt->execute();
    $expensesResult = $expensesStmt->get_result();
    if ($expensesResult) {
        $row = $expensesResult->fetch_assoc();
        $stats['monthly_expenses'] = $row['total'] ?? 0;
    }
    $expensesStmt->close();

    // 4. Activity This Week (Number of sales)
    // YEARWEEK(date, 1) uses Monday as the first day of the week
    $weeklyActivityQuery = "SELECT COUNT(*) as count FROM transactions 
                            WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURRENT_DATE(), 1)
                            AND tenant_id = ?";
    $weeklyActivityStmt = $conn->prepare($weeklyActivityQuery);
    $weeklyActivityStmt->bind_param("i", $_SESSION['tenant_id']);
    $weeklyActivityStmt->execute();
    $weeklyActivityResult = $weeklyActivityStmt->get_result();
    if ($weeklyActivityResult) {
        $stats['weekly_sales_count'] = $weeklyActivityResult->fetch_assoc()['count'];
    }
    $weeklyActivityStmt->close();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'stats' => $stats
    ]);

} catch (Exception $e) {
    error_log("Dashboard stats error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve dashboard statistics']);
}

$conn->close();
