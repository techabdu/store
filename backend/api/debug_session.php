<?php
/**
 * Debug Login Flow - TEMPORARY FOR DEBUGGING
 * DELETE THIS FILE AFTER FIXING THE ISSUE
 * 
 * This tests if sessions are being properly saved after login-like actions
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/session_helper.php';

// Set CORS headers
setCorsHeaders();

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

$step = $_GET['step'] ?? 'set';

if ($step === 'set') {
    // Step 1: Initialize session and set test data
    initializeSecureSession();
    
    // Simulate login by setting session data
    $_SESSION['test_user_id'] = 12345;
    $_SESSION['test_time'] = time();
    $_SESSION['test_random'] = bin2hex(random_bytes(8));
    
    echo json_encode([
        'success' => true,
        'step' => 'set',
        'message' => 'Session data SET. Now call ?step=get to verify it persists',
        'session_id' => session_id(),
        'session_data' => $_SESSION,
        'cookie_params' => session_get_cookie_params()
    ], JSON_PRETTY_PRINT);
    
} elseif ($step === 'get') {
    // Step 2: Read session (simulates subsequent API call)
    initializeSecureSession();
    
    echo json_encode([
        'success' => true,
        'step' => 'get',
        'message' => 'Reading session data...',
        'session_id' => session_id(),
        'session_data' => $_SESSION,
        'has_test_user_id' => isset($_SESSION['test_user_id']),
        'cookie_header' => $_SERVER['HTTP_COOKIE'] ?? 'not present',
    ], JSON_PRETTY_PRINT);
    
} elseif ($step === 'regenerate') {
    // Step 3: Test session regeneration (like login does)
    initializeSecureSession();
    
    $old_session_id = session_id();
    
    // Set some data before regeneration
    $_SESSION['pre_regen_data'] = 'before_regen';
    
    // Regenerate like login does
    session_regenerate_id(true);
    
    // Set more data after regeneration
    $_SESSION['post_regen_data'] = 'after_regen';
    $_SESSION['test_user_id'] = 99999;
    
    echo json_encode([
        'success' => true,
        'step' => 'regenerate',
        'message' => 'Session regenerated. Now call ?step=get to verify data persists with new ID',
        'old_session_id' => $old_session_id,
        'new_session_id' => session_id(),
        'session_data' => $_SESSION,
        'cookie_params' => session_get_cookie_params()
    ], JSON_PRETTY_PRINT);
    
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid step. Use ?step=set, ?step=get, or ?step=regenerate'
    ]);
}
?>
