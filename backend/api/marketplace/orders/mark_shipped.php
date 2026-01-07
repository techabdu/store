<?php
/**
 * Mark Order as Shipped
 * 
 * Allows seller to mark an order as shipped, updating the delivery status
 * and sending an automatic notification to the buyer.
 */

session_start();
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../../middleware/api_logger.php'; // API request logging

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
    // Start transaction
    $conn->begin_transaction();

    // Fetch order details and verify seller ownership
    $stmt = $conn->prepare("
        SELECT o.id, o.buyer_id, o.agreed_price as total_amount, o.order_status as status, o.delivery_status,
               l.user_id as seller_id, l.title as product_name, l.id as listing_id,
               u.username as buyer_name
        FROM marketplace_orders o
        JOIN marketplace_listings l ON o.listing_id = l.id
        JOIN users u ON o.buyer_id = u.id
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

    // Verify user is the seller
    if ($order['seller_id'] != $user_id) {
        $conn->rollback();
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You are not authorized to update this order']);
        exit;
    }

    // Verify order status is valid (paid/escrowed orders)
    $valid_statuses = ['pending', 'paid', 'processing', 'completed'];
    if (!in_array($order['status'], $valid_statuses)) {
        $conn->rollback();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Order must be paid before shipping']);
        exit;
    }

    // Verify delivery status is pending
    if ($order['delivery_status'] !== 'pending') {
        $conn->rollback();
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Order has already been marked as shipped'
        ]);
        exit;
    }

    // Update delivery status to shipped
    $stmt = $conn->prepare("UPDATE marketplace_orders SET delivery_status = 'shipped' WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $stmt->close();

    // Send automatic notification message to buyer
    // Find or get conversation
    $stmt = $conn->prepare("
        SELECT id FROM marketplace_conversations 
        WHERE buyer_id = ? AND seller_id = ? AND listing_id = ?
        LIMIT 1
    ");
    $stmt->bind_param("iii", $order['buyer_id'], $user_id, $order['listing_id']);
    $stmt->execute();
    $conv_result = $stmt->get_result();
    
    if ($conv_result->num_rows > 0) {
        $conversation = $conv_result->fetch_assoc();
        $conversation_id = $conversation['id'];
        $stmt->close();

        // Send system message
        $message = "📦 Good news! Your order has been shipped and is on the way!";
        
        $stmt = $conn->prepare("
            INSERT INTO marketplace_messages (conversation_id, sender_id, receiver_id, message, is_read)
            VALUES (?, ?, ?, ?, 0)
        ");
        $stmt->bind_param("iiis", $conversation_id, $user_id, $order['buyer_id'], $message);
        $stmt->execute();
        $stmt->close();

        // Update conversation last_message_at
        $stmt = $conn->prepare("UPDATE marketplace_conversations SET last_message_at = NOW() WHERE id = ?");
        $stmt->bind_param("i", $conversation_id);
        $stmt->execute();
        $stmt->close();
    }

    // Commit transaction
    $conn->commit();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Order marked as shipped successfully',
        'delivery_status' => 'shipped'
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

$conn->close();
?>
