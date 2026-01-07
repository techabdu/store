<?php
/**
 * DatabaseHealth Class
 * 
 * Monitors database health including size, table statistics,
 * integrity checks, and growth trends
 */

require_once __DIR__ . '/../config/database.php';

class DatabaseHealth {
    private $conn;
    private $dbName = 'store';
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    /**
     * Get database size information
     * 
     * @return array Database size metrics
     */
    public function getDatabaseSize() {
        try {
            $stmt = $this->conn->prepare(
                "SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                    ROUND(SUM(data_free) / 1024 / 1024, 2) AS free_mb
                 FROM information_schema.TABLES 
                 WHERE table_schema = ?"
            );
            
            $stmt->bind_param("s", $this->dbName);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            // Assume allocated space is 1024 MB (1 GB) - can be configured
            $allocatedMb = 1024;
            $usagePercentage = ($row['size_mb'] / $allocatedMb) * 100;
            
            return [
                'size_mb' => $row['size_mb'],
                'free_mb' => $row['free_mb'],
                'allocated_mb' => $allocatedMb,
                'usage_percentage' => round($usagePercentage, 2)
            ];
        } catch (Exception $e) {
            error_log("Failed to get database size: " . $e->getMessage());
            return [
                'size_mb' => 0,
                'free_mb' => 0,
                'allocated_mb' => 1024,
                'usage_percentage' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get statistics for all tables
     * 
     * @return array Table statistics including row counts and sizes
     */
    public function getTableStatistics() {
        try {
            $stmt = $this->conn->prepare(
                "SELECT 
                    table_name,
                    table_rows,
                    ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                    ROUND(data_length / 1024 / 1024, 2) AS data_mb,
                    ROUND(index_length / 1024 / 1024, 2) AS index_mb
                 FROM information_schema.TABLES 
                 WHERE table_schema = ?
                 ORDER BY (data_length + index_length) DESC"
            );
            
            $stmt->bind_param("s", $this->dbName);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $tables = [];
            while ($row = $result->fetch_assoc()) {
                $tables[] = $row;
            }
            
            $stmt->close();
            return $tables;
        } catch (Exception $e) {
            error_log("Failed to get table statistics: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Check database integrity
     * 
     * @return array Integrity check results
     */
    public function checkDatabaseIntegrity() {
        try {
            $issues = [];
            
            // Check for orphaned activity logs (user_id not in users table)
            // Using LEFT JOIN approach for better MariaDB compatibility
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as orphaned_count 
                 FROM activity_logs al
                 LEFT JOIN users u ON al.user_id = u.id
                 WHERE u.id IS NULL AND al.user_id IS NOT NULL"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['orphaned_count'] > 0) {
                $issues[] = [
                    'type' => 'orphaned_records',
                    'table' => 'activity_logs',
                    'count' => $row['orphaned_count'],
                    'description' => 'Activity logs with non-existent user_id'
                ];
            }
            $stmt->close();
            
            // Check for orphaned transactions (user_id not in users table)
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as orphaned_count 
                 FROM transactions t
                 LEFT JOIN users u ON t.user_id = u.id
                 WHERE u.id IS NULL AND t.user_id IS NOT NULL"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['orphaned_count'] > 0) {
                $issues[] = [
                    'type' => 'orphaned_records',
                    'table' => 'transactions',
                    'count' => $row['orphaned_count'],
                    'description' => 'Transactions with non-existent user_id'
                ];
            }
            $stmt->close();
            
            // Check for orphaned expenses (created_by not in users table)
            // Note: expenses table uses 'created_by' column, not 'user_id'
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as orphaned_count 
                 FROM expenses e
                 LEFT JOIN users u ON e.created_by = u.id
                 WHERE u.id IS NULL AND e.created_by IS NOT NULL"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['orphaned_count'] > 0) {
                $issues[] = [
                    'type' => 'orphaned_records',
                    'table' => 'expenses',
                    'count' => $row['orphaned_count'],
                    'description' => 'Expenses with non-existent created_by user'
                ];
            }
            $stmt->close();
            
            return [
                'status' => count($issues) === 0 ? 'healthy' : 'issues_found',
                'issues' => $issues,
                'checked_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to check database integrity: " . $e->getMessage());
            return [
                'status' => 'error',
                'issues' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get database growth trend over specified days
     * 
     * @param int $days Number of days to analyze (default: 7)
     * @return array Growth trend data
     */
    public function getGrowthTrend($days = 7) {
        try {
            // This requires historical data tracking
            // For now, we'll estimate based on created_at timestamps
            
            $trend = [];
            
            // Get daily transaction counts
            $stmt = $this->conn->prepare(
                "SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as transaction_count
                 FROM transactions
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY date ASC"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $trend[] = [
                    'date' => $row['date'],
                    'transactions' => $row['transaction_count']
                ];
            }
            $stmt->close();
            
            // Get current database size for reference
            $currentSize = $this->getDatabaseSize();
            
            return [
                'period_days' => $days,
                'current_size_mb' => $currentSize['size_mb'],
                'daily_activity' => $trend,
                'estimated_growth_mb_per_day' => count($trend) > 0 ? 
                    round($currentSize['size_mb'] / max(1, count($trend)), 2) : 0
            ];
        } catch (Exception $e) {
            error_log("Failed to get growth trend: " . $e->getMessage());
            return [
                'period_days' => $days,
                'current_size_mb' => 0,
                'daily_activity' => [],
                'estimated_growth_mb_per_day' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Cache database metrics for performance
     * 
     * @param string $metricType Type of metric to cache
     * @param array $data Metric data to cache
     * @return bool Success status
     */
    public function cacheMetric($metricType, $data) {
        try {
            $metricJson = json_encode($data);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+5 minutes'));
            
            $stmt = $this->conn->prepare(
                "INSERT INTO system_metrics (metric_type, metric_data, expires_at) 
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 metric_data = ?, cached_at = NOW(), expires_at = ?"
            );
            
            $stmt->bind_param("sssss", $metricType, $metricJson, $expiresAt, $metricJson, $expiresAt);
            $result = $stmt->execute();
            $stmt->close();
            
            return $result;
        } catch (Exception $e) {
            error_log("Failed to cache metric: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get cached metric if available and not expired
     * 
     * @param string $metricType Type of metric to retrieve
     * @return array|null Cached metric data or null if expired/not found
     */
    public function getCachedMetric($metricType) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT metric_data, cached_at, expires_at 
                 FROM system_metrics 
                 WHERE metric_type = ? AND expires_at > NOW()"
            );
            
            $stmt->bind_param("s", $metricType);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $stmt->close();
                return json_decode($row['metric_data'], true);
            }
            
            $stmt->close();
            return null;
        } catch (Exception $e) {
            error_log("Failed to get cached metric: " . $e->getMessage());
            return null;
        }
    }
}
