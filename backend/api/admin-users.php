<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/role.php';
require_once __DIR__ . '/../helpers/activity_log.php';

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check authentication
$currentUser = checkAuth();

// Check role (Admin only - not superadmin)
checkRole(['admin']);

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
        handleDelete($conn, $currentUser);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}

function handleGet($conn) {
    // Check for username availability
    if (isset($_GET['check_username'])) {
        $username = trim($_GET['check_username']);
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND tenant_id = ?");
        $stmt->bind_param("si", $username, $_SESSION['tenant_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        echo json_encode(['success' => true, 'available' => $result->num_rows === 0]);
        return;
    }

    // Get all users with role 'user' or 'admin' for current tenant (exclude superadmins)
    $sql = "SELECT id, username, email, role, status, updated_at as lastActive 
            FROM users 
            WHERE role IN ('user', 'admin') 
            AND tenant_id = ?
            ORDER BY created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $_SESSION['tenant_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode(['success' => true, 'users' => $users]);
}

function handlePost($conn, $currentUser) {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->username) || !isset($data->email) || !isset($data->password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    $username = trim($data->username);
    $email = trim($data->email);
    $password = trim($data->password);
    // Default role to 'user' if not specified, but only allow 'user' or 'admin'
    $role = isset($data->role) ? trim($data->role) : 'user';
    
    // Validate role - admins can only create users or admins, not superadmins
    if (!in_array($role, ['user', 'admin'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid role. Only user or admin allowed.']);
        exit;
    }
    
    // Check if username or email exists within the current tenant
    $stmt = $conn->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND tenant_id = ?");
    $stmt->bind_param("ssi", $username, $email, $_SESSION['tenant_id']);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Username or email already exists in this shop']);
        exit;
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Insert user with tenant_id
    $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, role, tenant_id, created_by) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssii", $username, $email, $password_hash, $role, $_SESSION['tenant_id'], $currentUser['id']);
    
    if ($stmt->execute()) {
        $newUserId = $conn->insert_id;
        logActivity($currentUser['id'], 'create_user', "Created user: $username ($role)");
        
        echo json_encode(['success' => true, 'user' => [
            'id' => $newUserId,
            'username' => $username,
            'email' => $email,
            'role' => $role,
            'status' => 'active',
            'lastActive' => 'Just now'
        ]]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create user']);
    }
}

function handlePut($conn, $currentUser) {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'User ID required']);
        exit;
    }
    
    $id = $data->id;
    
    // Prevent modifying self
    if ($id == $currentUser['id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot modify your own account']);
        exit;
    }
    
    // Check that the target user belongs to same tenant and is not a superadmin
    $checkStmt = $conn->prepare("SELECT role, tenant_id FROM users WHERE id = ?");
    $checkStmt->bind_param("i", $id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    $targetUser = $result->fetch_assoc();
    
    // Verify user belongs to same tenant
    if ($targetUser['tenant_id'] != $_SESSION['tenant_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot modify users from other tenants']);
        exit;
    }
    
    if ($targetUser['role'] === 'superadmin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot modify superadmin accounts']);
        exit;
    }
    
    // Build update query dynamically
    $updates = [];
    $types = "";
    $params = [];
    
    if (isset($data->status)) {
        $updates[] = "status = ?";
        $types .= "s";
        $params[] = $data->status;
    }
    
    if (isset($data->role)) {
        // Only allow role changes between 'user' and 'admin'
        if (!in_array($data->role, ['user', 'admin'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid role. Only user or admin allowed.']);
            exit;
        }
        $updates[] = "role = ?";
        $types .= "s";
        $params[] = $data->role;
    }
    
    // If password update is needed
    if (isset($data->password) && !empty($data->password)) {
        $updates[] = "password_hash = ?";
        $types .= "s";
        $params[] = password_hash($data->password, PASSWORD_BCRYPT);
        
        // Log specific activity for password reset
        logActivity($currentUser['id'], 'reset_password', "Reset password for user ID: $id");
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }
    
    $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $types .= "i";
    $params[] = $id;
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        logActivity($currentUser['id'], 'update_user', "Updated user ID: $id");
        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update user']);
    }
}

function handleDelete($conn, $currentUser) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        $data = json_decode(file_get_contents("php://input"));
        $id = $data->id ?? null;
    }
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'User ID required']);
        exit;
    }
    
    if ($id == $currentUser['id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot delete yourself']);
        exit;
    }
    
    // Check that the target user belongs to same tenant and is not a superadmin
    $checkStmt = $conn->prepare("SELECT role, tenant_id FROM users WHERE id = ?");
    $checkStmt->bind_param("i", $id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    $targetUser = $result->fetch_assoc();
    
    // Verify user belongs to same tenant
    if ($targetUser['tenant_id'] != $_SESSION['tenant_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot delete users from other tenants']);
        exit;
    }
    
    if ($targetUser['role'] === 'superadmin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot delete superadmin accounts']);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        logActivity($currentUser['id'], 'delete_user', "Deleted user ID: $id");
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete user']);
    }
}
?>
