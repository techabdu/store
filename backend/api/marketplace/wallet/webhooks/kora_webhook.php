<?php
// backend/api/marketplace/wallet/webhooks/kora_webhook.php

// Kora expects 200 OK immediately.
// It's good practice to log the payload and process async, but for this scale sync processing is fine.

require_once '../../../../config/db_connect.php';
require_once '../../../../includes/kora_api.php';

// Capture raw input
$input = @file_get_contents("php://input");
$headers = getallheaders();
// Kora header for signature: 'x-korapay-signature' or 'X-Korapay-Signature'
$signature = $headers['x-korapay-signature'] ?? $headers['X-Korapay-Signature'] ?? '';

$kora = new KoraAPI();

// 1. Verify Signature
if (!$kora->verifyWebhookSignature($input, $signature)) {
    http_response_code(400); // Invalid signature
    exit('Invalid signature');
}

$event = json_decode($input, true);

if (!$event || !isset($event['event'])) {
    http_response_code(400); 
    exit('Invalid payload');
}

// 2. Handle 'charge.success' (Deposit)
if ($event['event'] === 'charge.success') {
    $data = $event['data'];
    $reference = $data['reference'];
    $amount = $data['amount']; // Kora usually sends full amount
    $status = $data['status'];
    
    if ($status !== 'success') {
        exit('Transaction not successful');
    }
    
    // Check if reference exists in our log
    $stmt = $conn->prepare("SELECT id, user_id, amount, status, transaction_type FROM kora_payment_references WHERE kora_reference = ?");
    $stmt->bind_param("s", $reference);
    $stmt->execute();
    $tx = $stmt->get_result()->fetch_assoc();
    
    if (!$tx) {
        // Unknown transaction
        http_response_code(200); // Ack anyway
        exit('Reference not found');
    }
    
    if ($tx['status'] === 'success') {
        // Already processed
        http_response_code(200);
        exit('Already processed');
    }
    
    if ($tx['transaction_type'] !== 'pay_in') {
        // Mismatch type (should not happen if refs are unique)
        exit('Transaction type mismatch'); 
    }
    
    // Verify amount matches (Security check)
    if (floatval($amount) < floatval($tx['amount'])) {
        // Underpayment? Log suspicious
        // For now, fail or mark partial. Let's just exit.
        exit('Amount mismatch');
    }
    
    // START TRANSACTION
    $conn->begin_transaction();
    
    try {
        // Update Reference Status
        $up_stmt = $conn->prepare("UPDATE kora_payment_references SET status = 'success', kora_transaction_id = ?, updated_at = NOW() WHERE id = ?");
        // transaction_id might be in data
        $kora_tx_id = $data['id'] ?? null; 
        $up_stmt->bind_param("si", $kora_tx_id, $tx['id']);
        $up_stmt->execute();
        
        // Credit User Wallet
        $user_id = $tx['user_id'];
        
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
        
        // Get Wallet ID for log
        $wid_stmt = $conn->prepare("SELECT id FROM marketplace_wallets WHERE user_id = ?");
        $wid_stmt->bind_param("i", $user_id);
        $wid_stmt->execute();
        $wallet_id = $wid_stmt->get_result()->fetch_assoc()['id'];
        
        // Get Updated Balances for log
        $bal_stmt = $conn->prepare("SELECT available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE id = ?");
        $bal_stmt->bind_param("i", $wallet_id);
        $bal_stmt->execute();
        $balances = $bal_stmt->get_result()->fetch_assoc();

        // Log to Wallet Transaction History
        $log_stmt = $conn->prepare("
            INSERT INTO marketplace_wallet_transactions 
            (wallet_id, user_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
            VALUES (?, ?, 'fund', ?, ?, ?, ?, ?, 'Wallet Funding via Kora', NOW())
        ");
        $log_stmt->bind_param("iidddds", 
            $wallet_id, 
            $user_id, 
            $amount, 
            $balances['available_balance'], 
            $balances['pending_balance'], 
            $balances['held_balance'], 
            $reference
        );
        $log_stmt->execute();
        
        $conn->commit();
        http_response_code(200);
        echo "Deposit Processed";
        
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo "Error Processing";
    }
}
// Handle other events
elseif ($event['event'] === 'transfer.success') {
    // Withdrawal Successful
    $data = $event['data'];
    $reference = $data['reference'];
    
    // Update withdrawal request
    $up_stmt = $conn->prepare("UPDATE marketplace_withdrawal_requests SET status = 'completed', completed_at = NOW() WHERE kora_reference = ? AND status = 'processing'");
    if ($up_stmt) {
        $up_stmt->bind_param("s", $reference);
        $up_stmt->execute();
    }

    // Update wallet transaction status (so user sees it as completed)
    $tx_up = $conn->prepare("UPDATE marketplace_wallet_transactions SET status = 'completed' WHERE reference_number = ? AND transaction_type = 'withdraw'");
    if ($tx_up) {
        $tx_up->bind_param("s", $reference);
        $tx_up->execute();
    }

    http_response_code(200);
}
elseif ($event['event'] === 'transfer.failed' || $event['event'] === 'transfer.reversed') {
    // Withdrawal Failed - Refund User
    $data = $event['data'];
    $reference = $data['reference'];
    
    // Find withdrawal request
    $stmt = $conn->prepare("SELECT id, user_id, amount, wallet_id, status FROM marketplace_withdrawal_requests WHERE kora_reference = ?");
    $stmt->bind_param("s", $reference);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    
    if ($req && $req['status'] === 'processing') {
        $conn->begin_transaction();
        try {
            // 1. Mark request as failed
            $up_stmt = $conn->prepare("UPDATE marketplace_withdrawal_requests SET status = 'failed', failure_reason = ?, updated_at = NOW() WHERE id = ?");
            $reason = $data['reason'] ?? 'Transfer failed at provider';
            $up_stmt->bind_param("si", $reason, $req['id']);
            $up_stmt->execute();
            
            // Update original wallet transaction status to failed
            $tx_fail = $conn->prepare("UPDATE marketplace_wallet_transactions SET status = 'failed' WHERE reference_number = ? AND transaction_type = 'withdraw'");
            if ($tx_fail) {
                $tx_fail->bind_param("s", $reference);
                $tx_fail->execute();
            }

            // 2. Refund balance
            $ref_stmt = $conn->prepare("UPDATE marketplace_wallets SET available_balance = available_balance + ?, total_withdrawn = total_withdrawn - ? WHERE user_id = ?");
            $ref_stmt->bind_param("ddi", $req['amount'], $req['amount'], $req['user_id']);
            $ref_stmt->execute();
            
            // 3. Log refund entry with balances
            $bal_stmt = $conn->prepare("SELECT available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE id = ?");
            $bal_stmt->bind_param("i", $req['wallet_id']);
            $bal_stmt->execute();
            $balances = $bal_stmt->get_result()->fetch_assoc();

            $log_stmt = $conn->prepare("
                INSERT INTO marketplace_wallet_transactions 
                (wallet_id, user_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
                VALUES (?, ?, 'refund', ?, ?, ?, ?, ?, 'Refund for failed withdrawal', NOW())
            ");
            $refund_ref = $reference . '_REF';
            $log_stmt->bind_param("iidddds", 
                $req['wallet_id'], 
                $req['user_id'], 
                $req['amount'], 
                $balances['available_balance'], 
                $balances['pending_balance'], 
                $balances['held_balance'], 
                $refund_ref
            );
            $log_stmt->execute();
            
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
        }
    }
    http_response_code(200);
}
else {
    http_response_code(200);
}
?>
