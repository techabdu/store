<?php
// backend/api/marketplace/reviews/get_reviews.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/api_logger.php'; // API request logging

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

if (!isset($_GET['user_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User ID required']);
    exit();
}

$target_user_id = intval($_GET['user_id']);
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

$query = "
    SELECT 
        r.id, r.rating, r.comment, r.created_at,
        p.display_name as reviewer_name,
        p.profile_image as reviewer_image
    FROM marketplace_reviews r
    JOIN marketplace_profiles p ON r.reviewer_id = p.user_id
    WHERE r.reviewee_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
";

$stmt = $conn->prepare($query);
$stmt->bind_param("iii", $target_user_id, $limit, $offset);
$stmt->execute();
$result = $stmt->get_result();

$reviews = [];
while ($row = $result->fetch_assoc()) {
    $reviews[] = $row;
}

// Get stats summary (optional helper)
$stmt = $conn->prepare("SELECT average_rating, total_reviews FROM marketplace_profiles WHERE user_id = ?");
$stmt->bind_param("i", $target_user_id);
$stmt->execute();
$stats = $stmt->get_result()->fetch_assoc();

echo json_encode([
    'success' => true, 
    'reviews' => $reviews,
    'stats' => $stats
]);
?>
