<?php
/**
 * Global Error and Exception Handler
 * Ensures consistent JSON responses for all types of errors
 */

class ErrorHandler {
    /**
     * Initialize the error handlers
     */
    public static function init() {
        set_error_handler([self::class, 'handleError']);
        set_exception_handler([self::class, 'handleException']);
        register_shutdown_function([self::class, 'handleShutdown']);
        
        // Disable displaying errors to output
        ini_set('display_errors', 0);
        ini_set('log_errors', 1);
    }

    /**
     * Handle PHP Errors
     */
    public static function handleError($errno, $errstr, $errfile, $errline) {
        if (!(error_reporting() & $errno)) {
            return false;
        }

        $message = "PHP Error [$errno]: $errstr in $errfile on line $errline";
        error_log($message);

        // Convert certain errors to exceptions to be caught by the exception handler
        if ($errno === E_USER_ERROR || $errno === E_RECOVERABLE_ERROR) {
            throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
        }

        return true; 
    }

    /**
     * Handle Uncaught Exceptions
     */
    public static function handleException($exception) {
        $statusCode = 500;
        $message = 'An unexpected server error occurred';
        
        // Log detailed error
        error_log(sprintf(
            "Uncaught Exception: %s in %s on line %d\nStack trace:\n%s",
            $exception->getMessage(),
            $exception->getFile(),
            $exception->getLine(),
            $exception->getTraceAsString()
        ));

        // In development, we might want more details (optional check)
        $isDev = !in_array($_SERVER['HTTP_HOST'] ?? 'localhost', ['localhost', '127.0.0.1']) === false;
        
        if ($isDev) {
            $message = $exception->getMessage();
        }

        self::sendJsonResponse($statusCode, [
            'success' => false,
            'error' => $message,
            'debug' => $isDev ? [
                'type' => get_class($exception),
                'file' => $exception->getFile(),
                'line' => $exception->getLine()
            ] : null
        ]);
    }

    /**
     * Handle Fatal Errors on Shutdown
     */
    public static function handleShutdown() {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            $message = "Fatal Error: {$error['message']} in {$error['file']} on line {$error['line']}";
            error_log($message);
            
            // Note: Since headers might have been sent, we try to clear buffer
            if (ob_get_length()) ob_clean();
            
            self::sendJsonResponse(500, [
                'success' => false,
                'error' => 'A critical server error occurred'
            ]);
        }
    }

    /**
     * Send a JSON response and exit
     */
    private static function sendJsonResponse($code, $data) {
        if (!headers_sent()) {
            http_response_code($code);
            header('Content-Type: application/json; charset=UTF-8');
            
            // Add CORS if FRONTEND_URL is defined (from config.php)
            if (defined('FRONTEND_URL')) {
                header("Access-Control-Allow-Origin: " . FRONTEND_URL);
                header("Access-Control-Allow-Credentials: true");
            }
        }
        
        echo json_encode($data);
        exit;
    }
}
