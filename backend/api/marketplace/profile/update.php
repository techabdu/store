<?php
// backend/api/marketplace/profile/update.php

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
$data = json_decode(file_get_contents("php://input"));

// Fields to update
$updates = [];
$types = "";
$params = [];

if (isset($data->display_name)) {
    $updates[] = "display_name = ?";
    $types .= "s";
    $params[] = trim($data->display_name);
}

if (isset($data->bio)) {
    $updates[] = "bio = ?";
    $types .= "s";
    $params[] = trim($data->bio);
}

if (isset($data->profile_image)) {
    $updates[] = "profile_image = ?";
    $types .= "s";
    $params[] = trim($data->profile_image);
}

if (empty($updates)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No fields to update']);
    exit();
}

// Add user_id and shop_id to params
$shop_id = $_SESSION['current_shop_id'] ?? null;
if ($shop_id) {
    $types .= "ii";
    $params[] = $user_id;
    $params[] = $shop_id;
    $sql = "UPDATE marketplace_profiles SET " . implode(", ", $updates) . " WHERE user_id = ? AND shop_id = ?";
} else {
    $types .= "i";
    $params[] = $user_id;
    $sql = "UPDATE marketplace_profiles SET " . implode(", ", $updates) . " WHERE user_id = ?";
}

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    } else {
        echo json_encode(['success' => true, 'message' => 'No changes made']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Update failed: ' . $conn->error]);
}
?>
