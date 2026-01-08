<?php
/**
 * ABC Inventory Analysis API
 * 
 * Purpose: Classify products by profitability contribution (ABC Analysis)
 * Method: GET
 * Authentication: Required (SuperAdmin/Admin)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
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

$shopId = getCurrentShopId();
$tenantId = $_SESSION['tenant_id'];

if (!$shopId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No shop context']);
    exit;
}

try {
    // Get time range (default 12 months)
    $months = isset($_GET['months']) ? (int)$_GET['months'] : 12;
    // Cap at 60 months (5 years) to prevent malicious large queries
    if ($months > 60) $months = 60;
    if ($months < 1) $months = 1;
    
    $startDate = date('Y-m-d 00:00:00', strtotime("-$months months"));

    // 1. Fetch sales data grouped by brand and model
    $query = "SELECT 
                i.brand, 
                i.model, 
                COUNT(ti.id) as units_sold,
                SUM(ti.price) as total_revenue,
                SUM(i.cost_price) as total_cogs,
                SUM(ti.price - i.cost_price) as total_profit
              FROM transaction_items ti
              JOIN inventory i ON ti.inventory_id = i.id
              JOIN transactions t ON ti.transaction_id = t.id
              WHERE t.shop_id = ? AND t.tenant_id = ? AND ti.type = 'sale' AND t.created_at >= ?
              GROUP BY i.brand, i.model
              ORDER BY total_profit DESC";
              
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iis", $shopId, $tenantId, $startDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $models = $result->fetch_all(MYSQLI_ASSOC);
    
    // 2. Calculate Total Profit for Cumulative %
    $overallTotalProfit = 0;
    foreach ($models as $m) {
        $overallTotalProfit += floatval($m['total_profit']);
    }
    
    // 3. Perform ABC Classification
    $cumulativeProfit = 0;
    $abcData = [];
    
    foreach ($models as $m) {
        $profit = floatval($m['total_profit']);
        $cumulativeProfit += $profit;
        $cumulativePercentage = ($overallTotalProfit > 0) ? ($cumulativeProfit / $overallTotalProfit) * 100 : 0;
        
        $category = 'C';
        if ($cumulativePercentage <= 80) {
            $category = 'A';
        } else if ($cumulativePercentage <= 95) {
            $category = 'B';
        }
        
        $abcData[] = array_merge($m, [
            'cumulative_percentage' => round($cumulativePercentage, 2),
            'category' => $category,
            'profit_margin' => ($m['total_revenue'] > 0) ? round(($m['total_profit'] / $m['total_revenue']) * 100, 2) : 0
        ]);
    }
    
    // 4. Summary Stats
    $summary = [
        'A' => ['count' => 0, 'profit' => 0],
        'B' => ['count' => 0, 'profit' => 0],
        'C' => ['count' => 0, 'profit' => 0]
    ];
    
    foreach ($abcData as $item) {
        $cat = $item['category'];
        $summary[$cat]['count']++;
        $summary[$cat]['profit'] += $item['total_profit'];
    }

    echo json_encode([
        'success' => true,
        'data' => $abcData,
        'summary' => $summary,
        'total_profit' => $overallTotalProfit
    ]);

} catch (Exception $e) {
    error_log("ABC Analysis API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
