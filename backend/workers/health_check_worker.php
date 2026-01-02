<?php
/**
 * Health Check Worker
 * 
 * Monitors system health and reports issues.
 * Runs via cron job every 5 minutes for continuous monitoring.
 * 
 * Health Checks:
 * - Database connectivity
 * - Table integrity
 * - Disk space usage
 * - Worker status (last run times)
 * - Error rates
 * - API availability
 * 
 * Features:
 * - Comprehensive health monitoring
 * - Automatic issue detection
 * - Health score calculation
 * - Alert integration
 * - Status reporting
 * 
 * Usage: php health_check_worker.php
 * Cron: Every 5 minutes
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/EventLogger.php';

class HealthCheckWorker {
    private $conn;
    private $logPrefix = '[HealthCheck]';
    
    // Health check results
    private $checks = [];
    private $issues = [];
    private $healthScore = 100;
    
    // Thresholds
    private $thresholds = [
        'disk_space_warning' => 80,  // 80% usage
        'disk_space_critical' => 90, // 90% usage
        'error_rate_warning' => 5,   // 5% error rate
        'error_rate_critical' => 10, // 10% error rate
        'worker_delay_warning' => 120, // 2 hours
        'worker_delay_critical' => 360, // 6 hours
    ];
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Main execution method
     */
    public function run() {
        $this->log("Starting health check...");
        
        try {
            // Perform all health checks
            $this->checkDatabaseConnection();
            $this->checkDatabaseTables();
            $this->checkDiskSpace();
            $this->checkWorkerStatus();
            $this->checkErrorRates();
            $this->checkApiAvailability();
            
            // Calculate overall health score
            $this->calculateHealthScore();
            
            // Report results
            $this->reportResults();
            
            // Send alerts if critical issues found
            if (!empty($this->issues)) {
                $this->sendHealthAlert();
            }
            
            $this->log("Health check completed successfully");
            $this->log("Overall Health Score: {$this->healthScore}%");
            
            return true;
            
        } catch (Exception $e) {
            $this->log("ERROR: " . $e->getMessage());
            EventLogger::logError('critical', 'Health check failed', [
                'error_type' => 'WorkerException',
                'error_code' => 'HEALTH_001',
                'message' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }
    
    /**
     * Check database connection
     */
    private function checkDatabaseConnection() {
        $this->log("Checking database connection...");
        
        try {
            $result = $this->conn->query("SELECT 1");
            
            if ($result) {
                $this->checks['database_connection'] = [
                    'status' => 'healthy',
                    'message' => 'Database connection active'
                ];
                $this->log("✓ Database connection healthy");
            } else {
                $this->addIssue('critical', 'Database connection failed');
            }
        } catch (Exception $e) {
            $this->addIssue('critical', 'Database connection error: ' . $e->getMessage());
        }
    }
    
    /**
     * Check database table integrity
     */
    private function checkDatabaseTables() {
        $this->log("Checking database tables...");
        
        $requiredTables = [
            'api_request_logs',
            'application_errors',
            'metrics_hourly',
            'metrics_daily',
            'email_notifications'
        ];
        
        $missingTables = [];
        
        foreach ($requiredTables as $table) {
            $result = $this->conn->query("SHOW TABLES LIKE '$table'");
            if (!$result || $result->num_rows === 0) {
                $missingTables[] = $table;
            }
        }
        
        if (empty($missingTables)) {
            $this->checks['database_tables'] = [
                'status' => 'healthy',
                'message' => 'All required tables present'
            ];
            $this->log("✓ All database tables present");
        } else {
            $this->addIssue('critical', 'Missing tables: ' . implode(', ', $missingTables));
        }
    }
    
    /**
     * Check disk space usage
     */
    private function checkDiskSpace() {
        $this->log("Checking disk space...");
        
        $path = __DIR__ . '/../../';
        $freeSpace = disk_free_space($path);
        $totalSpace = disk_total_space($path);
        
        if ($freeSpace !== false && $totalSpace !== false) {
            $usedSpace = $totalSpace - $freeSpace;
            $usagePercent = ($usedSpace / $totalSpace) * 100;
            
            $freeGB = round($freeSpace / 1024 / 1024 / 1024, 2);
            $totalGB = round($totalSpace / 1024 / 1024 / 1024, 2);
            
            if ($usagePercent >= $this->thresholds['disk_space_critical']) {
                $this->addIssue('critical', "Disk space critical: {$usagePercent}% used ({$freeGB}GB free)");
            } elseif ($usagePercent >= $this->thresholds['disk_space_warning']) {
                $this->addIssue('warning', "Disk space warning: {$usagePercent}% used ({$freeGB}GB free)");
            } else {
                $this->checks['disk_space'] = [
                    'status' => 'healthy',
                    'message' => "Disk space healthy: {$usagePercent}% used ({$freeGB}GB free of {$totalGB}GB)"
                ];
                $this->log("✓ Disk space healthy: {$freeGB}GB free");
            }
        } else {
            $this->addIssue('warning', 'Could not check disk space');
        }
    }
    
    /**
     * Check worker status (last run times)
     */
    private function checkWorkerStatus() {
        $this->log("Checking worker status...");
        
        // Check metrics aggregation worker
        $result = $this->conn->query(
            "SELECT MAX(created_at) as last_run 
             FROM metrics_hourly 
             WHERE metric_type = 'api_requests'"
        );
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $lastRun = $row['last_run'];
            
            if ($lastRun) {
                $minutesSinceRun = (time() - strtotime($lastRun)) / 60;
                
                if ($minutesSinceRun > $this->thresholds['worker_delay_critical']) {
                    $this->addIssue('critical', "Metrics worker not running (last run: " . round($minutesSinceRun) . " minutes ago)");
                } elseif ($minutesSinceRun > $this->thresholds['worker_delay_warning']) {
                    $this->addIssue('warning', "Metrics worker delayed (last run: " . round($minutesSinceRun) . " minutes ago)");
                } else {
                    $this->checks['worker_status'] = [
                        'status' => 'healthy',
                        'message' => 'Workers running normally'
                    ];
                    $this->log("✓ Workers running normally");
                }
            } else {
                $this->addIssue('warning', 'No metrics data found - workers may not have run yet');
            }
        }
    }
    
    /**
     * Check error rates
     */
    private function checkErrorRates() {
        $this->log("Checking error rates...");
        
        // Check last hour's error rate
        $oneHourAgo = date('Y-m-d H:i:s', strtotime('-1 hour'));
        
        $result = $this->conn->query(
            "SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as error_count
             FROM api_request_logs
             WHERE created_at >= '$oneHourAgo'"
        );
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $totalRequests = $row['total_requests'];
            $errorCount = $row['error_count'];
            
            if ($totalRequests > 0) {
                $errorRate = ($errorCount / $totalRequests) * 100;
                
                if ($errorRate >= $this->thresholds['error_rate_critical']) {
                    $this->addIssue('critical', "High error rate: {$errorRate}% ({$errorCount}/{$totalRequests})");
                } elseif ($errorRate >= $this->thresholds['error_rate_warning']) {
                    $this->addIssue('warning', "Elevated error rate: {$errorRate}% ({$errorCount}/{$totalRequests})");
                } else {
                    $this->checks['error_rate'] = [
                        'status' => 'healthy',
                        'message' => "Error rate healthy: {$errorRate}% ({$errorCount}/{$totalRequests})"
                    ];
                    $this->log("✓ Error rate healthy: {$errorRate}%");
                }
            } else {
                $this->checks['error_rate'] = [
                    'status' => 'healthy',
                    'message' => 'No requests in last hour'
                ];
                $this->log("✓ No requests in last hour");
            }
        }
    }
    
    /**
     * Check API availability
     */
    private function checkApiAvailability() {
        $this->log("Checking API availability...");
        
        // Check if any API endpoints are responding
        $result = $this->conn->query(
            "SELECT COUNT(*) as count 
             FROM api_request_logs 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)"
        );
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $recentRequests = $row['count'];
            
            if ($recentRequests > 0) {
                $this->checks['api_availability'] = [
                    'status' => 'healthy',
                    'message' => "API active ($recentRequests requests in last 5 minutes)"
                ];
                $this->log("✓ API active: $recentRequests requests");
            } else {
                $this->addIssue('warning', 'No API requests in last 5 minutes');
            }
        }
    }
    
    /**
     * Calculate overall health score
     */
    private function calculateHealthScore() {
        $totalChecks = count($this->checks);
        $criticalIssues = 0;
        $warnings = 0;
        
        foreach ($this->issues as $issue) {
            if ($issue['severity'] === 'critical') {
                $criticalIssues++;
            } else {
                $warnings++;
            }
        }
        
        // Deduct points for issues
        $this->healthScore = 100;
        $this->healthScore -= ($criticalIssues * 20); // -20 per critical
        $this->healthScore -= ($warnings * 5);        // -5 per warning
        
        // Ensure score doesn't go below 0
        $this->healthScore = max(0, $this->healthScore);
    }
    
    /**
     * Add an issue to the list
     */
    private function addIssue($severity, $message) {
        $this->issues[] = [
            'severity' => $severity,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        $icon = $severity === 'critical' ? '✗' : '⚠';
        $this->log("$icon $message");
    }
    
    /**
     * Report health check results
     */
    private function reportResults() {
        $this->log("\n=== Health Check Summary ===");
        $this->log("Checks Passed: " . count($this->checks));
        $this->log("Issues Found: " . count($this->issues));
        $this->log("Health Score: {$this->healthScore}%");
        
        if (!empty($this->issues)) {
            $this->log("\nIssues:");
            foreach ($this->issues as $issue) {
                $this->log("  [{$issue['severity']}] {$issue['message']}");
            }
        }
    }
    
    /**
     * Send health alert if critical issues found
     */
    private function sendHealthAlert() {
        $criticalIssues = array_filter($this->issues, function($issue) {
            return $issue['severity'] === 'critical';
        });
        
        if (!empty($criticalIssues)) {
            $this->log("Sending health alert for critical issues...");
            
            EventLogger::logError('critical', 'System health check failed', [
                'error_type' => 'HealthCheckFailure',
                'health_score' => $this->healthScore,
                'critical_issues' => count($criticalIssues),
                'total_issues' => count($this->issues),
                'issues' => $this->issues
            ]);
        }
    }
    
    /**
     * Get health status for API
     */
    public function getHealthStatus() {
        return [
            'status' => $this->healthScore >= 80 ? 'healthy' : ($this->healthScore >= 50 ? 'degraded' : 'unhealthy'),
            'score' => $this->healthScore,
            'checks' => $this->checks,
            'issues' => $this->issues,
            'timestamp' => date('Y-m-d H:i:s')
        ];
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
    echo "=== Health Check Worker ===\n";
    echo "Started at: " . date('Y-m-d H:i:s') . "\n\n";
    
    $worker = new HealthCheckWorker($conn);
    $success = $worker->run();
    
    echo "\n";
    echo "Finished at: " . date('Y-m-d H:i:s') . "\n";
    echo "Status: " . ($success ? "SUCCESS" : "FAILED") . "\n";
    
    exit($success ? 0 : 1);
}
