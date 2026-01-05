<?php
// backend/api/marketplace/identity/get_attempts.php

require_once '../../../config/config.php';
require_once '../../../middleware/api_logger.php'; // API request logging

setCorsHeaders();
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];

$stmt = $conn->prepare("
    SELECT verification_type, attempt_status, verification_cost, kora_reference, created_at, error_message 
    FROM marketplace_verification_attempts 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 20
");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$attempts = [];
while ($row = $result->fetch_assoc()) {
    $attempts[] = $row;
}

echo json_encode([
    'success' => true,
    'attempts' => $attempts
]);
?>
