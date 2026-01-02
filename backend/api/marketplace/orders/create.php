<?php
// backend/api/marketplace/orders/create.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once __DIR__ . '/../../../helpers/validation_helper.php'; // Input validation

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
require_once '../../../includes/encryption.php'; // For reference generation
require_once '../messaging/send_system_message.php'; // For automatic notifications

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$buyer_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

// Validate listing_id with proper validation
try {
    $listing_id = validatePositiveInt($data->listing_id ?? null, 'Listing ID');
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit();
}

// Start Transaction
$conn->begin_transaction();

try {
    // 0. Check Verification Status (Buyer must be verified)
    $v_stmt = $conn->prepare("SELECT is_verified FROM marketplace_identity_verifications WHERE user_id = ?");
    $v_stmt->bind_param("i", $buyer_id);
    $v_stmt->execute();
    $v_res = $v_stmt->get_result()->fetch_assoc();

    if (!$v_res || !$v_res['is_verified']) {
        throw new Exception('Your account must be verified before you can make purchases.');
    }

    // 1. Fetch Listing & Validate
    // Use FOR UPDATE to lock the row and prevent double booking
    $stmt = $conn->prepare("SELECT * FROM marketplace_listings WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $listing_id);
    $stmt->execute();
    $listing = $stmt->get_result()->fetch_assoc();

    if (!$listing) {
        throw new Exception('Listing not found');
    }

    if ($listing['status'] !== 'active') { // Assuming 'active' is the available status
        throw new Exception('Listing is not available for purchase');
    }

    if ($listing['user_id'] === $buyer_id) {
        throw new Exception('You cannot buy your own item');
    }

    $seller_id = $listing['user_id'];
    $seller_shop_id = $listing['shop_id']; // Listing has shop_id
    $price = floatval($listing['price']);

    // 2. Check Buyer Balance
    $stmt = $conn->prepare("SELECT w.id, w.available_balance, u.shop_id as user_shop_id FROM marketplace_wallets w JOIN users u ON w.user_id = u.id WHERE w.user_id = ? FOR UPDATE");
    $stmt->bind_param("i", $buyer_id);
    $stmt->execute();
    $buyer_wallet = $stmt->get_result()->fetch_assoc();
    
    // Fallback for buyer_shop_id if not set in users table (use listing shop or default)
    // Ideally we fetch from marketplace_profiles if using that system.
    // Converting simplistic check to robust one:
    require_once '../../../helpers/shop_helper.php';
    $buyer_shop_id = requireShopContext();

    if (!$buyer_wallet) {
         // Should have been created at profile creation, but create if missing?
         // For now throw error
         throw new Exception('Buyer wallet not found');
    }

    if ($buyer_wallet['available_balance'] < $price) {
        throw new Exception('Insufficient wallet balance. Please fund your wallet via Bank Transfer or Card.');
    }

    // 3. Process Payment (Escrow)
    // Debit Buyer: Available -> Held
    $new_buyer_balance = $buyer_wallet['available_balance'] - $price;
    $stmt = $conn->prepare("UPDATE marketplace_wallets SET available_balance = ?, held_balance = held_balance + ?, total_purchases = total_purchases + ? WHERE user_id = ?");
    $stmt->bind_param("dddi", $new_buyer_balance, $price, $price, $buyer_id);
    if (!$stmt->execute()) throw new Exception('Failed to debit buyer');

    // Credit Seller (Pending Balance)
    $stmt = $conn->prepare("UPDATE marketplace_wallets SET pending_balance = pending_balance + ? WHERE user_id = ?");
    $stmt->bind_param("di", $price, $seller_id);
    if (!$stmt->execute()) throw new Exception('Failed to credit seller escrow');

    // 4. Create Order Record
    $order_reference = generateSecureReference('ORD');
    $tenant_id = $_SESSION['tenant_id'] ?? 1;
    $stmt = $conn->prepare("
        INSERT INTO marketplace_orders 
        (tenant_id, buyer_id, seller_id, listing_id, seller_shop_id, buyer_shop_id, order_number, agreed_price, order_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");
    $stmt->bind_param("iiiiiisd", $tenant_id, $buyer_id, $seller_id, $listing_id, $seller_shop_id, $buyer_shop_id, $order_reference, $price);
    if (!$stmt->execute()) throw new Exception('Failed to create order record: ' . $stmt->error);
    $order_id = $conn->insert_id;

    // 5. Update Listing Status
    $stmt = $conn->prepare("UPDATE marketplace_listings SET status = 'sold', sold_at = NOW() WHERE id = ?");
    $stmt->bind_param("i", $listing_id);
    if (!$stmt->execute()) throw new Exception('Failed to update listing status');

    // 5.1 NEW: Update Inventory Status to 'in_transit'
    // This removes it from 'Inventory Value' report immediately as requested.
    $inv_id = $listing['inventory_id'];
    $stmt = $conn->prepare("UPDATE inventory SET status = 'in_transit', is_listed = 0 WHERE id = ?");
    $stmt->bind_param("i", $inv_id);
    if (!$stmt->execute()) throw new Exception('Failed to update inventory status');

    // 6. Log Transactions
    // Get Updated Buyer Balances for log
    $b_bal_stmt = $conn->prepare("SELECT shop_id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $b_bal_stmt->bind_param("i", $buyer_id);
    $b_bal_stmt->execute();
    $b_balances = $b_bal_stmt->get_result()->fetch_assoc();
    $buyer_wallet_shop_id = $b_balances['shop_id'];

    // Buyer Debit Log - Use 'purchase_hold' as funds are in escrow
    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
        VALUES (?, ?, ?, ?, 'purchase_hold', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $desc_buyer = "Purchase of listing #$listing_id";
    $buyer_ref = $order_reference . '_DEBIT';
    $stmt->bind_param("iiiiddddss", 
        $tenant_id,
        $buyer_wallet['id'], 
        $buyer_id, 
        $buyer_wallet_shop_id,
        $price, 
        $b_balances['available_balance'], 
        $b_balances['pending_balance'], 
        $b_balances['held_balance'], 
        $buyer_ref, 
        $desc_buyer
    );
    $stmt->execute();

    // Seller Credit Log (Escrow)
    // Get Updated Seller Balances for log
    $s_bal_stmt = $conn->prepare("SELECT id, shop_id, available_balance, pending_balance, held_balance FROM marketplace_wallets WHERE user_id = ?");
    $s_bal_stmt->bind_param("i", $seller_id);
    $s_bal_stmt->execute();
    $s_wallet_data = $s_bal_stmt->get_result()->fetch_assoc();
    $seller_wallet_id = $s_wallet_data['id'];
    $seller_wallet_shop_id = $s_wallet_data['shop_id'];

    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (tenant_id, wallet_id, user_id, shop_id, transaction_type, amount, available_balance_after, pending_balance_after, held_balance_after, reference_number, description, created_at) 
        VALUES (?, ?, ?, ?, 'sale_pending', ?, ?, ?, ?, ?, ?, NOW())
    ");
    $desc_seller = "Sale of listing #$listing_id (Funds held in Escrow)";
    $seller_escrow_ref = $order_reference . '_ESCROW';
    $stmt->bind_param("iiiiddddss", 
        $tenant_id,
        $seller_wallet_id, 
        $seller_id, 
        $seller_wallet_shop_id,
        $price, 
        $s_wallet_data['available_balance'], 
        $s_wallet_data['pending_balance'], 
        $s_wallet_data['held_balance'], 
        $seller_escrow_ref, 
        $desc_seller
    );
    $stmt->execute();

    // 7. Send Automatic Notification to Seller with Order Card
    // Fetch buyer's name
    $buyer_name_stmt = $conn->prepare("SELECT display_name FROM marketplace_profiles WHERE user_id = ? LIMIT 1");
    $buyer_name_stmt->bind_param("i", $buyer_id);
    $buyer_name_stmt->execute();
    $buyer_profile = $buyer_name_stmt->get_result()->fetch_assoc();
    $buyer_name = $buyer_profile['display_name'] ?? 'A buyer';
    
    // Fetch listing image for the order card
    $img_stmt = $conn->prepare("SELECT image_url FROM marketplace_listing_images WHERE listing_id = ? AND is_primary = 1 LIMIT 1");
    $img_stmt->bind_param("i", $listing_id);
    $img_stmt->execute();
    $img_result = $img_stmt->get_result()->fetch_assoc();
    $listing_image = $img_result['image_url'] ?? null;
    
    // Create notification message
    $notification_message = "$buyer_name placed an order for {$listing['title']}";
    
    // Build order card metadata
    $order_metadata = [
        'order_id' => $order_id,
        'order_number' => $order_reference,
        'listing_id' => $listing_id,
        'title' => $listing['title'],
        'price' => $price,
        'image_url' => $listing_image,
        'condition' => $listing['phone_condition'] ?? 'N/A',
        'brand' => $listing['phone_brand'] ?? '',
        'model' => $listing['phone_model'] ?? '',
        'status' => 'pending'
    ];
    
    // Send order card message (buyer is the sender since they initiated the order)
    sendSystemMessage($conn, $listing_id, $buyer_id, $seller_id, $notification_message, $buyer_id, 'order_card', $order_metadata);

    // 8. Link Order to Conversation
    // Find the conversation for this buyer-seller-listing combination
    $conv_stmt = $conn->prepare("
        SELECT id FROM marketplace_conversations 
        WHERE buyer_id = ? AND seller_id = ? AND listing_id = ?
        LIMIT 1
    ");
    $conv_stmt->bind_param("iii", $buyer_id, $seller_id, $listing_id);
    $conv_stmt->execute();
    $conv_result = $conv_stmt->get_result();
    
    if ($conv_result->num_rows > 0) {
        $conversation = $conv_result->fetch_assoc();
        $conversation_id = $conversation['id'];
        
        // Update conversation with order_id
        $update_conv_stmt = $conn->prepare("
            UPDATE marketplace_conversations 
            SET order_id = ? 
            WHERE id = ?
        ");
        $update_conv_stmt->bind_param("ii", $order_id, $conversation_id);
        $update_conv_stmt->execute();
        $update_conv_stmt->close();
    }
    $conv_stmt->close();

    // Commit
    $conn->commit();

    // Track feature usage
    require_once '../../../helpers/FeatureTracker.php';
    FeatureTracker::track('marketplace', 'place_order', $buyer_id, $tenant_id, $buyer_shop_id);

    echo json_encode([
        'success' => true,
        'message' => 'Order placed successfully. Funds held in escrow.',
        'order_id' => $order_id,
        'order_reference' => $order_reference
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
