<?php
/**
 * Get Order by Conversation ID
 * 
 * Retrieves order details associated with a conversation.
 * Used to determine delivery status and display action buttons in chat.
 */

session_start();
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$conversation_id = isset($_GET['conversation_id']) ? intval($_GET['conversation_id']) : 0;
$user_id = $_SESSION['user_id'];

if (!$conversation_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Conversation ID is required']);
    exit;
}

try {
    // Fetch order linked to this conversation
    $stmt = $conn->prepare("
        SELECT 
            o.id,
            o.buyer_id,
            o.agreed_price as total_amount,
            o.order_status as status,
            o.delivery_status,
            o.created_at,
            l.user_id as seller_id,
            l.title as product_name,
            l.id as listing_id
        FROM marketplace_conversations c
        LEFT JOIN marketplace_orders o ON c.order_id = o.id
        LEFT JOIN marketplace_listings l ON o.listing_id = l.id
        WHERE c.id = ? AND (c.buyer_id = ? OR c.seller_id = ?)
    ");
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    $stmt->bind_param("iii", $conversation_id, $user_id, $user_id);
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute statement: " . $stmt->error);
    }
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Conversation not found']);
        exit;
    }
    
    $data = $result->fetch_assoc();
    $stmt->close();

    // If no order linked to conversation, return success with null order
    if (!$data['id']) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'order' => null
        ]);
        exit;
    }

    // Return order details
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'order' => [
            'id' => $data['id'],
            'buyer_id' => $data['buyer_id'],
            'seller_id' => $data['seller_id'],
            'total_amount' => floatval($data['total_amount']),
            'status' => $data['status'],
            'delivery_status' => $data['delivery_status'],
            'product_name' => $data['product_name'],
            'listing_id' => $data['listing_id'],
            'created_at' => $data['created_at']
        ]
    ]);

} catch (Throwable $t) {
    error_log("Order fetch error: " . $t->getMessage() . " in " . $t->getFile() . " on line " . $t->getLine());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $t->getMessage()]);
}

$conn->close();
?>
