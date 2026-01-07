<?php
// backend/api/marketplace/profile/create.php

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

// 1. Check if profile already exists
$stmt = $conn->prepare("SELECT id FROM marketplace_profiles WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Marketplace profile already exists']);
    exit();
}

// 2. Check Identity Verification
// Must have at least one successful verification (BVN or NIN)
$stmt = $conn->prepare("
    SELECT verification_level, is_verified 
    FROM marketplace_identity_verifications 
    WHERE user_id = ? AND is_verified = 1 AND verification_status = 'success'
    LIMIT 1
");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$verification_result = $stmt->get_result();
$verification_data = $verification_result->fetch_assoc();

if (!$verification_data) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Identity verification required before creating a profile. Please complete BVN or NIN verification.']);
    exit();
}

// 3. Get User's Shop ID and Tenant ID
$stmt = $conn->prepare("SELECT shop_id, tenant_id, username FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user_data = $stmt->get_result()->fetch_assoc();

if (!$user_data || !$user_data['shop_id']) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User must belong to a shop to create a marketplace profile']);
    exit();
}

$shop_id = $user_data['shop_id'];
$tenant_id = $user_data['tenant_id'];
$display_name = isset($data->display_name) ? trim($data->display_name) : $user_data['username'];
$bio = isset($data->bio) ? trim($data->bio) : '';
$profile_image = isset($data->profile_image) ? trim($data->profile_image) : '';

// 4. Create Profile
$stmt = $conn->prepare("
    INSERT INTO marketplace_profiles 
    (tenant_id, user_id, shop_id, display_name, bio, profile_image, is_verified, verification_level, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1)
");

$level = $verification_data['verification_level'];
$stmt->bind_param("iiissss", $tenant_id, $user_id, $shop_id, $display_name, $bio, $profile_image, $level);

if ($stmt->execute()) {
    // 5. Also Create Wallet if not exists
    $wallet_stmt = $conn->prepare("INSERT IGNORE INTO marketplace_wallets (tenant_id, user_id, shop_id) VALUES (?, ?, ?)");
    $wallet_stmt->bind_param("iii", $tenant_id, $user_id, $shop_id);
    $wallet_stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'Marketplace profile created successfully']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to create profile: ' . $conn->error]);
}
?>
