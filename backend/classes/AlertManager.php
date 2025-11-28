<?php
/**
 * AlertManager Class
 * 
 * Manages system alerts including creation, retrieval, and resolution
 */

require_once __DIR__ . '/../config/database.php';

class AlertManager {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    /**
     * Create a new system alert
     * 
     * @param string $type Alert category (security, database, performance, business)
     * @param string $severity Alert severity (critical, warning, info)
     * @param string $message Brief alert description
     * @param string $details Additional details in JSON format
     * @return bool Success status
     */
    public function createAlert($type, $severity, $message, $details = null) {
        try {
            // Check if similar alert already exists and is unresolved
            $stmt = $this->conn->prepare(
                "SELECT id FROM system_alerts 
                 WHERE type = ? AND message = ? AND resolved = FALSE 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)"
            );
            
            $stmt->bind_param("ss", $type, $message);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // Don't create duplicate alerts within 1 hour
            if ($result->num_rows > 0) {
                $stmt->close();
                return true;
            }
            $stmt->close();
            
            // Create new alert
            $stmt = $this->conn->prepare(
                "INSERT INTO system_alerts (type, severity, message, details) 
                 VALUES (?, ?, ?, ?)"
            );
            
            $stmt->bind_param("ssss", $type, $severity, $message, $details);
            $result = $stmt->execute();
            $stmt->close();
            
            return $result;
        } catch (Exception $e) {
            error_log("Failed to create alert: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get all active (unresolved) alerts
     * 
     * @param string $severity Filter by severity (optional)
     * @param int $limit Maximum number of alerts to return
     * @return array Active alerts
     */
    public function getActiveAlerts($severity = null, $limit = 50) {
        try {
            if ($severity) {
                $stmt = $this->conn->prepare(
                    "SELECT id, type, severity, message, details, created_at 
                     FROM system_alerts 
                     WHERE resolved = FALSE AND severity = ?
                     ORDER BY 
                         CASE severity 
                             WHEN 'critical' THEN 1 
                             WHEN 'warning' THEN 2 
                             WHEN 'info' THEN 3 
                         END,
                         created_at DESC 
                     LIMIT ?"
                );
                $stmt->bind_param("si", $severity, $limit);
            } else {
                $stmt = $this->conn->prepare(
                    "SELECT id, type, severity, message, details, created_at 
                     FROM system_alerts 
                     WHERE resolved = FALSE 
                     ORDER BY 
                         CASE severity 
                             WHEN 'critical' THEN 1 
                             WHEN 'warning' THEN 2 
                             WHEN 'info' THEN 3 
                         END,
                         created_at DESC 
                     LIMIT ?"
                );
                $stmt->bind_param("i", $limit);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $alerts = [];
            while ($row = $result->fetch_assoc()) {
                // Decode JSON details if present
                if ($row['details']) {
                    $row['details'] = json_decode($row['details'], true);
                }
                $alerts[] = $row;
            }
            
            $stmt->close();
            return $alerts;
        } catch (Exception $e) {
            error_log("Failed to get active alerts: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Resolve an alert
     * 
     * @param int $alertId Alert ID to resolve
     * @param int $userId User ID who resolved the alert
     * @return bool Success status
     */
    public function resolveAlert($alertId, $userId = null) {
        try {
            $stmt = $this->conn->prepare(
                "UPDATE system_alerts 
                 SET resolved = TRUE, resolved_at = NOW(), resolved_by = ? 
                 WHERE id = ?"
            );
            
            $stmt->bind_param("ii", $userId, $alertId);
            $result = $stmt->execute();
            $stmt->close();
            
            return $result;
        } catch (Exception $e) {
            error_log("Failed to resolve alert: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check alert thresholds and create alerts if needed
     * 
     * @return array Created alerts
     */
    public function checkThresholds() {
        $createdAlerts = [];
        
        try {
            // Check database size threshold (> 50% of allocated space)
            $dbHealth = new DatabaseHealth();
            $dbSize = $dbHealth->getDatabaseSize();
            
            if (isset($dbSize['usage_percentage']) && $dbSize['usage_percentage'] > 50) {
                $created = $this->createAlert(
                    'database',
                    'warning',
                    'Database size exceeds 50% of allocated space',
                    json_encode([
                        'current_size_mb' => $dbSize['size_mb'],
                        'allocated_mb' => $dbSize['allocated_mb'],
                        'usage_percentage' => $dbSize['usage_percentage']
                    ])
                );
                
                if ($created) {
                    $createdAlerts[] = 'database_size_threshold';
                }
            }
            
            // Note: Failed login threshold is checked in SecurityMonitor::logFailedLogin()
            
            return $createdAlerts;
        } catch (Exception $e) {
            error_log("Failed to check thresholds: " . $e->getMessage());
            return $createdAlerts;
        }
    }
    
    /**
     * Get alert statistics
     * 
     * @return array Alert counts by severity and type
     */
    public function getAlertStatistics() {
        try {
            $stats = [
                'by_severity' => [],
                'by_type' => [],
                'total_active' => 0,
                'total_resolved' => 0
            ];
            
            // Count by severity
            $stmt = $this->conn->prepare(
                "SELECT severity, COUNT(*) as count 
                 FROM system_alerts 
                 WHERE resolved = FALSE 
                 GROUP BY severity"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $stats['by_severity'][$row['severity']] = $row['count'];
                $stats['total_active'] += $row['count'];
            }
            $stmt->close();
            
            // Count by type
            $stmt = $this->conn->prepare(
                "SELECT type, COUNT(*) as count 
                 FROM system_alerts 
                 WHERE resolved = FALSE 
                 GROUP BY type"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $stats['by_type'][$row['type']] = $row['count'];
            }
            $stmt->close();
            
            // Count resolved alerts
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as count FROM system_alerts WHERE resolved = TRUE"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stats['total_resolved'] = $row['count'];
            $stmt->close();
            
            return $stats;
        } catch (Exception $e) {
            error_log("Failed to get alert statistics: " . $e->getMessage());
            return [
                'by_severity' => [],
                'by_type' => [],
                'total_active' => 0,
                'total_resolved' => 0
            ];
        }
    }
}

// Include DatabaseHealth for threshold checking
require_once __DIR__ . '/DatabaseHealth.php';
