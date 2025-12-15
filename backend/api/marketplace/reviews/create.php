<?php
// backend/api/marketplace/reviews/create.php

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

if (!isset($data->order_id) || !isset($data->rating)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID and rating required']);
    exit();
}

$order_id = intval($data->order_id);
$rating = intval($data->rating);
$comment = isset($data->comment) ? trim($data->comment) : '';

if ($rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Rating must be between 1 and 5']);
    exit();
}

$conn->begin_transaction();

try {
    // 3. Verify Order Eligibility
    // Order must exist, belong to buyer, be completed.
    $stmt = $conn->prepare("SELECT seller_id, order_status FROM marketplace_orders WHERE id = ? AND buyer_id = ? FOR UPDATE");
    $stmt->bind_param("ii", $order_id, $user_id);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order) {
        throw new Exception('Order not found or unauthorized');
    }

    if ($order['order_status'] !== 'completed') {
        throw new Exception('Can only review completed orders');
    }

    $seller_id = $order['seller_id'];

    if ($seller_id === $user_id) {
        throw new Exception('You cannot review yourself'); 
    }

    // 2. Check for Existing Review
    $check_stmt = $conn->prepare("SELECT id FROM marketplace_reviews WHERE order_id = ?");
    $check_stmt->bind_param("i", $order_id);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows > 0) {
        throw new Exception('You have already reviewed this order');
    }

    // 3. Insert Review
    $insert_stmt = $conn->prepare("
        INSERT INTO marketplace_reviews (order_id, reviewer_id, reviewee_id, rating, comment, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $insert_stmt->bind_param("iiiis", $order_id, $user_id, $seller_id, $rating, $comment);
    if (!$insert_stmt->execute()) {
        throw new Exception('Failed to submit review');
    }

    // 4. Update Seller Rating stats
    // Calculate new average
    $avg_stmt = $conn->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM marketplace_reviews WHERE reviewee_id = ?");
    $avg_stmt->bind_param("i", $seller_id);
    $avg_stmt->execute();
    $stats = $avg_stmt->get_result()->fetch_assoc();
    
    $new_avg = round($stats['avg_rating'], 1); // 1 decimal place
    $total = $stats['total_reviews'];

    // Update Profile
    $prof_stmt = $conn->prepare("UPDATE marketplace_profiles SET average_rating = ?, total_reviews = ? WHERE user_id = ?");
    $prof_stmt->bind_param("dii", $new_avg, $total, $seller_id);
    $prof_stmt->execute();

    $conn->commit();
    
    echo json_encode(['success' => true, 'message' => 'Review submitted successfully']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
