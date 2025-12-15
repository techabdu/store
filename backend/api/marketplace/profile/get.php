<?php
// backend/api/marketplace/profile/get.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
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
// Optional: Allow getting other users' profiles by ID in query param
$target_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : $user_id;

$stmt = $conn->prepare("
    SELECT 
        mp.*, 
        s.name as shop_name,
        s.address as shop_address
    FROM marketplace_profiles mp
    JOIN shops s ON mp.shop_id = s.id
    WHERE mp.user_id = ?
");

$stmt->bind_param("i", $target_user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // Basic sanitization
    unset($row['created_at']); // Optional
    
    echo json_encode(['success' => true, 'profile' => $row]);
} else {
    // If requesting own profile and not found, return specific status
    if ($target_user_id === $user_id) {
        echo json_encode(['success' => false, 'error' => 'Profile not found', 'code' => 'NO_PROFILE']);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User profile not found']);
    }
}
?>
