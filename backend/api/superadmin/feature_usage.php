<?php
// backend/api/superadmin/feature_usage.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../middleware/api_logger.php'; // API request logging

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/role.php';

// Set CORS headers
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

$db = new Database();
$conn = $db->connect();

$action = $_GET['action'] ?? '';
$tenantId = $_GET['tenant_id'] ?? null;
$period = $_GET['period'] ?? '30d';

// Parse period to days
$days = 30;
if (preg_match('/^(\d+)d$/', $period, $matches)) {
    $days = (int)$matches[1];
}

try {
    if ($action === 'tenant_usage') {
        if (!$tenantId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Tenant ID required']);
            exit;
        }
        
        $stmt = $conn->prepare("
            SELECT feature_name, action, COUNT(*) as usage_count
            FROM feature_usage
            WHERE tenant_id = ? 
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY feature_name, action
            ORDER BY usage_count DESC
        ");
        $stmt->bind_param("ii", $tenantId, $days);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $usage = [];
        while ($row = $result->fetch_assoc()) {
            $usage[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'tenant_id' => $tenantId,
            'period' => $period,
            'data' => $usage
        ]);
        
    } elseif ($action === 'heatmap') {
        // Query heatmap data
        // Group by tenant and feature to get a matrix-like structure
        $stmt = $conn->prepare("
            SELECT tenant_id, feature_name, COUNT(*) as usage_count
            FROM feature_usage
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY tenant_id, feature_name
        ");
        $stmt->bind_param("i", $days);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $rawData = [];
        $tenants = [];
        $features = [];
        
        while ($row = $result->fetch_assoc()) {
            $rawData[] = $row;
            if (!in_array($row['tenant_id'], $tenants)) $tenants[] = $row['tenant_id'];
            if (!in_array($row['feature_name'], $features)) $features[] = $row['feature_name'];
        }
        
        // Build matrix
        // Rows: Tenants, Cols: Features
        $matrix = [];
        
        // Initialize matrix with 0s
        foreach ($tenants as $tid) {
            $row = [];
            foreach ($features as $feat) {
                // Key format: tenant_id_feature_name
                $row[$feat] = 0;
            }
            $matrix[$tid] = $row;
        }
        
        // Fill matrix
        foreach ($rawData as $item) {
            $tid = $item['tenant_id'];
            $feat = $item['feature_name'];
            $count = $item['usage_count'];
            
            if (isset($matrix[$tid][$feat])) {
                $matrix[$tid][$feat] = $count;
            }
        }
        
        // Reformat for frontend if needed (e.g., array of arrays)
        // Or return as object: { tenant_id: { feature: count, ... } }
        // The plan suggests: { tenants: [...], features: [...], usage_matrix: [[count, ...], ...] }
        
        // Sort lists to ensure consistent order
        sort($tenants);
        sort($features);
        
        $finalMatrix = [];
        foreach ($tenants as $tid) {
            $row = [];
            foreach ($features as $feat) {
                $row[] = $matrix[$tid][$feat];
            }
            $finalMatrix[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'tenants' => $tenants,
            'features' => $features,
            'usage_matrix' => $finalMatrix
        ]);
        
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
