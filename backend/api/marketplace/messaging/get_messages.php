<?php
// backend/api/marketplace/messaging/get_messages.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];

if (!isset($_GET['conversation_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Conversation ID required']);
    exit();
}

$conversation_id = intval($_GET['conversation_id']);

// 1. Verify Access
$stmt = $conn->prepare("SELECT buyer_id, seller_id FROM marketplace_conversations WHERE id = ?");
$stmt->bind_param("i", $conversation_id);
$stmt->execute();
$conv = $stmt->get_result()->fetch_assoc();

if (!$conv || ($conv['buyer_id'] != $user_id && $conv['seller_id'] != $user_id)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Access denied']);
    exit();
}

// 2. Mark messages as read (where receiver is me and is_read is 0)
$update_stmt = $conn->prepare("UPDATE marketplace_messages SET is_read = 1 WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0");
$update_stmt->bind_param("ii", $conversation_id, $user_id);
$update_stmt->execute();

// 3. Fetch Messages
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

$query = "
    SELECT id, sender_id, message, message_type, metadata, created_at, is_read 
    FROM marketplace_messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
";

$stmt = $conn->prepare($query);
$stmt->bind_param("iii", $conversation_id, $limit, $offset);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $row['is_me'] = ($row['sender_id'] == $user_id);
    // Parse metadata JSON if present
    if (!empty($row['metadata'])) {
        $row['metadata'] = json_decode($row['metadata'], true);
    }
    $messages[] = $row;
}

echo json_encode(['success' => true, 'messages' => $messages]);
?>
