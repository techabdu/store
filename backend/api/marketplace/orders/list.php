<?php
// backend/api/marketplace/orders/list.php

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
$role = isset($_GET['role']) ? $_GET['role'] : 'buyer'; // 'buyer' or 'seller'
$status = isset($_GET['status']) ? $_GET['status'] : '';

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

$where = [];
$params = [];
$types = "";

if ($role === 'seller') {
    $where[] = "o.seller_id = ?";
} else {
    $where[] = "o.buyer_id = ?";
}
$types .= "i";
$params[] = $user_id;

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
        END as other_party_name
        
    FROM marketplace_orders o
    JOIN marketplace_listings l ON o.listing_id = l.id
    LEFT JOIN marketplace_profiles p_buyer ON o.buyer_id = p_buyer.user_id
    LEFT JOIN marketplace_profiles p_seller ON o.seller_id = p_seller.user_id
    
    WHERE $where_clause
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
";

// Add user_id again for CASE, then limit/offset
$final_params = array_merge([$user_id], $params, [$limit, $offset]);
$final_types = "i" . $types . "ii";

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
