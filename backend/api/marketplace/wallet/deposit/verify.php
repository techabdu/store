<?php
// backend/api/marketplace/wallet/deposit/verify.php

require_once '../../../../config/config.php';
require_once '../../../../config/database.php';

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
require_once '../../../../includes/kora_api.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];

// 0. Check Verification Status
$v_stmt = $conn->prepare("SELECT is_verified FROM marketplace_identity_verifications WHERE user_id = ?");
$v_stmt->bind_param("i", $user_id);
$v_stmt->execute();
$v_res = $v_stmt->get_result()->fetch_assoc();

if (!$v_res || !$v_res['is_verified']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Your account must be verified to perform this action.']);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->reference)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Reference required']);
    exit();
}

$reference = $data->reference;

// 1. Check if already processed in our DB
$stmt = $conn->prepare("SELECT id, user_id, amount, status, transaction_type FROM kora_payment_references WHERE kora_reference = ? AND user_id = ?");
$stmt->bind_param("si", $reference, $user_id);
$stmt->execute();
$tx = $stmt->get_result()->fetch_assoc();

if (!$tx) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Transaction reference not found']);
    exit();
}

if ($tx['status'] === 'success') {
    echo json_encode(['success' => true, 'message' => 'Payment already processed']);
    exit();
}

// 2. Fetch status from Kora
$kora = new KoraAPI();
$result = $kora->getPaymentStatus($reference);

if (!$result['success']) {
    echo json_encode(['success' => false, 'error' => 'Could not verify with payment gateway', 'details' => $result['message']]);
    exit();
}

$kora_data = $result['data'];
// Kora status can be 'success', 'failed', 'pending'
if ($kora_data['status'] !== 'success') {
    echo json_encode(['success' => false, 'status' => $kora_data['status'], 'message' => 'Payment is not yet successful']);
    exit();
}

// 3. Process success (Credit Wallet)
$amount = $kora_data['amount'];

$conn->begin_transaction();

try {
    // Update Reference Status
    $up_stmt = $conn->prepare("UPDATE kora_payment_references SET status = 'success', kora_transaction_id = ?, updated_at = NOW() WHERE id = ?");
    $kora_tx_id = $kora_data['id'] ?? null; 
    $up_stmt->bind_param("si", $kora_tx_id, $tx['id']);
    $up_stmt->execute();
    
    // Credit User Wallet
    $w_stmt = $conn->prepare("
        UPDATE marketplace_wallets 
        SET available_balance = available_balance + ?, 
            total_funded = total_funded + ? 
        WHERE user_id = ?
    ");
    $w_stmt->bind_param("ddi", $amount, $amount, $user_id);
    if (!$w_stmt->execute()) {
         throw new Exception("Failed to update wallet");
    }
    
    // Get Updated Balances for log
    $wid_stmt = $conn->prepare("SELECT id, tenant_id, shop_id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $wid_stmt->bind_param("i", $user_id);
    $wid_stmt->execute();
    $wallet = $wid_stmt->get_result()->fetch_assoc();
    $wallet_id = $wallet['id'];
    $wallet_shop_id = $wallet['shop_id'];
    $tenant_id = $wallet['tenant_id'];

    // Log to Wallet Transaction History
    $log_stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
        VALUES (?, ?, ?, ?, 'fund', ?, ?, ?, ?, ?, 'Wallet Funding via Kora (Verified)', NOW())
    ");
    $log_stmt->bind_param("iiiidddds", 
        $tenant_id,
        $wallet_id, 
        $user_id, 
        $wallet_shop_id,
        $amount, 
        $wallet['available_balance'], 
        $wallet['pending_balance'], 
        $wallet['held_balance'], 
        $reference
    );
    $log_stmt->execute();
    
    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Payment verified and wallet funded']);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Payment Verification Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error processing payment verification']);
}
?>
