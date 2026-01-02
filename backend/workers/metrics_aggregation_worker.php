<?php
/**
 * Metrics Aggregation Worker
 * 
 * Aggregates raw API request logs into hourly and daily metrics.
 * Runs via cron job every hour to process the previous hour's data.
 * 
 * Metrics Calculated:
 * - API request count
 * - Average response time
 * - Error rate
 * - Request volume by module
 * - Peak request times
 * 
 * Usage: php metrics_aggregation_worker.php
 * Cron: 0 * * * * php /path/to/metrics_aggregation_worker.php
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/EventLogger.php';

class MetricsAggregationWorker {
    private $conn;
    private $logPrefix = '[MetricsWorker]';
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Main execution method
     */
    public function run() {
        $this->log("Starting metrics aggregation...");
        
        try {
            // Aggregate hourly metrics for the previous hour
            $this->aggregateHourlyMetrics();
            
            // If it's midnight, aggregate daily metrics for yesterday
            $currentHour = (int)date('H');
            if ($currentHour === 0) {
                $this->aggregateDailyMetrics();
            }
            
            $this->log("Metrics aggregation completed successfully");
            return true;
            
        } catch (Exception $e) {
            $this->log("ERROR: " . $e->getMessage());
            EventLogger::logError('critical', 'Metrics aggregation failed', [
                'error_type' => 'WorkerException',
                'error_code' => 'METRICS_001',
                'message' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }
    
    /**
     * Aggregate metrics for the previous hour
     */
    private function aggregateHourlyMetrics() {
        $this->log("Aggregating hourly metrics...");
        
        // Calculate the previous hour timestamp
        $hourTimestamp = date('Y-m-d H:00:00', strtotime('-1 hour'));
        $hourStart = $hourTimestamp;
        $hourEnd = date('Y-m-d H:59:59', strtotime($hourTimestamp));
        
        $this->log("Processing hour: $hourTimestamp");
        
        // Check if already aggregated
        $check = $this->conn->prepare(
            "SELECT id FROM metrics_hourly 
             WHERE hour_timestamp = ? AND metric_type = 'api_requests' 
             LIMIT 1"
        );
        $check->bind_param("s", $hourTimestamp);
        $check->execute();
        $result = $check->get_result();
        
        if ($result->num_rows > 0) {
            $this->log("Hour already aggregated, skipping...");
            $check->close();
            return;
        }
        $check->close();
        
        // Aggregate API request metrics
        $this->aggregateApiRequestMetrics($hourTimestamp, $hourStart, $hourEnd);
        
        // Aggregate error metrics
        $this->aggregateErrorMetrics($hourTimestamp, $hourStart, $hourEnd);
        
        // Aggregate module metrics
        $this->aggregateModuleMetrics($hourTimestamp, $hourStart, $hourEnd);
        
        $this->log("Hourly metrics aggregated successfully");
    }
    
    /**
     * Aggregate API request metrics
     */
    private function aggregateApiRequestMetrics($hourTimestamp, $hourStart, $hourEnd) {
        // Get API request statistics
        $query = "
            SELECT 
                COUNT(*) as total_requests,
                AVG(response_time_ms) as avg_response_time,
                MIN(response_time_ms) as min_response_time,
                MAX(response_time_ms) as max_response_time,
                SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as error_count
            FROM api_request_logs
            WHERE created_at >= ? AND created_at <= ?
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ss", $hourStart, $hourEnd);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats = $result->fetch_assoc();
        $stmt->close();
        
        if ($stats['total_requests'] > 0) {
            // Calculate error rate
            $errorRate = ($stats['error_count'] / $stats['total_requests']) * 100;
            
            // Prepare metadata
            $metadata = json_encode([
                'min_response_time' => round($stats['min_response_time'], 2),
                'max_response_time' => round($stats['max_response_time'], 2),
                'error_count' => (int)$stats['error_count'],
                'error_rate' => round($errorRate, 2)
            ]);
            
            // Insert metric
            $insert = $this->conn->prepare(
                "INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count, metadata) 
                 VALUES (?, 'api_requests', ?, ?, ?)"
            );
            
            $avgResponseTime = round($stats['avg_response_time'], 2);
            $totalRequests = (int)$stats['total_requests'];
            
            $insert->bind_param("sdis", $hourTimestamp, $avgResponseTime, $totalRequests, $metadata);
            $insert->execute();
            $insert->close();
            
            $this->log("API requests: $totalRequests (avg: {$avgResponseTime}ms, errors: {$stats['error_count']})");
        }
    }
    
    /**
     * Aggregate error metrics
     */
    private function aggregateErrorMetrics($hourTimestamp, $hourStart, $hourEnd) {
        // Get error statistics
        $query = "
            SELECT 
                COUNT(*) as total_errors,
                SUM(CASE WHEN error_level = 'warning' THEN 1 ELSE 0 END) as warnings,
                SUM(CASE WHEN error_level = 'error' THEN 1 ELSE 0 END) as errors,
                SUM(CASE WHEN error_level = 'critical' THEN 1 ELSE 0 END) as critical
            FROM application_errors
            WHERE created_at >= ? AND created_at <= ?
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ss", $hourStart, $hourEnd);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats = $result->fetch_assoc();
        $stmt->close();
        
        if ($stats['total_errors'] > 0) {
            // Prepare metadata
            $metadata = json_encode([
                'warnings' => (int)$stats['warnings'],
                'errors' => (int)$stats['errors'],
                'critical' => (int)$stats['critical']
            ]);
            
            // Insert metric
            $insert = $this->conn->prepare(
                "INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count, metadata) 
                 VALUES (?, 'application_errors', ?, ?, ?)"
            );
            
            $totalErrors = (int)$stats['total_errors'];
            $criticalCount = (int)$stats['critical'];
            
            $insert->bind_param("sdis", $hourTimestamp, $criticalCount, $totalErrors, $metadata);
            $insert->execute();
            $insert->close();
            
            $this->log("Errors: $totalErrors (critical: {$stats['critical']}, errors: {$stats['errors']}, warnings: {$stats['warnings']})");
        }
    }
    
    /**
     * Aggregate module-specific metrics
     */
    private function aggregateModuleMetrics($hourTimestamp, $hourStart, $hourEnd) {
        // Get per-module statistics
        $query = "
            SELECT 
                module,
                COUNT(*) as request_count,
                AVG(response_time_ms) as avg_response_time,
                SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as error_count
            FROM api_request_logs
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY module
            HAVING request_count > 0
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ss", $hourStart, $hourEnd);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $module = $row['module'];
            $requestCount = (int)$row['request_count'];
            $avgResponseTime = round($row['avg_response_time'], 2);
            $errorCount = (int)$row['error_count'];
            
            // Prepare metadata
            $metadata = json_encode([
                'module' => $module,
                'error_count' => $errorCount,
                'error_rate' => round(($errorCount / $requestCount) * 100, 2)
            ]);
            
            // Insert metric
            $insert = $this->conn->prepare(
                "INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count, metadata) 
                 VALUES (?, ?, ?, ?, ?)"
            );
            
            $metricType = "module_$module";
            
            $insert->bind_param("ssdis", $hourTimestamp, $metricType, $avgResponseTime, $requestCount, $metadata);
            $insert->execute();
            $insert->close();
            
            $this->log("Module '$module': $requestCount requests (avg: {$avgResponseTime}ms)");
        }
        
        $stmt->close();
    }
    
    /**
     * Aggregate daily metrics from hourly data
     */
    private function aggregateDailyMetrics() {
        $this->log("Aggregating daily metrics...");
        
        // Calculate yesterday's date
        $date = date('Y-m-d', strtotime('-1 day'));
        
        $this->log("Processing date: $date");
        
        // Check if already aggregated
        $check = $this->conn->prepare(
            "SELECT id FROM metrics_daily 
             WHERE date = ? AND metric_type = 'api_requests' 
             LIMIT 1"
        );
        $check->bind_param("s", $date);
        $check->execute();
        $result = $check->get_result();
        
        if ($result->num_rows > 0) {
            $this->log("Date already aggregated, skipping...");
            $check->close();
            return;
        }
        $check->close();
        
        // Aggregate from hourly metrics
        $this->aggregateDailyFromHourly($date, 'api_requests');
        $this->aggregateDailyFromHourly($date, 'application_errors');
        
        $this->log("Daily metrics aggregated successfully");
    }
    
    /**
     * Aggregate daily metrics from hourly data for a specific metric type
     */
    private function aggregateDailyFromHourly($date, $metricType) {
        $dayStart = "$date 00:00:00";
        $dayEnd = "$date 23:59:59";
        
        // Get hourly data for the day
        $query = "
            SELECT 
                SUM(count) as total_count,
                AVG(metric_value) as avg_value,
                MIN(metric_value) as min_value,
                MAX(metric_value) as max_value,
                metadata
            FROM metrics_hourly
            WHERE hour_timestamp >= ? AND hour_timestamp <= ?
            AND metric_type = ?
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("sss", $dayStart, $dayEnd, $metricType);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats = $result->fetch_assoc();
        $stmt->close();
        
        if ($stats['total_count'] > 0) {
            // Aggregate metadata from all hourly entries
            $metadataQuery = "
                SELECT metadata 
                FROM metrics_hourly
                WHERE hour_timestamp >= ? AND hour_timestamp <= ?
                AND metric_type = ?
            ";
            
            $metaStmt = $this->conn->prepare($metadataQuery);
            $metaStmt->bind_param("sss", $dayStart, $dayEnd, $metricType);
            $metaStmt->execute();
            $metaResult = $metaStmt->get_result();
            
            $aggregatedMeta = [
                'min_value' => round($stats['min_value'], 2),
                'max_value' => round($stats['max_value'], 2),
                'hourly_count' => 0
            ];
            
            while ($metaRow = $metaResult->fetch_assoc()) {
                $aggregatedMeta['hourly_count']++;
            }
            $metaStmt->close();
            
            $metadata = json_encode($aggregatedMeta);
            
            // Insert daily metric
            $insert = $this->conn->prepare(
                "INSERT INTO metrics_daily (date, metric_type, metric_value, count, metadata) 
                 VALUES (?, ?, ?, ?, ?)"
            );
            
            $avgValue = round($stats['avg_value'], 2);
            $totalCount = (int)$stats['total_count'];
            
            $insert->bind_param("ssdis", $date, $metricType, $avgValue, $totalCount, $metadata);
            $insert->execute();
            $insert->close();
            
            $this->log("Daily $metricType: $totalCount total (avg: $avgValue)");
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
    echo "=== Metrics Aggregation Worker ===\n";
    echo "Started at: " . date('Y-m-d H:i:s') . "\n\n";
    
    $worker = new MetricsAggregationWorker($conn);
    $success = $worker->run();
    
    echo "\n";
    echo "Finished at: " . date('Y-m-d H:i:s') . "\n";
    echo "Status: " . ($success ? "SUCCESS" : "FAILED") . "\n";
    
    exit($success ? 0 : 1);
}
