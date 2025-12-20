<?php
// backend/api/marketplace/profile/get_stats.php

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
$shop_id = isset($_GET['shop_id']) ? intval($_GET['shop_id']) : null;

try {
    // 1. Active Listings
    if ($shop_id) {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_listings WHERE user_id = ? AND shop_id = ? AND status = 'active'");
        $stmt->bind_param("ii", $user_id, $shop_id);
    } else {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_listings WHERE user_id = ? AND status = 'active'");
        $stmt->bind_param("i", $user_id);
    }
    $stmt->execute();
    $active_listings = $stmt->get_result()->fetch_assoc()['count'];

    // 2. Total Sales (Completed Orders as Seller)
    if ($shop_id) {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_orders WHERE seller_id = ? AND seller_shop_id = ? AND order_status = 'completed'");
        $stmt->bind_param("ii", $user_id, $shop_id);
    } else {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_orders WHERE seller_id = ? AND order_status = 'completed'");
        $stmt->bind_param("i", $user_id);
    }
    $stmt->execute();
    $total_sales = $stmt->get_result()->fetch_assoc()['count'];

    // 3. Total Purchases (Completed Orders as Buyer)
    // Purchases are usually global for the user account, but let's allow shop filtering if we track where they bought from
    if ($shop_id) {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_orders WHERE buyer_id = ? AND buyer_shop_id = ? AND order_status = 'completed'");
        $stmt->bind_param("ii", $user_id, $shop_id);
    } else {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_orders WHERE buyer_id = ? AND order_status = 'completed'");
        $stmt->bind_param("i", $user_id);
    }
    $stmt->execute();
    $total_purchases = $stmt->get_result()->fetch_assoc()['count'];

    // 4. Pending Orders (Orders to process as Seller)
    if ($shop_id) {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_orders WHERE seller_id = ? AND seller_shop_id = ? AND order_status = 'pending'");
        $stmt->bind_param("ii", $user_id, $shop_id);
    } else {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM marketplace_orders WHERE seller_id = ? AND order_status = 'pending'");
        $stmt->bind_param("i", $user_id);
    }
    $stmt->execute();
    $pending_orders = $stmt->get_result()->fetch_assoc()['count'];

    $stats = [
        'active_listings' => $active_listings,
        'total_sales' => $total_sales,
        'total_purchases' => $total_purchases,
        'pending_orders' => $pending_orders
    ];

    echo json_encode(['success' => true, 'stats' => $stats]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
