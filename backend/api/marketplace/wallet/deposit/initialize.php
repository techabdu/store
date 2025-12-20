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

try {
    // 0. Check Verification Status
    $v_stmt = $conn->prepare("SELECT is_verified FROM marketplace_identity_verifications WHERE user_id = ?");
    $v_stmt->bind_param("i", $user_id);
    $v_stmt->execute();
    $v_res = $v_stmt->get_result()->fetch_assoc();

    if (!$v_res || !$v_res['is_verified']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Your account must be verified before you can fund your wallet.']);
        exit();
    }

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
        // Use kora_reference column and pay_in type per DB schema
        $stmt = $conn->prepare("
            INSERT INTO kora_payment_references 
            (user_id, kora_reference, transaction_type, amount, status, created_at)
            VALUES (?, ?, 'pay_in', ?, 'pending', NOW())
        ");
        
        if (!$stmt) {
            throw new Exception("Database prepare failed: " . $conn->error);
        }

        $stmt->bind_param("isd", $user_id, $reference, $amount);
        
        if ($stmt->execute()) {
             echo json_encode([
                 'success' => true,
                 'message' => 'Payment initialized',
                 'checkout_url' => $result['data']['checkout_url'] ?? $result['data']['payment_url'] ?? '',
                 'reference' => $reference
             ]);
        } else {
             throw new Exception("Database execution failed: " . $stmt->error);
        }
        
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Kora initialization failed: ' . ($result['message'] ?? 'Unknown error')]);
    }
} catch (Exception $e) {
    error_log("Wallet Deposit Initialization Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred while processing your request. Please try again later.']);
}
?>
