<?php
require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Set headers
header("Content-Type: application/json; charset=UTF-8");
// Check authentication and admin role
$user_data = checkAuth();
if (!$user_data || !in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied"]);
    exit;
}

// Get current shop context
$shopId = getCurrentShopId();
if ($shopId === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
    exit;
}

// Use connection from database.php
$db = $conn;

try {
    // 1. Calculate Monthly Total Sales (current month) for current shop
    $currentMonthStart = date('Y-m-01 00:00:00');
    $lastMonthStart = date('Y-m-01 00:00:00', strtotime('-1 month'));
    $lastMonthEnd = date('Y-m-t 23:59:59', strtotime('-1 month'));
    
    // Current month sales
    $queryCurrentSales = "SELECT COALESCE(SUM(total_amount), 0) as total_sales 
                          FROM transactions 
                          WHERE created_at >= ? AND shop_id = ?";
    $stmtCurrentSales = $db->prepare($queryCurrentSales);
    $stmtCurrentSales->bind_param("si", $currentMonthStart, $shopId);
    $stmtCurrentSales->execute();
    $currentSalesResult = $stmtCurrentSales->get_result()->fetch_assoc();
    $currentMonthSales = (float)$currentSalesResult['total_sales'];
    
    // Last month sales for comparison
    $queryLastSales = "SELECT COALESCE(SUM(total_amount), 0) as total_sales 
                       FROM transactions 
                       WHERE created_at >= ? AND created_at <= ? AND shop_id = ?";
    $stmtLastSales = $db->prepare($queryLastSales);
    $stmtLastSales->bind_param("ssi", $lastMonthStart, $lastMonthEnd, $shopId);
    $stmtLastSales->execute();
    $lastSalesResult = $stmtLastSales->get_result()->fetch_assoc();
    $lastMonthSales = (float)$lastSalesResult['total_sales'];
    
    // Calculate percentage change
    $salesPercentageChange = 0;
    if ($lastMonthSales > 0) {
        $salesPercentageChange = (($currentMonthSales - $lastMonthSales) / $lastMonthSales) * 100;
    } elseif ($currentMonthSales > 0) {
        $salesPercentageChange = 100; // If no sales last month but sales this month
    }
    
    // 2. Count Total Inventory (in_stock items) for current shop
    $queryInventory = "SELECT COUNT(*) as total_inventory 
                       FROM inventory 
                       WHERE status = 'in_stock' AND shop_id = ?";
    $stmtInventory = $db->prepare($queryInventory);
    $stmtInventory->bind_param("i", $shopId);
    $stmtInventory->execute();
    $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
    $totalInventory = (int)$inventoryResult['total_inventory'];
    
    // 3. Count Monthly New Customers (unique customer_phone this month) for current shop
    $queryCurrentCustomers = "SELECT COUNT(DISTINCT customer_phone) as new_customers 
                              FROM transactions 
                              WHERE created_at >= ? AND customer_phone IS NOT NULL AND customer_phone != '' AND shop_id = ?";
    $stmtCurrentCustomers = $db->prepare($queryCurrentCustomers);
    $stmtCurrentCustomers->bind_param("si", $currentMonthStart, $shopId);
    $stmtCurrentCustomers->execute();
    $currentCustomersResult = $stmtCurrentCustomers->get_result()->fetch_assoc();
    $currentMonthCustomers = (int)$currentCustomersResult['new_customers'];
    
    // Last month customers for comparison
    $queryLastCustomers = "SELECT COUNT(DISTINCT customer_phone) as new_customers 
                           FROM transactions 
                           WHERE created_at >= ? AND created_at <= ? AND customer_phone IS NOT NULL AND customer_phone != '' AND shop_id = ?";
    $stmtLastCustomers = $db->prepare($queryLastCustomers);
    $stmtLastCustomers->bind_param("ssi", $lastMonthStart, $lastMonthEnd, $shopId);
    $stmtLastCustomers->execute();
    $lastCustomersResult = $stmtLastCustomers->get_result()->fetch_assoc();
    $lastMonthCustomers = (int)$lastCustomersResult['new_customers'];
    
    // Calculate percentage change
    $customersPercentageChange = 0;
    if ($lastMonthCustomers > 0) {
        $customersPercentageChange = (($currentMonthCustomers - $lastMonthCustomers) / $lastMonthCustomers) * 100;
    } elseif ($currentMonthCustomers > 0) {
        $customersPercentageChange = 100;
    }
    
    // 4. Get Sales Overview Data (last 7 months) for current shop
    $salesOverview = [];
    for ($i = 6; $i >= 0; $i--) {
        $monthStart = date('Y-m-01 00:00:00', strtotime("-$i months"));
        $monthEnd = date('Y-m-t 23:59:59', strtotime("-$i months"));
        $monthLabel = date('M', strtotime("-$i months"));
        
        $querySalesMonth = "SELECT COALESCE(SUM(total_amount), 0) as sales 
                            FROM transactions 
                            WHERE created_at >= ? AND created_at <= ? AND shop_id = ?";
        $stmtSalesMonth = $db->prepare($querySalesMonth);
        $stmtSalesMonth->bind_param("ssi", $monthStart, $monthEnd, $shopId);
        $stmtSalesMonth->execute();
        $salesMonthResult = $stmtSalesMonth->get_result()->fetch_assoc();
        
        $salesOverview[] = [
            'month' => $monthLabel,
            'sales' => (float)$salesMonthResult['sales']
        ];
    }
    
    
    // 5. Get Low Stock Threshold from shop settings
    $queryThreshold = "SELECT low_stock_threshold FROM shops WHERE id = ?";
    $stmtThreshold = $db->prepare($queryThreshold);
    $stmtThreshold->bind_param("i", $shopId);
    $stmtThreshold->execute();
    $thresholdResult = $stmtThreshold->get_result()->fetch_assoc();
    $lowStockThreshold = (int)($thresholdResult['low_stock_threshold'] ?? 5);
    $stmtThreshold->close();
    
    // 6. Get Low Stock Alerts (items at or below threshold) for current shop
    $queryLowStock = "SELECT brand, model, COUNT(*) as count 
                      FROM inventory 
                      WHERE status = 'in_stock' AND shop_id = ?
                      GROUP BY brand, model 
                      HAVING count <= ? 
                      ORDER BY count ASC 
                      LIMIT 10";
    $stmtLowStock = $db->prepare($queryLowStock);
    $stmtLowStock->bind_param("ii", $shopId, $lowStockThreshold);
    $stmtLowStock->execute();
    $lowStockResult = $stmtLowStock->get_result();
    
    $lowStockAlerts = [];
    while ($row = $lowStockResult->fetch_assoc()) {
        // Use threshold to determine severity: critical if <= 40% of threshold
        $criticalLevel = max(2, (int)($lowStockThreshold * 0.4));
        
        $lowStockAlerts[] = [
            'title' => 'Low Stock Warning',
            'description' => $row['brand'] . ' ' . $row['model'] . ' is running low (' . $row['count'] . ' unit' . ($row['count'] > 1 ? 's' : '') . ' left)',
            'timestamp' => 'Now',
            'color' => $row['count'] <= $criticalLevel ? 'danger' : 'warning',
            'action' => 'Restock'
        ];
    }
    $stmtLowStock->close();
    
    // 7. Calculate Total Outstanding Debt for current shop
    $queryDebtStats = "SELECT COALESCE(SUM(remaining_balance), 0) as total_outstanding FROM debts WHERE shop_id = ? AND status != 'written_off'";
    $stmtDebtStats = $db->prepare($queryDebtStats);
    $stmtDebtStats->bind_param("i", $shopId);
    $stmtDebtStats->execute();
    $debtStatsResult = $stmtDebtStats->get_result()->fetch_assoc();
    $totalOutstandingDebt = (float)$debtStatsResult['total_outstanding'];
    $stmtDebtStats->close();
    
    // Return all dashboard stats
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'monthly_sales' => [
                'total' => $currentMonthSales,
                'percentage_change' => round($salesPercentageChange, 1)
            ],
            'total_inventory' => $totalInventory,
            'monthly_customers' => [
                'total' => $currentMonthCustomers,
                'percentage_change' => round($customersPercentageChange, 1)
            ],
            'sales_overview' => $salesOverview,
            'low_stock_alerts' => $lowStockAlerts,
            'total_outstanding_debt' => $totalOutstandingDebt
        ],
        'shop_id' => $shopId
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching dashboard stats: ' . $e->getMessage()
    ]);
}
?>
