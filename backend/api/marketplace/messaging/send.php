<?php
// backend/api/marketplace/messaging/send.php

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

if (!isset($data->listing_id) || !isset($data->message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing listing_id or message']);
    exit();
}

$listing_id = intval($data->listing_id);
$message = trim($data->message);

if (empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Message cannot be empty']);
    exit();
}

// 1. Validate Listing
$stmt = $conn->prepare("SELECT user_id, status FROM marketplace_listings WHERE id = ?");
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

// Prevent messaging yourself
if ($user_id === $seller_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'You cannot message yourself']);
    exit();
}

// 2. Find or Create Conversation
// A conversation is unique per (listing, buyer). 
// Since seller is fixed for a listing, we just need to check if *this* user (buyer) has a conv for *this* listing.
// Wait, if the seller messages, we need to know who the buyer is.
// Usually messaging starts from Buyer. 
// If User is Seller: They must reply to an existing conversation. They can't initiate "to a buyer" without context.
// So input MUST have `conversation_id` OR `listing_id` (implying new chat as buyer).

$conversation_id = null;

if (isset($data->conversation_id)) {
    // Reply flow
    $conversation_id = intval($data->conversation_id);
    
    // Verify user is part of this conversation
    $c_stmt = $conn->prepare("SELECT id, buyer_id, seller_id FROM marketplace_conversations WHERE id = ?");
    $c_stmt->bind_param("i", $conversation_id);
    $c_stmt->execute();
    $conv = $c_stmt->get_result()->fetch_assoc();
    
    if (!$conv || ($conv['buyer_id'] !== $user_id && $conv['seller_id'] !== $user_id)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Conversation access denied']);
        exit();
    }
    
    $receiver_id = ($conv['buyer_id'] === $user_id) ? $conv['seller_id'] : $conv['buyer_id'];

} else {
    // New conversation flow (Buyer initiating)
    // Check if conversation already exists for this listing + buyer
    $c_stmt = $conn->prepare("SELECT id FROM marketplace_conversations WHERE listing_id = ? AND buyer_id = ?");
    $c_stmt->bind_param("ii", $listing_id, $user_id);
    $c_stmt->execute();
    $existing = $c_stmt->get_result()->fetch_assoc();
    
    if ($existing) {
        $conversation_id = $existing['id'];
    } else {
        // Create new conversation
        $new_stmt = $conn->prepare("INSERT INTO marketplace_conversations (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)");
        $new_stmt->bind_param("iii", $listing_id, $user_id, $seller_id);
        if ($new_stmt->execute()) {
            $conversation_id = $conn->insert_id;
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create conversation']);
            exit();
        }
    }
    $receiver_id = $seller_id;
}

// 3. Send Message
$msg_stmt = $conn->prepare("INSERT INTO marketplace_messages (conversation_id, sender_id, receiver_id, message, is_read) VALUES (?, ?, ?, ?, 0)");
$msg_stmt->bind_param("iiis", $conversation_id, $user_id, $receiver_id, $message);

if ($msg_stmt->execute()) {
    // Update conversation timestamp
    $conn->query("UPDATE marketplace_conversations SET last_message_at = NOW() WHERE id = $conversation_id");
    
    // Reset archive status (bring back to inbox if archived)
    // If I am sender, I want it active. If receiver archived it, this new message un-archives it.
    if ($user_id === $receiver_id) { 
        // Logic error in variable naming above? $receiver_id is the OTHER person.
        // If I send to Receiver, update Receiver's archive status.
    }
    // Simplification: Unarchive for both just in case
    $conn->query("UPDATE marketplace_conversations SET is_archived_by_buyer = 0, is_archived_by_seller = 0 WHERE id = $conversation_id");
    
    echo json_encode(['success' => true, 'message' => 'Message sent', 'conversation_id' => $conversation_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to send message']);
}
?>
