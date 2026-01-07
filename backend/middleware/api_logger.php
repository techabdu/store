<?php
/**
 * API Request Logger Middleware
 * 
 * Logs all API requests to the api_request_logs table for monitoring,
 * analytics, and debugging purposes.
 * 
 * This middleware should be included early in API endpoints to capture
 * request timing and details.
 * 
 * Table: api_request_logs
 * - tracks endpoint, HTTP method, status code, response time
 * - associates with tenant, user, and shop context
 * - flags errors for easy filtering
 */

// Ensure database connection is available
require_once __DIR__ . '/../config/database.php';

/**
 * API Logger Class
 * 
 * Handles logging of API requests with automatic timing and context detection
 */
class ApiLogger {
    private static $instance = null;
    private $startTime;
    private $conn;
    private $endpoint;
    private $method;
    private $logged = false;
    
    /**
     * Private constructor for singleton pattern
     */
    private function __construct() {
        global $conn;
        $this->conn = $conn;
        $this->startTime = microtime(true);
        $this->endpoint = $_SERVER['REQUEST_URI'] ?? 'unknown';
        $this->method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        // Register shutdown function to ensure logging even on errors
        register_shutdown_function([$this, 'logOnShutdown']);
    }
    
    /**
     * Get singleton instance
     * 
     * @return ApiLogger
     */
    public static function getInstance(): ApiLogger {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Log the API request
     * 
     * @param int $statusCode HTTP status code
     * @param int|null $responseSize Response body size in bytes
     * @return bool Success status
     */
    public function log(int $statusCode = 200, ?int $responseSize = null): bool {
        if ($this->logged) {
            return true; // Already logged
        }
        
        $this->logged = true;
        
        // Don't log OPTIONS preflight requests
        if ($this->method === 'OPTIONS') {
            return true;
        }
        
        try {
            // Calculate response time in milliseconds
            $responseTimeMs = (int) round((microtime(true) - $this->startTime) * 1000);
            
            // Get context from session (may not be available for all requests)
            $tenantId = $_SESSION['tenant_id'] ?? null;
            $userId = $_SESSION['user_id'] ?? null;
            $shopId = $_SESSION['user_shop_id'] ?? $_SESSION['current_shop_id'] ?? null;
            
            // Get request details
            $ipAddress = $this->getClientIp();
            $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
            $requestSize = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
            
            // Determine if this is an error
            $isError = ($statusCode >= 400) ? 1 : 0;
            
            // Determine module from endpoint path
            $module = $this->detectModule($this->endpoint);
            
            // Clean endpoint (remove query string for grouping)
            $cleanEndpoint = strtok($this->endpoint, '?');
            
            // Prepare and execute insert
            $stmt = $this->conn->prepare("
                INSERT INTO api_request_logs 
                (tenant_id, user_id, shop_id, endpoint, http_method, status_code, 
                 response_time_ms, request_size_bytes, response_size_bytes, 
                 ip_address, user_agent, is_error, module, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            if (!$stmt) {
                error_log("API Logger: Failed to prepare statement - " . $this->conn->error);
                return false;
            }
            
            $stmt->bind_param(
                "iiissiiiissss",
                $tenantId,
                $userId,
                $shopId,
                $cleanEndpoint,
                $this->method,
                $statusCode,
                $responseTimeMs,
                $requestSize,
                $responseSize,
                $ipAddress,
                $userAgent,
                $isError,
                $module
            );
            
            $result = $stmt->execute();
            
            if (!$result) {
                error_log("API Logger: Failed to insert log - " . $stmt->error);
            }
            
            $stmt->close();
            return $result;
            
        } catch (Exception $e) {
            error_log("API Logger Exception: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Log on shutdown (catches errors/exits)
     */
    public function logOnShutdown(): void {
        if ($this->logged) {
            return;
        }
        
        // Get the current HTTP response code
        $statusCode = http_response_code() ?: 200;
        
        // Check for fatal errors
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            $statusCode = 500;
        }
        
        $this->log($statusCode);
    }
    
    /**
     * Get the client IP address
     * 
     * @return string|null
     */
    private function getClientIp(): ?string {
        // Check for forwarded IP (behind proxy/load balancer)
        $headers = [
            'HTTP_CF_CONNECTING_IP', // Cloudflare
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];
                // X-Forwarded-For may contain multiple IPs, take the first
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                return substr($ip, 0, 45); // Limit to column size
            }
        }
        
        return null;
    }
    
    /**
     * Detect the module name from the endpoint path
     * 
     * @param string $endpoint
     * @return string|null
     */
    private function detectModule(string $endpoint): ?string {
        $endpoint = strtolower($endpoint);
        
        $modules = [
            '/auth/' => 'auth',
            '/inventory/' => 'inventory',
            '/transaction' => 'sales',
            '/expense' => 'expenses',
            '/customer' => 'customers',
            '/user/' => 'users',
            '/admin/' => 'admin',
            '/superadmin/' => 'superadmin',
            '/marketplace/' => 'marketplace',
            '/shop' => 'shops',
            '/debt' => 'debts',
            '/report' => 'reports',
            '/subscription' => 'subscription'
        ];
        
        foreach ($modules as $pattern => $module) {
            if (strpos($endpoint, $pattern) !== false) {
                return $module;
            }
        }
        
        return 'general';
    }
    
    /**
     * Get the start time for manual timing calculations
     * 
     * @return float
     */
    public function getStartTime(): float {
        return $this->startTime;
    }
}

/**
 * Initialize the API logger singleton
 * This is called automatically when the file is included
 */
$apiLogger = ApiLogger::getInstance();

/**
 * Helper function to manually log with specific status
 * Call this before exit() if you want to log with a specific status code
 * 
 * @param int $statusCode
 * @param int|null $responseSize
 * @return bool
 */
function logApiRequest(int $statusCode = 200, ?int $responseSize = null): bool {
    return ApiLogger::getInstance()->log($statusCode, $responseSize);
}
