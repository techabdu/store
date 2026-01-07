<?php
// backend/api/marketplace/orders/list.php

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

$user_id = $_SESSION['user_id'];
$role = isset($_GET['role']) ? $_GET['role'] : 'buyer'; // 'buyer' or 'seller'
$status = isset($_GET['status']) ? $_GET['status'] : '';

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

$where = [];
$params = [];
$types = "";

if ($role === 'seller') {
    $where[] = "o.seller_id = ?";
    $shop_id = $_SESSION['current_shop_id'] ?? null;
    $tenant_id = $_SESSION['tenant_id'] ?? null;
    
    if ($shop_id && $tenant_id) {
        $where[] = "o.seller_shop_id = ?";
        $where[] = "u_seller.tenant_id = ?";
        $types .= "iii";
        $params[] = $user_id;
        $params[] = $shop_id;
        $params[] = $tenant_id;
    } elseif ($tenant_id) {
        $where[] = "u_seller.tenant_id = ?";
        $types .= "ii";
        $params[] = $user_id;
        $params[] = $tenant_id;
    } else {
        $types .= "i";
        $params[] = $user_id;
    }
} else {
    $where[] = "o.buyer_id = ?";
    $shop_id = $_SESSION['current_shop_id'] ?? null;
    $tenant_id = $_SESSION['tenant_id'] ?? null;
    
    if ($shop_id && $tenant_id) {
        $where[] = "o.buyer_shop_id = ?";
        $where[] = "u_buyer.tenant_id = ?";
        $types .= "iii";
        $params[] = $user_id;
        $params[] = $shop_id;
        $params[] = $tenant_id;
    } elseif ($tenant_id) {
        $where[] = "u_buyer.tenant_id = ?";
        $types .= "ii";
        $params[] = $user_id;
        $params[] = $tenant_id;
    } else {
        $types .= "i";
        $params[] = $user_id;
    }
}

if (!empty($status)) {
    $where[] = "o.order_status = ?";
    $types .= "s";
    $params[] = $status;
}

$where_clause = implode(" AND ", $where);

$query = "
    SELECT 
        o.id, 
        o.order_number as order_reference, 
        o.agreed_price as total_amount, 
        o.order_status as status, 
        o.created_at,
        l.title as listing_title,
        l.listing_type,
        
        CASE 
            WHEN o.buyer_id = ? THEN p_seller.display_name
            ELSE p_buyer.display_name
        END as other_party_name,

        CASE 
            WHEN o.buyer_id = ? THEN s_shop.shop_name
            ELSE b_shop.shop_name
        END as other_party_shop_name,

        (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id ORDER BY is_primary DESC, id ASC LIMIT 1) as listing_image
        
    FROM marketplace_orders o
    JOIN marketplace_listings l ON o.listing_id = l.id
    LEFT JOIN marketplace_profiles p_buyer ON o.buyer_id = p_buyer.user_id AND (o.buyer_shop_id = p_buyer.shop_id OR (o.buyer_shop_id IS NULL AND p_buyer.shop_id IS NULL))
    LEFT JOIN marketplace_profiles p_seller ON o.seller_id = p_seller.user_id AND (o.seller_shop_id = p_seller.shop_id OR (o.seller_shop_id IS NULL AND p_seller.shop_id IS NULL))
    LEFT JOIN users u_buyer ON o.buyer_id = u_buyer.id
    LEFT JOIN shops b_shop ON u_buyer.tenant_id = b_shop.tenant_id AND b_shop.is_main_branch = 1
    LEFT JOIN users u_seller ON o.seller_id = u_seller.id
    LEFT JOIN shops s_shop ON u_seller.tenant_id = s_shop.tenant_id AND s_shop.is_main_branch = 1
    
    WHERE $where_clause
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
";

// Add user_id again for CASE statements (two now), then limit/offset
$final_params = array_merge([$user_id, $user_id], $params, [$limit, $offset]);
$final_types = "ii" . $types . "ii";

$stmt = $conn->prepare($query);
$stmt->bind_param($final_types, ...$final_params);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = $row;
}

echo json_encode(['success' => true, 'orders' => $orders]);
?>
