<?php
/**
 * Environment Configuration Helper
 * 
 * Provides a unified way to detect and access environment settings.
 */

class Environment {
    /** @var string Current environment (production, development, staging) */
    private static $environment = null;
    
    /** @var array Configuration cache */
    private static $config = [];
    
    /**
     * Get the current environment
     * 
     * Detection order:
     * 1. APP_ENV environment variable
     * 2. Host-based detection (prhub.shop = production)
     * 3. Default to 'development'
     * 
     * @return string 'production', 'development', or 'staging'
     */
    public static function get() {
        if (self::$environment !== null) {
            return self::$environment;
        }
        
        // Check APP_ENV environment variable first
        $appEnv = getenv('APP_ENV') 
                 ?: ($_ENV['APP_ENV'] ?? null) 
                 ?: ($_SERVER['APP_ENV'] ?? null);
        
        if ($appEnv) {
            self::$environment = strtolower($appEnv);
            return self::$environment;
        }
        
        // Host-based detection
        $host = $_SERVER['HTTP_HOST'] ?? '';
        
        if (strpos($host, 'prhub.shop') !== false) {
            self::$environment = 'production';
        } elseif (strpos($host, 'staging.') !== false) {
            self::$environment = 'staging';
        } else {
            self::$environment = 'development';
        }
        
        return self::$environment;
    }
    
    /**
     * Check if we're in production
     * 
     * @return bool
     */
    public static function isProduction() {
        return self::get() === 'production';
    }
    
    /**
     * Check if we're in development
     * 
     * @return bool
     */
    public static function isDevelopment() {
        return self::get() === 'development';
    }
    
    /**
     * Get a configuration value with fallback
     * 
     * @param string $key Configuration key (e.g., 'db_host')
     * @param mixed $default Default value if not found
     * @return mixed
     */
    public static function config($key, $default = null) {
        // Map common config keys to environment variables
        $envKeys = [
            'db_host' => 'DB_HOST',
            'db_user' => 'DB_USER',
            'db_pass' => 'DB_PASS',
            'db_name' => 'DB_NAME',
            'smtp_host' => 'SMTP_HOST',
            'smtp_username' => 'SMTP_USERNAME',
            'smtp_password' => 'SMTP_PASSWORD',
            'smtp_port' => 'SMTP_PORT',
            'smtp_from_email' => 'SMTP_FROM_EMAIL',
            'smtp_from_name' => 'SMTP_FROM_NAME',
            'frontend_url' => 'FRONTEND_URL',
            'api_url' => 'API_URL',
            'app_env' => 'APP_ENV',
        ];
        
        // Check cache first
        if (isset(self::$config[$key])) {
            return self::$config[$key];
        }
        
        // Get environment variable name
        $envKey = $envKeys[$key] ?? strtoupper($key);
        
        // Try to get value from environment
        $value = getenv($envKey);
        if ($value === false) {
            $value = $_ENV[$envKey] ?? ($_SERVER[$envKey] ?? null);
        }
        
        // Use default if not found
        $result = ($value !== null && $value !== false) ? $value : $default;
        
        // Cache the result
        self::$config[$key] = $result;
        
        return $result;
    }
    
    /**
     * Force set environment (useful for testing)
     * 
     * @param string $env
     */
    public static function set($env) {
        self::$environment = strtolower($env);
    }
    
    /**
     * Reset cached values (useful for testing)
     */
    public static function reset() {
        self::$environment = null;
        self::$config = [];
    }
}
?>
