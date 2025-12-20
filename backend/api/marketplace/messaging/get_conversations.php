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
$shop_id = isset($_GET['shop_id']) ? intval($_GET['shop_id']) : null;

// Determine if user is buyer or seller in the conv and fetch OTHER party's details
// Also join Listing to get title/image
// Use subqueries for profiles to avoid duplication due to multiple profiles per user
$query = "
    SELECT 
        c.id as conversation_id,
        c.last_message_at,
        c.buyer_id,
        c.seller_id,
        l.id as listing_id,
        l.title as listing_title,
        l.shop_id,
        (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
        
        CASE 
            WHEN c.buyer_id = ? THEN (SELECT display_name FROM marketplace_profiles WHERE user_id = c.seller_id LIMIT 1)
            ELSE (SELECT display_name FROM marketplace_profiles WHERE user_id = c.buyer_id LIMIT 1)
        END as other_party_name,
        
        CASE 
            WHEN c.buyer_id = ? THEN (SELECT profile_image FROM marketplace_profiles WHERE user_id = c.seller_id LIMIT 1)
            ELSE (SELECT profile_image FROM marketplace_profiles WHERE user_id = c.buyer_id LIMIT 1)
        END as other_party_image,
        
        (SELECT message FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT is_read FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_is_read,
        (SELECT sender_id FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id

    FROM marketplace_conversations c
    JOIN marketplace_listings l ON c.listing_id = l.id
    
    WHERE (
        (c.buyer_id = ? AND c.is_archived_by_buyer = 0)
";

$params = [$user_id, $user_id, $user_id];
$types = "iii";

if ($shop_id) {
    $query .= " OR (c.seller_id = ? AND l.shop_id = ? AND c.is_archived_by_seller = 0) ";
    $params[] = $user_id;
    $params[] = $shop_id;
    $types .= "ii";
} else {
    $query .= " OR (c.seller_id = ? AND c.is_archived_by_seller = 0) ";
    $params[] = $user_id;
    $types .= "i";
}

$query .= " ) ";

$query .= " ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($query);
$stmt->bind_param($types, ...$params);
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
