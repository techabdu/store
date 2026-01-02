<?php
/**
 * Cash Flow Analysis API
 * 
 * Purpose: Track cash inflows and outflows over time
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

$shopId = getCurrentShopId();
$tenantId = $_SESSION['tenant_id'];

if (!$shopId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No shop context']);
    exit;
}

try {
    // Get Date Range Parameters
    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('-30 days'));
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-d');

    // Validate dates
    if ($startDate > $endDate) {
        $temp = $startDate;
        $startDate = $endDate;
        $endDate = $temp;
    }

    // ---------------------------------------------------------
    // 1. Calculate Opening Balance (Prior to Start Date)
    // ---------------------------------------------------------
    
    // A. Capital (Business Opening Balance)
    // If shop was created BEFORE the start date, it counts towards opening balance.
    // If created DURING the period, it will be added as a flow on that day.
    // SECURITY: Enforce tenant isolation
    $shopQ = "SELECT business_capital, DATE(created_at) as date FROM shops WHERE id = ? AND tenant_id = ?";
    $stmtS = $conn->prepare($shopQ);
    $stmtS->bind_param("ii", $shopId, $tenantId);
    $stmtS->execute();
    $shopInfo = $stmtS->get_result()->fetch_assoc();
    $stmtS->close();

    $capitalAmount = $shopInfo ? floatval($shopInfo['business_capital']) : 0;
    $capitalDate = $shopInfo ? $shopInfo['date'] : '0000-00-00';
    
    $initialBalance = 0;

    // If capital was added before this period, add to initial balance
    if ($capitalDate < $startDate) {
        $initialBalance += $capitalAmount;
    }

    // B. Prior Inflows (Sales recorded before Start Date)
    $preInQuery = "SELECT SUM(total_amount) as total FROM transactions 
                   WHERE shop_id = ? AND tenant_id = ? 
                   AND transaction_type IN ('sale', 'debt_payment') 
                   AND DATE(created_at) < ?";
    $stmtPreIn = $conn->prepare($preInQuery);
    $stmtPreIn->bind_param("iis", $shopId, $tenantId, $startDate);
    $stmtPreIn->execute();
    $preInResult = $stmtPreIn->get_result()->fetch_assoc();
    $initialBalance += ($preInResult['total'] ?? 0);
    $stmtPreIn->close();

    // C. Prior Outflows (Expenses before Start Date)
    $preOutQuery = "SELECT SUM(amount) as total FROM expenses 
                    WHERE shop_id = ? AND tenant_id = ? 
                    AND DATE(date) < ?";
    $stmtPreOut = $conn->prepare($preOutQuery);
    $stmtPreOut->bind_param("iis", $shopId, $tenantId, $startDate);
    $stmtPreOut->execute();
    $preOutResult = $stmtPreOut->get_result()->fetch_assoc();
    $initialBalance -= ($preOutResult['total'] ?? 0);
    $stmtPreOut->close();

    // D. Prior Inventory Costs (Stock purchases before Start Date)
    $preInvQuery = "SELECT SUM(i.cost_price) as total 
                    FROM inventory i
                    LEFT JOIN transaction_items ti ON i.id = ti.inventory_id AND ti.type = 'trade_in'
                    WHERE i.shop_id = ? AND i.tenant_id = ?
                    AND ti.id IS NULL 
                    AND DATE(i.created_at) < ?";
    $stmtPreInv = $conn->prepare($preInvQuery);
    $stmtPreInv->bind_param("iis", $shopId, $tenantId, $startDate);
    $stmtPreInv->execute();
    $preInvResult = $stmtPreInv->get_result()->fetch_assoc();
    $initialBalance -= ($preInvResult['total'] ?? 0);
    $stmtPreInv->close();

    // ---------------------------------------------------------
    // 2. Get Period Data (Within Date Range)
    // ---------------------------------------------------------

    // A. Period Inflows
    $inflowQuery = "SELECT DATE(created_at) as date, SUM(total_amount) as amount 
                    FROM transactions 
                    WHERE shop_id = ? AND tenant_id = ? 
                    AND transaction_type IN ('sale', 'debt_payment')
                    AND DATE(created_at) BETWEEN ? AND ?
                    GROUP BY DATE(created_at)";
    $stmtI = $conn->prepare($inflowQuery);
    $stmtI->bind_param("iiss", $shopId, $tenantId, $startDate, $endDate);
    $stmtI->execute();
    $inflows = $stmtI->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtI->close();

    // B. Period Outflows (Expenses)
    $outflowQuery = "SELECT DATE(date) as date, SUM(amount) as amount 
                     FROM expenses 
                     WHERE shop_id = ? AND tenant_id = ? 
                     AND DATE(date) BETWEEN ? AND ?
                     GROUP BY DATE(date)";
    $stmtO = $conn->prepare($outflowQuery);
    $stmtO->bind_param("iiss", $shopId, $tenantId, $startDate, $endDate);
    $stmtO->execute();
    $outflows = $stmtO->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtO->close();

    // C. Period Inventory Costs
    $invQuery = "SELECT DATE(i.created_at) as date, SUM(i.cost_price) as amount 
                 FROM inventory i
                 LEFT JOIN transaction_items ti ON i.id = ti.inventory_id AND ti.type = 'trade_in'
                 WHERE i.shop_id = ? AND i.tenant_id = ? 
                 AND ti.id IS NULL 
                 AND DATE(i.created_at) BETWEEN ? AND ?
                 GROUP BY DATE(i.created_at)";
    $stmtInv = $conn->prepare($invQuery);
    $stmtInv->bind_param("iiss", $shopId, $tenantId, $startDate, $endDate);
    $stmtInv->execute();
    $invOutflows = $stmtInv->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtInv->close();

    // ---------------------------------------------------------
    // 3. Merge & Fill Gaps
    // ---------------------------------------------------------
    
    $flowMap = [];

    // Helper to map data
    foreach ($inflows as $i) $flowMap[$i['date']]['inflow'] = floatval($i['amount']);
    foreach ($outflows as $o) {
        if (!isset($flowMap[$o['date']])) $flowMap[$o['date']]['inflow'] = 0;
        $flowMap[$o['date']]['outflow'] = ($flowMap[$o['date']]['outflow'] ?? 0) + floatval($o['amount']);
    }
    foreach ($invOutflows as $iv) {
        if (!isset($flowMap[$iv['date']])) $flowMap[$iv['date']]['inflow'] = 0;
        $flowMap[$iv['date']]['outflow'] = ($flowMap[$iv['date']]['outflow'] ?? 0) + floatval($iv['amount']);
    }

    // Add Capital if it falls within this period
    if ($capitalDate >= $startDate && $capitalDate <= $endDate) {
        if (!isset($flowMap[$capitalDate])) $flowMap[$capitalDate]['inflow'] = 0;
        $flowMap[$capitalDate]['inflow'] += $capitalAmount;
    }

    // Generate continuous date list
    $resultData = [];
    $currentDate = $startDate;
    $runningBalance = $initialBalance;
    $totalPeriodInflow = 0;
    $totalPeriodOutflow = 0;

    while ($currentDate <= $endDate) {
        $in = isset($flowMap[$currentDate]['inflow']) ? $flowMap[$currentDate]['inflow'] : 0;
        $out = isset($flowMap[$currentDate]['outflow']) ? $flowMap[$currentDate]['outflow'] : 0;
        
        $net = $in - $out;
        $runningBalance += $net;
        
        $totalPeriodInflow += $in;
        $totalPeriodOutflow += $out;

        $resultData[] = [
            'date' => $currentDate,
            'inflow' => $in,
            'outflow' => $out,
            'net' => $net,
            'balance' => $runningBalance
        ];

        // Move to next day
        $currentDate = date('Y-m-d', strtotime($currentDate . ' +1 day'));
    }

    echo json_encode([
        'success' => true,
        'data' => $resultData,
        'period_summary' => [
            'inflow' => $totalPeriodInflow,
            'outflow' => $totalPeriodOutflow,
            'net' => $totalPeriodInflow - $totalPeriodOutflow,
            'opening_balance' => $initialBalance,
            'closing_balance' => $runningBalance
        ],
        'current_balance' => $runningBalance
    ]);

} catch (Exception $e) {
    error_log("Cash Flow API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
