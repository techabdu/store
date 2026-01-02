# SuperAdmin Monitoring - Quick Start Guide

## Executive Summary

Based on comprehensive research and analysis of your codebase, here's what you need to implement a production-grade monitoring system that tracks:

1. **System Health** - Is the app alive and fast?
2. **User Health** - Are users active, stuck, or leaving?
3. **Error Health** - What's breaking, where, and for who?
4. **Business Health** - Is the product actually succeeding?

---

## What You Already Have ✅

Your codebase already has a **solid foundation**:

- ✅ **Monitor Classes**: `PerformanceMonitor`, `SecurityMonitor`, `BusinessMetrics`, `DatabaseHealth`, `AlertManager`, `AuditCompliance`, `VulnerabilityScanner`, `SystemResources`
- ✅ **Database Tables**: `activity_logs`, `security_logs`, `system_alerts`, `system_metrics`
- ✅ **API Endpoint**: `/api/superadmin/system_insights.php` (tabbed interface with caching)
- ✅ **Basic Logging**: `helpers/activity_log.php` function

---

## What's Missing ⚠️

1. **Comprehensive Event Logging** - Not all events are being captured in a structured way
2. **Error Tracking** - No centralized error logging with stack traces
3. **API Performance Monitoring** - No request/response time tracking
4. **Automated Alerting** - Alerts created, but no email notifications
5. **Metrics Aggregation** - No background workers to calculate hourly/daily metrics
6. **Enhanced Visualization** - Dashboard exists but needs expansion for all 4 health pillars

---

## Immediate Actions (Week 1)

### Step 1: Install Monolog (Structured Logging)

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/store/backend
composer require monolog/monolog
```

### Step 2: Create Database Tables

Run this SQL in your `store` database:

```sql
-- Save this as: backend/sql/migrations/002_monitoring_tables.sql

-- Detailed application error logs
CREATE TABLE IF NOT EXISTS `application_errors` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` INT(11) DEFAULT NULL,
  `user_id` INT(11) DEFAULT NULL,
  `error_level` ENUM('warning', 'error', 'critical') NOT NULL,
  `error_type` VARCHAR(50) NOT NULL,
  `error_message` TEXT NOT NULL,
  `file_path` VARCHAR(500) DEFAULT NULL,
  `line_number` INT(11) DEFAULT NULL,
  `stack_trace` TEXT DEFAULT NULL,
  `request_url` VARCHAR(500) DEFAULT NULL,
  `request_method` ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `context` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_error_level` (`error_level`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API request logs for performance tracking
CREATE TABLE IF NOT EXISTS `api_request_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` INT(11) DEFAULT NULL,
  `user_id` INT(11) DEFAULT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `http_method` ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
  `status_code` INT(11) NOT NULL,
  `response_time_ms` INT(11) NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `is_error` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_endpoint` (`endpoint`(255)),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_is_error` (`is_error`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pre-aggregated metrics
CREATE TABLE IF NOT EXISTS `metrics_hourly` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `hour_timestamp` TIMESTAMP NOT NULL,
  `metric_type` VARCHAR(50) NOT NULL,
  `metric_value` DECIMAL(20, 2) NOT NULL,
  `count` INT(11) DEFAULT 0,
  `metadata` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_hour_metric` (`hour_timestamp`, `metric_type`),
  INDEX `idx_metric_type` (`metric_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `metrics_daily` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `metric_type` VARCHAR(50) NOT NULL,
  `metric_value` DECIMAL(20, 2) NOT NULL,
  `count` INT(11) DEFAULT 0,
  `metadata` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date_metric` (`date`, `metric_type`),
  INDEX `idx_metric_type` (`metric_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email notification tracking
CREATE TABLE IF NOT EXISTS `email_notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `recipient_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `body` TEXT NOT NULL,
  `notification_type` ENUM('alert', 'report', 'system') DEFAULT 'alert',
  `status` ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  `sent_at` TIMESTAMP NULL DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Step 3: Create Directory Structure

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/store/backend
mkdir -p workers
mkdir -p logs
mkdir -p config/alerts
chmod 777 logs  # Make writable for log files
```

---

## Key Files to Create (Priority Order)

### 1. **EventLogger.php** (Centralized Logging)
**Location**: `backend/helpers/EventLogger.php`  
**Purpose**: Wrap Monolog for structured JSON logging  
**See full implementation in main plan**

### 2. **error_handlers.php** (Error Tracking)
**Location**: `backend/helpers/error_handlers.php`  
**Purpose**: Custom PHP error/exception handlers
```php
<?php
// backend/helpers/error_handlers.php

require_once __DIR__ . '/EventLogger.php';

// Custom error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    $errorLevel = 'warning';
    if ($errno === E_ERROR || $errno === E_USER_ERROR) {
        $errorLevel = 'error';
    }
    
    EventLogger::logError($errorLevel, $errstr, [
        'error_type' => 'PHPError',
        'file' => $errfile,
        'line' => $errline,
        'errno' => $errno
    ]);
    
    // Don't execute PHP's internal error handler
    return true;
});

