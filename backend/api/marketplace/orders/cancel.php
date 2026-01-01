<?php
// backend/api/marketplace/orders/cancel.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
require_once '../messaging/send_system_message.php'; // For automatic notifications

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['order_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit();
}

$order_id = intval($data['order_id']);
$reason = isset($data['reason']) ? $data['reason'] : 'No reason provided';
$user_id = $_SESSION['user_id'];

// Start transaction
$conn->begin_transaction();

try {
    // 1. Check order existence and permission, and get listing/price info
    $check_query = "
        SELECT 
            o.order_status, 
            o.buyer_id, 
            o.seller_id, 
            o.listing_id, 
            o.tenant_id,
            o.agreed_price as amount, 
            o.order_number as order_reference
        FROM marketplace_orders o 
        WHERE o.id = ? 
        FOR UPDATE
    ";
    $stmt = $conn->prepare($check_query);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Order not found");
    }

    $order = $result->fetch_assoc();
    $listing_id = $order['listing_id'];
    $amount = $order['amount'];
    $order_reference = $order['order_reference'];
    $tenant_id = $order['tenant_id'] ?? 1;

    // Only buyer or seller can cancel
    if ($order['buyer_id'] != $user_id && $order['seller_id'] != $user_id) {
        throw new Exception("Access denied");
    }

    // Only certain statuses can be cancelled (e.g., pending, processing)
    if (!in_array($order['order_status'], ['pending', 'processing'])) {
        throw new Exception("This order cannot be cancelled in its current state (" . $order['order_status'] . ")");
    }

    // 2. Update order status
    $update_query = "
        UPDATE marketplace_orders 
        SET order_status = 'cancelled', 
            cancelled_at = CURRENT_TIMESTAMP, 
            cancelled_by = ?, 
            cancellation_reason = ? 
        WHERE id = ?
    ";
    $stmt = $conn->prepare($update_query);
    $stmt->bind_param("isi", $user_id, $reason, $order_id);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update order status");
    }

    // 3. Reactivate Listing
    $reactivate_query = "UPDATE marketplace_listings SET status = 'active' WHERE id = ?";
    $stmt = $conn->prepare($reactivate_query);
    $stmt->bind_param("i", $listing_id);
    if (!$stmt->execute()) {
        throw new Exception("Failed to reactivate listing");
    }

    // 4. Revert Wallet Balances (Refund)
    $buyer_id = $order['buyer_id'];
    $seller_id = $order['seller_id'];

    // Update Buyer Wallet: Held -> Available
    $stmt = $conn->prepare("UPDATE marketplace_wallets SET held_balance = held_balance - ?, available_balance = available_balance + ?, total_purchases = total_purchases - ? WHERE user_id = ?");
    $stmt->bind_param("dddi", $amount, $amount, $amount, $buyer_id);
    if (!$stmt->execute()) {
        throw new Exception('Failed to refund buyer wallet');
    }

    // Update Seller Wallet: Remove Pending
    $stmt = $conn->prepare("UPDATE marketplace_wallets SET pending_balance = pending_balance - ? WHERE user_id = ?");
    $stmt->bind_param("di", $amount, $seller_id);
    if (!$stmt->execute()) {
        throw new Exception('Failed to update seller pending balance');
    }

    // 5. Log Transactions
    // Log for Buyer (Refund)
    $b_bal_stmt = $conn->prepare("SELECT id, shop_id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $b_bal_stmt->bind_param("i", $buyer_id);
    $b_bal_stmt->execute();
    $b_wallet_data = $b_bal_stmt->get_result()->fetch_assoc();
    $buyer_wallet_shop_id = $b_wallet_data['shop_id'];

    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
        VALUES (?, ?, ?, ?, 'purchase_refund', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $desc_buyer = "Refund for cancelled order #$order_reference";
    $refund_ref_buyer = $order_reference . '_REFUND';
    $stmt->bind_param("iiiiddddss", 
        $tenant_id,
        $b_wallet_data['id'], 
        $buyer_id, 
        $buyer_wallet_shop_id,
        $amount, 
        $b_wallet_data['available_balance'], 
        $b_wallet_data['pending_balance'], 
        $b_wallet_data['held_balance'], 
        $refund_ref_buyer, 
        $desc_buyer
    );
    $stmt->execute();

    // Log for Seller (Cancellation)
    $s_bal_stmt = $conn->prepare("SELECT id, shop_id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $s_bal_stmt->bind_param("i", $seller_id);
    $s_bal_stmt->execute();
    $s_wallet_data = $s_bal_stmt->get_result()->fetch_assoc();
    $seller_wallet_shop_id = $s_wallet_data['shop_id'];

    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
        VALUES (?, ?, ?, ?, 'sale_cancelled', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $desc_seller = "Sale cancelled for order #$order_reference";
    $refund_ref_seller = $order_reference . '_CANCEL';
    $stmt->bind_param("iiiiddddss", 
        $tenant_id,
        $s_wallet_data['id'], 
        $seller_id, 
        $seller_wallet_shop_id,
        $amount, 
        $s_wallet_data['available_balance'], 
        $s_wallet_data['pending_balance'], 
        $s_wallet_data['held_balance'], 
        $refund_ref_seller, 
        $desc_seller
    );
    $stmt->execute();

    // 6. Send Automatic Notification to Seller about Cancellation
    // Fetch buyer's name
    $buyer_name_stmt = $conn->prepare("SELECT display_name FROM marketplace_profiles WHERE user_id = ? LIMIT 1");
    $buyer_name_stmt->bind_param("i", $buyer_id);
    $buyer_name_stmt->execute();
    $buyer_profile = $buyer_name_stmt->get_result()->fetch_assoc();
    $buyer_name = $buyer_profile['display_name'] ?? 'A buyer';
    
    // Fetch listing title
    $listing_stmt = $conn->prepare("SELECT title FROM marketplace_listings WHERE id = ? LIMIT 1");
    $listing_stmt->bind_param("i", $listing_id);
    $listing_stmt->execute();
    $listing_data = $listing_stmt->get_result()->fetch_assoc();
    $listing_title = $listing_data['title'] ?? 'a product';
    
    // Create cancellation notification message
    $notification_message = "$buyer_name canceled the order for $listing_title - Reason: $reason";
    
    // Send system message (buyer is the sender since they initiated the cancellation)
    sendSystemMessage($conn, $listing_id, $buyer_id, $seller_id, $notification_message, $buyer_id);

    // 7. Clear order link from conversation (allow conversation to persist)
    $clear_order_stmt = $conn->prepare("
        UPDATE marketplace_conversations 
        SET order_id = NULL 
        WHERE order_id = ?
    ");
    $clear_order_stmt->bind_param("i", $order_id);
    $clear_order_stmt->execute();
    $clear_order_stmt->close();

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Order cancelled and listing reactivated successfully']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
