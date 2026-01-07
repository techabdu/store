<?php
/**
 * Inventory Delete API
 * DELETE endpoint to remove inventory items
 * Accessible by: Admin, SuperAdmin ONLY
 */

header('Content-Type: application/json');

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/activity_log.php';

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    setCorsHeaders();
    http_response_code(200);
    exit;
}

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    setCorsHeaders(); // Ensure headers are set even on error
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Set CORS headers using centralized config
setCorsHeaders();

// Check authentication
checkAuth();

// Check role - ONLY admin and superadmin can delete
checkRole(['admin', 'superadmin']);

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate ID
if (!isset($input['id']) || !is_numeric($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid inventory ID']);
    exit;
}

$inventoryId = intval($input['id']);

try {
    // Verify inventory item exists and belongs to current tenant
    $checkStmt = $conn->prepare("SELECT id, brand, model, imei, tenant_id FROM inventory WHERE id = ?");
    $checkStmt->bind_param("i", $inventoryId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Inventory item not found']);
        $checkStmt->close();
        exit;
    }
    
    $item = $checkResult->fetch_assoc();
    if ($item['tenant_id'] != $_SESSION['tenant_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot delete items from other tenants']);
        $checkStmt->close();
        exit;
    }
    $checkStmt->close();
    
    // Check if item is part of any transaction
    $transactionCheckStmt = $conn->prepare("SELECT COUNT(*) as count FROM transaction_items WHERE inventory_id = ?");
    $transactionCheckStmt->bind_param("i", $inventoryId);
    $transactionCheckStmt->execute();
    $transactionResult = $transactionCheckStmt->get_result();
    $transactionCount = $transactionResult->fetch_assoc()['count'];
    $transactionCheckStmt->close();
    
    if ($transactionCount > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Cannot delete inventory item that is part of a transaction. Consider marking as returned instead.'
        ]);
        exit;
    }
    
    // Delete the inventory item
    $deleteStmt = $conn->prepare("DELETE FROM inventory WHERE id = ?");
    $deleteStmt->bind_param("i", $inventoryId);
    
    if ($deleteStmt->execute()) {
        // Log activity
        logActivity(
            $_SESSION['user_id'],
            'inventory_delete',
            "Deleted inventory: " . $item['brand'] . " " . $item['model'] . " (IMEI: " . $item['imei'] . ")"
        );
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Inventory item deleted successfully'
        ]);
    } else {
        throw new Exception("Failed to delete inventory item");
    }
    
    $deleteStmt->close();
    
} catch (Exception $e) {
    error_log("Inventory delete error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to delete inventory item']);
}

$conn->close();
