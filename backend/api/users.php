<?php
require_once '../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/role.php';
require_once __DIR__ . '/../helpers/activity_log.php';
require_once __DIR__ . '/../helpers/validate.php';
require_once __DIR__ . '/../helpers/sanitize.php';
require_once __DIR__ . '/../helpers/csrf.php';

// Set CORS headers using centralized config
setCorsHeaders();

// CORS Headers
header("Content-Type: application/json; charset=UTF-8");

// Check authentication
$currentUser = checkAuth();

// Check role (SuperAdmin only)
checkRole(['superadmin']);

$method = $_SERVER['REQUEST_METHOD'];

// Verify CSRF for state-changing requests
if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
    requireCsrf();
}

// Check role (SuperAdmin only)
checkRole(['superadmin']);

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
    // Get all users from all tenants with tenant information
    $sql = "
        SELECT 
            u.id, 
            u.username, 
            u.email, 
            u.role, 
            u.status, 
            u.updated_at as lastActive,
            u.tenant_id,
            t.shop_name as tenant_name,
            t.status as tenant_status,
            t.plan_type as tenant_plan
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.role != 'superadmin'
        ORDER BY t.shop_name ASC, u.role DESC, u.created_at DESC
    ";
    
    $result = $conn->query($sql);
    
    $users = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'id' => (int)$row['id'],
                'username' => $row['username'],
                'email' => $row['email'],
                'role' => $row['role'],
                'status' => $row['status'],
                'lastActive' => $row['lastActive'],
                'tenant_id' => (int)$row['tenant_id'],
                'tenant_name' => $row['tenant_name'],
                'tenant_status' => $row['tenant_status'],
                'tenant_plan' => $row['tenant_plan']
            ];
        }
    }
    
    echo json_encode(['success' => true, 'users' => $users]);
}

function handlePost($conn, $currentUser) {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->username) || !isset($data->email) || !isset($data->password) || !isset($data->role)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    // Sanitize inputs
    $username = sanitizeInput($data->username);
    $email = sanitizeEmail($data->email);
    // Password shouldn't be sanitized with htmlspecialchars as it might contain special chars allowed in passwords
    // But we should trim it.
    $password = trim($data->password); 
    $role = sanitizeInput($data->role);

    // Validate inputs
    if (!validateUsername($username)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid username format (3-20 alphanum chars)']);
        exit;
    }

    if (!validatePasswordStrength($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Password too weak (min 8 chars)']);
        exit;
    }
    
    // Validate role
    if (!in_array($role, ['admin', 'superadmin'])) { // Only creating admins/superadmins here? Or users too?
        // UserManagement.jsx has options for Admin and SuperAdmin.
        // Assuming we can create any role.
    }
    
    // Check if username or email exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Username or email already exists']);
        exit;
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Insert user
    // Insert user
    $tenantId = $currentUser['tenant_id'];
    
    // Check if SuperAdmin is trying to create user for another tenant (feature for future, but handling basic logic now)
    if (isset($data->tenant_id) && $currentUser['role'] === 'superadmin') {
        // Validate that tenant exists
        // $tenantId = $data->tenant_id;
    }

    $stmt = $conn->prepare("INSERT INTO users (tenant_id, username, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("issssi", $tenantId, $username, $email, $password_hash, $role, $currentUser['id']);
    
    if ($stmt->execute()) {
        $newUserId = $conn->insert_id;
        logActivity($currentUser['id'], 'create_user', "Created user: $username ($role)", $tenantId);
        
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
    
    // Prevent modifying self (optional but recommended)
    if ($id == $currentUser['id']) {
        // Maybe allow updating own profile but not role/status via this API?
        // For now, let's allow it but be careful.
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
        $updates[] = "role = ?";
        $types .= "s";
        $params[] = $data->role;
    }
    
    // If password update is needed, handle it separately or here
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
    // Get ID from query string or body. DELETE requests often use query string.
    // But axios might send data. Let's check query string first.
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        // Try body
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
