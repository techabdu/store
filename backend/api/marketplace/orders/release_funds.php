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

    // 2. Move Funds for Seller
    $seller_id = $order['seller_id'];
    $amount = $order['agreed_price'];

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
    $s_wallet_stmt = $conn->prepare("SELECT id FROM marketplace_wallets WHERE user_id = ?");
    $s_wallet_stmt->bind_param("i", $seller_id);
    $s_wallet_stmt->execute();
    $seller_wallet_id = $s_wallet_stmt->get_result()->fetch_assoc()['id'];

    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (wallet_id, user_id, transaction_type, amount, reference, status, description, created_at)
        VALUES (?, ?, 'sale_release', ?, ?, 'completed', ?, NOW())
    ");
    $desc = "Funds released for order #" . $order['order_reference'];
    $stmt->bind_param("iids", $seller_wallet_id, $seller_id, $amount, $order['order_reference'], $desc);
    $stmt->execute();

    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Funds released to seller successfully']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
