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

$testAction = $argv[1] ?? 'list';
$testTenantId = $argv[2] ?? null;

if ($testAction === 'detail' && $testTenantId) {
    $_GET['tenant_id'] = $testTenantId;
} elseif ($testAction === 'filter') {
    $_GET['category'] = $argv[2] ?? 'at_risk';
}

$_SERVER['REQUEST_METHOD'] = 'GET';

echo "Testing health scores API action: $testAction\n";

ob_start();
try {
    require __DIR__ . '/api/superadmin/health_scores.php';
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage();
}
$output = ob_get_clean();
echo "Response:\n" . $output . "\n";
?>
