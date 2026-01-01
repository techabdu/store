<?php
// backend/api/marketplace/messaging/get_conversations.php

// TEMPORARY DEBUG MODE - Remove after fixing the issue
define('DEBUG_MODE', true);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';

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
        $errorMsg = "Database connection not available";
        if (DEBUG_MODE && isset($conn) && $conn->connect_error) {
            $errorMsg .= ": " . $conn->connect_error;
        }
        error_log("get_conversations.php: " . $errorMsg);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $errorMsg]);
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
    // Strictly restrict conversations to the current tenant context.
    if (isset($_SESSION['tenant_id'])) {
        $tenant_id = $_SESSION['tenant_id'];
        $query .= " AND c.tenant_id = ? ";
        $params[] = $tenant_id;
        $types .= "i";
    }

    $query .= " ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    // Prepare statement with error handling
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        $errorMsg = "Failed to prepare query";
        if (DEBUG_MODE) {
            $errorMsg .= ": " . $conn->error;
        }
        error_log("get_conversations.php: " . $errorMsg);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $errorMsg]);
        exit();
    }

    // Bind parameters with error handling
    if (!$stmt->bind_param($types, ...$params)) {
        $errorMsg = "Failed to bind parameters";
        if (DEBUG_MODE) {
            $errorMsg .= ": " . $stmt->error;
        }
        error_log("get_conversations.php: " . $errorMsg);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $errorMsg]);
        exit();
    }

    // Execute with error handling
    if (!$stmt->execute()) {
        $errorMsg = "Failed to execute query";
        if (DEBUG_MODE) {
            $errorMsg .= ": " . $stmt->error;
        }
        error_log("get_conversations.php: " . $errorMsg);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $errorMsg]);
        exit();
    }

    $result = $stmt->get_result();
    if (!$result) {
        $errorMsg = "Failed to get query results";
        if (DEBUG_MODE) {
            $errorMsg .= ": " . $stmt->error;
        }
        error_log("get_conversations.php: " . $errorMsg);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $errorMsg]);
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
    
    // Return error to client (with details in debug mode)
    http_response_code(500);
    $errorMsg = DEBUG_MODE ? $e->getMessage() . " (File: " . $e->getFile() . ", Line: " . $e->getLine() . ")" : 'Internal server error';
    echo json_encode(['success' => false, 'error' => $errorMsg, 'debug_trace' => DEBUG_MODE ? $e->getTraceAsString() : null]);
}
?>
