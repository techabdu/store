<?php
/**
 * EventLogger - Comprehensive Logging System
 * 
 * PSR-3 compliant structured logging with Monolog integration.
 * Provides automatic context enrichment and multiple logging handlers.
 * 
 * Features:
 * - File logging with rotation (30 days)
 * - Database logging for errors and API requests
 * - Automatic context enrichment (user, tenant, shop, IP)
 * - Multiple log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

// Load Composer autoloader for Monolog
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

use Monolog\Logger;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\JsonFormatter;

class EventLogger {
    private static $logger = null;
    private static $conn = null;
    
    /**
     * Get or create Monolog logger instance
     * 
     * @return Logger Monolog logger instance
     */
    private static function getInstance() {
        if (self::$logger === null) {
            // Create logger instance
            self::$logger = new Logger('app');
            
            // Create rotating file handler (30 days retention)
            $logPath = __DIR__ . '/../logs/app.log';
            $handler = new RotatingFileHandler($logPath, 30, Logger::DEBUG);
            
            // Use JSON formatter for structured logging
            $formatter = new JsonFormatter();
            $handler->setFormatter($formatter);
            
            // Add handler to logger
            self::$logger->pushHandler($handler);
        }
        
        return self::$logger;
    }
    
    /**
     * Get database connection
     * 
     * @return mysqli Database connection
     */
    private static function getConnection() {
        if (self::$conn === null) {
            require_once __DIR__ . '/../config/database.php';
            global $conn;
            self::$conn = $conn;
        }
        return self::$conn;
    }
    
    /**
     * Enrich context with automatic data
     * 
     * Adds user_id, tenant_id, shop_id, IP address, and user agent
     * 
     * @param array $context Additional context data
     * @return array Enriched context
     */
    private static function enrichContext($context = []) {
        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            @session_start();
        }
        
        // Add user context from session
        if (isset($_SESSION['user_id'])) {
            $context['user_id'] = $_SESSION['user_id'];
        }
        if (isset($_SESSION['tenant_id'])) {
            $context['tenant_id'] = $_SESSION['tenant_id'];
        }
        if (isset($_SESSION['shop_id'])) {
            $context['shop_id'] = $_SESSION['shop_id'];
        }
        if (isset($_SESSION['role'])) {
            $context['role'] = $_SESSION['role'];
        }
        
        // Add request context
        $context['ip_address'] = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $context['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $context['request_uri'] = $_SERVER['REQUEST_URI'] ?? '';
        $context['request_method'] = $_SERVER['REQUEST_METHOD'] ?? '';
        
        // Add timestamp
        $context['timestamp'] = date('Y-m-d H:i:s');
        
        return $context;
    }
    
    /**
     * Log activity event
     * 
     * Logs user activity to both file and database (activity_logs table)
     * 
     * @param string $eventType Type of event (e.g., 'user_login', 'inventory_create')
     * @param int $userId User ID performing the action
     * @param int $tenantId Tenant ID
     * @param array $context Additional context data
     * @return bool Success status
     */
    public static function logActivity($eventType, $userId, $tenantId, $context = []) {
        try {
            // Enrich context
            $enrichedContext = self::enrichContext($context);
            $enrichedContext['event_type'] = $eventType;
            $enrichedContext['user_id'] = $userId;
            $enrichedContext['tenant_id'] = $tenantId;
            
            // Log to file
            $logger = self::getInstance();
            $logger->info($eventType, $enrichedContext);
            
            // Log to database (activity_logs table)
            $conn = self::getConnection();
            if ($conn) {
                $stmt = $conn->prepare(
                    "INSERT INTO activity_logs (user_id, tenant_id, shop_id, action, details, ip_address, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, NOW())"
                );
                
                $shopId = $enrichedContext['shop_id'] ?? null;
                $details = json_encode($context);
                $ipAddress = $enrichedContext['ip_address'];
                
                $stmt->bind_param(
                    "iiisss",
                    $userId,
                    $tenantId,
                    $shopId,
                    $eventType,
                    $details,
                    $ipAddress
                );
                
                $stmt->execute();
                $stmt->close();
            }
            
            return true;
        } catch (Exception $e) {
            // Fail silently to avoid breaking application
            error_log("EventLogger::logActivity failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Log error to database and file
     * 
     * Stores errors in application_errors table with full context
     * 
     * @param string $errorLevel Error level: 'warning', 'error', or 'critical'
     * @param string $errorMessage Error message
     * @param array $context Additional context (file, line, stack_trace, etc.)
     * @return bool Success status
     */
    public static function logError($errorLevel, $errorMessage, $context = []) {
        try {
            // Enrich context
            $enrichedContext = self::enrichContext($context);
            $enrichedContext['error_level'] = $errorLevel;
            $enrichedContext['error_message'] = $errorMessage;
            
            // Log to file
            $logger = self::getInstance();
            $logger->error($errorMessage, $enrichedContext);
            
            // Log to database (application_errors table)
            $conn = self::getConnection();
            if ($conn) {
                $stmt = $conn->prepare(
                    "INSERT INTO application_errors (
                        tenant_id, user_id, shop_id,
                        error_level, error_type, error_message, error_code,
                        file_path, line_number, stack_trace,
                        request_url, request_method,
                        ip_address, user_agent, context,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
                );
                
                $tenantId = $enrichedContext['tenant_id'] ?? null;
                $userId = $enrichedContext['user_id'] ?? null;
                $shopId = $enrichedContext['shop_id'] ?? null;
                $errorType = $context['error_type'] ?? 'UnknownError';
                $errorCode = $context['error_code'] ?? null;
                $filePath = $context['file'] ?? null;
                $lineNumber = $context['line'] ?? null;
                $stackTrace = $context['stack_trace'] ?? null;
                $requestUrl = $enrichedContext['request_uri'];
                // Handle empty request_method for ENUM field
                $requestMethod = !empty($enrichedContext['request_method']) ? $enrichedContext['request_method'] : null;
                $ipAddress = $enrichedContext['ip_address'];
                $userAgent = $enrichedContext['user_agent'];
                $contextJson = json_encode($context);
                
                $stmt->bind_param(
                    "iiissssssisssss",
                    $tenantId,
                    $userId,
                    $shopId,
                    $errorLevel,
                    $errorType,
                    $errorMessage,
                    $errorCode,
                    $filePath,
                    $lineNumber,
                    $stackTrace,
                    $requestUrl,
                    $requestMethod,
                    $ipAddress,
                    $userAgent,
                    $contextJson
                );
                
                $stmt->execute();
                $stmt->close();
            }
            
            return true;
        } catch (Exception $e) {
            // Fail silently to avoid breaking application
            error_log("EventLogger::logError failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Log API request
     * 
     * Stores API request metrics in api_request_logs table
     * 
     * @param string $endpoint API endpoint path
     * @param string $method HTTP method (GET, POST, etc.)
     * @param int $statusCode HTTP status code
     * @param int $responseTimeMs Response time in milliseconds
     * @param string|null $module Module name (auto-detected if null)
     * @return bool Success status
     */
    public static function logApiRequest($endpoint, $method, $statusCode, $responseTimeMs, $module = null) {
        try {
            // Auto-detect module if not provided
            if ($module === null) {
                $module = self::detectModule($endpoint);
            }
            
            // Enrich context
            $context = self::enrichContext([]);
            
            // Determine if error
            $isError = ($statusCode >= 400) ? 1 : 0;
            
            // Log to database (api_request_logs table)
            $conn = self::getConnection();
            if ($conn) {
                $stmt = $conn->prepare(
                    "INSERT INTO api_request_logs (
                        tenant_id, user_id, shop_id,
                        endpoint, http_method,
                        status_code, response_time_ms,
                        ip_address, user_agent,
                        is_error, module,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
                );
                
                $tenantId = $context['tenant_id'] ?? null;
                $userId = $context['user_id'] ?? null;
                $shopId = $context['shop_id'] ?? null;
                $ipAddress = $context['ip_address'];
                $userAgent = $context['user_agent'];
                
                $stmt->bind_param(
                    "iiissiiisss",
                    $tenantId,
                    $userId,
                    $shopId,
                    $endpoint,
                    $method,
                    $statusCode,
                    $responseTimeMs,
                    $ipAddress,
                    $userAgent,
                    $isError,
                    $module
                );
                
                $stmt->execute();
                $stmt->close();
            }
            
            return true;
        } catch (Exception $e) {
            // Fail silently to avoid breaking application
            error_log("EventLogger::logApiRequest failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Detect module from endpoint URL
     * 
     * @param string $endpoint API endpoint path
     * @return string Module name
     */
    private static function detectModule($endpoint) {
        if (strpos($endpoint, '/inventory') !== false) return 'inventory';
        if (strpos($endpoint, '/transaction') !== false) return 'sales';
        if (strpos($endpoint, '/marketplace') !== false) return 'marketplace';
        if (strpos($endpoint, '/admin') !== false) return 'admin';
        if (strpos($endpoint, '/superadmin') !== false) return 'superadmin';
        if (strpos($endpoint, '/auth') !== false) return 'auth';
        if (strpos($endpoint, '/report') !== false) return 'reports';
        if (strpos($endpoint, '/expense') !== false) return 'expenses';
        if (strpos($endpoint, '/customer') !== false) return 'customers';
        if (strpos($endpoint, '/vendor') !== false) return 'vendors';
        if (strpos($endpoint, '/profile') !== false) return 'profile';
        
        return 'other';
    }
    
    /**
     * Log debug message (development only)
     * 
     * @param string $message Debug message
     * @param array $context Additional context
     */
    public static function debug($message, $context = []) {
        $logger = self::getInstance();
        $enrichedContext = self::enrichContext($context);
        $logger->debug($message, $enrichedContext);
    }
    
    /**
     * Log info message
     * 
     * @param string $message Info message
     * @param array $context Additional context
     */
    public static function info($message, $context = []) {
        $logger = self::getInstance();
        $enrichedContext = self::enrichContext($context);
        $logger->info($message, $enrichedContext);
    }
    
    /**
     * Log warning message
     * 
     * @param string $message Warning message
     * @param array $context Additional context
     */
    public static function warning($message, $context = []) {
        $logger = self::getInstance();
        $enrichedContext = self::enrichContext($context);
        $logger->warning($message, $enrichedContext);
    }
}
