<?php
/**
 * Multi-Branch Comparison API
 * 
 * Purpose: Compare financial performance across different shop branches
 * Method: GET
 * Authentication: Required (SuperAdmin/Admin)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers
setCorsHeaders();

// Check authentication
$user_data = checkAuth();

// Only allow SuperAdmin or Admin
if ($user_data['role'] !== 'superadmin' && $user_data['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit;
}

$tenantId = $_SESSION['tenant_id'];

// Get date range if provided
$startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
$endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;

try {
    // Optimized Query: Fetch Shops + Sales + Expenses in ONE go using Subqueries (LEFT JOIN)
    // This solves the N+1 problem (running queries inside a loop)
    
    // 1. Prepare conditions and parameters
    $dateConditionTrans = "";
    $dateConditionExp = "";
    $params = [];
    $types = "";

    // Base params for subqueries
    // We bind parameters later, but we need to structure the query parts first
    
    // 2. Build the BIG query
    // We use COALESCE to turn NULLs (no sales/expenses) into 0
    
    $query = "
        SELECT 
            s.id as shop_id,
            s.shop_name,
            s.shop_address,
            COALESCE(t.total_sales, 0) as total_sales,
            COALESCE(t.total_cogs, 0) as total_cogs,
            COALESCE(t.total_gross_profit, 0) as gross_profit,
            COALESCE(e.total_expenses, 0) as total_expenses
        FROM shops s
        LEFT JOIN (
            SELECT 
                shop_id,
                SUM(total_amount) as total_sales,
                SUM(total_cogs) as total_cogs,
                SUM(gross_profit) as total_gross_profit
            FROM transactions
            WHERE tenant_id = ? AND transaction_type = 'sale'
            " . ($startDate && $endDate ? "AND DATE(created_at) BETWEEN ? AND ?" : "") . "
            GROUP BY shop_id
        ) t ON s.id = t.shop_id
        LEFT JOIN (
            SELECT 
                shop_id,
                SUM(amount) as total_expenses
            FROM expenses
            WHERE tenant_id = ?
            " . ($startDate && $endDate ? "AND date BETWEEN ? AND ?" : "") . "
            GROUP BY shop_id
        ) e ON s.id = e.shop_id
        WHERE s.tenant_id = ?
    ";

    // 3. Bind Parameters
    // Order: Transaction Subquery (ID, Start?, End?), Expense Subquery (ID, Start?, End?), Main Query (ID)
    
    // Transactions Subquery Block
    $params[] = $tenantId;
    $types .= "i";
    if ($startDate && $endDate) {
        $params[] = $startDate;
        $params[] = $endDate;
        $types .= "ss";
    }

    // Expenses Subquery Block
    $params[] = $tenantId;
    $types .= "i";
    if ($startDate && $endDate) {
        $params[] = $startDate;
        $params[] = $endDate;
        $types .= "ss";
    }

    // Main Query Block (Shops)
    $params[] = $tenantId;
    $types .= "i";

    // 4. Execution
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $raw_data = $result->fetch_all(MYSQLI_ASSOC);

    // 5. Process & Calculate Margins (PHP side logic is cheap for simple math)
    $comparisonData = [];

    foreach ($raw_data as $row) {
        $sales = floatval($row['total_sales']);
        $cogs = floatval($row['total_cogs']);
        $gross = floatval($row['gross_profit']);
        $expenses = floatval($row['total_expenses']);
        
        // Final Net Profit Calculation
        $netProfit = $gross - $expenses;
        
        $row['net_profit'] = $netProfit;
        $row['gross_margin'] = ($sales > 0) ? round(($gross / $sales) * 100, 2) : 0;
        $row['net_margin'] = ($sales > 0) ? round(($netProfit / $sales) * 100, 2) : 0;
        
        // Clean up text format for frontend just in case
        $row['shop_name'] = htmlspecialchars_decode($row['shop_name']);
        $row['location'] = $row['shop_address']; // Map to expected frontend key
        
        $comparisonData[] = $row;
    }

    // Sort by net profit descending
    usort($comparisonData, function($a, $b) {
        return $b['net_profit'] <=> $a['net_profit'];
    });

    echo json_encode([
        'success' => true,
        'data' => $comparisonData
    ]);

} catch (Exception $e) {
    error_log("Branch Comparison API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
