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
$shop_id = $_SESSION['current_shop_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$offset = ($page - 1) * $limit;
$type_filter = isset($_GET['type']) ? $_GET['type'] : 'all';

if ($limit > 100) $limit = 100;

// Filters
$where = ["user_id = ?"];
$params = [$user_id];
$types = "i";

if ($tenant_id) {
    // If tenant_id is added to table, use it. Otherwise join with shops.
    // For now, let's assume we use the tenant_id from our schema update or join.
    $where[] = "EXISTS (SELECT 1 FROM shops s WHERE s.id = marketplace_wallet_transactions.shop_id AND s.tenant_id = ?)";
    $params[] = $tenant_id;
    $types .= "i";
}

// User requested branch isolation
if ($shop_id) {
    $where[] = "shop_id = ?";
    $params[] = $shop_id;
    $types .= "i";
}

if ($type_filter !== 'all') {
    switch ($type_filter) {
        case 'fund':
            $where[] = "transaction_type = 'fund'";
            break;
        case 'withdraw':
            $where[] = "transaction_type = 'withdraw'";
            break;
        case 'purchase':
            $where[] = "transaction_type IN ('purchase_hold', 'purchase_release', 'purchase_refund', 'refund', 'bid_hold', 'bid_release')";
            break;
        case 'sale':
            $where[] = "transaction_type IN ('sale_pending', 'sale_complete', 'sale_cancelled', 'sale_release')";
            break;
    }
}

$where_clause = implode(" AND ", $where);

// Get total count
$count_query = "SELECT COUNT(*) as total FROM marketplace_wallet_transactions WHERE $where_clause";
$count_stmt = $conn->prepare($count_query);
$count_stmt->bind_param($types, ...$params);
$count_stmt->execute();
$total_rows = $count_stmt->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_rows / $limit);

// Get transactions
$query = "
    SELECT * 
    FROM marketplace_wallet_transactions 
    WHERE $where_clause
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
";

$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($query);
$stmt->bind_param($types, ...$params);
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

