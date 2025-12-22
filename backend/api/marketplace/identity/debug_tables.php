<?php
// backend/api/marketplace/identity/debug_tables.php
session_start();
header("Content-Type: application/json");
require_once '../../../config/db_connect.php';

$user_id = $_SESSION['user_id'] ?? null;

$tables = [
    'marketplace_identity_verifications',
    'marketplace_verification_attempts',
    'marketplace_profiles',
    'rate_limit_log',
    'users'
];

$results = [];
foreach ($tables as $table) {
    $res = $conn->query("SHOW TABLES LIKE '$table'");
    $results[$table] = $res && $res->num_rows > 0;
}

echo json_encode([
    'success' => true,
    'tables' => $results,
    'php_version' => phpversion(),
    'session_status' => session_status(),
    'session_id' => session_id(),
    'user_id' => $user_id,
    'test_rate_limiter' => 'Starting...',
]);

// Test RateLimiter
require_once '../../../includes/security.php';
try {
    $rl = new RateLimiter($conn);
    // Use a high user ID to not interfere with real data
    $check = $rl->checkLimit(999999, 'debug_test', 10, 1);
    echo "\nRateLimiter Test: " . ($check ? 'PASSED' : 'FAILED/LIMITED');
} catch (Throwable $e) {
    echo "\nRateLimiter CRASHED: " . $e->getMessage();
}
?>
