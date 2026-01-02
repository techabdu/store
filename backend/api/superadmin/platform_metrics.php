<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../helpers/EventLogger.php';
require_once __DIR__ . '/../../middleware/api_logger.php';

// Set CORS headers
if (function_exists('setCorsHeaders')) {
    setCorsHeaders();
} else {
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.gc_maxlifetime', 172800);
    ini_set('session.cookie_lifetime', 172800);
    session_start();
}

// Auth Check: Superadmin only
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit;
}

$db = new Database();
$conn = $db->connect();

$type = $_GET['type'] ?? '';
$period = $_GET['period'] ?? '30d';

// Parse period to days
$days = 30;
if (preg_match('/^(\d+)d$/', $period, $matches)) {
    $days = (int)$matches[1];
}

try {
    $data = [];
    
    switch ($type) {
        case 'growth':
            $data = getGrowthMetrics($conn, $days);
            break;
        case 'inventory':
            $data = getInventoryMetrics($conn, $days);
            break;
        case 'transactions':
            $data = getTransactionMetrics($conn, $days);
            break;
        case 'usage':
            $data = getUsageMetrics($conn, $days);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid or missing metric type']);
            exit;
    }
    
    echo json_encode([
        'success' => true,
        'type' => $type,
        'period' => $period,
        'data' => $data
    ]);

} catch (Exception $e) {
    EventLogger::logError('error', $e->getMessage(), ['type' => $type, 'error_type' => 'platform_metrics_error']);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred']);
}

// -----------------------------------------------------------------------------
// Metric Functions
// -----------------------------------------------------------------------------

function getGrowthMetrics($conn, $days) {
    $metrics = [];
    
    // 1. New Tenants
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tenants WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['new_tenants'] = $stmt->get_result()->fetch_assoc()['count'];
    
    // 2. Churned Tenants
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tenants WHERE cancelled_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['churned_tenants'] = $stmt->get_result()->fetch_assoc()['count'];
    
    // 3. MRR
    $res = $conn->query("SELECT SUM(mrr) as total_mrr FROM tenants WHERE status = 'active'");
    $metrics['current_mrr'] = (float)($res->fetch_assoc()['total_mrr'] ?? 0);
    $metrics['arr'] = $metrics['current_mrr'] * 12;
    
    // 4. Growth Rate (Simplified: MRR now vs estimated MRR at start of period)
    // For exact historical MRR we would need snapshots, but we can estimate or use current - new + churned if we tracked value
    // We'll trust subscription_history if available, or just give current stats.
    // Let's calculate net tenant growth % for now
    $totalTenants = $conn->query("SELECT COUNT(*) as c FROM tenants")->fetch_assoc()['c'];
    $prevTenants = $totalTenants - $metrics['new_tenants'] + $metrics['churned_tenants'];
    $metrics['tenant_growth_rate'] = $prevTenants > 0 ? (($totalTenants - $prevTenants) / $prevTenants) * 100 : 0;
    
    // 5. Growth Chart (Last 12 months, fixed interval)
    $chartSql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count 
                 FROM tenants 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) 
                 GROUP BY month 
                 ORDER BY month";
    $metrics['growth_chart'] = $conn->query($chartSql)->fetch_all(MYSQLI_ASSOC);
    
    return $metrics;
}

