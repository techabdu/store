<?php
/**
 * Environment Configuration Manager
 * 
 * Manages environment-specific configurations for development and production.
 * Loads settings from .env file and provides centralized config access.
 * 
 * @author SuperAdmin Monitoring System
 * @date 2026-01-02
 */

class Environment {
    private static $env = null;
    
    /**
     * Get current environment (development or production)
     * 
     * @return string Current environment name
     */
    public static function get() {
        if (self::$env === null) {
            // Load from .env file
            if (file_exists(__DIR__ . '/../.env')) {
                $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    // Skip comments and empty lines
                    if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                        list($key, $value) = explode('=', $line, 2);
                        putenv(trim($key) . '=' . trim($value));
                    }
                }
            }
            self::$env = getenv('APP_ENV') ?: 'development';
        }
        return self::$env;
    }
    
    /**
     * Get configuration value for current environment
     * 
     * @param string $key Configuration key to retrieve
     * @param mixed $default Default value if key not found
     * @return mixed Configuration value
     */
    public static function config($key, $default = null) {
        $configs = [
            'development' => [
                'db_host' => 'localhost',
                'db_name' => 'store',
                'db_user' => 'root',
                'db_pass' => '',
                'api_url' => 'http://localhost/store/backend/api',
                'frontend_url' => 'http://localhost:5173',
                'ws_url' => 'ws://localhost:8080',
                'smtp_host' => getenv('SMTP_HOST') ?: 'smtp.mailtrap.io',
                'smtp_port' => getenv('SMTP_PORT') ?: 2525,
                'smtp_user' => getenv('SMTP_USER') ?: '',
                'smtp_pass' => getenv('SMTP_PASS') ?: '',
                'smtp_from_email' => getenv('SMTP_FROM_EMAIL') ?: 'noreply@prhub.shop',
                'smtp_from_name' => getenv('SMTP_FROM_NAME') ?: 'PR Hub',
            ],
            'production' => [
                'db_host' => getenv('DB_HOST'),
                'db_name' => getenv('DB_NAME'),
                'db_user' => getenv('DB_USER'),
                'db_pass' => getenv('DB_PASS'),
                'api_url' => 'https://prhub.shop/api',
                'frontend_url' => 'https://prhub.shop',
                'ws_url' => 'wss://prhub.shop:8080',
                'smtp_host' => getenv('SMTP_HOST'),
                'smtp_port' => getenv('SMTP_PORT'),
                'smtp_user' => getenv('SMTP_USER'),
                'smtp_pass' => getenv('SMTP_PASS'),
                'smtp_from_email' => getenv('SMTP_FROM_EMAIL') ?: 'noreply@prhub.shop',
                'smtp_from_name' => getenv('SMTP_FROM_NAME') ?: 'PR Hub',
            ]
        ];
        
        $env = self::get();
        return $configs[$env][$key] ?? $default;
    }
    
    /**
     * Check if current environment is development
     * 
     * @return bool True if development environment
     */
    public static function isDevelopment() {
        return self::get() === 'development';
    }
    
    /**
     * Check if current environment is production
     * 
     * @return bool True if production environment
     */
    public static function isProduction() {
        return self::get() === 'production';
    }
}
