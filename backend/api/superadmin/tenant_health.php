<?php
/**
 * Tenant Health API (SuperAdmin Only)
 * 
 * Purpose: Monitor tenant system health and performance
 * Method: GET
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=resources: Get storage, API usage, database size
 * - action=performance: Get response times, error rates
 * - action=health_score: Calculate overall health score (0-100)
 */

require_once '../../config/config.php';
require_once '../../middleware/api_logger.php'; // API request logging
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
$action = isset($_GET['action']) ? $_GET['action'] : 'resources';

if ($method === 'GET') {
    $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
    
    if ($tenant_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
        exit;
    }
    
    if ($action === 'resources') {
        // Get tenant resource metrics
        $tenant_stmt = $conn->prepare("
            SELECT 
                storage_used_mb,
                api_calls_today,
                total_logins,
                last_login_at
            FROM tenants
            WHERE id = ?
        ");
        $tenant_stmt->bind_param("i", $tenant_id);
        $tenant_stmt->execute();
        $tenant_result = $tenant_stmt->get_result();
        $resources = $tenant_result->fetch_assoc();
        $tenant_stmt->close();
        
        // Calculate database size for this tenant
        $db_size_stmt = $conn->prepare("
            SELECT 
                (SELECT COUNT(*) FROM users WHERE tenant_id = ?) as user_count,
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = ?) as inventory_count,
                (SELECT COUNT(*) FROM transactions WHERE tenant_id = ?) as transaction_count,
                (SELECT COUNT(*) FROM activity_logs WHERE tenant_id = ?) as activity_log_count
        ");
        $db_size_stmt->bind_param("iiii", $tenant_id, $tenant_id, $tenant_id, $tenant_id);
        $db_size_stmt->execute();
        $db_size_result = $db_size_stmt->get_result();
        $db_metrics = $db_size_result->fetch_assoc();
        $db_size_stmt->close();
        
        // Estimated storage usage (rough calculation)
        $estimated_storage = (
            ($db_metrics['user_count'] * 0.001) + // ~1KB per user
            ($db_metrics['inventory_count'] * 0.002) + // ~2KB per item
            ($db_metrics['transaction_count'] * 0.003) + // ~3KB per transaction
            ($db_metrics['activity_log_count'] * 0.001) // ~1KB per log
        );
        
        // API usage (last 7 days)
        $api_usage_stmt = $conn->prepare("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as request_count
            FROM activity_logs
            WHERE tenant_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
        $api_usage_stmt->bind_param("i", $tenant_id);
        $api_usage_stmt->execute();
        $api_usage_result = $api_usage_stmt->get_result();
        
        $api_usage = [];
        while ($row = $api_usage_result->fetch_assoc()) {
            $api_usage[] = $row;
        }
        $api_usage_stmt->close();
        
        echo json_encode([
            'success' => true,
            'resources' => [
                'database_size' => round($estimated_storage, 2) . ' MB',
                'storage_used' => round(floatval($resources['storage_used_mb'] ?: $estimated_storage), 2) . ' MB',
                'storage_limit' => '1 GB',
                'storage_percentage' => round((floatval($resources['storage_used_mb'] ?: $estimated_storage) / 1024) * 100, 2),
                'api_calls_24h' => intval($resources['api_calls_today']),
                'api_call_limit' => 10000,
                'active_sessions' => intval($resources['total_logins'] / 10), // Placeholder active sessions
                'last_login' => $resources['last_login_at']
            ],
            'database_metrics' => $db_metrics,
            'api_usage_7d' => $api_usage
        ]);
        
    } elseif ($action === 'performance') {
        // Get from retailer_health_scores if exists
        $health_stmt = $conn->prepare("
            SELECT 
                performance_score,
                error_rate,
                avg_response_time,
                uptime_percentage as uptime,
                calculated_at as last_checked
            FROM retailer_health_scores
            WHERE tenant_id = ?
            ORDER BY calculated_at DESC
            LIMIT 1
        ");
        
        $performance = null;
        if ($health_stmt) {
            $health_stmt->bind_param("i", $tenant_id);
            $health_stmt->execute();
            $health_result = $health_stmt->get_result();
            
            if ($health_result->num_rows > 0) {
                $performance = $health_result->fetch_assoc();
            }
            $health_stmt->close();
        }
        
        // If no health score data, calculate basic metrics
        if (!$performance) {
            // Count errors in last 24 hours
            $error_stmt = $conn->prepare("
                SELECT COUNT(*) as error_count
                FROM activity_logs
                WHERE tenant_id = ?
                AND action LIKE '%error%'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ");
            $error_stmt->bind_param("i", $tenant_id);
            $error_stmt->execute();
            $error_result = $error_stmt->get_result();
            $error_count = $error_result->fetch_assoc()['error_count'];
            $error_stmt->close();
            
            // Total actions in last 24 hours
            $total_stmt = $conn->prepare("
                SELECT COUNT(*) as total_actions
                FROM activity_logs
                WHERE tenant_id = ?
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ");
            $total_stmt->bind_param("i", $tenant_id);
            $total_stmt->execute();
            $total_result = $total_stmt->get_result();
            $total_actions = $total_result->fetch_assoc()['total_actions'];
            $total_stmt->close();
            
            $performance = [
                'performance_score' => 85, // Default placeholder
                'error_rate' => $total_actions > 0 ? round(($error_count / $total_actions) * 100, 2) : 0,
                'avg_response_time' => 250, // Placeholder (ms)
                'uptime' => '99.9%', // Placeholder
                'last_checked' => date('Y-m-d H:i:s')
            ];
        }
        
        // Error trend (last 7 days)
        $error_trend_stmt = $conn->prepare("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as error_count
            FROM activity_logs
            WHERE tenant_id = ?
            AND action LIKE '%error%'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
        $error_trend_stmt->bind_param("i", $tenant_id);
        $error_trend_stmt->execute();
        $error_trend_result = $error_trend_stmt->get_result();
        
        $error_trend = [];
        while ($row = $error_trend_result->fetch_assoc()) {
            $error_trend[] = $row;
        }
        $error_trend_stmt->close();
        
        echo json_encode([
            'success' => true,
            'performance' => $performance,
            'error_trend' => $error_trend
        ]);
        
    } elseif ($action === 'health_score') {
        // Calculate comprehensive health score (0-100)
        $score = 100;
        $breakdown = [];
        $recommendations = [];
        
        // Factor 1: Error Rate (max -25 points)
        $error_stmt = $conn->prepare("
            SELECT COUNT(*) as error_count
            FROM activity_logs
            WHERE tenant_id = ?
            AND action LIKE '%error%'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $error_stmt->bind_param("i", $tenant_id);
        $error_stmt->execute();
        $error_result = $error_stmt->get_result();
        $error_count = $error_result->fetch_assoc()['error_count'];
        $error_stmt->close();
        
        $total_stmt = $conn->prepare("
            SELECT COUNT(*) as total_actions
            FROM activity_logs
            WHERE tenant_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $total_stmt->bind_param("i", $tenant_id);
        $total_stmt->execute();
        $total_result = $total_stmt->get_result();
        $total_actions = $total_result->fetch_assoc()['total_actions'];
        $total_stmt->close();
        
        $error_rate = $total_actions > 0 ? ($error_count / $total_actions) * 100 : 0;
        
        if ($error_rate > 10) {
            $score -= 25;
            $breakdown[] = ['factor' => 'Error Rate', 'impact' => -25, 'value' => round($error_rate, 2) . '%'];
            $recommendations[] = 'High error rate detected. Review recent errors in activity logs.';
        } elseif ($error_rate > 5) {
            $score -= 15;
            $breakdown[] = ['factor' => 'Error Rate', 'impact' => -15, 'value' => round($error_rate, 2) . '%'];
            $recommendations[] = 'Moderate error rate. Monitor system stability.';
        } else {
            $breakdown[] = ['factor' => 'Error Rate', 'impact' => 0, 'value' => round($error_rate, 2) . '%'];
        }
        
        // Factor 2: Storage Usage (max -20 points)
        $storage_stmt = $conn->prepare("SELECT storage_used_mb FROM tenants WHERE id = ?");
        $storage_stmt->bind_param("i", $tenant_id);
        $storage_stmt->execute();
        $storage_result = $storage_stmt->get_result();
        $storage_used = $storage_result->fetch_assoc()['storage_used_mb'] ?: 0;
        $storage_stmt->close();
        
        $storage_percentage = ($storage_used / 1024) * 100; // Assuming 1GB limit
        
        if ($storage_percentage > 90) {
            $score -= 20;
            $breakdown[] = ['factor' => 'Storage Usage', 'impact' => -20, 'value' => round($storage_percentage, 2) . '%'];
            $recommendations[] = 'Storage almost full. Consider upgrading plan or cleaning old data.';
        } elseif ($storage_percentage > 75) {
            $score -= 10;
            $breakdown[] = ['factor' => 'Storage Usage', 'impact' => -10, 'value' => round($storage_percentage, 2) . '%'];
            $recommendations[] = 'Storage usage is high. Monitor closely.';
        } else {
            $breakdown[] = ['factor' => 'Storage Usage', 'impact' => 0, 'value' => round($storage_percentage, 2) . '%'];
        }
        
        // Factor 3: Active Users (max -15 points)
        $active_users_stmt = $conn->prepare("
            SELECT COUNT(DISTINCT user_id) as active_users
            FROM activity_logs
            WHERE tenant_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ");
        $active_users_stmt->bind_param("i", $tenant_id);
        $active_users_stmt->execute();
        $active_result = $active_users_stmt->get_result();
        $active_users = $active_result->fetch_assoc()['active_users'];
        $active_users_stmt->close();
        
        $total_users_stmt = $conn->prepare("SELECT COUNT(*) as total FROM users WHERE tenant_id = ?");
        $total_users_stmt->bind_param("i", $tenant_id);
        $total_users_stmt->execute();
        $total_users_result = $total_users_stmt->get_result();
        $total_users = $total_users_result->fetch_assoc()['total'];
        $total_users_stmt->close();
        
        $activity_rate = $total_users > 0 ? ($active_users / $total_users) * 100 : 100;
        
        if ($activity_rate < 20) {
            $score -= 15;
            $breakdown[] = ['factor' => 'User Activity', 'impact' => -15, 'value' => round($activity_rate, 2) . '%'];
            $recommendations[] = 'Low user engagement. Encourage staff to use the system regularly.';
        } elseif ($activity_rate < 50) {
            $score -= 8;
            $breakdown[] = ['factor' => 'User Activity', 'impact' => -8, 'value' => round($activity_rate, 2) . '%'];
        } else {
            $breakdown[] = ['factor' => 'User Activity', 'impact' => 0, 'value' => round($activity_rate, 2) . '%'];
        }
        
        // Factor 4: Support Tickets (max -15 points)
        $tickets_stmt = $conn->prepare("
            SELECT COUNT(*) as open_tickets
            FROM support_tickets
            WHERE tenant_id = ?
            AND status IN ('open', 'in_progress')
        ");
        $tickets_stmt->bind_param("i", $tenant_id);
        $tickets_stmt->execute();
        $tickets_result = $tickets_stmt->get_result();
        $open_tickets = $tickets_result->fetch_assoc()['open_tickets'];
        $tickets_stmt->close();
        
        if ($open_tickets > 5) {
            $score -= 15;
            $breakdown[] = ['factor' => 'Support Tickets', 'impact' => -15, 'value' => $open_tickets . ' open'];
            $recommendations[] = 'Multiple unresolved support tickets. Prioritize resolution.';
        } elseif ($open_tickets > 2) {
            $score -= 7;
            $breakdown[] = ['factor' => 'Support Tickets', 'impact' => -7, 'value' => $open_tickets . ' open'];
        } else {
            $breakdown[] = ['factor' => 'Support Tickets', 'impact' => 0, 'value' => $open_tickets . ' open'];
        }
        
        // Factor 5: Data Freshness (max -10 points)
        $last_transaction_stmt = $conn->prepare("
            SELECT MAX(created_at) as last_transaction
            FROM transactions
            WHERE tenant_id = ?
        ");
        $last_transaction_stmt->bind_param("i", $tenant_id);
        $last_transaction_stmt->execute();
        $last_transaction_result = $last_transaction_stmt->get_result();
        $last_transaction = $last_transaction_result->fetch_assoc()['last_transaction'];
        $last_transaction_stmt->close();
        
        if ($last_transaction) {
            $days_since_last = (time() - strtotime($last_transaction)) / 86400;
            
            if ($days_since_last > 30) {
                $score -= 10;
                $breakdown[] = ['factor' => 'Data Freshness', 'impact' => -10, 'value' => round($days_since_last) . ' days'];
                $recommendations[] = 'No recent transactions. System may be inactive.';
            } elseif ($days_since_last > 14) {
                $score -= 5;
                $breakdown[] = ['factor' => 'Data Freshness', 'impact' => -5, 'value' => round($days_since_last) . ' days'];
            } else {
                $breakdown[] = ['factor' => 'Data Freshness', 'impact' => 0, 'value' => round($days_since_last) . ' days'];
            }
        }
        
        // Ensure score is within 0-100
        $score = max(0, min(100, $score));
        
        // Determine health status
        $status = 'excellent';
        if ($score < 60) $status = 'critical';
        elseif ($score < 75) $status = 'poor';
        elseif ($score < 85) $status = 'fair';
        elseif ($score < 95) $status = 'good';
        
        // Format breakdown for frontend (converting impact to score)
        $formatted_breakdown = [];
        foreach ($breakdown as $item) {
            $formatted_breakdown[] = [
                'category' => $item['factor'],
                'score' => 100 + $item['impact']
            ];
        }

        // Format recommendations for frontend
        $formatted_recs = [];
        foreach ($recommendations as $rec) {
            $priority = (strpos($rec, 'High') !== false || strpos($rec, 'unresolved') !== false) ? 'high' : 'medium';
            $formatted_recs[] = [
                'priority' => $priority,
                'title' => $priority === 'high' ? 'Priority Issue' : 'Optimization',
                'description' => $rec
            ];
        }

        echo json_encode([
            'success' => true,
            'score' => $score,
            'status' => $status,
            'breakdown' => $formatted_breakdown,
            'recommendations' => $formatted_recs
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
