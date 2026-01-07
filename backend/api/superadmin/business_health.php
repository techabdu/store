<?php
/**
 * Business Health API Endpoint
 * 
 * Provides comprehensive business metrics for SuperAdmin dashboard
 * - Daily revenue, total transactions, GMV, average transaction value
 * - Revenue trends, top selling devices, payment method distribution
 * - Recent transactions across all tenants
 * 
 * Method: GET
 * Authentication: Required (SuperAdmin only)
 */

require_once '../../config/config.php';
require_once '../../middleware/api_logger.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

global $conn;

try {
    $response = [
        'success' => true,
        'data' => []
    ];

    // ========================================
    // 1. DAILY METRICS
    // ========================================
    
    // Today's revenue and transactions
    $todayStmt = $conn->prepare("
        SELECT 
            COALESCE(SUM(total_amount), 0) as daily_revenue,
            COUNT(*) as total_transactions
        FROM transactions 
        WHERE DATE(created_at) = CURDATE()
        AND transaction_type = 'sale'
    ");
    
    $dailyRevenue = 0;
    $totalTransactions = 0;
    
    if ($todayStmt) {
        $todayStmt->execute();
        $todayResult = $todayStmt->get_result();
        if ($row = $todayResult->fetch_assoc()) {
            $dailyRevenue = floatval($row['daily_revenue']);
            $totalTransactions = intval($row['total_transactions']);
        }
        $todayStmt->close();
    }

    // Yesterday's revenue for trend comparison
    $yesterdayStmt = $conn->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as yesterday_revenue
        FROM transactions 
        WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        AND transaction_type = 'sale'
    ");
    
    $yesterdayRevenue = 0;
    if ($yesterdayStmt) {
        $yesterdayStmt->execute();
        $yesterdayResult = $yesterdayStmt->get_result();
        if ($row = $yesterdayResult->fetch_assoc()) {
            $yesterdayRevenue = floatval($row['yesterday_revenue']);
        }
        $yesterdayStmt->close();
    }

    // Calculate revenue trend
    $revenueTrend = 0;
    if ($yesterdayRevenue > 0) {
        $revenueTrend = round((($dailyRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100, 1);
    }

    // GMV (Total revenue for current month)
    $gmvStmt = $conn->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as gmv
        FROM transactions 
        WHERE MONTH(created_at) = MONTH(CURDATE())
        AND YEAR(created_at) = YEAR(CURDATE())
        AND transaction_type = 'sale'
    ");
    
    $gmv = 0;
    if ($gmvStmt) {
        $gmvStmt->execute();
        $gmvResult = $gmvStmt->get_result();
        if ($row = $gmvResult->fetch_assoc()) {
            $gmv = floatval($row['gmv']);
        }
        $gmvStmt->close();
    }

    // Average transaction value (today)
    $avgTransactionValue = $totalTransactions > 0 ? $dailyRevenue / $totalTransactions : 0;

    // Yesterday's transaction count for trend comparison
    $yesterdayTransStmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM transactions 
        WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        AND transaction_type = 'sale'
    ");
    
    $yesterdayTransactions = 0;
    if ($yesterdayTransStmt) {
        $yesterdayTransStmt->execute();
        $yesterdayTransResult = $yesterdayTransStmt->get_result();
        if ($row = $yesterdayTransResult->fetch_assoc()) {
            $yesterdayTransactions = intval($row['count']);
        }
        $yesterdayTransStmt->close();
    }

    // Calculate transaction trend
    $transactionTrend = 0;
    if ($yesterdayTransactions > 0) {
        $transactionTrend = round((($totalTransactions - $yesterdayTransactions) / $yesterdayTransactions) * 100, 1);
    }

    // ========================================
    // 2. REVENUE TREND (Last 12 Months)
    // ========================================
    $revenueTrendChart = ['data' => [], 'labels' => []];
    
    $trendStmt = $conn->prepare("
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            DATE_FORMAT(created_at, '%b') as month_label,
            COALESCE(SUM(total_amount), 0) as revenue
        FROM transactions 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        AND transaction_type = 'sale'
        GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
        ORDER BY month ASC
    ");
    
    if ($trendStmt) {
        $trendStmt->execute();
        $trendResult = $trendStmt->get_result();
        while ($row = $trendResult->fetch_assoc()) {
            $revenueTrendChart['data'][] = round(floatval($row['revenue']), 2);
            $revenueTrendChart['labels'][] = $row['month_label'];
        }
        $trendStmt->close();
    }

    // If no data, provide last 12 months with zeros
    if (empty($revenueTrendChart['data'])) {
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $currentMonth = intval(date('m')) - 1;
        for ($i = 0; $i < 12; $i++) {
            $monthIndex = ($currentMonth - 11 + $i + 12) % 12;
            $revenueTrendChart['labels'][] = $months[$monthIndex];
            $revenueTrendChart['data'][] = 0;
        }
    }

    // ========================================
    // 3. TOP SELLING DEVICES (by brand + model)
    // ========================================
    $topDevicesChart = ['data' => [], 'labels' => []];
    
    $devicesStmt = $conn->prepare("
        SELECT 
            CONCAT(i.brand, ' ', i.model) as device,
            COUNT(*) as sales_count
        FROM transaction_items ti
        JOIN inventory i ON ti.inventory_id = i.id
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE ti.type = 'sale'
        AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY i.brand, i.model
        ORDER BY sales_count DESC
        LIMIT 7
    ");
    
    if ($devicesStmt) {
        $devicesStmt->execute();
        $devicesResult = $devicesStmt->get_result();
        while ($row = $devicesResult->fetch_assoc()) {
            $topDevicesChart['data'][] = intval($row['sales_count']);
            $topDevicesChart['labels'][] = $row['device'];
        }
        $devicesStmt->close();
    }

    // Fallback: If no transaction items data, get from inventory sold items
    if (empty($topDevicesChart['data'])) {
        $fallbackDevicesStmt = $conn->prepare("
            SELECT 
                CONCAT(brand, ' ', model) as device,
                COUNT(*) as sales_count
            FROM inventory
            WHERE status = 'sold'
            AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY brand, model
            ORDER BY sales_count DESC
            LIMIT 7
        ");
        
        if ($fallbackDevicesStmt) {
            $fallbackDevicesStmt->execute();
            $fallbackDevicesResult = $fallbackDevicesStmt->get_result();
            while ($row = $fallbackDevicesResult->fetch_assoc()) {
                $topDevicesChart['data'][] = intval($row['sales_count']);
                $topDevicesChart['labels'][] = $row['device'];
            }
            $fallbackDevicesStmt->close();
        }
    }

    // ========================================
    // 4. PAYMENT METHOD DISTRIBUTION
    // ========================================
    $paymentMethodsChart = ['data' => [], 'labels' => []];
    
    $paymentStmt = $conn->prepare("
        SELECT 
            payment_method,
            COUNT(*) as count
        FROM transactions 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND transaction_type = 'sale'
        GROUP BY payment_method
        ORDER BY count DESC
    ");
    
    if ($paymentStmt) {
        $paymentStmt->execute();
        $paymentResult = $paymentStmt->get_result();
        while ($row = $paymentResult->fetch_assoc()) {
            $paymentMethod = ucfirst(str_replace('_', ' ', $row['payment_method'] ?? 'Unknown'));
            $paymentMethodsChart['data'][] = intval($row['count']);
            $paymentMethodsChart['labels'][] = $paymentMethod;
        }
        $paymentStmt->close();
    }

    // ========================================
    // 5. RECENT TRANSACTIONS (across all tenants)
    // ========================================
    $recentTransactions = [];
    
    $recentStmt = $conn->prepare("
        SELECT 
            t.id,
            ten.shop_name as tenant,
            t.total_amount as amount,
            COALESCE(
                (SELECT CONCAT(i.brand, ' ', i.model) 
                 FROM transaction_items ti 
                 JOIN inventory i ON ti.inventory_id = i.id 
                 WHERE ti.transaction_id = t.id 
                 LIMIT 1), 
                'Various Items'
            ) as device,
            COALESCE(t.payment_method, 'Unknown') as payment_method,
            t.created_at as timestamp
        FROM transactions t
        LEFT JOIN tenants ten ON t.tenant_id = ten.id
        WHERE t.transaction_type = 'sale'
        ORDER BY t.created_at DESC
        LIMIT 20
    ");
    
    if ($recentStmt) {
        $recentStmt->execute();
        $recentResult = $recentStmt->get_result();
        while ($row = $recentResult->fetch_assoc()) {
            $recentTransactions[] = [
                'id' => intval($row['id']),
                'tenant' => $row['tenant'] ?? 'Unknown Tenant',
                'amount' => floatval($row['amount']),
                'device' => $row['device'],
                'payment_method' => ucfirst(str_replace('_', ' ', $row['payment_method'])),
                'timestamp' => $row['timestamp']
            ];
        }
        $recentStmt->close();
    }

    // ========================================
    // ASSEMBLE RESPONSE
    // ========================================
    $response['data'] = [
        'daily_revenue' => round($dailyRevenue, 2),
        'total_transactions' => $totalTransactions,
        'gmv' => round($gmv, 2),
        'avg_transaction_value' => round($avgTransactionValue, 2),
        'revenue_trend' => $revenueTrend,
        'transaction_trend' => $transactionTrend,
        'charts' => [
            'revenue_trend' => $revenueTrendChart,
            'top_devices' => $topDevicesChart,
            'payment_methods' => $paymentMethodsChart
        ],
        'recent_transactions' => $recentTransactions,
        'last_updated' => date('Y-m-d H:i:s')
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    error_log("Business Health API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>
