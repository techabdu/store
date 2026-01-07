<?php
// backend/api/marketplace/messaging/get_conversations.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../../middleware/api_logger.php'; // API request logging

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

session_start();

// Wrap entire logic in try-catch for better error handling
try {
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }

    // Verify database connection
    if (!isset($conn) || $conn === null || $conn->connect_error) {
        $errorDetail = isset($conn) && $conn->connect_error ? $conn->connect_error : 'Connection not established';
        error_log("get_conversations.php: Database connection not available - " . $errorDetail);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit();
    }

    $user_id = $_SESSION['user_id'];
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $shop_id = isset($_GET['shop_id']) ? intval($_GET['shop_id']) : ($_SESSION['current_shop_id'] ?? null);

    // Determine if user is buyer or seller in the conv and fetch OTHER party's details
    // Also join Listing to get title/image
    // Use subqueries for profiles to avoid duplication due to multiple profiles per user
    $query = "
        SELECT 
            c.id as conversation_id,
            c.last_message_at,
            c.buyer_id,
            c.seller_id,
            l.id as listing_id,
            l.title as listing_title,
            l.shop_id,
            (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
            
            CASE 
                WHEN c.buyer_id = ? THEN (SELECT display_name FROM marketplace_profiles WHERE user_id = c.seller_id LIMIT 1)
                ELSE (SELECT display_name FROM marketplace_profiles WHERE user_id = c.buyer_id LIMIT 1)
            END as other_party_name,
            
            CASE 
                WHEN c.buyer_id = ? THEN (SELECT profile_image FROM marketplace_profiles WHERE user_id = c.seller_id LIMIT 1)
                ELSE (SELECT profile_image FROM marketplace_profiles WHERE user_id = c.buyer_id LIMIT 1)
            END as other_party_image,
            
            (SELECT message FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT is_read FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_is_read,
            (SELECT sender_id FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id

        FROM marketplace_conversations c
        JOIN marketplace_listings l ON c.listing_id = l.id
    ";

    $params = [$user_id, $user_id, $user_id, $shop_id, $user_id, $shop_id];
    $types = "iiiiii";

    $query .= "
        WHERE (
            (c.buyer_id = ? AND (c.buyer_shop_id = ? OR c.buyer_shop_id IS NULL))
            OR
            (c.seller_id = ? AND l.shop_id = ?)
        )
        AND c.is_archived_by_buyer = 0
        AND c.is_archived_by_seller = 0
    ";

    // Tenant Isolation:
    // We allow users to see any conversation they are a participant in (buyer or seller),
    // regardless of the listing's tenant ID, as they are already restricted by user_id.
    // This allows cross-tenant marketplace interactions.

    $query .= " ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    // Prepare statement with error handling
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        error_log("get_conversations.php: Failed to prepare query - " . $conn->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to prepare query']);
        exit();
    }

    // Bind parameters with error handling
    if (!$stmt->bind_param($types, ...$params)) {
        error_log("get_conversations.php: Failed to bind parameters - " . $stmt->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to bind parameters']);
        exit();
    }

    // Execute with error handling
    if (!$stmt->execute()) {
        error_log("get_conversations.php: Failed to execute query - " . $stmt->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to execute query']);
        exit();
    }

    $result = $stmt->get_result();
    if (!$result) {
        error_log("get_conversations.php: Failed to get result - " . $stmt->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to get query results']);
        exit();
    }

    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        // Add logic to determine if "I" have unread messages
        $row['has_unread'] = ($row['last_message_is_read'] == 0 && $row['last_message_sender_id'] != $user_id);
        $conversations[] = $row;
    }

    $stmt->close();

    echo json_encode(['success' => true, 'conversations' => $conversations]);
    
} catch (Exception $e) {
    // Log the detailed error
    error_log("get_conversations.php: Caught exception - " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine());
    
    // Return generic error to client
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>
