<?php
/**
 * System Insights API Endpoint
 * 
 * Provides comprehensive system monitoring data for SuperAdmin
 * Supports tabbed interface with caching for performance
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/role.php';
require_once __DIR__ . '/../../classes/SecurityMonitor.php';
require_once __DIR__ . '/../../classes/AlertManager.php';
require_once __DIR__ . '/../../classes/DatabaseHealth.php';
require_once __DIR__ . '/../../classes/SystemResources.php';
require_once __DIR__ . '/../../classes/PerformanceMonitor.php';
require_once __DIR__ . '/../../classes/AuditCompliance.php';
require_once __DIR__ . '/../../classes/VulnerabilityScanner.php';

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Start session and check authentication
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verify SuperAdmin role
checkRole(['superadmin']);

// Get tab parameter
$tab = isset($_GET['tab']) ? $_GET['tab'] : 'security';

// Initialize response
$response = [
    'success' => true,
    'tab' => $tab,
    'data' => [],
    'cached' => false
];

try {
    // Route to appropriate tab handler
    switch ($tab) {
        case 'security':
            $response['data'] = getSecurityData();
            break;
            
        case 'database':
            $response['data'] = getDatabaseData();
            break;
            
        case 'resources':
            $response['data'] = getResourcesData();
            break;
            
        case 'performance':
            $response['data'] = getPerformanceData();
            break;
            
        case 'audit':
            $response['data'] = getAuditData();
            break;
            
        case 'vulnerabilities':
            $response['data'] = getVulnerabilitiesData();
            break;
            
        case 'overview':
            $response['data'] = getOverviewData();
            break;
            
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid tab parameter'
            ]);
            exit;
    }
    
    http_response_code(200);
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("System Insights API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

/**
 * Get security monitoring data
 */
function getSecurityData() {
    $securityMonitor = new SecurityMonitor();
    $alertManager = new AlertManager();
    
    return [
        'failed_logins' => $securityMonitor->getFailedLoginAttempts(10, 50),
        'suspicious_activity' => $securityMonitor->detectSuspiciousActivity(),
        'active_sessions' => $securityMonitor->getActiveSessions(),
        'password_health' => $securityMonitor->checkPasswordHealth(),
        'security_alerts' => $alertManager->getActiveAlerts('critical', 20)
    ];
}

/**
 * Get database health data
 */
function getDatabaseData() {
    $dbHealth = new DatabaseHealth();
    
    // Check cache first
    $cached = $dbHealth->getCachedMetric('database_overview');
    if ($cached !== null) {
        $GLOBALS['response']['cached'] = true;
        return $cached;
    }
    
    // Generate fresh data
    $data = [
        'size' => $dbHealth->getDatabaseSize(),
        'table_statistics' => $dbHealth->getTableStatistics(),
        'integrity' => $dbHealth->checkDatabaseIntegrity(),
        'growth_trend_7day' => $dbHealth->getGrowthTrend(7),
        'growth_trend_30day' => $dbHealth->getGrowthTrend(30)
    ];
    
    // Cache for 5 minutes
    $dbHealth->cacheMetric('database_overview', $data);
    
    return $data;
}

/**
 * Get system resources data
 */
function getResourcesData() {
    $systemResources = new SystemResources();
    
    return [
        'php_info' => $systemResources->getPhpInfo(),
        'disk_space' => $systemResources->getDiskSpace(),
        'file_permissions' => $systemResources->checkFilePermissions(),
        'server_uptime' => $systemResources->getServerUptime(),
        'system_load' => $systemResources->getSystemLoad()
    ];
}

/**
 * Get performance metrics data
 */
function getPerformanceData() {
    $performanceMonitor = new PerformanceMonitor();
    
    // Check cache first
    $dbHealth = new DatabaseHealth();
    $cached = $dbHealth->getCachedMetric('performance_overview');
    if ($cached !== null) {
        $GLOBALS['response']['cached'] = true;
        return $cached;
    }
    
    // Generate fresh data
    $data = [
        'api_response_times' => $performanceMonitor->getApiResponseTimes(24),
        'error_rate' => $performanceMonitor->getErrorRate(24),
        'active_users' => $performanceMonitor->getActiveUsers(),
        'peak_usage_7day' => $performanceMonitor->getPeakUsageTimes(7),
        'peak_usage_30day' => $performanceMonitor->getPeakUsageTimes(30)
    ];
    
    // Cache for 5 minutes
    $dbHealth->cacheMetric('performance_overview', $data);
    
    return $data;
}


/**
 * Get audit and compliance data
 */
function getAuditData() {
    $auditCompliance = new AuditCompliance();
    
    return [
        'recent_activities' => $auditCompliance->getRecentActivities(100),
        'role_change_history' => $auditCompliance->getRoleChangeHistory(30),
        'data_integrity' => $auditCompliance->checkDataIntegrity(),
        'compliance_alerts' => $auditCompliance->getComplianceAlerts(),
        'audit_summary_7day' => $auditCompliance->getAuditSummary(7),
        'audit_summary_30day' => $auditCompliance->getAuditSummary(30)
    ];
}

/**
 * Get vulnerability scan data
 */
function getVulnerabilitiesData() {
    $vulnerabilityScanner = new VulnerabilityScanner();
    
    // Check cache first
    $dbHealth = new DatabaseHealth();
    $cached = $dbHealth->getCachedMetric('vulnerability_scan');
    if ($cached !== null) {
        $GLOBALS['response']['cached'] = true;
        return $cached;
    }
    
    // Generate fresh data
    $data = $vulnerabilityScanner->generateSecurityScore();
    
    // Cache for 5 minutes
    $dbHealth->cacheMetric('vulnerability_scan', $data);
    
    return $data;
}

/**
 * Get overview data (summary of all tabs)
 */
function getOverviewData() {
    $alertManager = new AlertManager();
    $dbHealth = new DatabaseHealth();
    $performanceMonitor = new PerformanceMonitor();
    $businessMetrics = new BusinessMetrics();
    $vulnerabilityScanner = new VulnerabilityScanner();
    
    // Check cache first
    $cached = $dbHealth->getCachedMetric('overview_dashboard');
    if ($cached !== null) {
        $GLOBALS['response']['cached'] = true;
        return $cached;
    }
    
    // Generate fresh data
    $data = [
        'alerts' => [
            'statistics' => $alertManager->getAlertStatistics(),
            'recent_critical' => $alertManager->getActiveAlerts('critical', 5)
        ],
        'database' => [
            'size' => $dbHealth->getDatabaseSize(),
            'integrity_status' => $dbHealth->checkDatabaseIntegrity()['status']
        ],
        'performance' => [
            'active_users' => $performanceMonitor->getActiveUsers()['active_count'],
            'error_rate' => $performanceMonitor->getErrorRate(24)['error_rate_percentage']
        ],
        'business' => [
            'user_stats' => $businessMetrics->getUserStatsByRole(),
            'revenue_today' => $businessMetrics->getRevenueTrends(1)
        ],
        'security' => [
            'overall_score' => $vulnerabilityScanner->generateSecurityScore()['overall_score'],
            'status' => $vulnerabilityScanner->generateSecurityScore()['status']
        ]
    ];
    
    // Cache for 5 minutes
    $dbHealth->cacheMetric('overview_dashboard', $data);
    
    return $data;
}

// Check and create alerts based on thresholds
$alertManager = new AlertManager();
$alertManager->checkThresholds();
?>
