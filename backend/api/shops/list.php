<?php
/**
 * Shop List API
 * GET endpoint to retrieve all shops for current tenant
 * Accessible by: Admin (owner), SuperAdmin
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers
setCorsHeaders();
header('Content-Type: application/json');

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
$user = checkAuth();

// Check role - only admins and superadmins can list shops
checkRole(['admin', 'superadmin']);

try {
    // For owners: return all shops in their tenant
    // For branch managers: return only their shop
    // For superadmin: handle differently (could list all or require tenant_id param)
    
    if ($user['role'] === 'superadmin') {
        // SuperAdmin: optionally filter by tenant_id parameter
        $tenantId = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : null;
        
        if ($tenantId) {
            $stmt = $conn->prepare("
                SELECT s.*, t.shop_name as tenant_name
                FROM shops s
                JOIN tenants t ON s.tenant_id = t.id
                WHERE s.tenant_id = ?
                ORDER BY s.is_main_branch DESC, s.shop_name ASC
            ");
            $stmt->bind_param("i", $tenantId);
        } else {
            // Return empty if no tenant specified
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'shops' => [],
                'message' => 'Specify tenant_id to list shops'
            ]);
            exit;
        }
    } else if (isOwner()) {
        // Owner: get all shops for tenant
        $stmt = $conn->prepare("
            SELECT id, shop_name, shop_address, shop_phone, shop_email, 
                   business_capital, status, is_main_branch, created_at, updated_at
            FROM shops 
            WHERE tenant_id = ?
            ORDER BY is_main_branch DESC, shop_name ASC
        ");
        $stmt->bind_param("i", $_SESSION['tenant_id']);
    } else {
        // Branch manager: get only their shop
        $stmt = $conn->prepare("
            SELECT id, shop_name, shop_address, shop_phone, shop_email, 
                   business_capital, status, is_main_branch, created_at, updated_at
            FROM shops 
            WHERE id = ?
        ");
        $stmt->bind_param("i", $_SESSION['user_shop_id']);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $shops = [];
    while ($row = $result->fetch_assoc()) {
        $shops[] = [
            'id' => (int)$row['id'],
            'shop_name' => $row['shop_name'],
            'shop_address' => $row['shop_address'],
            'shop_phone' => $row['shop_phone'],
            'shop_email' => $row['shop_email'],
            'business_capital' => (float)$row['business_capital'],
            'status' => $row['status'],
            'is_main_branch' => (bool)$row['is_main_branch'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'] ?? null
        ];
    }
    $stmt->close();
    
    // Get current shop info for context
    $currentShopId = getCurrentShopId();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'shops' => $shops,
        'current_shop_id' => $currentShopId,
        'is_owner' => isOwner(),
        'total' => count($shops)
    ]);
    
} catch (Exception $e) {
    error_log("Shop list error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve shops']);
}

$conn->close();
?>
