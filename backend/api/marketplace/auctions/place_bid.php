<?php
// backend/api/marketplace/auctions/place_bid.php

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

if (!isset($data->listing_id) || !isset($data->bid_amount)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Listing ID and bid amount required']);
    exit();
}

$listing_id = intval($data->listing_id);
$bid_amount = floatval($data->bid_amount);

$conn->begin_transaction();

try {
    // 1. Fetch Listing (Lock row)
    $stmt = $conn->prepare("SELECT * FROM marketplace_listings WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $listing_id);
    $stmt->execute();
    $listing = $stmt->get_result()->fetch_assoc();

    if (!$listing) {
        throw new Exception('Listing not found');
    }

    if ($listing['listing_type'] !== 'auction') {
        throw new Exception('This item is not for auction');
    }

    if ($listing['status'] !== 'active') {
        throw new Exception('Auction is not active');
    }

    if (strtotime($listing['auction_ends_at']) < time()) {
        throw new Exception('Auction has ended');
    }

    if ($listing['user_id'] === $user_id) {
        throw new Exception('You cannot bid on your own auction');
    }

    // 2. Validate Bid Amount
    // Must be higher than current price (which tracks highest bid)
    // If no bids, must be >= start price
    $current_price = floatval($listing['price']); // price column updates with highest bid
    $start_price = floatval($listing['auction_start_price']);
    
    // Determine strict minimum
    // If bids exist, must be > current. If no bids, must be >= start.
    // We can check if price == start_price. But price might update.
    // Simpler: Just check > current_price. (If no bids, current_price should start at start_price).
    
    if ($bid_amount <= $current_price) {
        throw new Exception("Bid must be higher than current price of NGN " . number_format($current_price, 2));
    }

    // 3. Check Wallet Balance
    $w_stmt = $conn->prepare("SELECT id, available_balance FROM marketplace_wallets WHERE user_id = ? FOR UPDATE");
    $w_stmt->bind_param("i", $user_id);
    $w_stmt->execute();
    $wallet = $w_stmt->get_result()->fetch_assoc();

    if ($wallet['available_balance'] < $bid_amount) {
        throw new Exception('Insufficient available balance to place this bid');
    }

    // 4. Handle Previous Highest Bidder (Refund them)
    // Check if there's a previous bid
    $prev_bid_stmt = $conn->prepare("SELECT id, user_id, bid_amount FROM marketplace_auction_bids WHERE listing_id = ? ORDER BY bid_amount DESC LIMIT 1");
    $prev_bid_stmt->bind_param("i", $listing_id);
    $prev_bid_stmt->execute();
    $prev_bid = $prev_bid_stmt->get_result()->fetch_assoc();

    if ($prev_bid) {
        // Refund previous bidder
        $prev_user_id = $prev_bid['user_id'];
        $refund_amount = $prev_bid['bid_amount'];
        
        $ref_stmt = $conn->prepare("UPDATE marketplace_wallets SET available_balance = available_balance + ?, held_balance = held_balance - ? WHERE user_id = ?");
        $ref_stmt->bind_param("ddi", $refund_amount, $refund_amount, $prev_user_id);
        if (!$ref_stmt->execute()) throw new Exception("Failed to refund previous bidder");
        
        // Log Refund
        // (Optional: can reduce log noise by skipping log, or log as 'outbid_refund')
    }

    // 5. Place New Bid (Hold Funds)
    // Debit Available, Credit Held
    $hold_stmt = $conn->prepare("UPDATE marketplace_wallets SET available_balance = available_balance - ?, held_balance = held_balance + ? WHERE id = ?");
    $hold_stmt->bind_param("ddi", $bid_amount, $bid_amount, $wallet['id']);
    if (!$hold_stmt->execute()) throw new Exception("Failed to hold bid funds");

    // Insert Bid Record
    $bid_stmt = $conn->prepare("INSERT INTO marketplace_auction_bids (listing_id, user_id, bid_amount, created_at) VALUES (?, ?, ?, NOW())");
    $bid_stmt->bind_param("iid", $listing_id, $user_id, $bid_amount);
    $bid_stmt->execute();

    // 6. Update Listing Price
    $up_stmt = $conn->prepare("UPDATE marketplace_listings SET price = ? WHERE id = ?");
    $up_stmt->bind_param("di", $bid_amount, $listing_id);
    $up_stmt->execute();

    $conn->commit();
    
    echo json_encode(['success' => true, 'message' => 'Bid placed successfully']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
