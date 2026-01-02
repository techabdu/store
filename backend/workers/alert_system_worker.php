<?php
/**
 * Alert System Worker
 * 
 * Monitors metrics and sends email alerts when thresholds are exceeded.
 * Runs via cron job every hour after metrics aggregation.
 * 
 * Alert Types:
 * - High error rate (>10%)
 * - Slow response time (>500ms avg)
 * - Critical errors detected
 * - High request volume
 * 
 * Features:
 * - Configurable thresholds
 * - Alert cooldown (prevent spam)
 * - Email notifications
 * - Alert history tracking
 * 
 * Usage: php alert_system_worker.php
 * Cron: 15 * * * * php /path/to/alert_system_worker.php
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/environment.php';
require_once __DIR__ . '/../helpers/EventLogger.php';

// Load PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class AlertSystemWorker {
    private $conn;
    private $logPrefix = '[AlertSystem]';
    
    // Alert thresholds (configurable)
    private $thresholds = [
        'error_rate' => 10.0,           // 10% error rate
        'avg_response_time' => 500.0,   // 500ms average
        'critical_errors' => 5,         // 5 critical errors per hour
        'request_volume' => 10000,      // 10K requests per hour
    ];
    
    // Alert cooldown (prevent spam)
    private $cooldownMinutes = 60; // 1 hour between same alert type
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Main execution method
     */
    public function run() {
        $this->log("Starting alert system...");
        
        try {
            // Get latest hourly metrics
            $latestHour = $this->getLatestHourTimestamp();
            
            if (!$latestHour) {
                $this->log("No metrics found to check");
                return true;
            }
            
            $this->log("Checking metrics for: $latestHour");
            
            // Check various alert conditions
            $this->checkErrorRate($latestHour);
            $this->checkResponseTime($latestHour);
            $this->checkCriticalErrors($latestHour);
            $this->checkRequestVolume($latestHour);
            
            $this->log("Alert system completed successfully");
            return true;
            
        } catch (Exception $e) {
            $this->log("ERROR: " . $e->getMessage());
            EventLogger::logError('critical', 'Alert system failed', [
                'error_type' => 'WorkerException',
                'error_code' => 'ALERT_001',
                'message' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }
    
    /**
     * Get the latest hour timestamp from metrics
     */
    private function getLatestHourTimestamp() {
        $result = $this->conn->query(
            "SELECT hour_timestamp FROM metrics_hourly 
             ORDER BY hour_timestamp DESC 
             LIMIT 1"
        );
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            return $row['hour_timestamp'];
        }
        
        return null;
    }
    
    /**
     * Check error rate threshold
     */
    private function checkErrorRate($hourTimestamp) {
        // Get API request metrics
        $stmt = $this->conn->prepare(
            "SELECT metric_value, count, metadata 
             FROM metrics_hourly 
             WHERE hour_timestamp = ? AND metric_type = 'api_requests'"
        );
        $stmt->bind_param("s", $hourTimestamp);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $metric = $result->fetch_assoc();
            $metadata = json_decode($metric['metadata'], true);
            
            if (isset($metadata['error_rate']) && $metadata['error_rate'] > $this->thresholds['error_rate']) {
                $this->sendAlert(
                    'high_error_rate',
                    'High Error Rate Detected',
                    "Error rate is {$metadata['error_rate']}% (threshold: {$this->thresholds['error_rate']}%)",
                    [
                        'hour' => $hourTimestamp,
                        'error_rate' => $metadata['error_rate'],
                        'error_count' => $metadata['error_count'],
                        'total_requests' => $metric['count']
                    ]
                );
            }
        }
        $stmt->close();
    }
    
    /**
     * Check average response time threshold
     */
    private function checkResponseTime($hourTimestamp) {
        $stmt = $this->conn->prepare(
            "SELECT metric_value, count, metadata 
             FROM metrics_hourly 
             WHERE hour_timestamp = ? AND metric_type = 'api_requests'"
        );
        $stmt->bind_param("s", $hourTimestamp);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $metric = $result->fetch_assoc();
            $avgResponseTime = $metric['metric_value'];
            
            if ($avgResponseTime > $this->thresholds['avg_response_time']) {
                $metadata = json_decode($metric['metadata'], true);
                
                $this->sendAlert(
                    'slow_response_time',
                    'Slow Response Time Detected',
                    "Average response time is {$avgResponseTime}ms (threshold: {$this->thresholds['avg_response_time']}ms)",
                    [
                        'hour' => $hourTimestamp,
                        'avg_response_time' => $avgResponseTime,
                        'min_response_time' => $metadata['min_response_time'],
                        'max_response_time' => $metadata['max_response_time'],
                        'total_requests' => $metric['count']
                    ]
                );
            }
        }
        $stmt->close();
    }
    
    /**
     * Check critical errors threshold
     */
    private function checkCriticalErrors($hourTimestamp) {
        $stmt = $this->conn->prepare(
            "SELECT metric_value, count, metadata 
             FROM metrics_hourly 
             WHERE hour_timestamp = ? AND metric_type = 'application_errors'"
        );
        $stmt->bind_param("s", $hourTimestamp);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $metric = $result->fetch_assoc();
            $criticalCount = $metric['metric_value'];
            
            if ($criticalCount >= $this->thresholds['critical_errors']) {
                $metadata = json_decode($metric['metadata'], true);
                
                $this->sendAlert(
                    'critical_errors',
                    'Critical Errors Detected',
                    "Critical errors: {$criticalCount} (threshold: {$this->thresholds['critical_errors']})",
                    [
                        'hour' => $hourTimestamp,
                        'critical_errors' => $criticalCount,
                        'total_errors' => $metric['count'],
                        'warnings' => $metadata['warnings'],
                        'errors' => $metadata['errors']
                    ]
                );
            }
        }
        $stmt->close();
    }
    
    /**
     * Check request volume threshold
     */
    private function checkRequestVolume($hourTimestamp) {
        $stmt = $this->conn->prepare(
            "SELECT metric_value, count 
             FROM metrics_hourly 
             WHERE hour_timestamp = ? AND metric_type = 'api_requests'"
        );
        $stmt->bind_param("s", $hourTimestamp);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $metric = $result->fetch_assoc();
            $requestCount = $metric['count'];
            
            if ($requestCount > $this->thresholds['request_volume']) {
                $this->sendAlert(
                    'high_request_volume',
                    'High Request Volume Detected',
                    "Request volume: {$requestCount} (threshold: {$this->thresholds['request_volume']})",
                    [
                        'hour' => $hourTimestamp,
                        'request_count' => $requestCount,
                        'avg_response_time' => $metric['metric_value']
                    ]
                );
            }
        }
        $stmt->close();
    }
    
    /**
     * Send alert email
     */
    private function sendAlert($alertType, $subject, $message, $context = []) {
        // Check cooldown
        if ($this->isInCooldown($alertType)) {
            $this->log("Alert '$alertType' is in cooldown, skipping...");
            return;
        }
        
        $this->log("Sending alert: $alertType");
        
        // Get admin email from environment or use default
        $adminEmail = Environment::config('admin_email', 'admin@prhub.shop');
        
        // Prepare email body
        $body = $this->prepareEmailBody($subject, $message, $context);
        
        // Send email
        $emailSent = $this->sendEmail($adminEmail, $subject, $body);
        
        // Record alert in database
        $this->recordAlert($alertType, $subject, $message, $context, $emailSent);
        
        if ($emailSent) {
            $this->log("Alert email sent successfully");
        } else {
            $this->log("Failed to send alert email");
        }
    }
    
    /**
     * Check if alert type is in cooldown period
     */
    private function isInCooldown($alertType) {
        $cooldownTime = date('Y-m-d H:i:s', strtotime("-{$this->cooldownMinutes} minutes"));
        
        $stmt = $this->conn->prepare(
            "SELECT id FROM email_notifications 
             WHERE notification_type = 'alert' 
             AND subject LIKE ? 
             AND created_at > ? 
             LIMIT 1"
        );
        
        $subjectPattern = "%$alertType%";
        $stmt->bind_param("ss", $subjectPattern, $cooldownTime);
        $stmt->execute();
        $result = $stmt->get_result();
        $inCooldown = ($result->num_rows > 0);
        $stmt->close();
        
        return $inCooldown;
    }
    
    /**
     * Prepare email body with context
     */
    private function prepareEmailBody($subject, $message, $context) {
        $body = "<html><body>";
        $body .= "<h2>🚨 SuperAdmin Alert: $subject</h2>";
        $body .= "<p><strong>Message:</strong> $message</p>";
        $body .= "<hr>";
        $body .= "<h3>Details:</h3>";
        $body .= "<ul>";
        
        foreach ($context as $key => $value) {
            $key = ucwords(str_replace('_', ' ', $key));
            $body .= "<li><strong>$key:</strong> $value</li>";
        }
        
        $body .= "</ul>";
        $body .= "<hr>";
        $body .= "<p><em>Time: " . date('Y-m-d H:i:s') . "</em></p>";
        $body .= "<p><em>This is an automated alert from the SuperAdmin Monitoring System.</em></p>";
        $body .= "</body></html>";
        
        return $body;
    }
    
    /**
     * Send email using PHPMailer
     */
    private function sendEmail($to, $subject, $body) {
        try {
            $mail = new PHPMailer(true);
            
            // SMTP configuration
            $mail->isSMTP();
            $mail->Host = Environment::config('smtp_host', 'smtp.mailtrap.io');
            $mail->SMTPAuth = true;
            $mail->Username = Environment::config('smtp_user', '');
            $mail->Password = Environment::config('smtp_pass', '');
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = Environment::config('smtp_port', 2525);
            
            // Recipients
            $mail->setFrom(
                Environment::config('smtp_from_email', 'alerts@prhub.shop'),
                Environment::config('smtp_from_name', 'SuperAdmin Alerts')
            );
            $mail->addAddress($to);
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = "[SuperAdmin] $subject";
            $mail->Body = $body;
            $mail->AltBody = strip_tags($body);
            
            $mail->send();
            return true;
            
        } catch (Exception $e) {
            $this->log("Email error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Record alert in database
     */
    private function recordAlert($alertType, $subject, $message, $context, $emailSent) {
        $stmt = $this->conn->prepare(
            "INSERT INTO email_notifications 
             (recipient_email, subject, body, notification_type, status, sent_at) 
             VALUES (?, ?, ?, 'alert', ?, ?)"
        );
        
        $adminEmail = Environment::config('admin_email', 'admin@prhub.shop');
        $fullSubject = "[SuperAdmin] $subject";
        $body = json_encode(['message' => $message, 'context' => $context]);
        $status = $emailSent ? 'sent' : 'failed';
        $sentAt = $emailSent ? date('Y-m-d H:i:s') : null;
        
        $stmt->bind_param("sssss", $adminEmail, $fullSubject, $body, $status, $sentAt);
        $stmt->execute();
        $stmt->close();
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
if (php_sapi_name() === 'cli') {
    echo "=== Alert System Worker ===\n";
    echo "Started at: " . date('Y-m-d H:i:s') . "\n\n";
    
    $worker = new AlertSystemWorker($conn);
    $success = $worker->run();
    
    echo "\n";
    echo "Finished at: " . date('Y-m-d H:i:s') . "\n";
    echo "Status: " . ($success ? "SUCCESS" : "FAILED") . "\n";
    
    exit($success ? 0 : 1);
}
