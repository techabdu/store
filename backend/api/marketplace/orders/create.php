<?php
// backend/api/marketplace/orders/create.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';
require_once '../../../includes/encryption.php'; // For reference generation

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$buyer_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->listing_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Listing ID required']);
    exit();
}

$listing_id = intval($data->listing_id);

// Start Transaction
$conn->begin_transaction();

try {
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
    $buyer_shop_id = $buyer_wallet['user_shop_id'] ?? 1; // Default to 1 (Main Shop) if null

    if (!$buyer_wallet) {
         // Should have been created at profile creation, but create if missing?
         // For now throw error
         throw new Exception('Buyer wallet not found');
    }

    if ($buyer_wallet['available_balance'] < $price) {
        throw new Exception('Insufficient wallet balance. Please fund your wallet via Bank Transfer or Card.');
    }

    // 3. Process Payment (Escrow)
    // Debit Buyer
    $new_buyer_balance = $buyer_wallet['available_balance'] - $price;
    $stmt = $conn->prepare("UPDATE marketplace_wallets SET available_balance = ?, total_purchases = total_purchases + ? WHERE user_id = ?");
    $stmt->bind_param("ddi", $new_buyer_balance, $price, $buyer_id);
    if (!$stmt->execute()) throw new Exception('Failed to debit buyer');

    // Credit Seller (Pending Balance)
    $stmt = $conn->prepare("UPDATE marketplace_wallets SET pending_balance = pending_balance + ? WHERE user_id = ?");
    $stmt->bind_param("di", $price, $seller_id);
    if (!$stmt->execute()) throw new Exception('Failed to credit seller escrow');

    // 4. Create Order Record
    $order_reference = generateSecureReference('ORD');
    $stmt = $conn->prepare("
        INSERT INTO marketplace_orders 
        (buyer_id, seller_id, listing_id, seller_shop_id, buyer_shop_id, order_number, agreed_price, order_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");
    $stmt->bind_param("iiiiisd", $buyer_id, $seller_id, $listing_id, $seller_shop_id, $buyer_shop_id, $order_reference, $price);
    if (!$stmt->execute()) throw new Exception('Failed to create order record: ' . $stmt->error);
    $order_id = $conn->insert_id;

    // 5. Update Listing Status
    $stmt = $conn->prepare("UPDATE marketplace_listings SET status = 'sold' WHERE id = ?");
    $stmt->bind_param("i", $listing_id);
    if (!$stmt->execute()) throw new Exception('Failed to update listing status');

    // 6. Log Transactions
    // Buyer Debit Log
    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (wallet_id, user_id, transaction_type, amount, reference, status, description, created_at)
        VALUES (?, ?, 'purchase', ?, ?, 'completed', ?, NOW())
    ");
    $desc_buyer = "Purchase of listing #$listing_id";
    $stmt->bind_param("iids", $buyer_wallet['id'], $buyer_id, $price, $order_reference, $desc_buyer);
    $stmt->execute();

    // Seller Credit Log (Escrow)
    // We need seller wallet ID
    $s_wallet_stmt = $conn->prepare("SELECT id FROM marketplace_wallets WHERE user_id = ?");
    $s_wallet_stmt->bind_param("i", $seller_id);
    $s_wallet_stmt->execute();
    $seller_wallet = $s_wallet_stmt->get_result()->fetch_assoc();
    $seller_wallet_id = $seller_wallet['id']; // Assumes exists

    $stmt = $conn->prepare("
        INSERT INTO marketplace_wallet_transactions 
        (wallet_id, user_id, transaction_type, amount, reference, status, description, created_at)
        VALUES (?, ?, 'sale_escrow', ?, ?, 'pending', ?, NOW())
    ");
    $desc_seller = "Sale of listing #$listing_id (Funds held in Escrow)";
    $stmt->bind_param("iids", $seller_wallet_id, $seller_id, $price, $order_reference, $desc_seller);
    $stmt->execute();

    // Commit
    $conn->commit();

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
