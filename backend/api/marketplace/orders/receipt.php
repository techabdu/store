<?php
/**
 * Receipt Generation API
 * Generates detailed receipt data for completed marketplace orders
 * 
 * Endpoint: GET /api/marketplace/orders/receipt.php?id={order_id}
 * Returns: Complete receipt data including buyer, seller, and transaction details
 */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';

session_start();

// Verify user is authenticated
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

// Validate order ID parameter
if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit();
}

$order_id = intval($_GET['id']);
$user_id = $_SESSION['user_id'];

/**
 * Query to get comprehensive receipt data
 * Includes: order details, listing info, buyer/seller info, payment info, and history
 */
$query = "
    SELECT 
        o.id as order_id,
        o.order_number,
        o.agreed_price,
        o.escrow_status,
        o.order_status,
        o.delivery_status,
        o.shipping_method,
        o.tracking_number,
        o.delivery_address as order_delivery_address,
        o.created_at as order_date,
        o.paid_at,
        o.shipped_at,
        o.delivered_at,
        o.completed_at,
        o.phone_model,
        
        -- Listing Details
        l.title as listing_title,
        l.listing_type,
        l.phone_condition,
        l.phone_storage,
        l.phone_color,
        l.phone_brand,
        
        -- Inventory details
        i.imei as phone_imei,
        
        -- Buyer Information (From their main shop/branch)
        COALESCE(NULLIF(TRIM(CONCAT(iv_b.first_name, ' ', iv_b.last_name)), ''), u_b.full_name, p_b.display_name, 'Buyer') as b_name,
        u_b.email as b_email,
        COALESCE(NULLIF(sb.shop_phone, ''), u_b.phone, 'N/A') as b_phone,
        sb.shop_name as b_shop_name,
        sb.shop_address as b_shop_address,
        p_b.profile_image as b_image,
        COALESCE(iv_b.is_verified, p_b.is_verified, 0) as b_is_verified,
        
        -- Seller Information (From their main shop/branch)
        COALESCE(NULLIF(TRIM(CONCAT(iv_s.first_name, ' ', iv_s.last_name)), ''), u_s.full_name, p_s.display_name, 'Seller') as s_name,
        u_s.email as s_email,
        COALESCE(NULLIF(ss.shop_phone, ''), u_s.phone, 'N/A') as s_phone,
        ss.shop_name as s_shop_name,
        ss.shop_address as s_shop_address,
        p_s.profile_image as s_image,
        COALESCE(iv_s.is_verified, p_s.is_verified, 0) as s_is_verified,
        
        -- Listing Image
        (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id ORDER BY is_primary DESC, id ASC LIMIT 1) as listing_image
        
    FROM marketplace_orders o
    JOIN marketplace_listings l ON o.listing_id = l.id
    LEFT JOIN inventory i ON l.inventory_id = i.id
    -- Buyer Joins (Joined via user's primary/main shop)
    LEFT JOIN users u_b ON o.buyer_id = u_b.id
    LEFT JOIN shops sb ON u_b.tenant_id = sb.tenant_id AND sb.is_main_branch = 1
    LEFT JOIN marketplace_profiles p_b ON o.buyer_id = p_b.user_id
    LEFT JOIN marketplace_identity_verifications iv_b ON o.buyer_id = iv_b.user_id AND iv_b.is_verified = 1
    -- Seller Joins (Joined via user's primary/main shop)
    LEFT JOIN users u_s ON o.seller_id = u_s.id
    LEFT JOIN shops ss ON u_s.tenant_id = ss.tenant_id AND ss.is_main_branch = 1
    LEFT JOIN marketplace_profiles p_s ON o.seller_id = p_s.user_id
    LEFT JOIN marketplace_identity_verifications iv_s ON o.seller_id = iv_s.user_id AND iv_s.is_verified = 1
    
    WHERE o.id = ? AND (o.buyer_id = ? OR o.seller_id = ?)
    GROUP BY o.id
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

// Determine if current user is buyer or seller
$is_buyer = ($order['buyer_id'] == $user_id);
$user_role = $is_buyer ? 'buyer' : 'seller';

// Get order history/timeline
$history_query = "
    SELECT 
        status_from,
        status_to,
        notes,
        created_at
    FROM marketplace_order_history
    WHERE order_id = ?
    ORDER BY created_at ASC
";

$history_stmt = $conn->prepare($history_query);
$history_stmt->bind_param("i", $order_id);
$history_stmt->execute();
$history_result = $history_stmt->get_result();

$order_history = [];
while ($history_row = $history_result->fetch_assoc()) {
    $order_history[] = $history_row;
}

// Format receipt data
$receipt = [
    'receipt_number' => $order['order_number'],
    'receipt_date' => date('Y-m-d H:i:s'),
    'user_role' => $user_role,
    
    // Transaction Details
    'transaction' => [
        'order_id' => $order['order_id'],
        'order_number' => $order['order_number'],
        'order_date' => $order['order_date'],
        'payment_date' => $order['paid_at'],
        'shipped_date' => $order['shipped_at'],
        'delivered_date' => $order['delivered_at'],
        'completed_date' => $order['completed_at'],
        'status' => $order['order_status'],
        'escrow_status' => $order['escrow_status'],
    ],
    
    // Item Details
    'item' => [
        'title' => $order['listing_title'],
        'description' => $order['listing_description'],
        'brand' => $order['phone_brand'],
        'model' => $order['phone_model'],
        'condition' => $order['phone_condition'],
        'storage' => $order['phone_storage'],
        'color' => $order['phone_color'],
        'imei' => $order['phone_imei'],
        'listing_type' => $order['listing_type'],
        'original_price' => $order['original_price'],
        'agreed_price' => $order['agreed_price'],
        'image' => $order['listing_image'],
    ],
    
    // Buyer Details
    'buyer' => [
        'id' => $order['buyer_id'],
        'name' => $order['b_name'],
        'email' => $order['b_email'],
        'phone' => $order['b_phone'],
        'shop_name' => $order['b_shop_name'],
        'shop_address' => $order['b_shop_address'],
        'profile_image' => $order['b_image'],
        'is_verified' => (bool)$order['b_is_verified'],
    ],
    
    // Seller Details
    'seller' => [
        'id' => $order['seller_id'],
        'name' => $order['s_name'],
        'email' => $order['s_email'],
        'phone' => $order['s_phone'],
        'shop_name' => $order['s_shop_name'],
        'shop_address' => $order['s_shop_address'],
        'profile_image' => $order['s_image'],
        'is_verified' => (bool)$order['s_is_verified'],
    ],
    
    // Delivery Details
    'delivery' => [
        'status' => $order['delivery_status'],
        'method' => $order['shipping_method'],
        'tracking_number' => $order['tracking_number'],
        'address' => $order['delivery_address'],
        'notes' => $order['delivery_notes'],
    ],
    
    // Order History/Timeline
    'history' => $order_history,
    
    // Financial Summary
    'financial' => [
        'subtotal' => $order['agreed_price'],
        'shipping_fee' => 0, // Can be extended later
        'platform_fee' => 0, // Can be extended later
        'total' => $order['agreed_price'],
    ],
];

echo json_encode([
    'success' => true, 
    'receipt' => $receipt,
    'can_print' => in_array($order['order_status'], ['completed', 'delivered']),
]);
?>
