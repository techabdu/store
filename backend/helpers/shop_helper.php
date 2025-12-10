<?php
/**
 * Shop Helper Functions
 * 
 * Provides utility functions for multi-branch shop management.
 * Handles shop context, access verification, and shop-scoped queries.
 */

/**
 * Get the current shop ID from session
 * 
 * For owners (shop_id = NULL in users table), uses current_shop_id from session.
 * For branch managers/staff, uses their assigned shop_id.
 * 
 * @return int|null Shop ID or null if not set
 * @throws Exception If shop context cannot be determined for non-superadmin
 */
function getCurrentShopId() {
    // SuperAdmin doesn't need shop context (platform level)
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'superadmin') {
        return null;
    }
    
    // Check if user has an assigned shop (branch manager or staff)
    if (isset($_SESSION['user_shop_id']) && $_SESSION['user_shop_id'] !== null) {
        return $_SESSION['user_shop_id'];
    }
    
    // Owner-level user: use current_shop_id from session
    if (isset($_SESSION['current_shop_id']) && $_SESSION['current_shop_id'] !== null) {
        return $_SESSION['current_shop_id'];
    }
    
    // No shop context - this is an error for data queries
    return null;
}

/**
 * Check if current user is an owner (has access to all shops)
 * 
 * @return bool True if user is owner (admin with shop_id = NULL)
 */
function isOwner() {
    // Must have role set
    if (!isset($_SESSION['role'])) {
        return false;
    }
    
    // Owner = admin role with no specific shop assignment (shop_id is NULL)
    // Note: Use array_key_exists because isset() returns false for NULL values
    $hasShopIdKey = array_key_exists('user_shop_id', $_SESSION);
    $shopIdIsNull = $hasShopIdKey && $_SESSION['user_shop_id'] === null;
    
    return $_SESSION['role'] === 'admin' && $shopIdIsNull;
}

/**
 * Check if current user is a branch manager (admin with specific shop)
 * 
 * @return bool True if user is branch manager
 */
function isBranchManager() {
    // Must have role set
    if (!isset($_SESSION['role'])) {
        return false;
    }
    
    // Branch manager = admin role with specific shop assignment (shop_id is NOT NULL)
    $hasShopIdKey = array_key_exists('user_shop_id', $_SESSION);
    $hasShopId = $hasShopIdKey && $_SESSION['user_shop_id'] !== null;
    
    return $_SESSION['role'] === 'admin' && $hasShopId;
}

/**
 * Verify user has access to a specific shop
 * 
 * @param int $shopId Shop ID to check access for
 * @return bool True if user has access
 */
function verifyShopAccess($shopId) {
    global $conn;
    
    // SuperAdmin has access to all shops
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'superadmin') {
        return true;
    }
    
    // Check tenant_id matches
    if (!isset($_SESSION['tenant_id'])) {
        return false;
    }
    
    // Verify shop belongs to user's tenant
    $stmt = $conn->prepare("SELECT id FROM shops WHERE id = ? AND tenant_id = ?");
    $stmt->bind_param("ii", $shopId, $_SESSION['tenant_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        return false;
    }
    $stmt->close();
    
    // If user has specific shop assignment, verify it matches
    if (isset($_SESSION['user_shop_id']) && $_SESSION['user_shop_id'] !== null) {
        return $_SESSION['user_shop_id'] == $shopId;
    }
    
    // Owner can access all shops in their tenant
    return true;
}

/**
 * Require shop context for data operations
 * Exits with 400 if no shop context is set
 * 
 * @return int The current shop ID
 */
function requireShopContext() {
    $shopId = getCurrentShopId();
    
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'No shop context. Please select a branch.'
        ]);
        exit;
    }
    
    return $shopId;
}

/**
 * Get list of shops for current tenant
 * 
 * @return array List of shops
 */
