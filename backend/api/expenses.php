<?php
require_once '../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/role.php';
require_once __DIR__ . '/../helpers/activity_log.php';
require_once __DIR__ . '/../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// CORS Headers
header("Content-Type: application/json; charset=UTF-8");

// Check authentication
$currentUser = checkAuth();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn, $currentUser);
        break;
    case 'PUT':
        handlePut($conn, $currentUser);
        break;
    case 'DELETE':
        // Only Admin/SuperAdmin can delete
        checkRole(['admin', 'superadmin']);
        handleDelete($conn, $currentUser);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}

function handleGet($conn) {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    // Get all expenses for current shop, ordered by date desc
    $query = "SELECT e.*, u.username as created_by_name 
              FROM expenses e 
              LEFT JOIN users u ON e.created_by = u.id 
              WHERE e.shop_id = ?
              ORDER BY e.date DESC, e.created_at DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $expenses = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $expenses[] = $row;
        }
    }
    
    echo json_encode(['success' => true, 'expenses' => $expenses, 'shop_id' => $shopId]);
}

function handlePost($conn, $currentUser) {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->description) || !isset($data->amount) || !isset($data->category) || !isset($data->date)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    $description = trim($data->description);
    $amount = $data->amount;
    $category = trim($data->category);
    $date = $data->date;
    
    $stmt = $conn->prepare("INSERT INTO expenses (description, amount, category, date, tenant_id, shop_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sdssiii", $description, $amount, $category, $date, $_SESSION['tenant_id'], $shopId, $_SESSION['user_id']);
    
    if ($stmt->execute()) {
        $newId = $conn->insert_id;
        logActivity($currentUser['id'], 'create_expense', "Created expense: $description ($amount)");
        
        // Track feature usage
        require_once '../../helpers/FeatureTracker.php';
        FeatureTracker::track('expenses', 'create', $_SESSION['user_id'], $_SESSION['tenant_id'], $shopId);

        // Fetch the created expense to return it
        $sql = "SELECT e.*, u.username as created_by_name 
                FROM expenses e 
                LEFT JOIN users u ON e.created_by = u.id 
                WHERE e.id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $newId);
        $stmt->execute();
        $result = $stmt->get_result();
        $expense = $result->fetch_assoc();
        
        echo json_encode(['success' => true, 'expense' => $expense]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create expense']);
    }
}

function handlePut($conn, $currentUser) {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Expense ID required']);
        exit;
    }
    
    $id = $data->id;
    
    // Verify expense belongs to current shop
    $checkStmt = $conn->prepare("SELECT id FROM expenses WHERE id = ? AND shop_id = ?");
    $checkStmt->bind_param("ii", $id, $shopId);
    $checkStmt->execute();
    if ($checkStmt->get_result()->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Expense not found in this branch']);
        $checkStmt->close();
        exit;
    }
    $checkStmt->close();
    
    // Build update query dynamically
    $updates = [];
    $types = "";
    $params = [];
    
    if (isset($data->description)) {
        $updates[] = "description = ?";
        $types .= "s";
        $params[] = trim($data->description);
    }
    
    if (isset($data->amount)) {
        $updates[] = "amount = ?";
        $types .= "d";
        $params[] = $data->amount;
    }
    
    if (isset($data->category)) {
        $updates[] = "category = ?";
        $types .= "s";
        $params[] = trim($data->category);
    }
    
    if (isset($data->date)) {
        $updates[] = "date = ?";
        $types .= "s";
        $params[] = $data->date;
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }
    
    $sql = "UPDATE expenses SET " . implode(", ", $updates) . " WHERE id = ? AND shop_id = ?";
    $types .= "ii";
    $params[] = $id;
    $params[] = $shopId;
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        logActivity($currentUser['id'], 'update_expense', "Updated expense ID: $id");
        
        // Track feature usage
        require_once '../../helpers/FeatureTracker.php';
        FeatureTracker::track('expenses', 'update', $_SESSION['user_id'], $_SESSION['tenant_id'], $shopId);
        
        echo json_encode(['success' => true, 'message' => 'Expense updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update expense']);
    }
}

function handleDelete($conn, $currentUser) {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        $data = json_decode(file_get_contents("php://input"));
        $id = $data->id ?? null;
    }
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Expense ID required']);
        exit;
    }
    
    // Delete only if expense belongs to current shop
    $stmt = $conn->prepare("DELETE FROM expenses WHERE id = ? AND shop_id = ?");
    $stmt->bind_param("ii", $id, $shopId);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            logActivity($currentUser['id'], 'delete_expense', "Deleted expense ID: $id");
            echo json_encode(['success' => true, 'message' => 'Expense deleted successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Expense not found in this branch']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete expense']);
    }
}
?>
