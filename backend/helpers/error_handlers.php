<?php
/**
 * Custom Error Handlers
 * 
 * Registers custom handlers for PHP errors, exceptions, and fatal errors.
 * All errors are logged to both file and database via EventLogger.
 * 
 * Features:
 * - Catches all PHP errors (warnings, notices, errors)
 * - Catches uncaught exceptions
 * - Catches fatal errors via shutdown function
 * - Automatic context enrichment
 * - Stack trace capture
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

require_once __DIR__ . '/EventLogger.php';

/**
 * Custom error handler for PHP errors
 * 
 * Handles E_ERROR, E_WARNING, E_NOTICE, etc.
 * 
 * @param int $errno Error number
 * @param string $errstr Error message
 * @param string $errfile File where error occurred
 * @param int $errline Line number where error occurred
 * @return bool True to prevent PHP's internal error handler
 */
function customErrorHandler($errno, $errstr, $errfile, $errline) {
    // Don't log errors that are suppressed with @
    if (!(error_reporting() & $errno)) {
        return false;
    }
    
    // Determine error level
    $errorLevel = 'error';
    $errorType = 'PHPError';
    
    switch ($errno) {
        case E_ERROR:
        case E_USER_ERROR:
        case E_CORE_ERROR:
        case E_COMPILE_ERROR:
            $errorLevel = 'critical';
            $errorType = 'FatalError';
            break;
            
        case E_WARNING:
        case E_USER_WARNING:
        case E_CORE_WARNING:
        case E_COMPILE_WARNING:
            $errorLevel = 'warning';
            $errorType = 'Warning';
            break;
            
        case E_NOTICE:
        case E_USER_NOTICE:
            $errorLevel = 'warning';
            $errorType = 'Notice';
            break;
            
        case E_STRICT:
            $errorLevel = 'warning';
            $errorType = 'Strict';
            break;
            
        case E_DEPRECATED:
        case E_USER_DEPRECATED:
            $errorLevel = 'warning';
            $errorType = 'Deprecated';
            break;
            
        default:
            $errorLevel = 'error';
            $errorType = 'UnknownError';
            break;
    }
    
    // Build context
    $context = [
        'error_type' => $errorType,
        'error_code' => $errno,
        'file' => $errfile,
        'line' => $errline,
        'errno' => $errno
    ];
    
    // Log the error
    EventLogger::logError($errorLevel, $errstr, $context);
    
    // Don't execute PHP internal error handler
    return true;
}

/**
 * Custom exception handler for uncaught exceptions
 * 
 * @param Throwable $exception The uncaught exception
 */
function customExceptionHandler($exception) {
    // Build context with full exception details
    $context = [
        'error_type' => get_class($exception),
        'error_code' => $exception->getCode(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'stack_trace' => $exception->getTraceAsString(),
        'exception_class' => get_class($exception)
    ];
    
    // Log as critical error
    EventLogger::logError('critical', $exception->getMessage(), $context);
    
    // In production, show generic error message
    // In development, you might want to show more details
    if (php_sapi_name() !== 'cli') {
        // Only send headers if not already sent
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code(500);
        }
        
        // Check environment
        $isDevelopment = (getenv('APP_ENV') === 'development');
        
        if ($isDevelopment) {
            // Show detailed error in development
            echo json_encode([
                'success' => false,
                'error' => 'Internal Server Error',
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTrace()
            ]);
        } else {
            // Show generic error in production
            echo json_encode([
                'success' => false,
                'error' => 'Internal Server Error',
                'message' => 'An unexpected error occurred. Please try again later.'
            ]);
        }
    }
}

/**
 * Shutdown function to catch fatal errors
 * 
 * Catches errors that can't be caught by error handler
 * (E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR)
 */
function customShutdownHandler() {
    $error = error_get_last();
    
    if ($error !== null) {
        $fatalErrors = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
        
        if (in_array($error['type'], $fatalErrors)) {
            // Build context
            $context = [
                'error_type' => 'FatalError',
                'error_code' => $error['type'],
                'file' => $error['file'],
                'line' => $error['line'],
                'fatal' => true
            ];
            
            // Log as critical error
            EventLogger::logError('critical', $error['message'], $context);
            
            // In production, show generic error
            if (php_sapi_name() !== 'cli' && !headers_sent()) {
                header('Content-Type: application/json');
                http_response_code(500);
                
                $isDevelopment = (getenv('APP_ENV') === 'development');
                
                if ($isDevelopment) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Fatal Error',
                        'message' => $error['message'],
                        'file' => $error['file'],
                        'line' => $error['line']
                    ]);
                } else {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Internal Server Error',
                        'message' => 'A critical error occurred. Please contact support.'
                    ]);
                }
            }
        }
    }
}

// Register error handlers
set_error_handler('customErrorHandler');
set_exception_handler('customExceptionHandler');
register_shutdown_function('customShutdownHandler');

// Log that error handlers are registered
EventLogger::info('Error handlers registered', [
    'handlers' => [
        'error_handler' => 'customErrorHandler',
        'exception_handler' => 'customExceptionHandler',
        'shutdown_handler' => 'customShutdownHandler'
    ]
]);
