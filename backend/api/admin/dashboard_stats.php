<?php
require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';

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

// Use connection from database.php
$db = $conn;

try {
    // 1. Calculate Monthly Total Sales (current month) for current tenant
    $currentMonthStart = date('Y-m-01 00:00:00');
    $lastMonthStart = date('Y-m-01 00:00:00', strtotime('-1 month'));
    $lastMonthEnd = date('Y-m-t 23:59:59', strtotime('-1 month'));
    
    // Current month sales
    $queryCurrentSales = "SELECT COALESCE(SUM(total_amount), 0) as total_sales 
                          FROM transactions 
                          WHERE created_at >= ? AND tenant_id = ?";
    $stmtCurrentSales = $db->prepare($queryCurrentSales);
    $stmtCurrentSales->bind_param("si", $currentMonthStart, $_SESSION['tenant_id']);
    $stmtCurrentSales->execute();
    $currentSalesResult = $stmtCurrentSales->get_result()->fetch_assoc();
    $currentMonthSales = (float)$currentSalesResult['total_sales'];
    
    // Last month sales for comparison
    $queryLastSales = "SELECT COALESCE(SUM(total_amount), 0) as total_sales 
                       FROM transactions 
                       WHERE created_at >= ? AND created_at <= ? AND tenant_id = ?";
    $stmtLastSales = $db->prepare($queryLastSales);
    $stmtLastSales->bind_param("ssi", $lastMonthStart, $lastMonthEnd, $_SESSION['tenant_id']);
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
    
    // 2. Count Total Inventory (in_stock items) for current tenant
    $queryInventory = "SELECT COUNT(*) as total_inventory 
                       FROM inventory 
                       WHERE status = 'in_stock' AND tenant_id = ?";
    $stmtInventory = $db->prepare($queryInventory);
    $stmtInventory->bind_param("i", $_SESSION['tenant_id']);
    $stmtInventory->execute();
    $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
    $totalInventory = (int)$inventoryResult['total_inventory'];
    
    // 3. Count Monthly New Customers (unique customer_phone this month) for current tenant
    $queryCurrentCustomers = "SELECT COUNT(DISTINCT customer_phone) as new_customers 
                              FROM transactions 
                              WHERE created_at >= ? AND customer_phone IS NOT NULL AND customer_phone != '' AND tenant_id = ?";
    $stmtCurrentCustomers = $db->prepare($queryCurrentCustomers);
    $stmtCurrentCustomers->bind_param("si", $currentMonthStart, $_SESSION['tenant_id']);
    $stmtCurrentCustomers->execute();
    $currentCustomersResult = $stmtCurrentCustomers->get_result()->fetch_assoc();
    $currentMonthCustomers = (int)$currentCustomersResult['new_customers'];
    
    // Last month customers for comparison
    $queryLastCustomers = "SELECT COUNT(DISTINCT customer_phone) as new_customers 
                           FROM transactions 
                           WHERE created_at >= ? AND created_at <= ? AND customer_phone IS NOT NULL AND customer_phone != '' AND tenant_id = ?";
    $stmtLastCustomers = $db->prepare($queryLastCustomers);
    $stmtLastCustomers->bind_param("ssi", $lastMonthStart, $lastMonthEnd, $_SESSION['tenant_id']);
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
    
    // 4. Get Sales Overview Data (last 7 months) for current tenant
    $salesOverview = [];
    for ($i = 6; $i >= 0; $i--) {
        $monthStart = date('Y-m-01 00:00:00', strtotime("-$i months"));
        $monthEnd = date('Y-m-t 23:59:59', strtotime("-$i months"));
        $monthLabel = date('M', strtotime("-$i months"));
        
        $querySalesMonth = "SELECT COALESCE(SUM(total_amount), 0) as sales 
                            FROM transactions 
                            WHERE created_at >= ? AND created_at <= ? AND tenant_id = ?";
        $stmtSalesMonth = $db->prepare($querySalesMonth);
        $stmtSalesMonth->bind_param("ssi", $monthStart, $monthEnd, $_SESSION['tenant_id']);
        $stmtSalesMonth->execute();
        $salesMonthResult = $stmtSalesMonth->get_result()->fetch_assoc();
        
        $salesOverview[] = [
            'month' => $monthLabel,
            'sales' => (float)$salesMonthResult['sales']
        ];
    }
    
    // 5. Get Low Stock Alerts (items with 5 or fewer units) for current tenant
    $queryLowStock = "SELECT brand, model, COUNT(*) as count 
                      FROM inventory 
                      WHERE status = 'in_stock' AND tenant_id = ?
                      GROUP BY brand, model 
                      HAVING count <= 5 
                      ORDER BY count ASC 
                      LIMIT 10";
    $stmtLowStock = $db->prepare($queryLowStock);
    $stmtLowStock->bind_param("i", $_SESSION['tenant_id']);
    $stmtLowStock->execute();
    $lowStockResult = $stmtLowStock->get_result();
    
    $lowStockAlerts = [];
    while ($row = $lowStockResult->fetch_assoc()) {
        $lowStockAlerts[] = [
            'title' => 'Low Stock Warning',
            'description' => $row['brand'] . ' ' . $row['model'] . ' is running low (' . $row['count'] . ' unit' . ($row['count'] > 1 ? 's' : '') . ' left)',
            'timestamp' => 'Now',
            'color' => $row['count'] <= 2 ? 'danger' : 'warning',
            'action' => 'Restock'
        ];
    }
    
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
            'low_stock_alerts' => $lowStockAlerts
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching dashboard stats: ' . $e->getMessage()
    ]);
}
?>
