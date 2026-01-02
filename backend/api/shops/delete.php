<?php
/**
 * Shop Delete API
 * DELETE endpoint to delete a branch shop
 * Accessible by: Admin (owner only), SuperAdmin
 * 
 * WARNING: This will delete all associated data (inventory, transactions, expenses, etc.)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';
require_once '../../helpers/activity_log.php';
require_once '../../helpers/csrf.php';

// Set CORS headers
setCorsHeaders();
header('Content-Type: application/json');

// Only allow DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
$user = checkAuth();

// Check role - only admins and superadmins can delete shops
checkRole(['admin', 'superadmin']);

// Verify CSRF
requireCsrf();

// Only owners can delete branches (not branch managers)
if ($user['role'] === 'admin' && !isOwner()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Only business owners can delete branches']);
    exit;
}

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

// Prevent deletion of main branch
if ($existingShop['is_main_branch']) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => 'Cannot delete the main branch. You must delete the entire business account instead.'
    ]);
    exit;
}

// Require confirmation flag
if (!isset($input['confirm']) || $input['confirm'] !== true) {
    // Return warning with data counts
    $counts = [];
    
    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM inventory WHERE shop_id = ?");
    $countStmt->bind_param("i", $shopId);
    $countStmt->execute();
    $counts['inventory'] = $countStmt->get_result()->fetch_assoc()['count'];
    $countStmt->close();
    
    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM transactions WHERE shop_id = ?");
    $countStmt->bind_param("i", $shopId);
    $countStmt->execute();
    $counts['transactions'] = $countStmt->get_result()->fetch_assoc()['count'];
    $countStmt->close();
    
    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM expenses WHERE shop_id = ?");
    $countStmt->bind_param("i", $shopId);
    $countStmt->execute();
    $counts['expenses'] = $countStmt->get_result()->fetch_assoc()['count'];
    $countStmt->close();
    
    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM users WHERE shop_id = ?");
    $countStmt->bind_param("i", $shopId);
    $countStmt->execute();
    $counts['users'] = $countStmt->get_result()->fetch_assoc()['count'];
    $countStmt->close();
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Confirmation required',
        'warning' => 'This action will permanently delete the branch and ALL associated data',
        'data_to_be_deleted' => $counts,
        'message' => 'Send confirm: true to proceed with deletion'
    ]);
    exit;
}

try {
    // Start transaction
    $conn->begin_transaction();
    
    // Store shop name for logging
    $shopName = $existingShop['shop_name'];
    $tenantId = $existingShop['tenant_id'];
    
    // Delete related data in order (respecting foreign keys)
    // Note: Some FK are ON DELETE CASCADE, but being explicit is safer
    
    // 1. Delete transaction_items for this shop
    $stmt = $conn->prepare("DELETE FROM transaction_items WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 2. Delete transactions for this shop
    $stmt = $conn->prepare("DELETE FROM transactions WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 3. Delete inventory for this shop
    $stmt = $conn->prepare("DELETE FROM inventory WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 4. Delete expenses for this shop
    $stmt = $conn->prepare("DELETE FROM expenses WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 5. Delete profit_records for this shop
    $stmt = $conn->prepare("DELETE FROM profit_records WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 6. Delete reports for this shop
    $stmt = $conn->prepare("DELETE FROM reports WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 7. Update users - set shop_id to NULL (convert to owner-level)
    // or delete them??? For safety, we set to NULL so they become orphaned
    // and the owner can reassign them
    $stmt = $conn->prepare("UPDATE users SET shop_id = NULL WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 8. Update activity_logs - set shop_id to NULL (preserve history)
    $stmt = $conn->prepare("UPDATE activity_logs SET shop_id = NULL WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // 9. Finally delete the shop
    $stmt = $conn->prepare("DELETE FROM shops WHERE id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $stmt->close();
    
    // Commit transaction
    $conn->commit();
    
    // Log activity (on tenant level since shop is deleted)
    logActivity(
        $_SESSION['user_id'],
        'shop_delete',
        json_encode([
            'shop_id' => $shopId,
            'shop_name' => $shopName
        ]),
        $tenantId
    );
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Branch '$shopName' and all associated data deleted successfully"
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    error_log("Shop delete error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to delete branch']);
}

$conn->close();
?>
