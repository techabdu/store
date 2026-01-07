<?php
// backend/api/marketplace/orders/get.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

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
$shop_id = $_SESSION['current_shop_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

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
    JOIN users u_buyer ON o.buyer_id = u_buyer.id
    JOIN users u_seller ON o.seller_id = u_seller.id
    
    WHERE o.id = ? AND (
        (o.buyer_id = ? AND (? IS NULL OR u_buyer.tenant_id = ?)) OR 
        (o.seller_id = ? AND (? IS NULL OR u_seller.tenant_id = ?))
    )
";

$stmt = $conn->prepare($query);
$stmt->bind_param("iiiiiii", $order_id, $user_id, $tenant_id, $tenant_id, $user_id, $tenant_id, $tenant_id);
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
