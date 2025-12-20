<?php
// backend/api/marketplace/orders/release_funds.php

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

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->order_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID required']);
    exit();
}

$order_id = intval($data->order_id);

$conn->begin_transaction();

try {
    // 1. Fetch Order
    // Must be Buyer or SuperAdmin (Assume SuperAdmin handled elsewhere or logic added later)
    // For now, only Buyer can release.
    $stmt = $conn->prepare("SELECT * FROM marketplace_orders WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order) {
        throw new Exception('Order not found');
    }

    if ($order['buyer_id'] !== $user_id) {
        throw new Exception('Unauthorized');
    }

    if ($order['order_status'] !== 'pending' && $order['order_status'] !== 'delivered') { // Depending on flow
        throw new Exception('Order is not in a releasable state');
    }
    
    if ($order['order_status'] === 'completed') {
        throw new Exception('Funds already released');
    }
    
    if ($order['order_status'] === 'disputed') {
        throw new Exception('Order is disputed. Contact support.');
    }

    // 2. Move Funds
    $seller_id = $order['seller_id'];
    $buyer_id = $order['buyer_id'];
    $amount = $order['agreed_price'];

    // Update Buyer Wallet: Decrement Held Balance
    $stmt = $conn->prepare("UPDATE marketplace_wallets SET held_balance = held_balance - ? WHERE user_id = ?");
    $stmt->bind_param("di", $amount, $buyer_id);
    if (!$stmt->execute()) {
        throw new Exception('Failed to update buyer wallet');
    }

    // Update Seller Wallet: Pending -> Available
    $stmt = $conn->prepare("
        UPDATE marketplace_wallets 
        SET pending_balance = pending_balance - ?, 
            available_balance = available_balance + ?, 
            total_sales = total_sales + ? 
        WHERE user_id = ?
    ");
    $stmt->bind_param("dddi", $amount, $amount, $amount, $seller_id);
    if (!$stmt->execute()) {
        throw new Exception('Failed to update seller wallet');
    }

    // 3. Mark Order Completed
    $stmt = $conn->prepare("UPDATE marketplace_orders SET order_status = 'completed', completed_at = NOW() WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    if (!$stmt->execute()) throw new Exception("Failed to update order status");

    // 4. Log Transaction (Release)
    // Get Updated Buyer Balances for log
    $b_bal_stmt = $conn->prepare("SELECT id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $b_bal_stmt->bind_param("i", $buyer_id);
    $b_bal_stmt->execute();
    $b_wallet_data = $b_bal_stmt->get_result()->fetch_assoc();

    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (wallet_id, user_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
        VALUES (?, ?, 'purchase_release', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $desc_buyer = "Funds released to seller for order #" . $order['order_reference'];
    $release_ref_buyer = $order['order_reference'] . '_RELEASE_BUYER';
    $stmt->bind_param("iiddddss", 
        $b_wallet_data['id'], 
        $buyer_id, 
        $amount, 
        $b_wallet_data['available_balance'], 
        $b_wallet_data['pending_balance'], 
        $b_wallet_data['held_balance'], 
        $release_ref_buyer, 
        $desc_buyer
    );
    $stmt->execute();

    // Get Updated Seller Balances for log
    $s_bal_stmt = $conn->prepare("SELECT id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $s_bal_stmt->bind_param("i", $seller_id);
    $s_bal_stmt->execute();
    $s_wallet_data = $s_bal_stmt->get_result()->fetch_assoc();
    $seller_wallet_id = $s_wallet_data['id'];

    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (wallet_id, user_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
        VALUES (?, ?, 'sale_complete', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $desc_seller = "Funds released for order #" . $order['order_reference'];
    $release_ref_seller = $order['order_reference'] . '_RELEASE';
    $stmt->bind_param("iiddddss", 
        $seller_wallet_id, 
        $seller_id, 
        $amount, 
        $s_wallet_data['available_balance'], 
        $s_wallet_data['pending_balance'], 
        $s_wallet_data['held_balance'], 
        $release_ref_seller, 
        $desc_seller
    );
    $stmt->execute();

    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Funds released to seller successfully']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
