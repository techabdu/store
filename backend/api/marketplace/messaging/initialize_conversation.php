<?php
// backend/api/marketplace/messaging/initialize_conversation.php

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

if (!isset($data->listing_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing listing_id']);
    exit();
}

$listing_id = intval($data->listing_id);
// Optional: buyer_id (if Seller is initiating from an order)
$target_buyer_id = isset($data->buyer_id) ? intval($data->buyer_id) : null;

// 1. Fetch listing details
$stmt = $conn->prepare("
    SELECT l.user_id as seller_id, l.title
    FROM marketplace_listings l
    WHERE l.id = ?
");
$stmt->bind_param("i", $listing_id);
$stmt->execute();
$listing = $stmt->get_result()->fetch_assoc();

if (!$listing) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Listing not found']);
    exit();
}

$seller_id = $listing['seller_id'];
$buyer_id = null;

if ($user_id == $seller_id) {
    // Current user is the SELLER
    if (!$target_buyer_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Buyer ID is required when seller initiates chat']);
        exit();
    }
    $buyer_id = $target_buyer_id;
} else {
    // Current user is the BUYER
    $buyer_id = $user_id;
    // Check if buyer is messaging themselves (if they happen to be seller)
    if ($buyer_id == $seller_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'You cannot message yourself']);
        exit();
    }
}

// 2. Check if conversation already exists
$c_stmt = $conn->prepare("SELECT id FROM marketplace_conversations WHERE listing_id = ? AND buyer_id = ?");
$c_stmt->bind_param("ii", $listing_id, $buyer_id);
$c_stmt->execute();
$existing = $c_stmt->get_result()->fetch_assoc();

if ($existing) {
    $conversation_id = $existing['id'];
} else {
    // 3. Create new conversation
    $new_stmt = $conn->prepare("INSERT INTO marketplace_conversations (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)");
    $new_stmt->bind_param("iii", $listing_id, $buyer_id, $seller_id);
    if ($new_stmt->execute()) {
        $conversation_id = $conn->insert_id;
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to initialize conversation']);
        exit();
    }
}

// Fetch Other Party Details (for the UI)
$other_party_id = ($user_id == $seller_id) ? $buyer_id : $seller_id;
$p_stmt = $conn->prepare("SELECT display_name, profile_image FROM marketplace_profiles WHERE user_id = ? LIMIT 1");
$p_stmt->bind_param("i", $other_party_id);
$p_stmt->execute();
$other_party = $p_stmt->get_result()->fetch_assoc();

echo json_encode([
    'success' => true,
    'conversation_id' => $conversation_id,
    'other_party_details' => [
        'name' => $other_party['display_name'] ?? 'User',
        'image' => $other_party['profile_image'] ?? null
    ],
    'listing_title' => $listing['title']
]);
?>
