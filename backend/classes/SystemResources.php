<?php
/**
 * SystemResources Class
 * 
 * Monitors system resources including PHP configuration,
 * disk space, file permissions, and server uptime
 */

require_once __DIR__ . '/../config/database.php';

class SystemResources {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    /**
     * Get PHP configuration information
     * 
     * @return array PHP version and important settings
     */
    public function getPhpInfo() {
        try {
            return [
                'version' => phpversion(),
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
                'display_errors' => ini_get('display_errors'),
                'error_reporting' => ini_get('error_reporting'),
                'session_cookie_httponly' => ini_get('session.cookie_httponly'),
                'session_cookie_secure' => ini_get('session.cookie_secure'),
                'extensions' => [
                    'mysqli' => extension_loaded('mysqli'),
                    'json' => extension_loaded('json'),
                    'mbstring' => extension_loaded('mbstring'),
                    'openssl' => extension_loaded('openssl')
                ]
            ];
        } catch (Exception $e) {
            error_log("Failed to get PHP info: " . $e->getMessage());
            return [
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get disk space information
     * 
     * @return array Disk space metrics
     */
    public function getDiskSpace() {
        try {
            $rootPath = $_SERVER['DOCUMENT_ROOT'];
            
            $totalSpace = disk_total_space($rootPath);
            $freeSpace = disk_free_space($rootPath);
            $usedSpace = $totalSpace - $freeSpace;
            
            return [
                'total_gb' => round($totalSpace / 1024 / 1024 / 1024, 2),
                'free_gb' => round($freeSpace / 1024 / 1024 / 1024, 2),
                'used_gb' => round($usedSpace / 1024 / 1024 / 1024, 2),
                'usage_percentage' => round(($usedSpace / $totalSpace) * 100, 2)
            ];
        } catch (Exception $e) {
            error_log("Failed to get disk space: " . $e->getMessage());
            return [
                'total_gb' => 0,
                'free_gb' => 0,
                'used_gb' => 0,
                'usage_percentage' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Check file permissions for critical files
     * 
     * @return array File permission check results
     */
    public function checkFilePermissions() {
        try {
            $basePath = dirname(__DIR__, 2); // Go up to store directory
            $issues = [];
            
            // Critical files/directories to check
            $criticalPaths = [
                $basePath . '/backend/config/database.php',
                $basePath . '/backend/api',
                $basePath . '/backend/classes',
                $basePath . '/frontend/src'
            ];
            
            foreach ($criticalPaths as $path) {
                if (file_exists($path)) {
                    $perms = fileperms($path);
                    $octalPerms = substr(sprintf('%o', $perms), -4);
                    
                    // Check if world-writable (dangerous)
                    if ($perms & 0x0002) {
                        $issues[] = [
                            'path' => $path,
                            'permissions' => $octalPerms,
                            'issue' => 'World-writable',
                            'severity' => 'critical'
                        ];
                    }
                    
                    // Check if database.php is readable by others (should be 0600 or 0640)
                    if (strpos($path, 'database.php') !== false && ($perms & 0x0004)) {
                        $issues[] = [
                            'path' => $path,
                            'permissions' => $octalPerms,
                            'issue' => 'Readable by others (contains credentials)',
                            'severity' => 'warning'
                        ];
                    }
                }
            }
            
            return [
                'status' => count($issues) === 0 ? 'secure' : 'issues_found',
                'issues' => $issues,
                'checked_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to check file permissions: " . $e->getMessage());
            return [
                'status' => 'error',
                'issues' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get server uptime (based on first activity log entry)
     * 
     * @return array Server uptime information
     */
    public function getServerUptime() {
        try {
            // Get earliest activity log entry as proxy for application start
            $stmt = $this->conn->prepare(
                "SELECT MIN(created_at) as first_activity FROM activity_logs"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            if ($row['first_activity']) {
                $firstActivity = strtotime($row['first_activity']);
                $now = time();
                $uptimeSeconds = $now - $firstActivity;
                
                $days = floor($uptimeSeconds / 86400);
                $hours = floor(($uptimeSeconds % 86400) / 3600);
                $minutes = floor(($uptimeSeconds % 3600) / 60);
                
                return [
                    'first_activity' => $row['first_activity'],
                    'uptime_seconds' => $uptimeSeconds,
                    'uptime_formatted' => sprintf('%d days, %d hours, %d minutes', $days, $hours, $minutes),
                    'days' => $days,
                    'hours' => $hours,
                    'minutes' => $minutes
                ];
            }
            
            return [
                'first_activity' => null,
                'uptime_seconds' => 0,
                'uptime_formatted' => 'No activity recorded',
                'days' => 0,
                'hours' => 0,
                'minutes' => 0
            ];
        } catch (Exception $e) {
            error_log("Failed to get server uptime: " . $e->getMessage());
            return [
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get system load average (if available on Unix systems)
     * 
     * @return array System load information
     */
    public function getSystemLoad() {
        try {
            if (function_exists('sys_getloadavg')) {
                $load = sys_getloadavg();
                return [
                    'available' => true,
                    'load_1min' => round($load[0], 2),
                    'load_5min' => round($load[1], 2),
                    'load_15min' => round($load[2], 2)
                ];
            }
            
            return [
                'available' => false,
                'message' => 'System load not available on this platform'
            ];
        } catch (Exception $e) {
            error_log("Failed to get system load: " . $e->getMessage());
            return [
                'available' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
