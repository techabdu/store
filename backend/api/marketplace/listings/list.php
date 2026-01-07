<?php
// backend/api/marketplace/listings/list.php

require_once '../../../config/config.php';
require_once '../../../middleware/api_logger.php'; // API request logging

setCorsHeaders();
header("Content-Type: application/json");

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
$filters = ["l.status = 'active'"];
$types = "";
$params = [];

// Shop and Tenant Filtering (Optional)
// Only filter if explicitly requested - User wants general listings to be public/global
if (isset($_GET['scope']) && $_GET['scope'] === 'shop' && isset($_SESSION['current_shop_id'])) {
    $filters[] = "l.shop_id = ?";
    $types .= "i";
    $params[] = $_SESSION['current_shop_id'];
} elseif (isset($_GET['scope']) && $_GET['scope'] === 'tenant' && isset($_SESSION['tenant_id'])) {
    $filters[] = "s.tenant_id = ?";
    $types .= "i";
    $params[] = $_SESSION['tenant_id'];
} elseif (isset($_GET['shop_id']) && !empty($_GET['shop_id'])) {
    // Explicit shop filter from frontend
    $filters[] = "l.shop_id = ?";
    $types .= "i";
    $params[] = intval($_GET['shop_id']);
}

// User Filter (for "My Listings")
if (isset($_GET['user_id'])) {
    $current_shop_id = $_SESSION['current_shop_id'] ?? null;
    if ($_GET['user_id'] === 'me') {
        $filters[] = "l.user_id = ?";
        $types .= "i";
        $params[] = $_SESSION['user_id'];
        
        // Enforce shop isolation for "My Listings"
        if ($current_shop_id) {
            $filters[] = "l.shop_id = ?";
            $types .= "i";
            $params[] = $current_shop_id;
        }
    } else {
        $filters[] = "l.user_id = ?";
        $types .= "i";
        $params[] = intval($_GET['user_id']);
    }
}

// Price Range
if (isset($_GET['min_price']) && $_GET['min_price'] !== '') {
    $filters[] = "l.price >= ?";
    $types .= "d";
    $params[] = floatval($_GET['min_price']);
}
if (isset($_GET['max_price']) && $_GET['max_price'] !== '') {
    $filters[] = "l.price <= ?";
    $types .= "d";
    $params[] = floatval($_GET['max_price']);
}

// Brand/Model
if (isset($_GET['brand']) && $_GET['brand'] !== '') {
    $filters[] = "l.phone_brand LIKE ?";
    $types .= "s";
    $params[] = "%" . $_GET['brand'] . "%";
}

// Condition
if (isset($_GET['condition']) && $_GET['condition'] !== '') {
    $filters[] = "l.phone_condition = ?";
    $types .= "s";
    $params[] = $_GET['condition'];
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


try {
    // Count Total
    $count_query = "SELECT COUNT(*) as total FROM marketplace_listings l JOIN shops s ON l.shop_id = s.id WHERE $where_clause";
    $stmt = $conn->prepare($count_query);
    if (!$stmt) {
        throw new Exception("Count Prepare failed: " . $conn->error);
    }
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    if (!$stmt->execute()) {
        throw new Exception("Count Execute failed: " . $stmt->error);
    }
    $total_rows = $stmt->get_result()->fetch_assoc()['total'];
    $total_pages = ceil($total_rows / $limit);


    // Fetch Listings
    // Randomization support: Use seed for consistent random order within a session
    $order_clause = "ORDER BY l.created_at DESC";
    
    if (isset($_GET['random']) && $_GET['random'] === 'true') {
        // Use seed for deterministic randomization (same seed = same order)
        $seed = isset($_GET['seed']) ? intval($_GET['seed']) : time();
        $order_clause = "ORDER BY RAND($seed)";
    }
    
    $query = "
        SELECT 
            l.id, l.title, l.price, l.listing_type, l.phone_model, l.phone_brand, l.phone_condition, l.created_at,
            s.shop_name as shop_name, s.shop_address,
            (SELECT image_url FROM marketplace_listing_images WHERE listing_id = l.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as image_url
        FROM marketplace_listings l
        JOIN shops s ON l.shop_id = s.id
        WHERE $where_clause
        $order_clause
        LIMIT ? OFFSET ?
    ";

    // Add pagination params
    $types .= "ii";
    $params[] = $limit;
    $params[] = $offset;


    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Query Prepare failed: " . $conn->error);
    }
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    if (!$stmt->execute()) {
        throw new Exception("Query Execute failed: " . $stmt->error);
    }
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

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
