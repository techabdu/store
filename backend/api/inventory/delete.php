<?php
/**
 * Inventory Delete API
 * DELETE endpoint to remove inventory items
 * Accessible by: Admin, SuperAdmin ONLY
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/activity_log.php';

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
    // Check if inventory item exists
    $checkStmt = $conn->prepare("SELECT * FROM inventory WHERE id = ?");
    $checkStmt->bind_param("i", $inventoryId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Inventory item not found']);
        $checkStmt->close();
        exit;
    }
    
    $item = $result->fetch_assoc();
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
            json_encode([
                'inventory_id' => $inventoryId,
                'brand' => $item['brand'],
                'model' => $item['model'],
                'imei' => $item['imei']
            ])
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
