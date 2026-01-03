<?php
/**
 * Customer Analytics API
 * 
 * Purpose: Fetch customer segmentation and behavior data
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

$action = isset($_GET['action']) ? $_GET['action'] : 'summary';

try {
    switch ($action) {
        case 'summary':
            // Get segment counts
            $segmentQuery = "SELECT segment, COUNT(*) as count FROM customer_analytics WHERE tenant_id = ? AND shop_id = ? GROUP BY segment";
            $stmt = $conn->prepare($segmentQuery);
            $stmt->bind_param("ii", $tenantId, $shopId);
            $stmt->execute();
            $segments = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            // Get high-level metrics
            $metricsQuery = "SELECT 
                COUNT(*) as total_customers,
                AVG(lifetime_value) as avg_ltv,
                SUM(current_outstanding_debt) as total_debt
                FROM customer_analytics WHERE tenant_id = ? AND shop_id = ?";
            $stmt = $conn->prepare($metricsQuery);
            $stmt->bind_param("ii", $tenantId, $shopId);
            $stmt->execute();
            $metrics = $stmt->get_result()->fetch_assoc();

            echo json_encode([
                'success' => true,
                'segments' => $segments,
                'metrics' => $metrics
            ]);
            break;

        case 'vips':
            $query = "SELECT * FROM customer_analytics 
                      WHERE tenant_id = ? AND shop_id = ? AND segment = 'vip' 
                      ORDER BY lifetime_value DESC LIMIT 20";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("ii", $tenantId, $shopId);
            $stmt->execute();
            $vips = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            echo json_encode([
                'success' => true,
                'customers' => $vips
            ]);
            break;

        case 'at_risk':
            $query = "SELECT * FROM customer_analytics 
                      WHERE tenant_id = ? AND shop_id = ? AND segment = 'at_risk' 
                      ORDER BY days_since_last_purchase DESC LIMIT 20";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("ii", $tenantId, $shopId);
            $stmt->execute();
            $atRisk = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            echo json_encode([
                'success' => true,
                'customers' => $atRisk
            ]);
            break;

        case 'top_debtors':
            $query = "SELECT * FROM customer_analytics 
                      WHERE tenant_id = ? AND shop_id = ? AND current_outstanding_debt > 0 
                      ORDER BY current_outstanding_debt DESC LIMIT 20";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("ii", $tenantId, $shopId);
            $stmt->execute();
            $debtors = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            echo json_encode([
                'success' => true,
                'customers' => $debtors
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    error_log("Customer Analytics API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
