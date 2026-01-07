<?php
// backend/api/marketplace/wallet/withdraw/initiate.php

require_once '../../../../config/config.php';
require_once '../../../../config/database.php';
require_once '../../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
require_once '../../../../includes/kora_api.php';
require_once '../../../../includes/encryption.php';
require_once '../../../../includes/security.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

require_once '../../../../helpers/shop_helper.php';
$user_id = $_SESSION['user_id'];
$shop_id = requireShopContext();
$data = json_decode(file_get_contents("php://input"));

// Input Validation
if (!isset($data->amount) || !isset($data->bank_code) || !isset($data->account_number)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing withdrawal details']);
    exit();
}

$amount = floatval($data->amount);
$bank_code = trim($data->bank_code);
$account_number = trim($data->account_number);

// 1. Check Configuration Limits
$min_withdrawal = getenv('MARKETPLACE_MIN_WITHDRAWAL') ?: 1000;
$max_daily = getenv('MARKETPLACE_MAX_DAILY_WITHDRAWAL') ?: 500000;

if ($amount < $min_withdrawal) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => "Minimum withdrawal amount is NGN $min_withdrawal"]);
    exit();
}

// 2. Check User Wallet Balance
$conn->begin_transaction();

try {
    $stmt = $conn->prepare("SELECT id, tenant_id, available_balance, user_id FROM marketplace_wallets WHERE user_id = ? AND shop_id = ? FOR UPDATE");
    $stmt->bind_param("ii", $user_id, $shop_id);
    $stmt->execute();
    $wallet = $stmt->get_result()->fetch_assoc();

    if (!$wallet) {
        throw new Exception('Wallet not found');
    }
    
    $tenant_id = $wallet['tenant_id'];

    if ($wallet['available_balance'] < $amount) {
        throw new Exception('Insufficient available balance');
    }

    // 3. Security Checks
    
    // A. Check Verification Status
    $v_stmt = $conn->prepare("SELECT is_verified, verification_level FROM marketplace_profiles WHERE user_id = ?");
    $v_stmt->bind_param("i", $user_id);
    $v_stmt->execute();
    $profile = $v_stmt->get_result()->fetch_assoc();
    
    if (!$profile || !$profile['is_verified']) {
        throw new Exception('Identity verification required for withdrawals');
    }

    // B. Check Daily Limit
    $today = date('Y-m-d');
    $l_stmt = $conn->prepare("
        SELECT SUM(amount) as daily_total 
        FROM marketplace_wallet_transactions 
        WHERE user_id = ? 
        AND shop_id = ?
        AND transaction_type = 'withdraw' 
        AND created_at >= ?
    ");
    $l_stmt->bind_param("iis", $user_id, $shop_id, $today);
    $l_stmt->execute();
    $day_total = $l_stmt->get_result()->fetch_assoc()['daily_total'] ?? 0;
    
    if (($day_total + $amount) > $max_daily) {
        throw new Exception("Daily withdrawal limit of NGN $max_daily exceeded");
    }

    // C. Fraud Detection (Suspicious Activity)
    if (detectSuspiciousActivity($conn, $user_id, $amount, 'withdraw')) {
        // Flag for manual review instead of processing
        // Logic: Create withdrawal request with status 'pending_review' but DO NOT call API yet
        // For this implementation, we will throw error to stop auto-process
        throw new Exception('Transaction flagged for security review. Please contact support.');
    }

    // 4. Debit Wallet (Create Pending Withdrawal)
    $new_balance = $wallet['available_balance'] - $amount;
    $up_stmt = $conn->prepare("UPDATE marketplace_wallets SET available_balance = ?, total_withdrawn = total_withdrawn + ? WHERE id = ?");
    $up_stmt->bind_param("ddi", $new_balance, $amount, $wallet['id']);
    if (!$up_stmt->execute()) {
        throw new Exception('Failed to debit wallet');
    }

    // 5. Initiate Payout via Kora
    $reference = generateSecureReference('WDR');
    
    $kora = new KoraAPI();
    $bank_details = [
        'bank_code' => $bank_code,
        'account_number' => $account_number
    ];
    
    $api_result = $kora->initiatePayout($amount, $bank_details, $reference);
    
    if (!$api_result['success']) {
        // API Call Failed - Rollback DB changes (Refund wallet)
        // Since we are inside transaction, we just throw exception which triggers rollback
        throw new Exception('Payout initiation failed: ' . $api_result['message']);
    }

    // 6. Log Transaction
    // Save bank details safely? Or just mask them in description.
    $masked_account = str_repeat('*', strlen($account_number) - 4) . substr($account_number, -4);
    $description = "Withdrawal to $bank_code - $masked_account";
    
    // Fetch latest balance details for log
    $b_stmt = $conn->prepare("SELECT available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE id = ?");
    $b_stmt->bind_param("i", $wallet['id']);
    $b_stmt->execute();
    $b_row = $b_stmt->get_result()->fetch_assoc();

    $log_stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, reference_number, status, description, available_balance_after, pending_balance_after, held_balance_after, created_at) 
        VALUES (?, ?, ?, ?, 'withdraw', ?, ?, 'pending', ?, ?, ?, ?, NOW())
    ");
    $log_stmt->bind_param("iiiidssddd", 
        $tenant_id,
        $wallet['id'], 
        $user_id, 
        $shop_id, 
        $amount, 
        $reference, 
        $description, 
        $b_row['available_balance'], 
        $b_row['pending_balance'], 
        $b_row['held_balance']
    );
    $log_stmt->execute();

    // 7. Create Withdrawal Request Record (for Webhook tracking)
    $req_stmt = $conn->prepare("
        INSERT INTO marketplace_withdrawal_requests 
        (user_id, shop_id, wallet_id, amount, status, kora_reference, bank_code, account_number, created_at)
        VALUES (?, ?, ?, ?, 'processing', ?, ?, ?, NOW())
    ");
    $req_stmt->bind_param("iiidsss", $user_id, $shop_id, $wallet['id'], $amount, $reference, $bank_code, $account_number);
    $req_stmt->execute();

    $conn->commit();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Withdrawal initiated successfully', 
        'reference' => $reference
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
