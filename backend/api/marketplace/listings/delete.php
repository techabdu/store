<?php
// backend/api/marketplace/listings/delete.php

require_once '../../../config/config.php';
require_once '../../../middleware/api_logger.php'; // API request logging

setCorsHeaders();
header("Content-Type: application/json");

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
    echo json_encode(['success' => false, 'error' => 'Listing ID is required']);
    exit();
}

$listing_id = intval($data->id);
$shop_id = $_SESSION['current_shop_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

try {
    // 1. Verify ownership and existence (strictly scoped)
    $query = "
        SELECT l.id, l.user_id, l.inventory_id, l.status 
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
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("ii", $listing_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Listing not found or access denied. Ensure you are in the correct branch.");
    }

    $listing = $result->fetch_assoc();
    $inventory_id = $listing['inventory_id'];

    $delete_stmt = $conn->prepare("DELETE FROM marketplace_listings WHERE id = ?");
    $delete_stmt->bind_param("i", $listing_id);
    
    if ($delete_stmt->execute()) {
        // Reset is_listed flag in inventory
        if ($inventory_id) {
            $update_inv = $conn->prepare("UPDATE inventory SET is_listed = 0 WHERE id = ?");
            $update_inv->bind_param("i", $inventory_id);
            $update_inv->execute();
        }
        echo json_encode(['success' => true, 'message' => 'Listing deleted successfully']);
    } else {
        throw new Exception("Failed to delete listing: " . $conn->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
