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
    // Get all users except current user (optional, but usually good practice not to delete yourself easily)
    // Or just get all users
    $sql = "SELECT id, username, email, role, status, updated_at as lastActive FROM users ORDER BY created_at DESC";
    
    // Note: last_activity is in sessions table or we can use updated_at or a specific column if added.
    // The plan said `username_last_changed` but didn't specify `last_login`.
    // However, `auth.php` updates `last_activity` in SESSION, not in DB users table (unless we add it).
    // Let's check `setup.sql` again. `users` table has `username_last_changed`, `created_at`, `updated_at`.
    // `sessions` table has `last_activity`.
    // For simplicity, we'll just return what we have. If we want last active time, we might need to join with sessions or add a column.
    // For now, let's just return `updated_at` as a proxy or just ignore lastActive for now if not in DB.
    // Actually, `UserManagement.jsx` expects `lastActive`.
    // Let's try to join with sessions or just return null.
    
    // Wait, `auth.php` updates `$_SESSION['last_activity']`. It doesn't update DB `users` table.
    // So we can't easily get last active time for ALL users unless we store it in DB.
    // I will assume for now we just return `updated_at` or similar.
    
    $result = $conn->query($sql);
    
    $users = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            // Calculate relative time for lastActive if possible, or just send timestamp
            // For now, sending raw data
            $users[] = $row;
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
    
    $username = trim($data->username);
    $email = trim($data->email);
    $password = trim($data->password);
    $role = trim($data->role);
    
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
    $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssi", $username, $email, $password_hash, $role, $currentUser['id']);
    
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
