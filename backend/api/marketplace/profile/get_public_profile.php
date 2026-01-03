<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../../config/db_connect.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if ($user_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid User ID']);
    exit;
}

try {
    // Fetch profile details including shop address if available
    // Added miv.first_name and miv.last_name to get verified identity name
    $query = "SELECT 
                mp.display_name,
                mp.bio,
                mp.profile_image,
                mp.average_rating,
                mp.total_reviews,
                mp.total_sales,
                mp.total_listings,
                mp.is_verified,
                mp.created_at as joined_at,
                s.shop_name,
                s.shop_address,
                s.shop_phone,
                u.email,
                miv.first_name,
                miv.last_name
              FROM marketplace_profiles mp
              JOIN users u ON mp.user_id = u.id
              LEFT JOIN shops s ON mp.shop_id = s.id
              LEFT JOIN marketplace_identity_verifications miv ON mp.user_id = miv.user_id
              WHERE mp.user_id = ?
              ORDER BY (mp.shop_id IS NOT NULL) DESC, mp.updated_at DESC
              LIMIT 1";

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("i", $user_id);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }

    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $profile = $result->fetch_assoc();
        
        echo json_encode([
            'success' => true,
            'profile' => $profile
        ]);
    } else {
         http_response_code(404);
         echo json_encode(['success' => false, 'message' => 'Seller profile not found']);
    }

} catch (Exception $e) {
    error_log("get_public_profile.php Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal Server Error']);
}
?>
