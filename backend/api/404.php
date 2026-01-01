<?php
require_once __DIR__ . '/../../config/config.php';
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8"); 
http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>
