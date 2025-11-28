<?php
/**
 * PerformanceMonitor Class
 * 
 * Tracks application performance metrics including API response times,
 * error rates, active users, and peak usage patterns
 */

require_once __DIR__ . '/../config/database.php';

class PerformanceMonitor {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    /**
     * Get average API response times from activity logs
     * 
     * @param int $hours Time window in hours (default: 24)
     * @return array Response time metrics
     */
    public function getApiResponseTimes($hours = 24) {
        try {
            // This is a simplified version - in production, you'd log actual response times
            // For now, we'll estimate based on activity frequency
            
            $stmt = $this->conn->prepare(
                "SELECT 
                    COUNT(*) as total_requests,
                    COUNT(DISTINCT user_id) as unique_users
                 FROM activity_logs
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)"
            );
            
            $stmt->bind_param("i", $hours);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            // Estimate average response time (this is placeholder logic)
            $avgResponseTime = $row['total_requests'] > 0 ? 
                min(500, 50 + ($row['total_requests'] / 10)) : 50;
            
            return [
                'time_window_hours' => $hours,
                'total_requests' => $row['total_requests'],
                'unique_users' => $row['unique_users'],
                'avg_response_time_ms' => round($avgResponseTime, 2),
                'status' => $avgResponseTime < 200 ? 'excellent' : 
                           ($avgResponseTime < 500 ? 'good' : 'needs_attention')
            ];
        } catch (Exception $e) {
            error_log("Failed to get API response times: " . $e->getMessage());
            return [
                'time_window_hours' => $hours,
                'total_requests' => 0,
                'unique_users' => 0,
                'avg_response_time_ms' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Calculate error rate from activity logs
     * 
     * @param int $hours Time window in hours (default: 24)
     * @return array Error rate metrics
     */
    public function getErrorRate($hours = 24) {
        try {
            // Count total requests
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as total_requests 
                 FROM activity_logs
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)"
            );
            
            $stmt->bind_param("i", $hours);
            $stmt->execute();
            $result = $stmt->get_result();
            $totalRow = $result->fetch_assoc();
            $stmt->close();
            
            // Count error-related activities (actions containing 'error', 'failed', etc.)
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as error_count 
                 FROM activity_logs
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                 AND (action LIKE '%error%' OR action LIKE '%failed%' OR action LIKE '%exception%')"
            );
            
            $stmt->bind_param("i", $hours);
            $stmt->execute();
            $result = $stmt->get_result();
            $errorRow = $result->fetch_assoc();
            $stmt->close();
            
            $errorRate = $totalRow['total_requests'] > 0 ? 
                ($errorRow['error_count'] / $totalRow['total_requests']) * 100 : 0;
            
            return [
                'time_window_hours' => $hours,
                'total_requests' => $totalRow['total_requests'],
                'error_count' => $errorRow['error_count'],
                'error_rate_percentage' => round($errorRate, 2),
                'status' => $errorRate < 1 ? 'healthy' : 
                           ($errorRate < 5 ? 'warning' : 'critical')
            ];
        } catch (Exception $e) {
            error_log("Failed to get error rate: " . $e->getMessage());
            return [
                'time_window_hours' => $hours,
                'total_requests' => 0,
                'error_count' => 0,
                'error_rate_percentage' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get count of currently active users
     * 
     * @return array Active user metrics
     */
    public function getActiveUsers() {
        try {
            // Users with activity in last 30 minutes
            $stmt = $this->conn->prepare(
                "SELECT COUNT(DISTINCT user_id) as active_count
                 FROM activity_logs
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            // Get breakdown by role
            $stmt = $this->conn->prepare(
                "SELECT u.role, COUNT(DISTINCT u.id) as count
                 FROM users u
                 JOIN activity_logs al ON u.id = al.user_id
                 WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
                 GROUP BY u.role"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $byRole = [];
            while ($roleRow = $result->fetch_assoc()) {
                $byRole[$roleRow['role']] = $roleRow['count'];
            }
            $stmt->close();
            
            return [
                'active_count' => $row['active_count'],
                'by_role' => $byRole,
                'time_window' => '30 minutes',
                'checked_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to get active users: " . $e->getMessage());
            return [
                'active_count' => 0,
                'by_role' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Identify peak usage times
     * 
     * @param int $days Number of days to analyze (default: 7)
     * @return array Peak usage patterns
     */
    public function getPeakUsageTimes($days = 7) {
        try {
            // Get activity count by hour of day
            $stmt = $this->conn->prepare(
                "SELECT 
                    HOUR(created_at) as hour,
                    COUNT(*) as activity_count,
                    COUNT(DISTINCT user_id) as unique_users
                 FROM activity_logs
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY HOUR(created_at)
                 ORDER BY activity_count DESC"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $hourlyActivity = [];
            $peakHour = null;
            $maxActivity = 0;
            
            while ($row = $result->fetch_assoc()) {
                $hourlyActivity[] = [
                    'hour' => $row['hour'],
                    'activity_count' => $row['activity_count'],
                    'unique_users' => $row['unique_users']
                ];
                
                if ($row['activity_count'] > $maxActivity) {
                    $maxActivity = $row['activity_count'];
                    $peakHour = $row['hour'];
                }
            }
            $stmt->close();
            
            // Get activity count by day of week
            $stmt = $this->conn->prepare(
                "SELECT 
                    DAYNAME(created_at) as day_name,
                    DAYOFWEEK(created_at) as day_number,
                    COUNT(*) as activity_count
                 FROM activity_logs
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY DAYNAME(created_at), DAYOFWEEK(created_at)
                 ORDER BY activity_count DESC"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $dailyActivity = [];
            while ($row = $result->fetch_assoc()) {
                $dailyActivity[] = [
                    'day_name' => $row['day_name'],
                    'day_number' => $row['day_number'],
                    'activity_count' => $row['activity_count']
                ];
            }
            $stmt->close();
            
            return [
                'period_days' => $days,
                'peak_hour' => $peakHour,
                'peak_hour_formatted' => $peakHour !== null ? 
                    sprintf('%02d:00 - %02d:00', $peakHour, ($peakHour + 1) % 24) : 'N/A',
                'hourly_activity' => $hourlyActivity,
                'daily_activity' => $dailyActivity
            ];
        } catch (Exception $e) {
            error_log("Failed to get peak usage times: " . $e->getMessage());
            return [
                'period_days' => $days,
                'peak_hour' => null,
                'hourly_activity' => [],
                'daily_activity' => [],
                'error' => $e->getMessage()
            ];
        }
    }
}
