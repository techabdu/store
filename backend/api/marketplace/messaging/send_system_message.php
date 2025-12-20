<?php
// backend/api/marketplace/messaging/send_system_message.php
// Helper function to send automatic system messages (not called directly via HTTP)

require_once '../../../config/db_connect.php';

/**
 * Send an automatic system message in a marketplace conversation
 * Creates conversation if it doesn't exist
 * 
 * @param mysqli $conn Database connection
 * @param int $listing_id Listing ID
 * @param int $buyer_id Buyer user ID
 * @param int $seller_id Seller user ID
 * @param string $message_text Message content
 * @param int $sender_id ID of the user sending the message (buyer or seller)
 * @return bool Success status
 */
function sendSystemMessage($conn, $listing_id, $buyer_id, $seller_id, $message_text, $sender_id) {
    try {
        // 1. Check if conversation already exists
        $c_stmt = $conn->prepare("SELECT id FROM marketplace_conversations WHERE listing_id = ? AND buyer_id = ?");
        $c_stmt->bind_param("ii", $listing_id, $buyer_id);
        $c_stmt->execute();
        $existing = $c_stmt->get_result()->fetch_assoc();
        
        if ($existing) {
            $conversation_id = $existing['id'];
        } else {
            // 2. Create new conversation
            $new_stmt = $conn->prepare("INSERT INTO marketplace_conversations (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)");
            $new_stmt->bind_param("iii", $listing_id, $buyer_id, $seller_id);
            if (!$new_stmt->execute()) {
                return false;
            }
            $conversation_id = $conn->insert_id;
        }
        
        // 3. Determine receiver_id (opposite of sender)
        $receiver_id = ($sender_id === $buyer_id) ? $seller_id : $buyer_id;
        
        // 4. Send the message
        $msg_stmt = $conn->prepare("INSERT INTO marketplace_messages (conversation_id, sender_id, receiver_id, message, is_read) VALUES (?, ?, ?, ?, 0)");
        $msg_stmt->bind_param("iiis", $conversation_id, $sender_id, $receiver_id, $message_text);
        
        if (!$msg_stmt->execute()) {
            return false;
        }
        
        // 5. Update conversation timestamp
        $conn->query("UPDATE marketplace_conversations SET last_message_at = NOW() WHERE id = $conversation_id");
        
        // 6. Unarchive for both parties
        $conn->query("UPDATE marketplace_conversations SET is_archived_by_buyer = 0, is_archived_by_seller = 0 WHERE id = $conversation_id");
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error sending system message: " . $e->getMessage());
        return false;
    }
}
?>
