<?php
// backend/api/marketplace/wallet/get_transactions.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json");
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$offset = ($page - 1) * $limit;
$type_filter = isset($_GET['type']) ? $_GET['type'] : 'all';

if ($limit > 100) $limit = 100; // Cap limit

// Map filter type to DB transaction types
$type_where = "";

if ($type_filter !== 'all') {
    switch ($type_filter) {
        case 'fund':
            $type_where = " AND transaction_type = 'fund'";
            break;
        case 'withdraw':
            $type_where = " AND transaction_type = 'withdraw'";
            break;
        case 'purchase':
            $type_where = " AND transaction_type IN ('purchase_hold', 'purchase_release', 'purchase_refund', 'refund', 'bid_hold', 'bid_release')";
            break;
        case 'sale':
            $type_where = " AND transaction_type IN ('sale_pending', 'sale_complete', 'sale_cancelled', 'sale_release')";
            break;
    }
}

// Get total count (filter by user_id only, not shop_id)
$count_query = "SELECT COUNT(*) as total FROM marketplace_wallet_transactions WHERE user_id = ?" . $type_where;
$count_stmt = $conn->prepare($count_query);
$count_stmt->bind_param("i", $user_id);
$count_stmt->execute();
$total_rows = $count_stmt->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_rows / $limit);

// Get transactions (filter by user_id only)
$query = "
    SELECT * 
    FROM marketplace_wallet_transactions 
    WHERE user_id = ? 
    $type_where
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
";

$stmt = $conn->prepare($query);
$stmt->bind_param("iii", $user_id, $limit, $offset);
$stmt->execute();
$result = $stmt->get_result();

$transactions = [];
while ($row = $result->fetch_assoc()) {
    $transactions[] = $row;
}

echo json_encode([
    'success' => true,
    'transactions' => $transactions,
    'pagination' => [
        'current_page' => $page,
        'total_pages' => $total_pages,
        'total_records' => $total_rows,
        'per_page' => $limit
    ]
]);
?>

