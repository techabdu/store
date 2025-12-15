<?php
// backend/api/marketplace/listings/get_details.php

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
    echo json_encode(['success' => false, 'error' => 'Listing ID required']);
    exit();
}

$listing_id = intval($_GET['id']);
$user_id = $_SESSION['user_id'];

// Fetch Listing Details
$stmt = $conn->prepare("
    SELECT 
        l.*,
        s.name as shop_name,
        s.address as shop_address,
        p.display_name as seller_name,
        p.profile_image as seller_image,
        p.is_verified as seller_verified,
        p.total_sales as seller_sales,
        p.average_rating as seller_rating
    FROM marketplace_listings l
    JOIN shops s ON l.shop_id = s.id
    JOIN marketplace_profiles p ON l.user_id = p.user_id
    WHERE l.id = ?
");

$stmt->bind_param("i", $listing_id);
$stmt->execute();
$result = $stmt->get_result();
$listing = $result->fetch_assoc();

if (!$listing) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Listing not found']);
    exit();
}

// Fetch Images
$img_stmt = $conn->prepare("SELECT image_url FROM marketplace_listing_images WHERE listing_id = ? ORDER BY display_order ASC");
$img_stmt->bind_param("i", $listing_id);
$img_stmt->execute();
$img_result = $img_stmt->get_result();

$images = [];
while ($row = $img_result->fetch_assoc()) {
    $images[] = $row['image_url'];
}

$listing['images'] = $images;

// Increment View Count (prevent dupes via session/cookie in real app, simplistic here)
$conn->query("UPDATE marketplace_listings SET views_count = views_count + 1 WHERE id = $listing_id");

// Log View (Optional, good for analytics)
$view_stmt = $conn->prepare("INSERT INTO marketplace_listing_views (listing_id, user_id, ip_address) VALUES (?, ?, ?)");
$ip = $_SERVER['REMOTE_ADDR'];
$view_stmt->bind_param("iis", $listing_id, $user_id, $ip);
$view_stmt->execute();

echo json_encode(['success' => true, 'listing' => $listing]);
?>
