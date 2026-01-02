<?php
/**
 * Data Retention Worker
 * 
 * Cleans up old logs and optimizes database storage.
 * Runs via cron job daily to maintain database performance.
 * 
 * Retention Policies:
 * - API request logs: 30 days
 * - Application errors: 90 days
 * - Metrics hourly: 90 days
 * - Metrics daily: 365 days (1 year)
 * - Email notifications: 30 days
 * 
 * Features:
 * - Configurable retention periods
 * - Safe deletion with transaction support
 * - Cleanup statistics tracking
 * - Table optimization
 * - Archive support (optional)
 * 
 * Usage: php data_retention_worker.php
 * Cron: 0 2 * * * php /path/to/data_retention_worker.php
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/EventLogger.php';

class DataRetentionWorker {
    private $conn;
    private $logPrefix = '[DataRetention]';
    
    // Retention periods in days (configurable)
    private $retentionPeriods = [
        'api_request_logs' => 30,
        'application_errors' => 90,
        'metrics_hourly' => 90,
        'metrics_daily' => 365,
        'email_notifications' => 30,
    ];
    
    // Statistics
    private $stats = [
        'api_request_logs' => 0,
        'application_errors' => 0,
        'metrics_hourly' => 0,
        'metrics_daily' => 0,
        'email_notifications' => 0,
    ];
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Main execution method
     */
    public function run() {
        $this->log("Starting data retention cleanup...");
        
        try {
            // Start transaction for safety
            $this->conn->begin_transaction();
            
            // Clean up each table
            $this->cleanupApiRequestLogs();
            $this->cleanupApplicationErrors();
            $this->cleanupMetricsHourly();
            $this->cleanupMetricsDaily();
            $this->cleanupEmailNotifications();
            
            // Commit transaction
            $this->conn->commit();
            
            // Optimize tables
            $this->optimizeTables();
            
            // Log statistics
            $this->logStatistics();
            
            $this->log("Data retention cleanup completed successfully");
            return true;
            
        } catch (Exception $e) {
            // Rollback on error
            $this->conn->rollback();
            
            $this->log("ERROR: " . $e->getMessage());
            EventLogger::logError('critical', 'Data retention failed', [
                'error_type' => 'WorkerException',
                'error_code' => 'RETENTION_001',
                'message' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }
    
    /**
     * Clean up old API request logs
     */
    private function cleanupApiRequestLogs() {
        $days = $this->retentionPeriods['api_request_logs'];
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-$days days"));
        
        $this->log("Cleaning API request logs older than $days days ($cutoffDate)...");
        
        // Count records to be deleted
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) as count FROM api_request_logs WHERE created_at < ?"
        );
        $stmt->bind_param("s", $cutoffDate);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $count = $row['count'];
        $stmt->close();
        
        if ($count > 0) {
            // Delete old records
            $stmt = $this->conn->prepare(
                "DELETE FROM api_request_logs WHERE created_at < ?"
            );
            $stmt->bind_param("s", $cutoffDate);
            $stmt->execute();
            $deleted = $stmt->affected_rows;
            $stmt->close();
            
            $this->stats['api_request_logs'] = $deleted;
            $this->log("Deleted $deleted API request logs");
        } else {
            $this->log("No API request logs to delete");
        }
    }
    
    /**
     * Clean up old application errors
     */
    private function cleanupApplicationErrors() {
        $days = $this->retentionPeriods['application_errors'];
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-$days days"));
        
        $this->log("Cleaning application errors older than $days days ($cutoffDate)...");
        
        // Count records to be deleted
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) as count FROM application_errors WHERE created_at < ?"
        );
        $stmt->bind_param("s", $cutoffDate);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $count = $row['count'];
        $stmt->close();
        
        if ($count > 0) {
            // Delete old records
            $stmt = $this->conn->prepare(
                "DELETE FROM application_errors WHERE created_at < ?"
            );
            $stmt->bind_param("s", $cutoffDate);
            $stmt->execute();
            $deleted = $stmt->affected_rows;
            $stmt->close();
            
            $this->stats['application_errors'] = $deleted;
            $this->log("Deleted $deleted application errors");
        } else {
            $this->log("No application errors to delete");
        }
    }
    
    /**
     * Clean up old hourly metrics
     */
    private function cleanupMetricsHourly() {
        $days = $this->retentionPeriods['metrics_hourly'];
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-$days days"));
        
        $this->log("Cleaning hourly metrics older than $days days ($cutoffDate)...");
        
        // Count records to be deleted
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) as count FROM metrics_hourly WHERE created_at < ?"
        );
        $stmt->bind_param("s", $cutoffDate);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $count = $row['count'];
        $stmt->close();
        
        if ($count > 0) {
            // Delete old records
            $stmt = $this->conn->prepare(
                "DELETE FROM metrics_hourly WHERE created_at < ?"
            );
            $stmt->bind_param("s", $cutoffDate);
            $stmt->execute();
            $deleted = $stmt->affected_rows;
            $stmt->close();
            
            $this->stats['metrics_hourly'] = $deleted;
            $this->log("Deleted $deleted hourly metrics");
        } else {
            $this->log("No hourly metrics to delete");
        }
    }
    
    /**
     * Clean up old daily metrics
     */
    private function cleanupMetricsDaily() {
        $days = $this->retentionPeriods['metrics_daily'];
        $cutoffDate = date('Y-m-d', strtotime("-$days days"));
        
        $this->log("Cleaning daily metrics older than $days days ($cutoffDate)...");
        
        // Count records to be deleted
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) as count FROM metrics_daily WHERE date < ?"
        );
        $stmt->bind_param("s", $cutoffDate);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $count = $row['count'];
        $stmt->close();
        
        if ($count > 0) {
            // Delete old records
            $stmt = $this->conn->prepare(
                "DELETE FROM metrics_daily WHERE date < ?"
            );
            $stmt->bind_param("s", $cutoffDate);
            $stmt->execute();
            $deleted = $stmt->affected_rows;
            $stmt->close();
            
            $this->stats['metrics_daily'] = $deleted;
            $this->log("Deleted $deleted daily metrics");
        } else {
            $this->log("No daily metrics to delete");
        }
    }
    
    /**
     * Clean up old email notifications
     */
    private function cleanupEmailNotifications() {
        $days = $this->retentionPeriods['email_notifications'];
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-$days days"));
        
        $this->log("Cleaning email notifications older than $days days ($cutoffDate)...");
        
        // Count records to be deleted
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) as count FROM email_notifications WHERE created_at < ?"
        );
        $stmt->bind_param("s", $cutoffDate);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $count = $row['count'];
        $stmt->close();
        
        if ($count > 0) {
            // Delete old records
            $stmt = $this->conn->prepare(
                "DELETE FROM email_notifications WHERE created_at < ?"
            );
            $stmt->bind_param("s", $cutoffDate);
            $stmt->execute();
            $deleted = $stmt->affected_rows;
            $stmt->close();
            
            $this->stats['email_notifications'] = $deleted;
            $this->log("Deleted $deleted email notifications");
        } else {
            $this->log("No email notifications to delete");
        }
    }
    
    /**
     * Optimize database tables
     */
    private function optimizeTables() {
        $this->log("Optimizing database tables...");
        
        $tables = [
            'api_request_logs',
            'application_errors',
            'metrics_hourly',
            'metrics_daily',
            'email_notifications'
        ];
        
        foreach ($tables as $table) {
            try {
                $this->conn->query("OPTIMIZE TABLE $table");
                $this->log("Optimized table: $table");
            } catch (Exception $e) {
                $this->log("Warning: Could not optimize $table: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Log cleanup statistics
     */
    private function logStatistics() {
        $this->log("Cleanup Statistics:");
        
        $totalDeleted = 0;
        foreach ($this->stats as $table => $count) {
            if ($count > 0) {
                $this->log("  - $table: $count records deleted");
                $totalDeleted += $count;
            }
        }
        
        if ($totalDeleted === 0) {
            $this->log("  - No records deleted (all data within retention period)");
        } else {
            $this->log("  - Total: $totalDeleted records deleted");
        }
        
        // Log to database for tracking
        EventLogger::info('Data retention cleanup completed', [
            'total_deleted' => $totalDeleted,
            'breakdown' => $this->stats,
            'retention_periods' => $this->retentionPeriods
        ]);
    }
    
    /**
     * Get current database sizes
     */
    public function getDatabaseSizes() {
        $this->log("Database Table Sizes:");
        
        $query = "
            SELECT 
                table_name,
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
                table_rows
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
            AND table_name IN (
                'api_request_logs',
                'application_errors',
                'metrics_hourly',
                'metrics_daily',
                'email_notifications'
            )
            ORDER BY (data_length + index_length) DESC
        ";
        
        $result = $this->conn->query($query);
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $this->log("  - {$row['table_name']}: {$row['size_mb']} MB ({$row['table_rows']} rows)");
            }
        }
    }
    
    /**
     * Log message with timestamp
     */
    private function log($message) {
        $timestamp = date('Y-m-d H:i:s');
        echo "[$timestamp] $this->logPrefix $message\n";
    }
}

// Execute if run directly
if (php_sapi_name() === 'cli' && realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'])) {
    echo "=== Data Retention Worker ===\n";
    echo "Started at: " . date('Y-m-d H:i:s') . "\n\n";
    
    $worker = new DataRetentionWorker($conn);
    
    // Show database sizes before cleanup
    $worker->getDatabaseSizes();
    echo "\n";
    
    // Run cleanup
    $success = $worker->run();
    
    echo "\n";
    
    // Show database sizes after cleanup
    $worker->getDatabaseSizes();
    
    echo "\n";
    echo "Finished at: " . date('Y-m-d H:i:s') . "\n";
    echo "Status: " . ($success ? "SUCCESS" : "FAILED") . "\n";
    
    exit($success ? 0 : 1);
}
