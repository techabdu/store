<?php
/**
 * AuditCompliance Class
 * 
 * Handles audit trail and compliance monitoring including
 * activity tracking, role changes, and data integrity
 */

require_once __DIR__ . '/../config/database.php';

class AuditCompliance {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    /**
     * Get recent critical activities across all users
     * 
     * @param int $limit Maximum number of activities to return (default: 100)
     * @return array Recent activities
     */
    public function getRecentActivities($limit = 100) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT 
                    al.id,
                    al.user_id,
                    u.username,
                    u.role,
                    al.action,
                    al.created_at
                 FROM activity_logs al
                 JOIN users u ON al.user_id = u.id
                 ORDER BY al.created_at DESC
                 LIMIT ?"
            );
            
            $stmt->bind_param("i", $limit);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $activities = [];
            while ($row = $result->fetch_assoc()) {
                $activities[] = $row;
            }
            
            $stmt->close();
            return $activities;
        } catch (Exception $e) {
            error_log("Failed to get recent activities: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get role change history
     * 
     * @param int $days Number of days to look back (default: 30)
     * @return array Role change events
     */
    public function getRoleChangeHistory($days = 30) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT 
                    al.id,
                    al.user_id,
                    u.username,
                    u.role as current_role,
                    al.action,
                    al.created_at
                 FROM activity_logs al
                 JOIN users u ON al.user_id = u.id
                 WHERE al.action LIKE '%role%'
                 AND al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ORDER BY al.created_at DESC"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $roleChanges = [];
            while ($row = $result->fetch_assoc()) {
                $roleChanges[] = $row;
            }
            
            $stmt->close();
            
            // Get statistics
            $stats = [
                'total_changes' => count($roleChanges),
                'period_days' => $days,
                'changes' => $roleChanges
            ];
            
            return $stats;
        } catch (Exception $e) {
            error_log("Failed to get role change history: " . $e->getMessage());
            return [
                'total_changes' => 0,
                'period_days' => $days,
                'changes' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Check data integrity across tables
     * 
     * @return array Data integrity check results
     */
    public function checkDataIntegrity() {
        try {
            $issues = [];
            
            // Check for orphaned activity logs
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as count 
                 FROM activity_logs 
                 WHERE user_id NOT IN (SELECT id FROM users)"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['count'] > 0) {
                $issues[] = [
                    'table' => 'activity_logs',
                    'issue_type' => 'orphaned_records',
                    'count' => $row['count'],
                    'severity' => 'warning'
                ];
            }
            $stmt->close();
            
            // Check for orphaned transactions
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as count 
                 FROM transactions 
                 WHERE user_id NOT IN (SELECT id FROM users)"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['count'] > 0) {
                $issues[] = [
                    'table' => 'transactions',
                    'issue_type' => 'orphaned_records',
                    'count' => $row['count'],
                    'severity' => 'warning'
                ];
            }
            $stmt->close();
            
            // Check for orphaned expenses
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as count 
                 FROM expenses 
                 WHERE user_id NOT IN (SELECT id FROM users)"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['count'] > 0) {
                $issues[] = [
                    'table' => 'expenses',
                    'issue_type' => 'orphaned_records',
                    'count' => $row['count'],
                    'severity' => 'warning'
                ];
            }
            $stmt->close();
            
            // Check for duplicate usernames
            $stmt = $this->conn->prepare(
                "SELECT username, COUNT(*) as count 
                 FROM users 
                 GROUP BY username 
                 HAVING count > 1"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $issues[] = [
                    'table' => 'users',
                    'issue_type' => 'duplicate_username',
                    'username' => $row['username'],
                    'count' => $row['count'],
                    'severity' => 'critical'
                ];
            }
            $stmt->close();
            
            // Check for negative inventory quantities
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as count 
                 FROM inventory 
                 WHERE quantity < 0"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['count'] > 0) {
                $issues[] = [
                    'table' => 'inventory',
                    'issue_type' => 'negative_quantity',
                    'count' => $row['count'],
                    'severity' => 'critical'
                ];
            }
            $stmt->close();
            
            return [
                'status' => count($issues) === 0 ? 'healthy' : 'issues_found',
                'total_issues' => count($issues),
                'issues' => $issues,
                'checked_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to check data integrity: " . $e->getMessage());
            return [
                'status' => 'error',
                'total_issues' => 0,
                'issues' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get compliance alerts
     * 
     * @return array Compliance-related alerts
     */
    public function getComplianceAlerts() {
        try {
            $alerts = [];
            
            // Check for users with no recent activity (potential inactive accounts)
            $stmt = $this->conn->prepare(
                "SELECT u.id, u.username, u.role, MAX(al.created_at) as last_activity
                 FROM users u
                 LEFT JOIN activity_logs al ON u.id = al.user_id
                 GROUP BY u.id, u.username, u.role
                 HAVING last_activity IS NULL OR last_activity < DATE_SUB(NOW(), INTERVAL 90 DAY)"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $inactiveCount = 0;
            while ($row = $result->fetch_assoc()) {
                $inactiveCount++;
            }
            
            if ($inactiveCount > 0) {
                $alerts[] = [
                    'type' => 'inactive_accounts',
                    'severity' => 'info',
                    'message' => "$inactiveCount user(s) inactive for 90+ days",
                    'count' => $inactiveCount
                ];
            }
            $stmt->close();
            
            // Check for admin accounts without recent password changes
            // Note: This requires a password_updated_at column
            // For now, we'll use account creation date as proxy
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as count 
                 FROM users 
                 WHERE role IN ('admin', 'superadmin')
                 AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['count'] > 0) {
                $alerts[] = [
                    'type' => 'old_admin_passwords',
                    'severity' => 'warning',
                    'message' => "{$row['count']} admin account(s) may have old passwords",
                    'count' => $row['count']
                ];
            }
            $stmt->close();
            
            return [
                'total_alerts' => count($alerts),
                'alerts' => $alerts,
                'checked_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to get compliance alerts: " . $e->getMessage());
            return [
                'total_alerts' => 0,
                'alerts' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get audit summary statistics
     * 
     * @param int $days Number of days to analyze (default: 7)
     * @return array Audit summary
     */
    public function getAuditSummary($days = 7) {
        try {
            // Total activities
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as total_activities 
                 FROM activity_logs
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            $activityRow = $result->fetch_assoc();
            $stmt->close();
            
            // Activities by role
            $stmt = $this->conn->prepare(
                "SELECT u.role, COUNT(*) as count
                 FROM activity_logs al
                 JOIN users u ON al.user_id = u.id
                 WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY u.role"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $byRole = [];
            while ($row = $result->fetch_assoc()) {
                $byRole[$row['role']] = $row['count'];
            }
            $stmt->close();
            
            return [
                'period_days' => $days,
                'total_activities' => $activityRow['total_activities'],
                'activities_by_role' => $byRole,
                'generated_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to get audit summary: " . $e->getMessage());
            return [
                'period_days' => $days,
                'total_activities' => 0,
                'activities_by_role' => [],
                'error' => $e->getMessage()
            ];
        }
    }
}
