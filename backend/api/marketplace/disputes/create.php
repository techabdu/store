<?php
/**
 * Create Dispute Report
 * 
 * Allows buyers or sellers to report issues with an order.
 * Creates a dispute record and notifies the other party.
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
$issue_type = isset($data['issue_type']) ? trim($data['issue_type']) : '';
$description = isset($data['description']) ? trim($data['description']) : '';
$user_id = $_SESSION['user_id'];

// Validation
if (!$order_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit;
}

if (!$issue_type) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Issue type is required']);
    exit;
}

if (!$description || strlen($description) < 20) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a detailed description (minimum 20 characters)']);
    exit;
}

// Validate issue type
$valid_issue_types = ['not_shipped', 'wrong_item', 'damaged', 'not_as_described', 'payment_issue', 'other'];
if (!in_array($issue_type, $valid_issue_types)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid issue type']);
    exit;
}

try {
    // Start transaction
    $conn->begin_transaction();

    // Fetch order details and determine roles
    $stmt = $conn->prepare("
        SELECT o.id, o.buyer_id, o.order_status as status, o.delivery_status,
               l.user_id as seller_id, l.title as product_name, l.id as listing_id
        FROM marketplace_orders o
        JOIN marketplace_listings l ON o.listing_id = l.id
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

    // Verify user is either buyer or seller
    $is_buyer = ($order['buyer_id'] == $user_id);
    $is_seller = ($order['seller_id'] == $user_id);
    
    if (!$is_buyer && !$is_seller) {
        $conn->rollback();
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You are not authorized to report this order']);
        exit;
    }

    // Determine who is being reported
    $reported_id = $is_buyer ? $order['seller_id'] : $order['buyer_id'];

    // Additional validation: ensure issue type makes sense for role
    if ($is_seller && $issue_type === 'not_shipped') {
        $conn->rollback();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Sellers cannot report "not shipped" issues']);
        exit;
    }

    if ($is_buyer && $issue_type === 'payment_issue') {
        $conn->rollback();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Buyers cannot report payment issues']);
        exit;
    }

    // Check if dispute already exists for this order from this user
    $check_stmt = $conn->prepare("
        SELECT id FROM order_disputes 
        WHERE order_id = ? AND reporter_id = ? AND status = 'open'
    ");
    $check_stmt->bind_param("ii", $order_id, $user_id);
    $check_stmt->execute();
    $existing = $check_stmt->get_result();
    
    if ($existing->num_rows > 0) {
        $conn->rollback();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'You already have an open dispute for this order']);
        exit;
    }
    $check_stmt->close();

    // Create dispute record
    $stmt = $conn->prepare("
        INSERT INTO order_disputes 
        (order_id, reporter_id, reported_id, issue_type, description, status)
        VALUES (?, ?, ?, ?, ?, 'open')
    ");
    $stmt->bind_param("iiiss", $order_id, $user_id, $reported_id, $issue_type, $description);
    $stmt->execute();
    $dispute_id = $conn->insert_id;
    $stmt->close();

    // Send notification message to the other party
    $stmt = $conn->prepare("
        SELECT id FROM marketplace_conversations 
        WHERE buyer_id = ? AND seller_id = ? AND listing_id = ?
        LIMIT 1
    ");
    $stmt->bind_param("iii", $order['buyer_id'], $order['seller_id'], $order['listing_id']);
    $stmt->execute();
    $conv_result = $stmt->get_result();
    
    if ($conv_result->num_rows > 0) {
        $conversation = $conv_result->fetch_assoc();
        $conversation_id = $conversation['id'];
        $stmt->close();

        // Format issue type for display
        $issue_display = str_replace('_', ' ', $issue_type);
        $issue_display = ucwords($issue_display);

        // Send system message
        $role = $is_buyer ? 'buyer' : 'seller';
        $message = "⚠️ A dispute has been reported regarding this order. Issue: {$issue_display}. Our support team will review this case.";
        
        $stmt = $conn->prepare("
            INSERT INTO marketplace_messages (conversation_id, sender_id, receiver_id, message, is_read)
            VALUES (?, ?, ?, ?, 0)
        ");
        $stmt->bind_param("iiis", $conversation_id, $user_id, $reported_id, $message);
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

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Dispute reported successfully. Our support team will review your case.',
        'dispute_id' => $dispute_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

$conn->close();
?>
