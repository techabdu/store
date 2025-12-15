<?php
// backend/api/marketplace/admin/ban_user.php

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

// 1. Check SuperAdmin Role
if (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Access Denied: SuperAdmin only']);
    exit();
}

$admin_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->user_id) || !isset($data->reason)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User ID and reason required']);
    exit();
}

$target_user_id = intval($data->user_id);
$reason = trim($data->reason);
$restriction_type = isset($data->type) ? $data->type : 'full_ban'; // full_ban, listing_ban, etc.
$duration_days = isset($data->duration_days) ? intval($data->duration_days) : null; 

$expires_at = null;
if ($duration_days) {
    $expires_at = date('Y-m-d H:i:s', strtotime("+$duration_days days"));
}

$conn->begin_transaction();

try {
    // 2. Validate Target User
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->bind_param("i", $target_user_id);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) {
        throw new Exception('User not found');
    }

    if ($target_user_id === $admin_id) {
        throw new Exception('You cannot ban yourself');
    }

    // 3. Insert Restriction
    // Check if active restriction exists, update or insert
    // Ideally we keep history, so just insert new active one.
    $stmt = $conn->prepare("
        INSERT INTO marketplace_restrictions 
        (user_id, restricted_by, restriction_type, reason, expires_at, created_at, is_active)
        VALUES (?, ?, ?, ?, ?, NOW(), 1)
    ");
    $stmt->bind_param("iisss", $target_user_id, $admin_id, $restriction_type, $reason, $expires_at);
    $stmt->execute();

    // 4. Update Profile Status
    if ($restriction_type === 'full_ban') {
        $up_stmt = $conn->prepare("UPDATE marketplace_profiles SET is_restricted = 1, is_active = 0 WHERE user_id = ?");
        $up_stmt->bind_param("i", $target_user_id);
        $up_stmt->execute();
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'User banned successfully']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
