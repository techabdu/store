<?php
/**
 * Debug endpoint to test register.php dependencies
 * TEMPORARY - Remove after debugging
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

$steps = [];

try {
    $steps[] = "Step 1: Starting...";
    
    require_once '../../config/database.php';
    $steps[] = "Step 2: database.php loaded";
    
    require_once '../../config/config.php';
    $steps[] = "Step 3: config.php loaded";
    
    require_once '../../config/environment.php';
    $steps[] = "Step 4: environment.php loaded";
    
    $steps[] = "Step 5: Environment::get() = " . Environment::get();
    
    require_once '../../helpers/email_sender.php';
    $steps[] = "Step 6: email_sender.php loaded";
    
    require_once '../../helpers/sanitize.php';
    $steps[] = "Step 7: sanitize.php loaded";
    
    require_once '../../helpers/csrf.php';
    $steps[] = "Step 8: csrf.php loaded";
    
    require_once '../../classes/SecurityMonitor.php';
    $steps[] = "Step 9: SecurityMonitor.php loaded";
    
    $securityMonitor = new SecurityMonitor();
    $steps[] = "Step 10: SecurityMonitor instantiated";
    
    echo json_encode(['success' => true, 'steps' => $steps]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
} catch (Error $e) {
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
}
?>
