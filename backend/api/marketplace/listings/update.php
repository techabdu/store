<?php
// backend/api/marketplace/listings/update.php

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

if (!isset($data->id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Listing ID required']);
    exit();
}

$listing_id = intval($data->id);
$shop_id = $_SESSION['current_shop_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

try {
    // 1. Verify ownership and existence (strictly scoped)
    $query = "
        SELECT l.id, l.user_id, l.status 
        FROM marketplace_listings l
        JOIN shops s ON l.shop_id = s.id
        WHERE l.id = ? AND l.user_id = ?
    ";
    
    if ($shop_id) {
        $query .= " AND l.shop_id = $shop_id";
    }
    if ($tenant_id) {
        $query .= " AND s.tenant_id = $tenant_id";
    }

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Database error: " . $conn->error);
    }
    $stmt->bind_param("ii", $listing_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Listing not found or access denied. Ensure you are in the correct branch.']);
        exit();
    }
    
    $listing = $result->fetch_assoc();

    // 2. Prepare Update Data
    // Allowed fields to update: title, description, price, listing_type, phone_condition, auction fields
    // Inventory related fields (brand, model, storage, color) are generally fixed unless inventory changes, 
    // but usually we don't allow changing underlying inventory item for a live listing to prevent bait-switch.
    
    $title = isset($data->title) ? trim($data->title) : '';
    $description = isset($data->description) ? trim($data->description) : '';
    $price = isset($data->price) ? floatval($data->price) : 0;
    
    if (empty($title) || $price < 0) {
        throw new Exception("Title and valid Price are required");
    }

    $listing_type = isset($data->listing_type) ? $data->listing_type : 'fixed_price';
    $phone_condition = isset($data->phone_condition) ? $data->phone_condition : 'good';
    
    // Auction fields
    $auction_start_price = null;
    $auction_reserve_price = null;
    $auction_ends_at = null;
    
    if ($listing_type === 'auction') {
        if (!isset($data->auction_ends_at)) {
            throw new Exception('Auction end date required for auctions');
        }
        $auction_start_price = $price; // Use price as start price
        $auction_reserve_price = isset($data->auction_reserve_price) ? floatval($data->auction_reserve_price) : null;
        $auction_ends_at = $data->auction_ends_at; // YYYY-MM-DD HH:MM:SS
    }

    // 3. Execute Update
    $query = "
        UPDATE marketplace_listings 
        SET title = ?, description = ?, price = ?, listing_type = ?, 
            phone_condition = ?, auction_start_price = ?, auction_reserve_price = ?, auction_ends_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    ";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Update Prepare failed: " . $conn->error);
    }
    
    // Types: s (title), s (desc), d (price), s (type), s (cond), d (start), d (reserve), s (ends), i (id), i (user)
    $stmt->bind_param("ssdssddsii", 
        $title, $description, $price, $listing_type, 
        $phone_condition, $auction_start_price, $auction_reserve_price, $auction_ends_at,
        $listing_id, $user_id
    );
    
    if ($stmt->execute()) {
        // Handle Images (Optional: If passed as array of URLs)
        // If images array is present (even if empty), we replace existing images
        if (isset($data->images) && is_array($data->images)) {
            // Delete existing images
            $del_stmt = $conn->prepare("DELETE FROM marketplace_listing_images WHERE listing_id = ?");
            $del_stmt->bind_param("i", $listing_id);
            $del_stmt->execute();
            
            // Insert new images
            if (count($data->images) > 0) {
                 $img_stmt = $conn->prepare("INSERT INTO marketplace_listing_images (listing_id, image_url, display_order, is_primary) VALUES (?, ?, ?, ?)");
                 foreach ($data->images as $index => $url) {
                    $is_primary = ($index === 0) ? 1 : 0;
                    $order = $index;
                    $img_stmt->bind_param("isii", $listing_id, $url, $order, $is_primary);
                    $img_stmt->execute();
                 }
            }
        }

        echo json_encode(['success' => true, 'message' => 'Listing updated successfully']);
    } else {
        throw new Exception("Update failed: " . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
