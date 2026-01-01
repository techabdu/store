<?php
/**
 * Confirm Delivery and Release Funds
 * 
 * Allows buyer to confirm receipt of goods, which triggers:
 * 1. Update delivery status to 'received'
 * 2. Transfer funds from buyer's held_balance to seller's available_balance
 * 3. Clear seller's pending_balance
 * 4. Create transaction records
 * 5. Send notification to seller
 */

session_start();
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';

// Set CORS headers
setCorsHeaders();
header('Content-Type: application/json');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get input
$data = json_decode(file_get_contents('php://input'), true);
$order_id = isset($data['order_id']) ? intval($data['order_id']) : 0;
$user_id = $_SESSION['user_id'];

if (!$order_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit;
}

try {
    // Start transaction - critical for financial operations
    $conn->begin_transaction();

    // Fetch order details
    $stmt = $conn->prepare("
        SELECT o.id, o.buyer_id, o.agreed_price as total_amount, o.order_status as status, o.delivery_status, o.tenant_id,
               l.user_id as seller_id, l.title as product_name, l.id as listing_id,
               u.username as seller_name
        FROM marketplace_orders o
        JOIN marketplace_listings l ON o.listing_id = l.id
        JOIN users u ON l.user_id = u.id
        WHERE o.id = ?
    ");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $conn->rollback();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit;
    }
    
    $order = $result->fetch_assoc();
    $stmt->close();

    // Verify user is the buyer
    if ($order['buyer_id'] != $user_id) {
        $conn->rollback();
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You are not authorized to confirm this order']);
        exit;
    }

    // Verify delivery status is shipped
    if ($order['delivery_status'] !== 'shipped') {
        $conn->rollback();
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Order must be shipped before confirming delivery'
        ]);
        exit;
    }

    $amount = $order['total_amount'];
    $seller_id = $order['seller_id'];
    $buyer_id = $order['buyer_id'];

    // Step 1: Update delivery and order status to completed
    $stmt = $conn->prepare("UPDATE marketplace_orders SET delivery_status = 'received', order_status = 'completed', completed_at = NOW() WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $stmt->close();

    // Step 2: Deduct from buyer's held_balance
    $stmt = $conn->prepare("
        UPDATE marketplace_wallets 
        SET held_balance = held_balance - ? 
        WHERE user_id = ?
    ");
    $stmt->bind_param("di", $amount, $buyer_id);
    $stmt->execute();
    $stmt->close();

    // Step 3: Deduct from seller's pending_balance and add to available_balance
    $stmt = $conn->prepare("
        UPDATE marketplace_wallets 
        SET pending_balance = pending_balance - ?,
            available_balance = available_balance + ?
        WHERE user_id = ?
    ");
    $stmt->bind_param("ddi", $amount, $amount, $seller_id);
    $stmt->execute();
    $stmt->close();

    // Step 4: Create transaction record for buyer (escrow release)
    // Get wallet ID and balances
    $b_bal_stmt = $conn->prepare("SELECT id, shop_id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $b_bal_stmt->bind_param("i", $buyer_id);
    $b_bal_stmt->execute();
    $b_wallet_data = $b_bal_stmt->get_result()->fetch_assoc();
    $b_bal_stmt->close();
    $buyer_wallet_shop_id = $b_wallet_data['shop_id'];
    
    $buyer_description = "Escrow released for order #" . $order_id;
    $buyer_ref = "ORD" . $order_id . "_RELEASE";
    
    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at)
        VALUES (?, ?, ?, ?, 'purchase_release', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->bind_param("iiiiddddss", 
        $order['tenant_id'],
        $b_wallet_data['id'],
        $buyer_id,
        $buyer_wallet_shop_id,
        $amount,
        $b_wallet_data['available_balance'],
        $b_wallet_data['pending_balance'],
        $b_wallet_data['held_balance'],
        $buyer_ref,
        $buyer_description
    );
    $stmt->execute();
    $stmt->close();

    // Step 5: Create transaction record for seller (fund received)
    // Get wallet ID and balances
    $s_bal_stmt = $conn->prepare("SELECT id, shop_id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $s_bal_stmt->bind_param("i", $seller_id);
    $s_bal_stmt->execute();
    $s_wallet_data = $s_bal_stmt->get_result()->fetch_assoc();
    $s_bal_stmt->close();
    $seller_wallet_shop_id = $s_wallet_data['shop_id'];
    
    $seller_description = "Payment received for order #" . $order_id;
    $seller_ref = "ORD" . $order_id . "_PAYMENT";
    
    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at)
        VALUES (?, ?, ?, ?, 'sale_complete', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->bind_param("iiiiddddss", 
        $order['tenant_id'],
        $s_wallet_data['id'],
        $seller_id,
        $seller_wallet_shop_id,
        $amount,
        $s_wallet_data['available_balance'],
        $s_wallet_data['pending_balance'],
        $s_wallet_data['held_balance'],
        $seller_ref,
        $seller_description
    );
    $stmt->execute();
    $stmt->close();

    // Step 6: Send automatic notification to seller
    $stmt = $conn->prepare("
        SELECT id FROM marketplace_conversations 
        WHERE buyer_id = ? AND seller_id = ? AND listing_id = ?
        LIMIT 1
    ");
    $stmt->bind_param("iii", $buyer_id, $seller_id, $order['listing_id']);
    $stmt->execute();
    $conv_result = $stmt->get_result();
    
    if ($conv_result->num_rows > 0) {
        $conversation = $conv_result->fetch_assoc();
        $conversation_id = $conversation['id'];
        $stmt->close();

        // Send system message
        $message = "✅ Order completed! The buyer has confirmed delivery. Funds have been released to your account.";
        
        $stmt = $conn->prepare("
            INSERT INTO marketplace_messages (conversation_id, sender_id, receiver_id, message, is_read)
            VALUES (?, ?, ?, ?, 0)
        ");
        $stmt->bind_param("iiis", $conversation_id, $buyer_id, $seller_id, $message);
        $stmt->execute();
        $stmt->close();

        // Update conversation last_message_at
        $stmt = $conn->prepare("UPDATE marketplace_conversations SET last_message_at = NOW() WHERE id = ?");
        $stmt->bind_param("i", $conversation_id);
        $stmt->execute();
        $stmt->close();
    }

    // Get updated buyer wallet balance
    $stmt = $conn->prepare("
        SELECT available_balance, held_balance, pending_balance 
        FROM marketplace_wallets 
        WHERE user_id = ?
    ");
    $stmt->bind_param("i", $buyer_id);
    $stmt->execute();
    $wallet_result = $stmt->get_result();
    $wallet = $wallet_result->fetch_assoc();
    $stmt->close();

    // Commit transaction
    $conn->commit();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Delivery confirmed and funds released successfully',
        'delivery_status' => 'received',
        'wallet' => $wallet
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

$conn->close();
?>
