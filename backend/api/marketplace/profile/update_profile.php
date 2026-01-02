<?php
// backend/api/marketplace/profile/update_profile.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->shop_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Shop ID is required']);
    exit();
}

$shop_id = $data->shop_id;

// Validate shop ownership
// Get user's tenant_id
$user_stmt = $conn->prepare("SELECT tenant_id FROM users WHERE id = ?");
$user_stmt->bind_param("i", $user_id);
$user_stmt->execute();
$user_res = $user_stmt->get_result();

if ($user_res->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'User not found']);
    exit();
}

$user_row = $user_res->fetch_assoc();
$tenant_id = $user_row['tenant_id'];

$check_shop = $conn->prepare("SELECT id FROM shops WHERE id = ? AND tenant_id = ?");
$check_shop->bind_param("ii", $shop_id, $tenant_id);
$check_shop->execute();
if ($check_shop->get_result()->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'You do not have permission to edit this shop']);
    exit();
}

$conn->begin_transaction();

try {
    // 1. Update Shop Details (Name, Phone, Address/Location)
    $shop_updates = [];
    $shop_types = "";
    $shop_params = [];

    if (isset($data->business_name)) {
        $shop_updates[] = "shop_name = ?";
        $shop_types .= "s";
        $shop_params[] = trim($data->business_name);
    }

    if (isset($data->phone)) {
        $shop_updates[] = "shop_phone = ?";
        $shop_types .= "s";
        $shop_params[] = trim($data->phone);
    }

    if (isset($data->location)) {
        $shop_updates[] = "shop_address = ?";
        $shop_types .= "s";
        $shop_params[] = trim($data->location);
    }

    if (!empty($shop_updates)) {
        $shop_types .= "i";
        $shop_params[] = $shop_id;
        $sql_shop = "UPDATE shops SET " . implode(", ", $shop_updates) . " WHERE id = ?";
        $stmt_shop = $conn->prepare($sql_shop);
        $stmt_shop->bind_param($shop_types, ...$shop_params);
        if (!$stmt_shop->execute()) {
            throw new Exception("Failed to update shop details: " . $stmt_shop->error);
        }
    }

    // 2. Update Marketplace Profile Details (Bio)
    // Note: display_name in marketplace_profiles could be different from shop_name, but usually they should align or display_name is the user's name.
    // Based on UI 'Business Name' -> likely maps to Shop Name. 
    // Bio is likely in marketplace_profiles.
    
    $profile_updates = [];
    $profile_types = "";
    $profile_params = [];

    if (isset($data->bio)) {
        $profile_updates[] = "bio = ?";
        $profile_types .= "s";
        $profile_params[] = trim($data->bio);
    }
    
    // Also sync display_name if business_name is changed, to keep them consistent if that's the desired behavior
    if (isset($data->business_name)) {
        $profile_updates[] = "display_name = ?";
        $profile_types .= "s";
        $profile_params[] = trim($data->business_name);
    }

    if (!empty($profile_updates)) {
        $profile_types .= "ii";
        $profile_params[] = $user_id;
        $profile_params[] = $shop_id;
        
        // We update where user_id matches AND shop_id matches to be precise
        $sql_profile = "UPDATE marketplace_profiles SET " . implode(", ", $profile_updates) . " WHERE user_id = ? AND shop_id = ?";
        $stmt_profile = $conn->prepare($sql_profile);
        $stmt_profile->bind_param($profile_types, ...$profile_params);
        if (!$stmt_profile->execute()) {
             throw new Exception("Failed to update profile details: " . $stmt_profile->error);
        }
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);

} catch (Exception $e) {
    $conn->rollback();
    error_log("update_profile.php Error: " . $e->getMessage() . " | " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal server error occurred. Please try again later.']);
}
?>
