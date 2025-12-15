<?php
// backend/api/marketplace/profile/update.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

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

// Add user_id to params
$types .= "i";
$params[] = $user_id;

$sql = "UPDATE marketplace_profiles SET " . implode(", ", $updates) . " WHERE user_id = ?";

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
