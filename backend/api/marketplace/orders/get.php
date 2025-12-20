<?php
// backend/api/marketplace/orders/get.php

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

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit();
}

$order_id = intval($_GET['id']);
$user_id = $_SESSION['user_id'];

// Query to get detailed order info
$query = "
    SELECT 
        o.*,
        l.title as listing_title,
        l.listing_type,
        l.description as listing_description,
        l.price as original_price,
        l.phone_condition,
        l.phone_storage,
        l.phone_color,
        
        p_buyer.display_name as buyer_name,
        p_seller.display_name as seller_name,
        
        (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id ORDER BY is_primary DESC, id ASC LIMIT 1) as listing_image
        
    FROM marketplace_orders o
    JOIN marketplace_listings l ON o.listing_id = l.id
    LEFT JOIN marketplace_profiles p_buyer ON o.buyer_id = p_buyer.user_id AND (o.buyer_shop_id = p_buyer.shop_id OR (o.buyer_shop_id IS NULL AND p_buyer.shop_id IS NULL))
    LEFT JOIN marketplace_profiles p_seller ON o.seller_id = p_seller.user_id AND (o.seller_shop_id = p_seller.shop_id OR (o.seller_shop_id IS NULL AND p_seller.shop_id IS NULL))
    
    WHERE o.id = ? AND (o.buyer_id = ? OR o.seller_id = ?)
";

$stmt = $conn->prepare($query);
$stmt->bind_param("iii", $order_id, $user_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Order not found or access denied']);
    exit();
}

$order = $result->fetch_assoc();

echo json_encode(['success' => true, 'order' => $order]);
?>
