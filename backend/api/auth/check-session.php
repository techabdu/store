<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// checkAuth() handles session start, timeout, and validation
// It exits with 401 if invalid
$user = checkAuth();

// Get shop context for multi-branch support
$isOwner = isOwner();
$currentShopId = getCurrentShopId();
$currentShop = $currentShopId ? getShopById($currentShopId) : null;
$shops = $isOwner ? getShopsForTenant() : [];

http_response_code(200);
echo json_encode([
    'success' => true,
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
        'status' => $user['status'],
        'shop_id' => $user['shop_id'] ?? null,
        'is_owner' => $isOwner
    ],
    'shop_context' => [
        'current_shop_id' => $currentShopId,
        'current_shop' => $currentShop,
        'shops' => $shops,
        'is_owner' => $isOwner
    ]
]);
?>
