<?php
/**
 * Error Health API Endpoint
 * 
 * Provides comprehensive error tracking metrics for SuperAdmin dashboard
 * Sources: application_errors table, activity_logs, metrics_hourly
 * 
 * Method: GET
 * Authentication: Required (SuperAdmin only)
 */

require_once '../../config/config.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
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

    $performanceMonitor = new PerformanceMonitor();

    // ========================================
    // 1. TOTAL ERRORS (24 hours)
    // ========================================
    $totalErrors24h = 0;
    $errorStmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM application_errors 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    
    if ($errorStmt) {
        $errorStmt->execute();
        $result = $errorStmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $totalErrors24h = intval($row['count']);
        }
        $errorStmt->close();
    }

    // ========================================
    // 2. ERROR RATE
    // ========================================
    $errorRateData = $performanceMonitor->getErrorRate(24);
    $errorRate = round($errorRateData['error_rate_percentage'] ?? 0, 2);

    // ========================================
    // 3. CRITICAL ERRORS
    // ========================================
    $criticalErrors = 0;
    $criticalStmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM application_errors 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND error_level IN ('critical', 'error')
    ");
    
    if ($criticalStmt) {
        $criticalStmt->execute();
        $result = $criticalStmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $criticalErrors = intval($row['count']);
        }
        $criticalStmt->close();
    }

    // ========================================
    // 4. AFFECTED USERS
    // ========================================
    $affectedUsers = 0;
    $usersStmt = $conn->prepare("
        SELECT COUNT(DISTINCT user_id) as count
        FROM application_errors 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND user_id IS NOT NULL
    ");
    
    if ($usersStmt) {
        $usersStmt->execute();
        $result = $usersStmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $affectedUsers = intval($row['count']);
        }
        $usersStmt->close();
    }

    // ========================================
    // 5. ERROR RATE TREND (7 days)
    // ========================================
    $errorRateTrend = ['data' => [], 'labels' => []];
    $trendStmt = $conn->prepare("
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as error_count 
        FROM application_errors 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ");
    
    if ($trendStmt) {
        $trendStmt->execute();
        $trendResult = $trendStmt->get_result();
        
        // Initialize last 7 days
        $dailyData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $dailyData[$date] = 0;
        }
        
        while ($row = $trendResult->fetch_assoc()) {
            if (isset($dailyData[$row['date']])) {
                $dailyData[$row['date']] = intval($row['error_count']);
            }
        }
        $trendStmt->close();
        
        // Calculate as rate (simplified: errors per 100 requests placeholder)
        $errorRateTrend['data'] = array_values($dailyData);
        $errorRateTrend['labels'] = array_map(function($d) { 
            return date('D', strtotime($d)); 
        }, array_keys($dailyData));
    }

    // ========================================
    // 6. ERROR BREAKDOWN BY TYPE
    // ========================================
    $errorByType = ['data' => [], 'labels' => []];
    $typeStmt = $conn->prepare("
        SELECT 
            COALESCE(error_type, 'Unknown') as type,
            COUNT(*) as count
        FROM application_errors 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 5
    ");
    
    if ($typeStmt) {
        $typeStmt->execute();
        $typeResult = $typeStmt->get_result();
        while ($row = $typeResult->fetch_assoc()) {
            $errorByType['data'][] = intval($row['count']);
            $errorByType['labels'][] = ucfirst($row['type']);
        }
        $typeStmt->close();
    }
    
    // Fallback if no data
    if (empty($errorByType['data'])) {
        $errorByType = [
            'data' => [0],
            'labels' => ['No Errors']
        ];
    }

    // ========================================
    // 7. ERROR BREAKDOWN BY MODULE
    // ========================================
    $errorByModule = ['data' => [], 'labels' => []];
    $moduleStmt = $conn->prepare("
        SELECT 
            CASE 
                WHEN file_path LIKE '%inventory%' THEN 'Inventory'
                WHEN file_path LIKE '%transaction%' OR file_path LIKE '%sales%' THEN 'Sales'
                WHEN file_path LIKE '%auth%' OR file_path LIKE '%login%' THEN 'Auth'
                WHEN file_path LIKE '%report%' THEN 'Reports'
                WHEN file_path LIKE '%marketplace%' THEN 'Marketplace'
                WHEN file_path LIKE '%user%' THEN 'Users'
                WHEN file_path LIKE '%shop%' THEN 'Shops'
                WHEN file_path LIKE '%superadmin%' THEN 'SuperAdmin'
                ELSE 'Other'
            END as module_name,
            COUNT(*) as count
        FROM application_errors 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY module_name
        ORDER BY count DESC
        LIMIT 6
    ");
    
    if ($moduleStmt) {
        $moduleStmt->execute();
        $moduleResult = $moduleStmt->get_result();
        while ($row = $moduleResult->fetch_assoc()) {
            $errorByModule['data'][] = intval($row['count']);
            $errorByModule['labels'][] = $row['module_name'];
        }
        $moduleStmt->close();
    }
    
    // Fallback if no data
    if (empty($errorByModule['data'])) {
        $errorByModule = [
            'data' => [0],
            'labels' => ['No Errors']
        ];
    }

    // ========================================
    // 8. RECENT ERRORS (last 20)
    // ========================================
    $recentErrors = [];
    $recentStmt = $conn->prepare("
        SELECT 
            ae.id,
            ae.error_type as type,
            ae.error_message as message,
            ae.error_level as severity,
            ae.file_path as file,
            ae.line_number as line,
            ae.created_at as timestamp,
            COALESCE(u.email, ae.user_id, 'system') as user,
            ae.stack_trace,
            ae.context
        FROM application_errors ae
        LEFT JOIN users u ON ae.user_id = u.id
        WHERE ae.created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
        ORDER BY ae.created_at DESC
        LIMIT 20
    ");
    
    if ($recentStmt) {
        $recentStmt->execute();
        $recentResult = $recentStmt->get_result();
        
        while ($row = $recentResult->fetch_assoc()) {
            // Map severity levels
            $severity = strtolower($row['severity'] ?? 'warning');
            if (in_array($severity, ['critical', 'fatal', 'error'])) {
                $severity = 'critical';
            } elseif (in_array($severity, ['warning', 'warn'])) {
                $severity = 'warning';
            } else {
                $severity = 'info';
            }
            
            // Parse context if JSON
            $context = [];
            if (!empty($row['context'])) {
                $parsed = json_decode($row['context'], true);
                if (is_array($parsed)) {
                    $context = $parsed;
                }
            }
            
            $recentErrors[] = [
                'id' => intval($row['id']),
                'type' => ucfirst($row['type'] ?? 'Unknown'),
                'message' => $row['message'] ?? 'No message',
                'severity' => $severity,
                'file' => $row['file'] ?? 'Unknown',
                'line' => intval($row['line'] ?? 0),
                'timestamp' => $row['timestamp'],
                'user' => $row['user'],
                'stack_trace' => $row['stack_trace'] ?? '',
                'context' => $context
            ];
        }
        $recentStmt->close();
    }

    // ========================================
    // ASSEMBLE RESPONSE
    // ========================================
    $response['data'] = [
        'total_errors_24h' => $totalErrors24h,
        'error_rate' => $errorRate,
        'critical_errors' => $criticalErrors,
        'affected_users' => $affectedUsers,
        'charts' => [
            'error_rate_trend' => $errorRateTrend,
            'error_by_type' => $errorByType,
            'error_by_module' => $errorByModule
        ],
        'recent_errors' => $recentErrors,
        'last_updated' => date('Y-m-d H:i:s')
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    error_log("Error Health API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>
