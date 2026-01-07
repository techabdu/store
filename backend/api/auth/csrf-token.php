<?php
require_once '../../config/config.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../helpers/csrf.php';

// Set CORS headers
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'csrf_token' => generateCsrfToken()
    ]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
