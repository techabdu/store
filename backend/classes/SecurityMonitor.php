<?php
/**
 * SecurityMonitor Class
 * 
 * Handles security monitoring including failed login tracking,
 * suspicious activity detection, and session monitoring
 */

require_once __DIR__ . '/../config/database.php';

class SecurityMonitor {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    /**
     * Log a failed login attempt
     * 
     * @param string $username Username that failed to authenticate
     * @param string $ip IP address of the attempt
     * @param string $userAgent Browser/client information
     * @return bool Success status
     */
    /**
     * Log a failed login attempt
     * 
     * @param string $username Username that failed to authenticate
     * @param string $ip IP address of the attempt
     * @param string $userAgent Browser/client information
     * @return bool Success status
     */
    public function logFailedLogin($username, $ip, $userAgent = '') {
        try {
            // Attempt to resolve tenant_id from username
            $tenantId = $this->getTenantIdByUsername($username);
            
            $stmt = $this->conn->prepare(
                "INSERT INTO security_logs (tenant_id, event_type, username, ip_address, user_agent, details) 
                 VALUES (?, 'failed_login', ?, ?, ?, ?)"
            );
            
            $details = json_encode([
                'timestamp' => date('Y-m-d H:i:s'),
                'attempted_username' => $username,
                'tenant_resolved' => ($tenantId !== null)
            ]);
            
            // tenantId is nullable now (requires schema update)
            $stmt->bind_param("issss", $tenantId, $username, $ip, $userAgent, $details);
            $result = $stmt->execute();
            $stmt->close();
            
            // Check if threshold exceeded (> 3 in 10 minutes)
            $this->checkFailedLoginThreshold($ip, $username);
            
            return $result;
        } catch (Exception $e) {
            error_log("Failed to log failed login: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Helper to get tenant ID by username
     */
    private function getTenantIdByUsername($username) {
        try {
            $stmt = $this->conn->prepare("SELECT tenant_id FROM users WHERE username = ? LIMIT 1");
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                return $row['tenant_id'];
            }
            return null;
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Log a generic security event
     */
    public function logSecurityEvent($eventType, $username = null, $ip = null, $details = []) {
        try {
            if (!$ip) $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $tenantId = $username ? $this->getTenantIdByUsername($username) : null;
            
            $stmt = $this->conn->prepare(
                "INSERT INTO security_logs (tenant_id, event_type, username, ip_address, details) 
                 VALUES (?, ?, ?, ?, ?)"
            );
            
            // Handle nullable tenant_id
            // If tenant_id is null, we need to handle that. 
            // The schema update made tenant_id nullable so this is fine.
            
            $detailsJson = json_encode($details);
            $stmt->bind_param("issss", $tenantId, $eventType, $username, $ip, $detailsJson);
            $stmt->execute();
            $stmt->close();
            return true;
        } catch (Exception $e) {
            error_log("Failed to log security event: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if a specific action is rate limited
     * 
     * @param string $actionType Event type to check (e.g., 'failed_login', 'password_reset_request')
     * @param string $ip IP address
     * @param string $username Target username/identifier
     * @param int $limit Max attempts
     * @param int $minutes Time window in minutes
     * @return bool True if rate limited
     */
    public function isActionRateLimited($actionType, $ip, $username, $limit = 5, $minutes = 10) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as attempt_count 
                 FROM security_logs 
                 WHERE event_type = ? 
                 AND (ip_address = ? OR (? IS NOT NULL AND username = ?))
                 AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)"
            );
            
            $stmt->bind_param("ssssi", $actionType, $ip, $username, $username, $minutes);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            return $row['attempt_count'] >= $limit;
        } catch (Exception $e) {
            error_log("Rate limit check failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if default failed login rate limit is exceeded
     */
    public function isRateLimited($ip, $username) {
        return $this->isActionRateLimited('failed_login', $ip, $username, 5, 10);
    }
    
    /**
     * Check if failed login threshold is exceeded and create alert
     * 
     * @param string $ip IP address to check
     * @param string $username Username to check
     */
    private function checkFailedLoginThreshold($ip, $username) {
        try {
            // Count failed logins in last 10 minutes
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as attempt_count 
                 FROM security_logs 
                 WHERE event_type = 'failed_login' 
                 AND (ip_address = ? OR username = ?)
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)"
            );
            
            $stmt->bind_param("ss", $ip, $username);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            // Threshold: > 3 attempts in 10 minutes
            if ($row['attempt_count'] > 3) {
                $alertManager = new AlertManager();
                $alertManager->createAlert(
                    'security',
                    'critical',
                    'Multiple failed login attempts detected',
                    json_encode([
                        'ip_address' => $ip,
                        'username' => $username,
                        'attempt_count' => $row['attempt_count'],
                        'time_window' => '10 minutes'
                    ])
                );
            }
        } catch (Exception $e) {
            error_log("Failed to check login threshold: " . $e->getMessage());
        }
    }
    
    /**
     * Get failed login attempts within specified time window
     * 
     * @param int $minutes Time window in minutes (default: 10)
     * @param int $limit Maximum number of records to return
     * @return array Failed login attempts
     */
    public function getFailedLoginAttempts($minutes = 10, $limit = 50) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT username, ip_address, user_agent, created_at 
                 FROM security_logs 
                 WHERE event_type = 'failed_login' 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
                 ORDER BY created_at DESC 
                 LIMIT ?"
            );
            
            $stmt->bind_param("ii", $minutes, $limit);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $attempts = [];
            while ($row = $result->fetch_assoc()) {
                $attempts[] = $row;
            }
            
            $stmt->close();
            return $attempts;
        } catch (Exception $e) {
            error_log("Failed to get login attempts: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Detect suspicious activity patterns
     * 
     * @return array Suspicious activities detected
     */
    public function detectSuspiciousActivity() {
        try {
            $suspicious = [];
            
            // Check for multiple role changes in short time (last 24 hours)
            $stmt = $this->conn->prepare(
                "SELECT user_id, COUNT(*) as change_count, 
                        GROUP_CONCAT(action SEPARATOR ', ') as actions
                 FROM activity_logs 
                 WHERE action LIKE '%role%' 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 GROUP BY user_id 
                 HAVING change_count > 2"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $suspicious[] = [
                    'type' => 'multiple_role_changes',
                    'user_id' => $row['user_id'],
                    'count' => $row['change_count'],
                    'details' => $row['actions']
                ];
            }
            
            $stmt->close();
            
            // Check for after-hours admin actions (10 PM - 6 AM)
            $stmt = $this->conn->prepare(
                "SELECT al.user_id, u.username, al.action, al.created_at
                 FROM activity_logs al
                 JOIN users u ON al.user_id = u.id
                 WHERE u.role IN ('admin', 'superadmin')
                 AND HOUR(al.created_at) >= 22 OR HOUR(al.created_at) <= 6
                 AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 ORDER BY al.created_at DESC
                 LIMIT 20"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $suspicious[] = [
                    'type' => 'after_hours_admin_action',
                    'user_id' => $row['user_id'],
                    'username' => $row['username'],
                    'action' => $row['action'],
                    'timestamp' => $row['created_at']
                ];
            }
            
            $stmt->close();
            
            return $suspicious;
        } catch (Exception $e) {
            error_log("Failed to detect suspicious activity: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get active user sessions
     * 
     * @return array Active sessions with user info
     */
    public function getActiveSessions() {
        try {
            // Get users who have activity in last 48 hours (session timeout)
            $stmt = $this->conn->prepare(
                "SELECT DISTINCT u.id, u.username, u.role, 
                        MAX(al.created_at) as last_activity
                 FROM users u
                 JOIN activity_logs al ON u.id = al.user_id
                 WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
                 GROUP BY u.id, u.username, u.role
                 ORDER BY last_activity DESC"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $sessions = [];
            while ($row = $result->fetch_assoc()) {
                $sessions[] = $row;
            }
            
            $stmt->close();
            return $sessions;
        } catch (Exception $e) {
            error_log("Failed to get active sessions: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Check password health across all users
     * 
     * @return array Password health metrics
     */
    public function checkPasswordHealth() {
        try {
            $metrics = [
                'total_users' => 0,
                'users_with_old_passwords' => 0,
                'password_age_threshold_days' => 90
            ];
            
            // Get total users
            $stmt = $this->conn->prepare("SELECT COUNT(*) as total FROM users");
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $metrics['total_users'] = $row['total'];
            $stmt->close();
            
            // Check for users who haven't changed password in 90 days
            // Note: This requires a password_updated_at column which may not exist
            // For now, we'll use created_at as a proxy
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as old_password_count 
                 FROM users 
                 WHERE created_at <= DATE_SUB(NOW(), INTERVAL 90 DAY)"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $metrics['users_with_old_passwords'] = $row['old_password_count'];
            $stmt->close();
            
            return $metrics;
        } catch (Exception $e) {
            error_log("Failed to check password health: " . $e->getMessage());
            return [
                'total_users' => 0,
                'users_with_old_passwords' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
}

// Include AlertManager for threshold checking
require_once __DIR__ . '/AlertManager.php';
