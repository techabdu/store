<?php
/**
 * Session Configuration and Management
 * 
 * Centralized session handling to ensure consistent session behavior
 * across all endpoints.
 */

/**
 * Initialize session with secure settings
 * Call this before any session operation
 */
function initializeSecureSession() {
    // Only initialize if session hasn't started
    if (session_status() !== PHP_SESSION_NONE) {
        return; // Already started
    }

    // Determine environment and security settings
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $isProduction = strpos($host, 'prhub.shop') !== false;
    
    // FORCE Secure in production (fixes issues behind proxies/load balancers)
    // Otherwise detect from headers
    $secure = $isProduction || 
              (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
              (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    // Cookie Domain: Allow sharing across subdomains in production
    $cookieDomain = $isProduction ? '.prhub.shop' : '';
    
    // Set cookie parameters BEFORE starting session
    // SameSite=None + Secure is the most robust for modern interactions
    session_set_cookie_params([
        'lifetime' => 172800, // 48 hours
        'path' => '/',
        'domain' => $cookieDomain,
        'secure' => $secure,   // Must be true for SameSite=None
        'httponly' => true,
        'samesite' => $isProduction ? 'None' : 'Lax' // Use None in production for max compatibility (requires Secure)
    ]);
    
    // Set additional session configuration
    ini_set('session.gc_maxlifetime', 172800); // 48 hours
    ini_set('session.use_strict_mode', 1);
    
    // Use custom session name (helps avoid conflicts)
    session_name('SALSABEELSESSID');
    
    // Start the session
    session_start();
}

/**
 * Regenerate session ID securely
 * Use after login to prevent session fixation
 */
function regenerateSessionId() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
}

/**
 * Check session timeout and update activity
 * 
 * @return bool True if session is valid, false if expired
 */
function checkSessionTimeout() {
    // Check absolute timeout (7 days = 604800 seconds)
    // Prevents indefinite sessions even with activity
    $absolute_timeout = 604800;
    if (!isset($_SESSION['created_at'])) {
        $_SESSION['created_at'] = time();
    } else if (time() - $_SESSION['created_at'] > $absolute_timeout) {
        return false; // Session too old
    }

    // Check inactivity timeout (48 hours)
    $timeout_duration = 172800;
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $timeout_duration) {
        return false; // Session inactive for too long
    }
    
    // Update last activity
    $_SESSION['last_activity'] = time();
    
    return true;
}

/**
 * Destroy session completely
 */
function destroySession() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = array();
        
        // Delete session cookie
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        
        session_destroy();
    }
}
?>
