<?php
require_once __DIR__ . '/../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../helpers/activity_log.php';
require_once __DIR__ . '/../../helpers/session_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Initialize session to get user info before destroying
initializeSecureSession();

if (isset($_SESSION['user_id'])) {
    logActivity($_SESSION['user_id'], 'logout', 'User logged out');
}

// Destroy session using centralized helper
destroySession();

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
?>
