<?php
// backend/api/marketplace/wallet/deposit/initialize.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../../config/db_connect.php';
require_once '../../../../includes/kora_api.php';
require_once '../../../../includes/encryption.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->amount) || floatval($data->amount) <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid amount']);
    exit();
}

$amount = floatval($data->amount);

// 1. Get User Details (Email/Name required for Kora)
$stmt = $conn->prepare("SELECT email, username FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user || empty($user['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User email required for payment']);
    exit();
}

// 2. Generate Reference
$reference = generateSecureReference('DEP');

// 3. Initiate with Kora
$kora = new KoraAPI();
$customer_data = [
    'email' => $user['email'],
    'name' => $user['username']
];

$result = $kora->initiatePayment($amount, $customer_data, $reference);

if ($result['success']) {
    // 4. Record Payment Reference in DB
    // Assuming table `marketplace_kora_references` or generic transaction log?
    // Using `marketplace_wallet_transactions` with status 'pending' is better for visibility
    // But we need to distinguish "Payment Attempt" from "Actual Credit". 
    // Usually we insert into a temporary table or `marketplace_payment_references` table from schema.
    
    // Check schema for suitable table. 
    // In Stage 1 task, "Create Kora integration tables (`kora_payment_references`)" was mentioned.
    
    $stmt = $conn->prepare("
        INSERT INTO kora_payment_references 
        (user_id, reference, transaction_type, amount, status, created_at)
        VALUES (?, ?, 'deposit', ?, 'pending', NOW())
    ");
    $stmt->bind_param("isd", $user_id, $reference, $amount);
    
    if ($stmt->execute()) {
         echo json_encode([
             'success' => true,
             'message' => 'Payment initialized',
             'checkout_url' => $result['data']['checkout_url'] ?? $result['data']['payment_url'] ?? '', // Adjust based on actual Kora response
             'reference' => $reference
         ]);
    } else {
         http_response_code(500);
         echo json_encode(['success' => false, 'error' => 'Database error recording reference']);
    }
    
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Kora initialization failed: ' . ($result['message'] ?? 'Unknown error')]);
}
?>
