<?php
// backend/api/marketplace/listings/list.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
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

// Filters
$filters = ["status = 'active'"];
$types = "";
$params = [];

// Shop Filter
if (isset($_GET['shop_id']) && !empty($_GET['shop_id'])) {
    $filters[] = "l.shop_id = ?";
    $types .= "i";
    $params[] = intval($_GET['shop_id']);
}

// Price Range
if (isset($_GET['min_price'])) {
    $filters[] = "l.price >= ?";
    $types .= "d";
    $params[] = floatval($_GET['min_price']);
}
if (isset($_GET['max_price'])) {
    $filters[] = "l.price <= ?";
    $types .= "d";
    $params[] = floatval($_GET['max_price']);
}

// Brand/Model
if (isset($_GET['brand'])) {
    $filters[] = "l.phone_brand LIKE ?";
    $types .= "s";
    $params[] = "%" . $_GET['brand'] . "%";
}

// Search (Title, Description, Model)
if (isset($_GET['q'])) {
    $filters[] = "(l.title LIKE ? OR l.description LIKE ? OR l.phone_model LIKE ?)";
    $types .= "sss";
    $term = "%" . $_GET['q'] . "%";
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
}

$where_clause = implode(" AND ", $filters);

// Pagination
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$offset = ($page - 1) * $limit;

if ($limit > 100) $limit = 100;

// Count Total
$count_query = "SELECT COUNT(*) as total FROM marketplace_listings l WHERE $where_clause";
$stmt = $conn->prepare($count_query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$total_rows = $stmt->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_rows / $limit);

// Fetch Listings
$query = "
    SELECT 
        l.id, l.title, l.price, l.listing_type, l.phone_model, l.phone_brand, l.phone_condition, l.created_at,
        s.name as shop_name,
        (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as thumbnail
    FROM marketplace_listings l
    JOIN shops s ON l.shop_id = s.id
    WHERE $where_clause
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
";

// Add pagination params
$types .= "ii";
$params[] = $limit;
$params[] = $offset;

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$listings = [];
while ($row = $result->fetch_assoc()) {
    $listings[] = $row;
}

echo json_encode([
    'success' => true,
    'listings' => $listings,
    'pagination' => [
        'current_page' => $page,
        'total_pages' => $total_pages,
        'total_records' => $total_rows
    ]
]);
?>