function getInventoryMetrics($conn, $days) {
    $metrics = [];
    
    // 1. Total Devices
    $metrics['total_devices'] = $conn->query("SELECT COUNT(*) as c FROM inventory")->fetch_assoc()['c'];
    
    // 2. By Brand
    $metrics['by_brand'] = $conn->query("SELECT brand, COUNT(*) as count FROM inventory GROUP BY brand ORDER BY count DESC LIMIT 10")->fetch_all(MYSQLI_ASSOC);
    
    // 3. By Model
    $metrics['by_model'] = $conn->query("SELECT model, COUNT(*) as count FROM inventory GROUP BY model ORDER BY count DESC LIMIT 10")->fetch_all(MYSQLI_ASSOC);
    
    // 4. Avg per tenant
    // Check if inventory table has tenant_id (it should)
    $avgRes = $conn->query("SELECT AVG(cnt) as avg_inv FROM (SELECT COUNT(*) as cnt FROM inventory GROUP BY tenant_id) as sub");
    $metrics['avg_per_tenant'] = (float)($avgRes->fetch_assoc()['avg_inv'] ?? 0);
    
    // 5. Total Value
    // Inventory is tracked by item (IMEI), so no quantity column. Value is sum of price for in_stock items.
    $valRes = $conn->query("SELECT SUM(price) as total_val FROM inventory WHERE status = 'in_stock'");
    $metrics['total_value'] = (float)($valRes->fetch_assoc()['total_val'] ?? 0);
    
    return $metrics;
}

function getTransactionMetrics($conn, $days) {
    $metrics = [];
    
    // 1. GMV
    $stmt = $conn->prepare("SELECT SUM(total_amount) as gmv FROM transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['gmv'] = (float)($stmt->get_result()->fetch_assoc()['gmv'] ?? 0);
    
    // 2. Count
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['transaction_count'] = $stmt->get_result()->fetch_assoc()['count'];
    
    // 3. Avg Value
    $metrics['avg_transaction_value'] = $metrics['transaction_count'] > 0 ? $metrics['gmv'] / $metrics['transaction_count'] : 0;
    
    // 4. Top Devices (by revenue)
    $checkTable = $conn->query("SHOW TABLES LIKE 'transaction_items'");
    if ($checkTable->num_rows > 0) {
        $sql = "SELECT i.model as device_name, COUNT(*) as units_sold, SUM(ti.price) as revenue 
                FROM transaction_items ti 
                JOIN inventory i ON ti.inventory_id = i.id 
                JOIN transactions t ON ti.transaction_id = t.id
                WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY i.model 
                ORDER BY units_sold DESC LIMIT 10";
         $stmt = $conn->prepare($sql);
         $stmt->bind_param("i", $days);
         $stmt->execute();
         $metrics['top_devices'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } else {
        $metrics['top_devices'] = [];
    }
    
    // 5. Payment Methods
    $stmt = $conn->prepare("SELECT payment_method, COUNT(*) as count FROM transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY payment_method");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['payment_methods'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // 6. Commission
    $stmt = $conn->prepare("SELECT SUM(commission_amount) as commission FROM transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['total_commission'] = (float)($stmt->get_result()->fetch_assoc()['commission'] ?? 0);
    
    return $metrics;
}

function getUsageMetrics($conn, $days) {
    $metrics = [];
    
    // 1. API Calls per Tenant
    $stmt = $conn->prepare("SELECT tenant_id, COUNT(*) as api_calls FROM api_request_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY tenant_id ORDER BY api_calls DESC LIMIT 20");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['top_api_users'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // 2. Storage
    // Get latest measurement
    $sql = "SELECT tenant_id, database_size_mb, file_storage_mb, (database_size_mb + file_storage_mb) as total_mb 
            FROM storage_metrics 
            WHERE measured_at = (SELECT MAX(measured_at) FROM storage_metrics) 
            ORDER BY total_mb DESC LIMIT 20";
    $metrics['storage_usage'] = $conn->query($sql)->fetch_all(MYSQLI_ASSOC);
    
    // 3. Feature Heatmap Data (simple count for now)
    $stmt = $conn->prepare("SELECT feature_name, COUNT(DISTINCT tenant_id) as tenant_count FROM feature_usage WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY feature_name");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['feature_adoption'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // 4. Module Usage
    $stmt = $conn->prepare("SELECT module, COUNT(*) as usage_count FROM api_request_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY module");
    $stmt->bind_param("i", $days);
    $stmt->execute();
    $metrics['module_usage'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    return $metrics;
}
?>
