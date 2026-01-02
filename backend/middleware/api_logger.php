<?php
/**
 * API Request Logger Middleware
 * 
 * Automatically logs all API requests with performance metrics.
 * Tracks response time, status codes, and errors.
 * 
 * Usage: Include at the top of any API endpoint file
 * require_once __DIR__ . '/../../middleware/api_logger.php';
 * 
 * Features:
 * - Automatic request timing
 * - Module detection
 * - Error flagging
 * - User/tenant tracking
 * - Minimal performance overhead (<5ms)
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

require_once __DIR__ . '/../helpers/EventLogger.php';

class ApiLogger {
    private static $startTime = null;
    private static $endpoint = null;
    private static $method = null;
    
    /**
     * Start request timing
     * 
     * Called automatically when middleware is included
     */
    public static function startRequest() {
        self::$startTime = microtime(true);
        self::$endpoint = $_SERVER['REQUEST_URI'] ?? '/unknown';
        self::$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }
    
    /**
     * End request and log metrics
     * 
     * Called automatically via shutdown function
     * 
     * @param int $statusCode HTTP status code (default: 200)
     */
    public static function endRequest($statusCode = null) {
        // Only log if startRequest was called
        if (self::$startTime === null) {
            return;
        }
        
        // Calculate response time
        $endTime = microtime(true);
        $responseTimeMs = round(($endTime - self::$startTime) * 1000);
        
        // Get status code from response or parameter
        if ($statusCode === null) {
            $statusCode = http_response_code();
            // If http_response_code() returns false, default to 200
            if ($statusCode === false) {
                $statusCode = 200;
            }
        }
        
        // Detect module from endpoint
        $module = self::detectModule(self::$endpoint);
        
        // Log the API request
        EventLogger::logApiRequest(
            self::$endpoint,
            self::$method,
            $statusCode,
            $responseTimeMs,
            $module
        );
    }
    
    /**
     * Detect module from endpoint URL
     * 
     * @param string $endpoint API endpoint path
     * @return string Module name
     */
    private static function detectModule($endpoint) {
        // Remove query string
        $path = strtok($endpoint, '?');
        
        // Module detection patterns
        if (strpos($path, '/inventory') !== false) return 'inventory';
        if (strpos($path, '/transaction') !== false) return 'sales';
        if (strpos($path, '/marketplace') !== false) return 'marketplace';
        if (strpos($path, '/admin') !== false) return 'admin';
        if (strpos($path, '/superadmin') !== false) return 'superadmin';
        if (strpos($path, '/auth') !== false) return 'auth';
        if (strpos($path, '/report') !== false) return 'reports';
        if (strpos($path, '/expense') !== false) return 'expenses';
        if (strpos($path, '/customer') !== false) return 'customers';
        if (strpos($path, '/vendor') !== false) return 'vendors';
        if (strpos($path, '/profile') !== false) return 'profile';
        if (strpos($path, '/settings') !== false) return 'settings';
        
        return 'other';
    }
    
    /**
     * Log request with custom status code
     * 
     * Use this to manually log with a specific status code
     * 
     * @param int $statusCode HTTP status code
     */
    public static function logWithStatus($statusCode) {
        self::endRequest($statusCode);
    }
}

// Auto-start request timing when middleware is included
ApiLogger::startRequest();

// Register shutdown function to automatically log when script ends
register_shutdown_function(function() {
    ApiLogger::endRequest();
});
