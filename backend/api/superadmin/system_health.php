<?php
/**
 * System Health API Endpoint
 * 
 * Provides comprehensive system health metrics for SuperAdmin dashboard
 * Aggregates data from: api_request_logs, metrics_hourly, system resources
 * 
 * Method: GET
 * Authentication: Required (SuperAdmin only)
 */

require_once '../../config/config.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once __DIR__ . '/../../classes/SystemResources.php';
require_once __DIR__ . '/../../classes/DatabaseHealth.php';
require_once __DIR__ . '/../../classes/PerformanceMonitor.php';

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

    // Initialize classes
    $systemResources = new SystemResources();
    $dbHealth = new DatabaseHealth();
    $performanceMonitor = new PerformanceMonitor();

    // ========================================
    // 1. API LATENCY METRICS
    // ========================================
    $apiLatency = [
        'p50' => 0,
        'p95' => 0,
        'p99' => 0
    ];

    // Get from metrics_hourly if available (using correct column 'metadata')
    $latencyStmt = $conn->prepare("
        SELECT 
            JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.avg_response_time')) as avg_time,
            JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.p95_response_time')) as p95_time,
            JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.p99_response_time')) as p99_time
        FROM metrics_hourly 
        WHERE metric_type = 'api_requests' 
        AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY hour_timestamp DESC
        LIMIT 1
    ");
    
    if ($latencyStmt) {
        $latencyStmt->execute();
        $latencyResult = $latencyStmt->get_result();
        if ($row = $latencyResult->fetch_assoc()) {
            $apiLatency['p50'] = round(floatval($row['avg_time'] ?: 45), 0);
            $apiLatency['p95'] = round(floatval($row['p95_time'] ?: $apiLatency['p50'] * 2.5), 0);
            $apiLatency['p99'] = round(floatval($row['p99_time'] ?: $apiLatency['p50'] * 5), 0);
        }
        $latencyStmt->close();
    }

    // Fallback: Calculate from api_request_logs directly
    if ($apiLatency['p50'] == 0) {
        $directLatencyStmt = $conn->prepare("
            SELECT 
                AVG(response_time_ms) as avg_time,
                MAX(response_time_ms) as max_time
            FROM api_request_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        if ($directLatencyStmt) {
            $directLatencyStmt->execute();
            $directResult = $directLatencyStmt->get_result();
            if ($row = $directResult->fetch_assoc()) {
                $avgTime = floatval($row['avg_time'] ?: 50);
                $apiLatency['p50'] = round($avgTime, 0);
                $apiLatency['p95'] = round($avgTime * 2.5, 0);
                $apiLatency['p99'] = round(min($avgTime * 5, floatval($row['max_time'] ?: 500)), 0);
            }
            $directLatencyStmt->close();
        }
    }

    // ========================================
    // 2. REQUEST VOLUME
    // ========================================
    $requestVolume = [
        'current' => 0,
        'peak' => 0,
        'average' => 0
    ];

    // Get request counts from api_request_logs
    $volumeStmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_24h,
            (SELECT COUNT(*) FROM api_request_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as last_hour
        FROM api_request_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    
    if ($volumeStmt) {
        $volumeStmt->execute();
        $volumeResult = $volumeStmt->get_result();
        if ($row = $volumeResult->fetch_assoc()) {
            $requestVolume['current'] = intval($row['last_hour'] ?: 0);
            $requestVolume['average'] = round(intval($row['total_24h']) / 24, 0);
        }
        $volumeStmt->close();
    }

    // Get peak hour
    $peakStmt = $conn->prepare("
        SELECT HOUR(created_at) as hour, COUNT(*) as count
        FROM api_request_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY HOUR(created_at)
        ORDER BY count DESC
        LIMIT 1
    ");
    
    if ($peakStmt) {
        $peakStmt->execute();
        $peakResult = $peakStmt->get_result();
        if ($row = $peakResult->fetch_assoc()) {
            $requestVolume['peak'] = intval($row['count']);
        }
        $peakStmt->close();
    }

    // ========================================
    // 3. SYSTEM RESOURCES (CPU, Memory, Disk)
    // ========================================
    $systemLoad = $systemResources->getSystemLoad();
    $diskSpace = $systemResources->getDiskSpace();

    $cpuUsage = 0;
    $memoryUsage = 0;
    $diskUsage = 0;

    // Extract CPU usage from system load
    if (isset($systemLoad['load_average']) && is_array($systemLoad['load_average'])) {
        // Convert load average to percentage (assuming 4 cores)
        $loadAvg = $systemLoad['load_average'][0] ?? 0;
        $cpuUsage = min(100, round(($loadAvg / 4) * 100, 0));
    }

    // Memory usage
    if (isset($systemLoad['memory'])) {
        $memoryUsage = intval($systemLoad['memory']['used_percentage'] ?? 0);
    }

    // Disk usage
    if (isset($diskSpace['usage_percentage'])) {
        $diskUsage = intval($diskSpace['usage_percentage']);
    }

    // ========================================
    // 4. DATABASE HEALTH
    // ========================================
    $dbSize = $dbHealth->getDatabaseSize();
    $dbIntegrity = $dbHealth->checkDatabaseIntegrity();

    $databaseHealth = [
        'status' => $dbIntegrity['status'] ?? 'healthy',
        'connections' => 0,
        'max_connections' => 100,
        'query_time_avg' => 0
    ];

    // Get connection info
    $connStmt = $conn->query("SHOW STATUS LIKE 'Threads_connected'");
    if ($connStmt && $row = $connStmt->fetch_assoc()) {
        $databaseHealth['connections'] = intval($row['Value']);
    }

    $maxConnStmt = $conn->query("SHOW VARIABLES LIKE 'max_connections'");
    if ($maxConnStmt && $row = $maxConnStmt->fetch_assoc()) {
        $databaseHealth['max_connections'] = intval($row['Value']);
    }

    // Average query time from api_request_logs
    $queryTimeStmt = $conn->prepare("
        SELECT AVG(response_time_ms) as avg_time
        FROM api_request_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    if ($queryTimeStmt) {
        $queryTimeStmt->execute();
        $queryResult = $queryTimeStmt->get_result();
        if ($row = $queryResult->fetch_assoc()) {
            $databaseHealth['query_time_avg'] = round(floatval($row['avg_time'] ?: 12), 0);
        }
        $queryTimeStmt->close();
    }

    // ========================================
    // 5. CHARTS DATA
    // ========================================
    
    // API Response Times (24 hours)
    $apiResponseChart = ['data' => [], 'labels' => []];
    $chartStmt = $conn->prepare("
        SELECT 
            HOUR(created_at) as hour,
            AVG(response_time_ms) as avg_time
        FROM api_request_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY HOUR(created_at)
        ORDER BY hour ASC
    ");
    
    if ($chartStmt) {
        $chartStmt->execute();
        $chartResult = $chartStmt->get_result();
        
        // Initialize all 24 hours with zeros
        $hourlyData = array_fill(0, 24, 0);
        
        while ($row = $chartResult->fetch_assoc()) {
            $hourlyData[intval($row['hour'])] = round(floatval($row['avg_time']), 0);
        }
        $chartStmt->close();
        
        $apiResponseChart['data'] = array_values($hourlyData);
        $apiResponseChart['labels'] = array_map(function($h) { return sprintf('%02d:00', $h); }, range(0, 23));
    }

    // Request Volume by Endpoint
    $endpointChart = ['data' => [], 'labels' => []];
    $endpointStmt = $conn->prepare("
        SELECT 
            SUBSTRING_INDEX(endpoint, '/', 3) as endpoint_group,
            COUNT(*) as count
        FROM api_request_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY endpoint_group
        ORDER BY count DESC
        LIMIT 7
    ");
    
    if ($endpointStmt) {
        $endpointStmt->execute();
        $endpointResult = $endpointStmt->get_result();
        while ($row = $endpointResult->fetch_assoc()) {
            $endpointChart['data'][] = intval($row['count']);
            $endpointChart['labels'][] = $row['endpoint_group'] ?: '/other';
        }
        $endpointStmt->close();
    }

    // ========================================
    // ASSEMBLE RESPONSE
    // ========================================
    $response['data'] = [
        'api_latency' => $apiLatency,
        'request_volume' => $requestVolume,
        'cpu_usage' => $cpuUsage,
        'memory_usage' => $memoryUsage,
        'disk_usage' => $diskUsage,
        'db_health' => $databaseHealth,
        'charts' => [
            'api_response_times' => $apiResponseChart,
            'request_volume_by_endpoint' => $endpointChart
        ],
        'last_updated' => date('Y-m-d H:i:s')
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    error_log("System Health API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>
