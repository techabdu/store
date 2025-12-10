<?php
/**
 * Shop Update API
 * PUT endpoint to update an existing branch shop
 * Accessible by: Admin (owner for any shop, branch manager for their shop), SuperAdmin
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';
require_once '../../helpers/activity_log.php';
require_once '../../helpers/sanitize.php';
require_once '../../helpers/csrf.php';

// Set CORS headers
setCorsHeaders();
header('Content-Type: application/json');

// Only allow PUT
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
$user = checkAuth();

// Check role
checkRole(['admin', 'superadmin']);

// Verify CSRF
requireCsrf();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Shop ID is required
if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Shop ID is required']);
    exit;
}

$shopId = intval($input['id']);

// Verify access to this shop
if (!verifyShopAccess($shopId)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'You do not have access to this branch']);
    exit;
}

// Get existing shop
$existingShop = getShopById($shopId);
if (!$existingShop) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Branch not found']);
    exit;
}

try {
    // Build update query dynamically based on provided fields
    $updates = [];
    $params = [];
    $types = '';
    
    if (isset($input['shop_name']) && trim($input['shop_name']) !== '') {
        $newName = sanitizeInput($input['shop_name']);
        
        // Check if name is unique within tenant
        $tenantId = $existingShop['tenant_id'];
        $checkName = $conn->prepare("SELECT id FROM shops WHERE shop_name = ? AND tenant_id = ? AND id != ?");
        $checkName->bind_param("sii", $newName, $tenantId, $shopId);
        $checkName->execute();
        if ($checkName->get_result()->num_rows > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'A branch with this name already exists']);
            $checkName->close();
            exit;
        }
        $checkName->close();
        
        $updates[] = "shop_name = ?";
        $params[] = $newName;
        $types .= 's';
    }
    
    if (isset($input['shop_address'])) {
        $updates[] = "shop_address = ?";
        $params[] = sanitizeInput($input['shop_address']);
        $types .= 's';
    }
    
    if (isset($input['shop_phone'])) {
        $updates[] = "shop_phone = ?";
        $params[] = sanitizeInput($input['shop_phone']);
        $types .= 's';
    }
    
    if (isset($input['shop_email'])) {
        $updates[] = "shop_email = ?";
        $params[] = sanitizeEmail($input['shop_email']);
        $types .= 's';
    }
    
    if (isset($input['business_capital'])) {
        $updates[] = "business_capital = ?";
        $params[] = floatval($input['business_capital']);
        $types .= 'd';
    }
    
    // Status can only be changed by owners or superadmin
    if (isset($input['status'])) {
        if (!isOwner() && $user['role'] !== 'superadmin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Only owners can change branch status']);
            exit;
        }
        
        $validStatuses = ['active', 'suspended'];
        if (!in_array($input['status'], $validStatuses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid status']);
            exit;
        }
        
        $updates[] = "status = ?";
        $params[] = $input['status'];
        $types .= 's';
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }
    
    // Add shop ID to params
    $params[] = $shopId;
    $types .= 'i';
    
    // Execute update
    $sql = "UPDATE shops SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        $stmt->close();
        
        // Log activity
        logActivity(
            $_SESSION['user_id'],
            'shop_update',
            json_encode([
                'shop_id' => $shopId,
                'fields_updated' => array_keys(array_filter($input, function($key) {
                    return $key !== 'id';
                }, ARRAY_FILTER_USE_KEY))
            ])
        );
        
        // Return updated shop
        $updatedShop = getShopById($shopId);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Branch updated successfully',
            'shop' => $updatedShop
        ]);
    } else {
        throw new Exception("Failed to update shop: " . $stmt->error);
    }
    
} catch (Exception $e) {
    error_log("Shop update error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update branch']);
}

$conn->close();
?>
