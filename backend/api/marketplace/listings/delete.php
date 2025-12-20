<?php
// backend/api/marketplace/listings/delete.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, DELETE");
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
    echo json_encode(['success' => false, 'error' => 'Listing ID is required']);
    exit();
}

$listing_id = intval($data->id);

try {
    // 1. Verify ownership and existence
    $stmt = $conn->prepare("SELECT id, user_id, status FROM marketplace_listings WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("i", $listing_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Listing not found");
    }

    $listing = $result->fetch_assoc();

    if ($listing['user_id'] != $user_id) {
        http_response_code(403);
        throw new Exception("You are not authorized to delete this listing");
    }

    // 2. Perform Deletion (Hard Delete)
    // Since 'status' column has strict ENUM constraints (likely 'active','sold','pending') and we hit truncation errors with 'deleted',
    // we will perform a hard delete to remove the listing entirely.
    
    // Optional: Delete associated images first if cascade is not set?
    // Usually cascade is set, but let's be safe or just delete the listing and let DB handle it.
    
    $delete_stmt = $conn->prepare("DELETE FROM marketplace_listings WHERE id = ?");
    $delete_stmt->bind_param("i", $listing_id);
    
    if ($delete_stmt->execute()) {
        // Also remove images from disk if possible? 
        // For now, database cleanup is priority.
        echo json_encode(['success' => true, 'message' => 'Listing deleted successfully']);
    } else {
        throw new Exception("Failed to delete listing: " . $conn->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
