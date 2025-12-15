<?php
// backend/api/marketplace/messaging/get_conversations.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
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
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

// Determine if user is buyer or seller in the conv and fetch OTHER party's details
// Also join Listing to get title/image
$query = "
    SELECT 
        c.id as conversation_id,
        c.last_message_at,
        l.id as listing_id,
        l.title as listing_title,
        (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
        
        CASE 
            WHEN c.buyer_id = ? THEN p_seller.display_name
            ELSE p_buyer.display_name
        END as other_party_name,
        
        CASE 
            WHEN c.buyer_id = ? THEN p_seller.profile_image
            ELSE p_buyer.profile_image
        END as other_party_image,
        
        (SELECT message FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT is_read FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_is_read,
        (SELECT sender_id FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id

    FROM marketplace_conversations c
    JOIN marketplace_listings l ON c.listing_id = l.id
    LEFT JOIN marketplace_profiles p_buyer ON c.buyer_id = p_buyer.user_id
    LEFT JOIN marketplace_profiles p_seller ON c.seller_id = p_seller.user_id
    
    WHERE (c.buyer_id = ? AND c.is_archived_by_buyer = 0) 
       OR (c.seller_id = ? AND c.is_archived_by_seller = 0)
       
    ORDER BY c.last_message_at DESC
    LIMIT ? OFFSET ?
";

$stmt = $conn->prepare($query);
// Bind params: user_id (x4 for CASE checks and WHERE), limit, offset
$stmt->bind_param("iiiiii", $user_id, $user_id, $user_id, $user_id, $limit, $offset);
$stmt->execute();
$result = $stmt->get_result();

$conversations = [];
while ($row = $result->fetch_assoc()) {
    // Add logic to determine if "I" have unread messages
    $row['has_unread'] = ($row['last_message_is_read'] == 0 && $row['last_message_sender_id'] != $user_id);
    $conversations[] = $row;
}

echo json_encode(['success' => true, 'conversations' => $conversations]);
?>
