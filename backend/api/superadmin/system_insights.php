<?php
/**
 * System Insights API Endpoint
 * 
 * Provides comprehensive system monitoring data for SuperAdmin
 * Supports tabbed interface with caching for performance
 */

require_once '../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Set CORS headers using centralized config
setCorsHeaders();
require_once __DIR__ . '/../../middleware/role.php';
require_once __DIR__ . '/../../classes/SecurityMonitor.php';
require_once __DIR__ . '/../../classes/AlertManager.php';
require_once __DIR__ . '/../../classes/DatabaseHealth.php';
require_once __DIR__ . '/../../classes/SystemResources.php';
require_once __DIR__ . '/../../classes/PerformanceMonitor.php';
require_once __DIR__ . '/../../classes/AuditCompliance.php';
require_once __DIR__ . '/../../classes/VulnerabilityScanner.php';
require_once __DIR__ . '/../../classes/BusinessMetrics.php';

// CORS Headers
header("Content-Type: application/json; charset=UTF-8");

// Authenticate and verify SuperAdmin role
$user = checkAuth();
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
            
        case 'business':
            $response['data'] = getBusinessData();
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
    global $conn;
    $securityMonitor = new SecurityMonitor();
    $alertManager = new AlertManager();
    
    // Get tenant statistics
    $tenantStats = $conn->query("
        SELECT 
            COUNT(*) as total_tenants,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tenants,
            SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trial_tenants,
            SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_tenants,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tenants,
            SUM(CASE WHEN email_verified = 0 THEN 1 ELSE 0 END) as unverified_tenants
        FROM tenants
    ")->fetch_assoc();
    
    return [
        'failed_logins' => $securityMonitor->getFailedLoginAttempts(10, 50),
        'suspicious_activity' => $securityMonitor->detectSuspiciousActivity(),
        'active_sessions' => $securityMonitor->getActiveSessions(),
        'password_health' => $securityMonitor->checkPasswordHealth(),
        'security_alerts' => $alertManager->getActiveAlerts('critical', 20),
        'login_success_ratio' => $securityMonitor->getLoginSuccessRatio(),
        'tenant_stats' => $tenantStats
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
 * Get business metrics data including tenant health, trials, and payments
 */
function getBusinessData() {
    global $conn;
    $businessMetrics = new BusinessMetrics();
    $dbHealth = new DatabaseHealth();
    
    // Check cache first
    $cached = $dbHealth->getCachedMetric('business_overview');
    if ($cached !== null) {
        $GLOBALS['response']['cached'] = true;
        return $cached;
    }
    
    // Get tenant health summary
    $tenantHealth = $conn->query("
        SELECT 
            COUNT(*) as total_tenants,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tenants,
            SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trial_tenants,
            SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_tenants,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tenants
        FROM tenants
    ")->fetch_assoc();
    
    // Get expiring trials (next 7 days)
    $expiringTrials = [];
    $stmt = $conn->prepare("
        SELECT id, shop_name as business_name, shop_email as email, trial_ends_at, 
               DATEDIFF(trial_ends_at, NOW()) as days_remaining
        FROM tenants 
        WHERE status = 'trial' 
        AND trial_ends_at IS NOT NULL 
        AND trial_ends_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)
        AND trial_ends_at > NOW()
        ORDER BY trial_ends_at ASC
        LIMIT 20
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $expiringTrials[] = $row;
    }
    $stmt->close();
    
    // Get payment status summary (if subscriptions table exists)
    $paymentStatus = [
        'successful' => 0,
        'failed' => 0,
        'pending' => 0,
        'total_revenue_30d' => 0
    ];
    
    // Check if subscriptions table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'subscriptions'");
    if ($tableCheck->num_rows > 0) {
        $paymentResult = $conn->query("
            SELECT 
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN payment_status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN amount ELSE 0 END) as total_revenue_30d
            FROM subscriptions
        ");
        if ($paymentResult && $row = $paymentResult->fetch_assoc()) {
            $paymentStatus = [
                'successful' => (int)($row['successful'] ?? 0),
                'failed' => (int)($row['failed'] ?? 0),
                'pending' => (int)($row['pending'] ?? 0),
                'total_revenue_30d' => (float)($row['total_revenue_30d'] ?? 0)
            ];
        }
    }
    
    // Get top tenants by user count
    $topTenants = [];
    $stmt = $conn->prepare("
        SELECT t.id, t.shop_name as business_name, t.status, COUNT(u.id) as user_count
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        GROUP BY t.id, t.shop_name, t.status
        ORDER BY user_count DESC
        LIMIT 10
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $topTenants[] = $row;
    }
    $stmt->close();
    
    // Get user growth (new users in last 7 days)
    $userGrowth = [];
    $stmt = $conn->prepare("
        SELECT DATE(created_at) as date, COUNT(*) as new_users
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $userGrowth[] = $row;
    }
    $stmt->close();
    
    // Generate fresh data using BusinessMetrics class
    $data = [
        'user_stats' => $businessMetrics->getUserStatsByRole(),
        'inactive_users' => $businessMetrics->getInactiveUsers(30),
        'transaction_volume_7day' => $businessMetrics->getTransactionVolume(7),
        'transaction_volume_30day' => $businessMetrics->getTransactionVolume(30),
        'inventory_status' => $businessMetrics->getInventoryStatus(),
        'revenue_trends_7day' => $businessMetrics->getRevenueTrends(7),
        'revenue_trends_30day' => $businessMetrics->getRevenueTrends(30),
        'tenant_health' => [
            'total' => (int)$tenantHealth['total_tenants'],
            'active' => (int)$tenantHealth['active_tenants'],
            'trial' => (int)$tenantHealth['trial_tenants'],
            'suspended' => (int)$tenantHealth['suspended_tenants'],
            'pending' => (int)$tenantHealth['pending_tenants']
        ],
        'expiring_trials' => $expiringTrials,
        'payment_status' => $paymentStatus,
        'top_tenants' => $topTenants,
        'user_growth' => $userGrowth
    ];
    
    // Cache for 5 minutes
    $dbHealth->cacheMetric('business_overview', $data);
    
    return $data;
}

/**
 * Get overview data (summary of all tabs)
 */
function getOverviewData() {
    global $conn;
    $alertManager = new AlertManager();
    $dbHealth = new DatabaseHealth();
    $performanceMonitor = new PerformanceMonitor();
    $businessMetrics = new BusinessMetrics();
    $vulnerabilityScanner = new VulnerabilityScanner();
    $systemResources = new SystemResources();
    $auditCompliance = new AuditCompliance();
    
    // Check cache first
    $cached = $dbHealth->getCachedMetric('overview_dashboard');
    if ($cached !== null) {
        $GLOBALS['response']['cached'] = true;
        return $cached;
    }
    
    // Get peak usage for chart
    $peakUsage = $performanceMonitor->getPeakUsageTimes(7);
    
    // Get tenant statistics
    $tenantStats = $conn->query("
        SELECT 
            COUNT(*) as total_tenants,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tenants,
            SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trial_tenants,
            SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_tenants
        FROM tenants
    ")->fetch_assoc();
    
    // Get tenant growth (new registrations in last 7 days)
    $tenantGrowth = $conn->query("
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM tenants
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ")->fetch_all(MYSQLI_ASSOC);
    
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
            'active_users' => $performanceMonitor->getActiveUsers(),
            'error_rate' => $performanceMonitor->getErrorRate(24)['error_rate_percentage']
        ],
        'business' => [
            'user_stats' => $businessMetrics->getUserStatsByRole(),
            'revenue_today' => $businessMetrics->getRevenueTrends(1)
        ],
        'security' => [
            'overall_score' => $vulnerabilityScanner->generateSecurityScore()['overall_score'],
            'status' => $vulnerabilityScanner->generateSecurityScore()['status']
        ],
        'system' => [
            'uptime' => $systemResources->getServerUptime(),
            'health' => 'Healthy' // You might want to derive this from alerts
        ],
        'tenants' => [
            'total' => (int)$tenantStats['total_tenants'],
            'active' => (int)$tenantStats['active_tenants'],
            'trial' => (int)$tenantStats['trial_tenants'],
            'suspended' => (int)$tenantStats['suspended_tenants'],
            'growth_chart' => $tenantGrowth
        ],
        'activity' => [
            'recent_logs' => $auditCompliance->getRecentActivities(5),
            'chart_data' => $peakUsage['daily_activity']
        ],
        'charts' => [
            'apiLatency' => $performanceMonitor->getApiResponseTimeTrend(6),
            'errorRate' => $performanceMonitor->getErrorRateTrend(7)
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
