<?php
// Mock environment for testing CLI
if (php_sapi_name() === 'cli') {
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
    $_SESSION['role'] = 'superadmin';
    $_SESSION['user_id'] = 999;
    
    // Test constants
    if (!defined('MYSQLI_ASSOC')) define('MYSQLI_ASSOC', 1);
}

$testAction = $argv[1] ?? 'tenant_usage';
$testTenantId = $argv[2] ?? 1;

$_GET['action'] = $testAction;
$_GET['tenant_id'] = $testTenantId;
$_GET['period'] = '30d';
$_SERVER['REQUEST_METHOD'] = 'GET';

echo "Testing feature usage action: $testAction (Tenant: $testTenantId)\n";

ob_start();
try {
    require __DIR__ . '/api/superadmin/feature_usage.php';
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage();
}
$output = ob_get_clean();
echo "Response:\n" . $output . "\n";
?>
