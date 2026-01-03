<?php
/**
 * Tenant Analytics API (SuperAdmin Only)
 * 
 * Purpose: Provide business analytics for tenant performance
 * Method: GET
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=sales_metrics: Get sales data and trends (30 days)
 * - action=inventory_health: Get stock levels and turnover
 * - action=growth_indicators: User growth and revenue trends
 */

require_once '../../config/config.php';
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

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'sales_metrics';

if ($method === 'GET') {
    $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
    
    if ($tenant_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
        exit;
    }
    
    if ($action === 'sales_metrics') {
        // Total sales metrics
        $total_stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(AVG(total_amount), 0) as avg_transaction,
                COALESCE(MAX(total_amount), 0) as highest_sale
            FROM transactions
            WHERE tenant_id = ?
        ");
        $total_stmt->bind_param("i", $tenant_id);
        $total_stmt->execute();
        $total_result = $total_stmt->get_result();
        $total_metrics = $total_result->fetch_assoc();
        $total_stmt->close();
        
        // Last 30 days sales trend (daily breakdown)
        $trend_stmt = $conn->prepare("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as daily_sales
            FROM transactions
            WHERE tenant_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
        $trend_stmt->bind_param("i", $tenant_id);
        $trend_stmt->execute();
        $trend_result = $trend_stmt->get_result();
        
        $sales_trend = [];
        while ($row = $trend_result->fetch_assoc()) {
            $sales_trend[] = $row;
        }
        $trend_stmt->close();
        
        // Top selling items (last 30 days)
        $top_items_stmt = $conn->prepare("
            SELECT 
                i.product_name,
                i.category,
                SUM(ti.quantity) as units_sold,
                SUM(ti.subtotal) as revenue,
                COUNT(DISTINCT ti.transaction_id) as order_count
            FROM transaction_items ti
            JOIN inventory i ON ti.inventory_id = i.id
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.tenant_id = ?
            AND t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY ti.inventory_id
            ORDER BY revenue DESC
            LIMIT 10
        ");
        $top_items_stmt->bind_param("i", $tenant_id);
        $top_items_stmt->execute();
        $top_items_result = $top_items_stmt->get_result();
        
        $top_items = [];
        while ($row = $top_items_result->fetch_assoc()) {
            $top_items[] = $row;
        }
        $top_items_stmt->close();
        
        // Month-over-month growth
        $current_month_stmt = $conn->prepare("
            SELECT COALESCE(SUM(total_amount), 0) as current_month_sales
            FROM transactions
            WHERE tenant_id = ?
            AND MONTH(created_at) = MONTH(NOW())
            AND YEAR(created_at) = YEAR(NOW())
        ");
        $current_month_stmt->bind_param("i", $tenant_id);
        $current_month_stmt->execute();
        $current_month_result = $current_month_stmt->get_result();
        $current_month_sales = $current_month_result->fetch_assoc()['current_month_sales'];
        $current_month_stmt->close();
        
        $last_month_stmt = $conn->prepare("
            SELECT COALESCE(SUM(total_amount), 0) as last_month_sales
            FROM transactions
            WHERE tenant_id = ?
            AND MONTH(created_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
            AND YEAR(created_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
        ");
        $last_month_stmt->bind_param("i", $tenant_id);
        $last_month_stmt->execute();
        $last_month_result = $last_month_stmt->get_result();
        $last_month_sales = $last_month_result->fetch_assoc()['last_month_sales'];
        $last_month_stmt->close();
        
        $growth_percentage = $last_month_sales > 0 
            ? (($current_month_sales - $last_month_sales) / $last_month_sales) * 100 
            : 0;
        
        echo json_encode([
            'success' => true,
            'total_metrics' => $total_metrics,
            'sales_trend' => $sales_trend,
            'top_items' => $top_items,
            'growth' => [
                'current_month' => floatval($current_month_sales),
                'last_month' => floatval($last_month_sales),
                'growth_percentage' => round($growth_percentage, 2)
            ]
        ]);
        
    } elseif ($action === 'inventory_health') {
        // Overall inventory stats
        $inventory_stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_quantity,
                SUM(quantity * cost_price) as total_value,
                SUM(quantity * selling_price) as potential_revenue,
                SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
                SUM(CASE WHEN quantity < 10 THEN 1 ELSE 0 END) as low_stock_count
            FROM inventory
            WHERE tenant_id = ?
        ");
        $inventory_stmt->bind_param("i", $tenant_id);
        $inventory_stmt->execute();
        $inventory_result = $inventory_stmt->get_result();
        $inventory_stats = $inventory_result->fetch_assoc();
        $inventory_stmt->close();
        
        // Low stock items
        $low_stock_stmt = $conn->prepare("
            SELECT 
                id, product_name, category, quantity, selling_price
            FROM inventory
            WHERE tenant_id = ?
            AND quantity < 10
            AND quantity > 0
            ORDER BY quantity ASC
            LIMIT 10
        ");
        $low_stock_stmt->bind_param("i", $tenant_id);
        $low_stock_stmt->execute();
        $low_stock_result = $low_stock_stmt->get_result();
        
        $low_stock_items = [];
        while ($row = $low_stock_result->fetch_assoc()) {
            $low_stock_items[] = $row;
        }
        $low_stock_stmt->close();
        
        // Inventory turnover (last 30 days)
        $turnover_stmt = $conn->prepare("
            SELECT 
                SUM(ti.quantity) as units_sold
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.tenant_id = ?
            AND t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $turnover_stmt->bind_param("i", $tenant_id);
        $turnover_stmt->execute();
        $turnover_result = $turnover_stmt->get_result();
        $units_sold = $turnover_result->fetch_assoc()['units_sold'] ?: 0;
        $turnover_stmt->close();
        
        $turnover_rate = $inventory_stats['total_quantity'] > 0 
            ? ($units_sold / $inventory_stats['total_quantity']) * 100 
            : 0;
        
        echo json_encode([
            'success' => true,
            'inventory_stats' => $inventory_stats,
            'low_stock_items' => $low_stock_items,
            'turnover' => [
                'units_sold_30d' => intval($units_sold),
                'turnover_rate' => round($turnover_rate, 2)
            ]
        ]);
        
    } elseif ($action === 'growth_indicators') {
        // User growth (last 6 months, monthly)
        $user_growth_stmt = $conn->prepare("
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as new_users
            FROM users
            WHERE tenant_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
        $user_growth_stmt->bind_param("i", $tenant_id);
        $user_growth_stmt->execute();
        $user_growth_result = $user_growth_stmt->get_result();
        
        $user_growth = [];
        while ($row = $user_growth_result->fetch_assoc()) {
            $user_growth[] = $row;
        }
        $user_growth_stmt->close();
        
        // Revenue growth (last 6 months, monthly)
        $revenue_growth_stmt = $conn->prepare("
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as monthly_revenue
            FROM transactions
            WHERE tenant_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
        $revenue_growth_stmt->bind_param("i", $tenant_id);
        $revenue_growth_stmt->execute();
        $revenue_growth_result = $revenue_growth_stmt->get_result();
        
        $revenue_growth = [];
        while ($row = $revenue_growth_result->fetch_assoc()) {
            $revenue_growth[] = $row;
        }
        $revenue_growth_stmt->close();
        
        // Inventory growth
        $inventory_growth_stmt = $conn->prepare("
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as items_added
            FROM inventory
            WHERE tenant_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
        $inventory_growth_stmt->bind_param("i", $tenant_id);
        $inventory_growth_stmt->execute();
        $inventory_growth_result = $inventory_growth_stmt->get_result();
        
        $inventory_growth = [];
        while ($row = $inventory_growth_result->fetch_assoc()) {
            $inventory_growth[] = $row;
        }
        $inventory_growth_stmt->close();
        
        // Current totals
        $totals_stmt = $conn->prepare("
            SELECT 
                (SELECT COUNT(*) FROM users WHERE tenant_id = ?) as total_users,
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = ?) as total_inventory,
                (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE tenant_id = ?) as lifetime_revenue
        ");
        $totals_stmt->bind_param("iii", $tenant_id, $tenant_id, $tenant_id);
        $totals_stmt->execute();
        $totals_result = $totals_stmt->get_result();
        $totals = $totals_result->fetch_assoc();
        $totals_stmt->close();
        
        echo json_encode([
            'success' => true,
            'user_growth' => $user_growth,
            'revenue_growth' => $revenue_growth,
            'inventory_growth' => $inventory_growth,
            'totals' => $totals
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
