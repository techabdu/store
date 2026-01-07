<?php
// backend/api/marketplace/auctions/get_bids.php

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

if (!isset($_GET['listing_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Listing ID required']);
    exit();
}

$listing_id = intval($_GET['listing_id']);

$query = "
    SELECT 
        b.id, b.bid_amount, b.created_at,
        p.display_name as bidder_name,
        p.profile_image as bidder_image
    FROM marketplace_auction_bids b
    JOIN marketplace_profiles p ON b.user_id = p.user_id
    WHERE b.listing_id = ?
    ORDER BY b.bid_amount DESC
    LIMIT 50
";

$stmt = $conn->prepare($query);
$stmt->bind_param("i", $listing_id);
$stmt->execute();
$result = $stmt->get_result();

$bids = [];
while ($row = $result->fetch_assoc()) {
    // Mask name for privacy if needed? usually auctions show names.
    // Let's hide last name chars or just show display name.
    // Display name is public.
    $bids[] = $row;
}

echo json_encode(['success' => true, 'bids' => $bids]);
?>