// Custom exception handler
set_exception_handler(function($exception) {
    EventLogger::logError('critical', $exception->getMessage(), [
        'error_type' => get_class($exception),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'stack_trace' => $exception->getTraceAsString()
    ]);
});

// Shutdown function for fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        EventLogger::logError('critical', $error['message'], [
            'error_type' => 'FatalError',
            'file' => $error['file'],
            'line' => $error['line']
        ]);
    }
});
```

### 3. **ApiLogger Middleware** (Request/Response Tracking)
**Location**: `backend/middleware/api_logger.php`
```php
<?php
// backend/middleware/api_logger.php

require_once __DIR__ . '/../helpers/EventLogger.php';

class ApiLogger {
    private static $startTime;
    
    public static function startRequest() {
        self::$startTime = microtime(true);
    }
    
    public static function endRequest($statusCode = 200) {
        if (self::$startTime === null) return;
        
        $endTime = microtime(true);
        $responseTimeMs = round(($endTime - self::$startTime) * 1000);
        
        EventLogger::logApiRequest(
            $_SERVER['REQUEST_URI'] ?? 'unknown',
            $_SERVER['REQUEST_METHOD'] ?? 'GET',
            $statusCode,
            $responseTimeMs
        );
    }
}

// Auto-start on include
ApiLogger::startRequest();

// Register shutdown function to log at end
register_shutdown_function(function() {
    ApiLogger::endRequest(http_response_code());
});
```

**Usage in API files:**
```php
<?php
// Add to top of every API endpoint
require_once __DIR__ . '/../../middleware/api_logger.php';

// ... rest of API code ...

// Set status code before exiting
http_response_code(200);
echo json_encode($response);
```

### 4. **MetricsAggregator Worker**
**Location**: `backend/workers/MetricsAggregator.php`  
**See full implementation in main plan**

### 5. **AlertProcessor Worker**
**Location**: `backend/workers/AlertProcessor.php`
```php
<?php
// backend/workers/AlertProcessor.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../classes/AlertManager.php';
require_once __DIR__ . '/../classes/EmailNotifier.php';

$database = new Database();
$conn = $database->connect();
$alertManager = new AlertManager();
$emailNotifier = new EmailNotifier();

// Check error rate threshold (last 10 minutes)
$errorRate = $conn->query("
    SELECT 
        (SELECT COUNT(*) FROM application_errors WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)) as error_count,
        (SELECT COUNT(*) FROM api_request_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)) as request_count
")->fetch_assoc();

$rate = $errorRate['request_count'] > 0 ? 
    ($errorRate['error_count'] / $errorRate['request_count']) * 100 : 0;

if ($rate > 5) { // 5% error rate threshold
    $alertId = $alertManager->createAlert(
        'performance',
        'critical',
        'High error rate detected',
        json_encode([
            'error_rate' => round($rate, 2),
            'error_count' => $errorRate['error_count'],
            'request_count' => $errorRate['request_count']
        ])
    );
    
    if ($alertId) {
        $emailNotifier->sendAlert($alertId);
    }
}

// Check other thresholds...
echo "Alert processing completed at " . date('Y-m-d H:i:s') . "\n";
```

### 6. **EmailNotifier Class**
**Location**: `backend/classes/EmailNotifier.php`
```php
<?php
// backend/classes/EmailNotifier.php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../config/database.php';

class EmailNotifier {
    private $conn;
    private $adminEmail = 'admin@prhub.shop'; // Change this
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    public function sendAlert($alertId) {
        // Get alert details
        $stmt = $this->conn->prepare("SELECT * FROM system_alerts WHERE id = ?");
        $stmt->bind_param("i", $alertId);
        $stmt->execute();
        $alert = $stmt->get_result()->fetch_assoc();
        
        if (!$alert) return false;
        
        $subject = "[{$alert['severity']}] {$alert['message']}";
        $body = $this->buildAlertEmail($alert);
        
        return $this->sendEmail($this->adminEmail, $subject, $body, 'alert');
    }
    
    private function buildAlertEmail($alert) {
        $details = json_decode($alert['details'], true);
        
        return "
        <h2>System Alert</h2>
        <p><strong>Severity:</strong> {$alert['severity']}</p>
        <p><strong>Type:</strong> {$alert['type']}</p>
        <p><strong>Message:</strong> {$alert['message']}</p>
        <p><strong>Time:</strong> {$alert['created_at']}</p>
        <h3>Details:</h3>
        <pre>" . json_encode($details, JSON_PRETTY_PRINT) . "</pre>
        <p><a href='https://administration.prhub.shop/alerts/{$alert['id']}'>View Full Alert</a></p>
        ";
    }
    
