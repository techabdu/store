<?php
// backend/debug_env.php
require_once 'vendor/autoload.php';

try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->safeLoad();
    echo "Dotenv loaded.\n";
} catch (Exception $e) {
    echo "Dotenv failed: " . $e->getMessage() . "\n";
}

echo "KORA_ENVIRONMENT: " . (getenv('KORA_ENVIRONMENT') ?: 'NOT SET') . "\n";
echo "KORA_SECRET_KEY: " . (getenv('KORA_SECRET_KEY') ? 'SET (Hidden for security)' : 'NOT SET') . "\n";
echo "DB_HOST: " . (getenv('DB_HOST') ?: 'NOT SET') . "\n";

echo "\nPHP VERSION: " . phpversion() . "\n";
echo "CURL ENABLED: " . (function_exists('curl_init') ? 'YES' : 'NO') . "\n";
?>
