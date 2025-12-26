<?php
// backend/api/marketplace/listings/create.php

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

// 1. Validate Input
$json = file_get_contents("php://input");
error_log("Create Listing Raw Input: " . $json); // DEBUG
$data = json_decode($json);

if (!isset($data->inventory_id) || !isset($data->price) || !isset($data->title)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}


try {

    // 2. Validate Inventory Item FIRST (to get correct shop context)
    // Must belong to user's shop (checked later via Profile) and be in 'in_stock' status
    $check_stmt = $conn->prepare("SELECT shop_id, status FROM inventory WHERE id = ?");
    if (!$check_stmt) {
        throw new Exception("Inventory Check Prepare failed: " . $conn->error);
    }
    $check_stmt->bind_param("i", $data->inventory_id);
    $check_stmt->execute();
    $inv_result = $check_stmt->get_result();
    
    if ($inv_result->num_rows === 0) {
        throw new Exception("Inventory item not found");
    }
    
    $inv_data = $inv_result->fetch_assoc();
    $target_shop_id = $inv_data['shop_id'];
    
    if ($inv_data['status'] !== 'in_stock') {
        throw new Exception('Item is not in stock (Status: ' . $inv_data['status'] . ')');
    }

    // 3. Check if User has a Profile for THIS Shop and is Active
    $stmt = $conn->prepare("SELECT id, shop_id, is_active, is_restricted FROM marketplace_profiles WHERE user_id = ? AND shop_id = ?");
    if (!$stmt) {
        throw new Exception("Profile Check Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("ii", $user_id, $target_shop_id);
    $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc();
    
    if (!$profile) {
        // Fallback: Check if they have ANY profile (to give better error)
        $stmt2 = $conn->prepare("SELECT id FROM marketplace_profiles WHERE user_id = ?");
        $stmt2->bind_param("i", $user_id);
        $stmt2->execute();
        if ($stmt2->get_result()->num_rows > 0) {
             throw new Exception('You do not have a marketplace profile for this specific shop branch (' . $target_shop_id . ')');
        }
        
        throw new Exception('You must create a marketplace profile first');
    }
    
    if (!$profile['is_active'] || $profile['is_restricted']) {
        throw new Exception('Your marketplace profile is restricted or inactive');
    }
    
    $shop_id = $profile['shop_id'];
    
    // Double check match (redundant but safe)
    if ($target_shop_id != $shop_id) {
        throw new Exception('Logic Error: Shop ID mismatch');
    }
    
    // Re-fetch full item
    $stmt = $conn->prepare("
        SELECT * FROM inventory 
        WHERE id = ? AND shop_id = ? AND status = 'in_stock'
    ");
    if (!$stmt) {
        throw new Exception("Inventory Fetch Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("ii", $data->inventory_id, $shop_id);
    $stmt->execute();
    $inventory_item = $stmt->get_result()->fetch_assoc();
    
    if (!$inventory_item) {
        throw new Exception('Invalid inventory item or item not in stock');
    }
    
    // Check if already listed
    $stmt = $conn->prepare("SELECT id FROM marketplace_listings WHERE inventory_id = ? AND status IN ('active', 'pending')");
    if (!$stmt) {
        throw new Exception("Listing Check Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("i", $data->inventory_id);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        throw new Exception('This item is already listed');
    }
    
    // 4. Prepare Listing Data
    $title = trim($data->title);
    $description = isset($data->description) ? trim($data->description) : '';
    $listing_type = isset($data->listing_type) ? $data->listing_type : 'fixed_price';
    $price = floatval($data->price);
    $original_price = isset($data->original_price) ? floatval($data->original_price) : null;
    $min_offer_price = isset($data->min_offer_price) ? floatval($data->min_offer_price) : null;
    
    // Auction fields
    $auction_start_price = null;
    $auction_reserve_price = null;
    $auction_ends_at = null;
    
    if ($listing_type === 'auction') {
        if (!isset($data->auction_ends_at)) {
            throw new Exception('Auction end date required');
        }
        $auction_start_price = floatval($data->price); // Base price is start price
        $auction_reserve_price = isset($data->auction_reserve_price) ? floatval($data->auction_reserve_price) : null;
        $auction_ends_at = $data->auction_ends_at; // YYYY-MM-DD HH:MM:SS
    }
    
    // Denormalized fields from inventory for faster search
    $phone_model = $inventory_item['model'];
    $phone_brand = $inventory_item['brand'];
    
    // Condition Mapping
    // Use inventory condition directly
    $phone_condition = $inventory_item['condition_status'];
    
    $phone_storage = $inventory_item['storage'];
    $phone_color = $inventory_item['color'];
    
    // 5. Insert Listing
    $stmt = $conn->prepare("
        INSERT INTO marketplace_listings 
        (shop_id, user_id, inventory_id, title, description, listing_type, price, original_price, min_offer_price, 
        auction_start_price, auction_reserve_price, auction_ends_at, 
        phone_model, phone_brand, phone_condition, phone_storage, phone_color, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    
    if (!$stmt) {
        throw new Exception("Insert Prepare failed: " . $conn->error);
    }
    
    // Correct types:
    // i (shop_id), i (user_id), i (inventory_id)
    // s (title), s (description), s (listing_type - was wrongly 'd')
    // d (price), d (original_price), d (min_offer_price)
    // d (auction_start_price), d (auction_reserve_price)
    // s (auction_ends_at - was wrongly 'd'?)
    // s (model), s (brand), s (cond), s (storage), s (color)
    
    // Old: "iiissddddddssssss"
    // New: "iiisssdddddssssss"
    
    $stmt->bind_param("iiisssdddddssssss", 
        $shop_id, $user_id, $data->inventory_id, $title, $description, $listing_type, $price, $original_price, $min_offer_price,
        $auction_start_price, $auction_reserve_price, $auction_ends_at,
        $phone_model, $phone_brand, $phone_condition, $phone_storage, $phone_color
    );
    
    if ($stmt->execute()) {
        $listing_id = $conn->insert_id;
        
        // 6. Handle Images (Optional: If passed as array of URLs)
        if (isset($data->images) && is_array($data->images)) {
            error_log("Processing " . count($data->images) . " images for listing " . $listing_id); // DEBUG
            $img_stmt = $conn->prepare("INSERT INTO marketplace_listing_images (listing_id, image_url, display_order, is_primary) VALUES (?, ?, ?, ?)");
            foreach ($data->images as $index => $url) {
                error_log("Inserting image: " . $url); // DEBUG
                $is_primary = ($index === 0) ? 1 : 0;
                $order = $index;
                $img_stmt->bind_param("isii", $listing_id, $url, $order, $is_primary);
                if (!$img_stmt->execute()) {
                     error_log("Image Insert Failed: " . $img_stmt->error); // DEBUG
                }
            }
        }
        
        // Update profile stats
        $conn->query("UPDATE marketplace_profiles SET total_listings = total_listings + 1 WHERE user_id = $user_id");
        
        // NEW: Mark inventory item as listed to prevent local sales conflict
        $conn->query("UPDATE inventory SET is_listed = 1 WHERE id = " . (int)$data->inventory_id);
        
        echo json_encode(['success' => true, 'message' => 'Listing created successfully', 'listing_id' => $listing_id]);
    } else {
        throw new Exception('Failed to create listing: ' . $conn->error);
    }

} catch (Exception $e) {
    http_response_code(400); // Return 400 for logic/validation errors primarily, or 500 if critical
    // Using 400 for now to ensure frontend displays the message
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Error $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Fatal Error: ' . $e->getMessage()]);
}
?>
