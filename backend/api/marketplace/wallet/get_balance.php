<?php
// backend/api/marketplace/wallet/get_balance.php

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
$shop_id = $_SESSION['current_shop_id'] ?? 1; // Default to 1 if not set

// Get wallet details for THIS shop
$stmt = $conn->prepare("
    SELECT id, available_balance, pending_balance, held_balance, total_funded, total_withdrawn, total_sales, total_purchases
    FROM marketplace_wallets 
    WHERE user_id = ? AND shop_id = ?
");

$stmt->bind_param("ii", $user_id, $shop_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode(['success' => true, 'wallet' => $row]);
} else {
    // Should not happen if profile creation auto-creates wallet, but just in case
    // Create wallet if missing for this branch
    $ins_stmt = $conn->prepare("INSERT IGNORE INTO marketplace_wallets (user_id, shop_id) VALUES (?, ?)");
    $ins_stmt->bind_param("ii", $user_id, $shop_id);
    $ins_stmt->execute();
    
    // Retry fetch
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'wallet' => $row]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not retrieve wallet for branch ' . $shop_id]);
    }
}
?>