function getShopsForTenant() {
    global $conn;
    
    if (!isset($_SESSION['tenant_id'])) {
        return [];
    }
    
    $stmt = $conn->prepare("
        SELECT id, shop_name, shop_address, shop_phone, shop_email, 
               business_capital, status, is_main_branch, created_at
        FROM shops 
        WHERE tenant_id = ?
        ORDER BY is_main_branch DESC, shop_name ASC
    ");
    $stmt->bind_param("i", $_SESSION['tenant_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $shops = [];
    while ($row = $result->fetch_assoc()) {
        $shops[] = $row;
    }
    $stmt->close();
    
    return $shops;
}

/**
 * Get main branch for a tenant
 * 
 * @param int|null $tenantId Tenant ID (uses session if null)
 * @return array|null Main shop data or null
 */
function getMainBranch($tenantId = null) {
    global $conn;
    
    if ($tenantId === null) {
        if (!isset($_SESSION['tenant_id'])) {
            return null;
        }
        $tenantId = $_SESSION['tenant_id'];
    }
    
    $stmt = $conn->prepare("
        SELECT id, shop_name, shop_address, shop_phone, shop_email, 
               business_capital, status, is_main_branch, created_at
        FROM shops 
        WHERE tenant_id = ? AND is_main_branch = 1
        LIMIT 1
    ");
    $stmt->bind_param("i", $tenantId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $shop = $result->fetch_assoc();
    $stmt->close();
    
    return $shop;
}

/**
 * Get shop by ID with tenant verification
 * 
 * @param int $shopId Shop ID
 * @return array|null Shop data or null if not found/unauthorized
 */
function getShopById($shopId) {
    global $conn;
    
    // Build query based on role
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'superadmin') {
        $stmt = $conn->prepare("
            SELECT s.*, t.shop_name as tenant_name, t.shop_email as tenant_email
            FROM shops s
            JOIN tenants t ON s.tenant_id = t.id
            WHERE s.id = ?
        ");
        $stmt->bind_param("i", $shopId);
    } else {
        if (!isset($_SESSION['tenant_id'])) {
            return null;
        }
        $stmt = $conn->prepare("
            SELECT * FROM shops 
            WHERE id = ? AND tenant_id = ?
        ");
        $stmt->bind_param("ii", $shopId, $_SESSION['tenant_id']);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $shop = $result->fetch_assoc();
    $stmt->close();
    
    return $shop;
}

/**
 * Set the current shop context in session
 * Only for owners (admins with shop_id = NULL)
 * 
 * @param int $shopId Shop ID to switch to
 * @return bool Success status
 */
function setCurrentShop($shopId) {
    // Verify user can switch shops (must be owner)
    if (!isOwner()) {
        return false;
    }
    
    // Verify shop belongs to user's tenant
    if (!verifyShopAccess($shopId)) {
        return false;
    }
    
    $_SESSION['current_shop_id'] = $shopId;
    return true;
}

/**
 * Initialize shop context for user after login
 * Sets appropriate shop context based on user type
 * 
 * @param array $userData User data from database
 * @return array Shop context data
 */
function initializeShopContext($userData) {
    global $conn;
    
    $result = [
        'is_owner' => false,
        'current_shop_id' => null,
        'shops' => [],
        'current_shop' => null
    ];
    
    // SuperAdmin doesn't need shop context
    if ($userData['role'] === 'superadmin') {
        return $result;
    }
    
    // Store user's assigned shop (null for owners)
    $_SESSION['user_shop_id'] = $userData['shop_id'];
    
    if ($userData['shop_id'] !== null) {
        // Branch manager or staff - set their shop as current
        $_SESSION['current_shop_id'] = $userData['shop_id'];
        $result['current_shop_id'] = $userData['shop_id'];
        $result['current_shop'] = getShopById($userData['shop_id']);
    } else if ($userData['role'] === 'admin') {
        // Owner - get all shops and set main branch as default
        $result['is_owner'] = true;
        $result['shops'] = getShopsForTenant();
        
        // Default to main branch
        $mainBranch = getMainBranch();
        if ($mainBranch) {
            $_SESSION['current_shop_id'] = $mainBranch['id'];
            $result['current_shop_id'] = $mainBranch['id'];
            $result['current_shop'] = $mainBranch;
        } else if (!empty($result['shops'])) {
            // Fallback to first shop
            $_SESSION['current_shop_id'] = $result['shops'][0]['id'];
            $result['current_shop_id'] = $result['shops'][0]['id'];
            $result['current_shop'] = $result['shops'][0];
        }
    }
    
    return $result;
}
?>
