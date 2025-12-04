<?php
/**
 * Inventory Update API
 * PUT endpoint to update existing inventory items
 * Accessible by: User, Admin, SuperAdmin
 */

header('Content-Type: application/json');
// Only allow PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/database.php';

// Set CORS headers using centralized config
setCorsHeaders();
require_once '../../config/config.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/activity_log.php';

// Check authentication
checkAuth();

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

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
    $checkStmt = $conn->prepare("SELECT * FROM inventory WHERE id = ?"); // Select all to get existingItem for logging
    $checkStmt->bind_param("i", $inventoryId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Inventory item not found']);
        $checkStmt->close();
        exit;
    }
    
    $existingItem = $checkResult->fetch_assoc(); // Fetch all data for existingItem
    if ($existingItem['tenant_id'] != $_SESSION['tenant_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot update items from other tenants']);
        $checkStmt->close();
        exit;
    }
    $checkStmt->close();
    
    // Build update query dynamically based on provided fields
    $updateFields = [];
    $params = [];
    $types = '';
    
    // Fields that can be updated
    $allowedFields = [
        'brand' => 's',
        'model' => 's',
        'color' => 's',
        'storage' => 's',
        'condition_status' => 's',
        'price' => 'd',
        'cost_price' => 'd',
        'status' => 's'
    ];
    
    foreach ($allowedFields as $field => $type) {
        if (isset($input[$field])) {
            $updateFields[] = "$field = ?";
            $params[] = $input[$field];
            $types .= $type;
        }
    }
    
    // If no fields to update
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }
    
    // Validate price if provided
    if (isset($input['price']) && floatval($input['price']) <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Price must be greater than 0']);
        exit;
    }
    
    if (isset($input['cost_price']) && floatval($input['cost_price']) <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cost price must be greater than 0']);
        exit;
    }
    
    // Validate condition if provided
    if (isset($input['condition_status']) && !in_array($input['condition_status'], ['new', 'used'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid condition']);
        exit;
    }
    
    // Validate status if provided
    if (isset($input['status']) && !in_array($input['status'], ['in_stock', 'sold', 'returned'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid status']);
        exit;
    }
    
    // Add inventory ID to params
    $params[] = $inventoryId;
    $types .= 'i';
    
    // Build and execute update query
    $query = "UPDATE inventory SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        // Calculate changes for activity log
        $changes = [];
        foreach ($input as $field => $newValue) {
            if (array_key_exists($field, $existingItem) && $existingItem[$field] != $newValue) {
                // Skip sensitive or internal fields if any (none here really)
                $oldValue = $existingItem[$field];
                $changes[] = "$field from '$oldValue' to '$newValue'";
            }
        }
        
        $logDetails = "Updated inventory " . $existingItem['brand'] . " " . $existingItem['model'];
        if (!empty($changes)) {
            $logDetails .= ": " . implode(", ", $changes);
        } else {
            $logDetails .= " (no changes detected)";
        }

        // Log activity
        logActivity(
            $_SESSION['user_id'],
            'inventory_update',
            $logDetails
        );
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Inventory item updated successfully'
        ]);
    } else {
        throw new Exception("Failed to update inventory item");
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log("Inventory update error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update inventory item']);
}

$conn->close();
