<?php
// backend/api/marketplace/messaging/send.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->message) || (empty($data->listing_id) && empty($data->conversation_id))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing message, listing_id, or conversation_id']);
    exit();
}

$message = trim($data->message);
if (empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Message cannot be empty']);
    exit();
}

$conversation_id = isset($data->conversation_id) ? intval($data->conversation_id) : null;
$listing_id = isset($data->listing_id) ? intval($data->listing_id) : null;
$message_type = isset($data->message_type) ? $data->message_type : 'text';
$metadata = isset($data->metadata) ? json_encode($data->metadata) : null;
$receiver_id = null;

if ($conversation_id) {
    // Reply flow: Verify user is part of this conversation
    $c_stmt = $conn->prepare("SELECT id, buyer_id, seller_id FROM marketplace_conversations WHERE id = ?");
    $c_stmt->bind_param("i", $conversation_id);
    $c_stmt->execute();
    $conv = $c_stmt->get_result()->fetch_assoc();
    
    if (!$conv || ($conv['buyer_id'] != $user_id && $conv['seller_id'] != $user_id)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Conversation access denied']);
        exit();
    }
    
    $receiver_id = ($conv['buyer_id'] === $user_id) ? $conv['seller_id'] : $conv['buyer_id'];

} else if ($listing_id) {
    // New conversation flow (Usually Buyer initiating via Listing)
    $stmt = $conn->prepare("SELECT user_id, tenant_id, status FROM marketplace_listings WHERE id = ?");
    $stmt->bind_param("i", $listing_id);
    $stmt->execute();
    $listing = $stmt->get_result()->fetch_assoc();
    
    if (!$listing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Listing not found']);
        exit();
    }
    
    if ($listing['status'] !== 'active' && $listing['status'] !== 'pending') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'This listing is no longer active']);
        exit();
    }
    
    $seller_id = $listing['user_id'];
    $tenant_id = $listing['tenant_id'];
    
    // Prevent messaging yourself
    if ($user_id === $seller_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'You cannot message yourself']);
        exit();
    }

    // Check if conversation already exists for this listing + buyer
    $c_stmt = $conn->prepare("SELECT id FROM marketplace_conversations WHERE listing_id = ? AND buyer_id = ?");
    $c_stmt->bind_param("ii", $listing_id, $user_id);
    $c_stmt->execute();
    $existing = $c_stmt->get_result()->fetch_assoc();
    
    if ($existing) {
        $conversation_id = $existing['id'];
    } else {
        // Create new conversation
        $buyer_shop_id = $_SESSION['current_shop_id'] ?? null;
        $new_stmt = $conn->prepare("INSERT INTO marketplace_conversations (tenant_id, listing_id, buyer_id, seller_id, buyer_shop_id) VALUES (?, ?, ?, ?, ?)");
        $new_stmt->bind_param("iiiii", $tenant_id, $listing_id, $user_id, $seller_id, $buyer_shop_id);
        if ($new_stmt->execute()) {
            $conversation_id = $conn->insert_id;
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create conversation: ' . $conn->error]);
            exit();
        }
    }
    $receiver_id = $seller_id;
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid request parameters']);
    exit();
}

// 3. Send Message
$msg_stmt = $conn->prepare("INSERT INTO marketplace_messages (conversation_id, sender_id, receiver_id, message, message_type, metadata, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)");
$msg_stmt->bind_param("iiisss", $conversation_id, $user_id, $receiver_id, $message, $message_type, $metadata);

if ($msg_stmt->execute()) {
    // Update conversation timestamp
    $conn->query("UPDATE marketplace_conversations SET last_message_at = NOW() WHERE id = $conversation_id");
    
    // Unarchive for both
    $conn->query("UPDATE marketplace_conversations SET is_archived_by_buyer = 0, is_archived_by_seller = 0 WHERE id = $conversation_id");
    
    // Track feature usage
    // We need tenant_id. It's available if new conversation created, but if replying, we need to fetch it.
    // Let's assume tenant_id is in session properly or fetch from conversation.
    // For now, use session tenant_id as simpler proxy or fetch properly.
    // Best: fetch from conversation or listings.
    
    // Simple fetch of tenant_id from conversation to be safe
    if (!isset($tenant_id)) {
        $t_stmt = $conn->prepare("SELECT tenant_id, buyer_shop_id FROM marketplace_conversations WHERE id = ?");
        $t_stmt->bind_param("i", $conversation_id);
        $t_stmt->execute();
        $t_res = $t_stmt->get_result()->fetch_assoc();
        $tenant_id = $t_res['tenant_id'];
        $buyer_shop_id = $t_res['buyer_shop_id']; // This might be null if seller is replying
    }
    
    require_once '../../../helpers/FeatureTracker.php';
    // shop_id logic: if sender is buyer, use buyer_shop_id. If sender is seller... we need seller's shop id. 
    // Let's just pass null for shop_id if unclear, or session shop id.
    // Simplest: Current session shop id or null.
    $current_shop_id = $_SESSION['shop_id'] ?? null;
    FeatureTracker::track('marketplace', 'send_message', $user_id, $tenant_id, $current_shop_id);

    echo json_encode(['success' => true, 'message' => 'Message sent', 'conversation_id' => $conversation_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to send message']);
}
?>
