<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->listing_id)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Listing ID required"]);
    exit;
}

$listing_id = $data->listing_id;

require_once __DIR__ . '/../../../helpers/shop_helper.php';
$shop_id = requireShopContext();

// Check if interest already exists for this shop
$stmt = $conn->prepare("SELECT id FROM marketplace_interests WHERE user_id = ? AND listing_id = ? AND shop_id = ?");
$stmt->bind_param("iii", $user_id, $listing_id, $shop_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Already interested, so remove it (toggle off)
    $delete_stmt = $conn->prepare("DELETE FROM marketplace_interests WHERE user_id = ? AND listing_id = ? AND shop_id = ?");
    $delete_stmt->bind_param("iii", $user_id, $listing_id, $shop_id);
    if ($delete_stmt->execute()) {
        echo json_encode(["success" => true, "action" => "removed", "message" => "Removed from interests"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to remove interest"]);
    }
} else {
    // Not interested yet, so add it (toggle on)
    $insert_stmt = $conn->prepare("INSERT INTO marketplace_interests (user_id, listing_id, shop_id) VALUES (?, ?, ?)");
    $insert_stmt->bind_param("iii", $user_id, $listing_id, $shop_id);
    if ($insert_stmt->execute()) {
        echo json_encode(["success" => true, "action" => "added", "message" => "Added to interests"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to add interest"]);
    }
}
?>