    private function sendEmail($to, $subject, $body, $type = 'alert') {
        // Insert into email_notifications table
        $stmt = $this->conn->prepare("
            INSERT INTO email_notifications (recipient_email, subject, body, notification_type, status)
            VALUES (?, ?, ?, ?, 'pending')
        ");
        $stmt->bind_param("ssss", $to, $subject, $body, $type);
        $stmt->execute();
        $emailId = $this->conn->insert_id;
        
        // Send via PHPMailer
        $mail = new PHPMailer(true);
        
        try {
            // SMTP Configuration (update with your settings)
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com'; // Change this
            $mail->SMTPAuth = true;
            $mail->Username = getenv('SMTP_USERNAME');
            $mail->Password = getenv('SMTP_PASSWORD');
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
            
            $mail->setFrom('noreply@prhub.shop', 'PRHub System');
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $body;
            
            $mail->send();
            
            // Update status
            $stmt = $this->conn->prepare("UPDATE email_notifications SET status = 'sent', sent_at = NOW() WHERE id = ?");
            $stmt->bind_param("i", $emailId);
            $stmt->execute();
            
            return true;
        } catch (Exception $e) {
            // Log error
            $stmt = $this->conn->prepare("UPDATE email_notifications SET status = 'failed', error_message = ? WHERE id = ?");
            $errorMsg = $mail->ErrorInfo;
            $stmt->bind_param("si", $errorMsg, $emailId);
            $stmt->execute();
            
            return false;
        }
    }
}
```

---

## Crontab Setup

```bash
# Edit crontab
crontab -e

# Add these lines (adjust paths):
*/5 * * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/MetricsAggregator.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/metrics_aggregator.log 2>&1
* * * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/AlertProcessor.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/alert_processor.log 2>&1
```

---

## Testing Checklist

- [ ] Monolog installed (`composer require monolog/monolog`)
- [ ] Database tables created (run SQL migration)
- [ ] `EventLogger.php` created
- [ ] `error_handlers.php` created and included in `config.php`
- [ ] `api_logger.php` middleware added to 3-5 sample API endpoints
- [ ] Trigger a test error and verify it appears in `application_errors` table
- [ ] Make API requests and verify they appear in `api_request_logs` table
- [ ] Create `MetricsAggregator.php` and run manually
- [ ] Verify metrics appear in `metrics_hourly` table
- [ ] Create `AlertProcessor.php` and run manually
- [ ] Create test alert and verify email is sent
- [ ] Set up cron jobs
- [ ] Monitor cron job logs for errors

---

## Key Decisions Needed

1. **Email Provider**: Do you want to use Gmail SMTP, SendGrid, or another provider?
2. **Alert Recipients**: Who should receive critical alerts? (email addresses)
3. **Data Retention**: How long to keep logs? (Recommendation: 90 days for errors, 30 days for API requests)
4. **Dashboard Priority**: Which health pillar dashboard should we build first?
5. **Real-time Updates**: Do you want WebSockets or is 30-second polling acceptable?

---

## Resources

- **Full Implementation Plan**: `/Applications/XAMPP/xamppfiles/htdocs/store/.agent/SUPERADMIN_MONITORING_IMPLEMENTATION_PLAN.md`
- **Monolog Docs**: https://github.com/Seldaek/monolog
- **Your Existing Monitor Classes**: `/Applications/XAMPP/xamppfiles/htdocs/store/backend/classes/`
- **Your Existing API**: `/Applications/XAMPP/xamppfiles/htdocs/store/backend/api/superadmin/system_insights.php`

---

## What to Ask Me Next

1. "Create the EventLogger.php file" - I'll build it for you
2. "Create the database migration SQL" - I'll write the full script
3. "Show me how to instrument an API endpoint" - I'll modify a real file
4. "Build the MetricsAggregator worker" - I'll write the complete worker
5. "Create the alert rules configuration" - I'll design the JSON structure
6. "Build the React error dashboard page" - I'll create the full component

**Your system already has 70% of the foundation. We just need to:**
1. ✅ Add structured logging (EventLogger)
2. ✅ Track errors comprehensively (error_handlers)
3. ✅ Log all API requests (api_logger middleware)
4. ✅ Aggregate metrics (background workers)
5. ✅ Send email alerts (EmailNotifier)
6. ✅ Build enhanced visualizations (React dashboard)

Let me know which piece you'd like to tackle first!
