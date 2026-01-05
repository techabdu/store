<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit;
}

require_once __DIR__ . '/../../../helpers/shop_helper.php';
$shop_id = requireShopContext();

// Fetch listings that the user is interested in
$query = "SELECT 
            l.id, l.title, l.price, l.listing_type, l.phone_model, l.phone_condition, l.created_at as listed_at,
            i.created_at as starred_at,
            s.shop_name,
            (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as image_url
          FROM marketplace_interests i
          JOIN marketplace_listings l ON i.listing_id = l.id
          JOIN shops s ON l.shop_id = s.id
          WHERE i.user_id = ? AND i.shop_id = ? AND l.status = 'active'
          ORDER BY i.created_at DESC";

$stmt = $conn->prepare($query);
$stmt->bind_param("ii", $user_id, $shop_id);
$stmt->execute();
$result = $stmt->get_result();

$interests = [];
while ($row = $result->fetch_assoc()) {
    $interests[] = $row;
}

echo json_encode([
    "success" => true,
    "interests" => $interests
]);
?>
