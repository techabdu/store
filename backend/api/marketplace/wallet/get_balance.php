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

// Get wallet details
$stmt = $conn->prepare("
    SELECT id, available_balance, pending_balance, held_balance, total_funded, total_withdrawn, total_sales, total_purchases
    FROM marketplace_wallets 
    WHERE user_id = ?
");

$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode(['success' => true, 'wallet' => $row]);
} else {
    // Should not happen if profile creation auto-creates wallet, but just in case
    // Create wallet if missing
    $conn->query("INSERT IGNORE INTO marketplace_wallets (user_id) VALUES ($user_id)");
    
    // Retry fetch
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'wallet' => $row]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not retrieve wallet']);
    }
}
?>
