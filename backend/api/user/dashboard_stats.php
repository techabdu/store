<?php
/**
 * User Dashboard Stats API
 * GET endpoint to retrieve dashboard metrics
 * Accessible by: User, Admin, SuperAdmin
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
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

require_once '../../config/database.php';
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
    $inventoryQuery = "SELECT COUNT(*) as count FROM inventory WHERE status = 'in_stock'";
    $inventoryResult = $conn->query($inventoryQuery);
    if ($inventoryResult) {
        $stats['inventory_count'] = $inventoryResult->fetch_assoc()['count'];
    }

    // 2. Total Monthly Sales
    // Using current month and year
    $salesQuery = "SELECT SUM(total_amount) as total FROM transactions 
                   WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
                   AND YEAR(created_at) = YEAR(CURRENT_DATE())";
    $salesResult = $conn->query($salesQuery);
    if ($salesResult) {
        $row = $salesResult->fetch_assoc();
        $stats['monthly_sales'] = $row['total'] ?? 0;
    }

    // 3. Monthly Expenses Logged
    $expensesQuery = "SELECT SUM(amount) as total FROM expenses 
                      WHERE MONTH(date) = MONTH(CURRENT_DATE()) 
                      AND YEAR(date) = YEAR(CURRENT_DATE())";
    $expensesResult = $conn->query($expensesQuery);
    if ($expensesResult) {
        $row = $expensesResult->fetch_assoc();
        $stats['monthly_expenses'] = $row['total'] ?? 0;
    }

    // 4. Activity This Week (Number of sales)
    // YEARWEEK(date, 1) uses Monday as the first day of the week
    $weeklyActivityQuery = "SELECT COUNT(*) as count FROM transactions 
                            WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURRENT_DATE(), 1)";
    $weeklyActivityResult = $conn->query($weeklyActivityQuery);
    if ($weeklyActivityResult) {
        $stats['weekly_sales_count'] = $weeklyActivityResult->fetch_assoc()['count'];
    }

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
