<?php
require_once '../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once '../middleware/api_logger.php'; // API request logging
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

// Check role (Admin only - not superadmin, not user)
checkRole(['admin']);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($conn, $currentUser);
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

function handleGet($conn, $currentUser) {
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

    // Multi-branch logic:
    // - Owner (shop_id = NULL): By default sees users for CURRENT branch, can request all
    // - Branch Manager (shop_id = X): Can only see users from their branch
    $isOwnerUser = isOwner();
    $currentShopId = getCurrentShopId();
    
    // Check if owner wants to see all users across branches
    $showAllBranches = isset($_GET['show_all']) && $_GET['show_all'] === 'true' && $isOwnerUser;
    
    if ($showAllBranches) {
        // Owner viewing ALL users across all branches
        $sql = "SELECT u.id, u.username, u.email, u.role, u.status, u.shop_id, 
                       u.updated_at as lastActive,
                       s.shop_name
                FROM users u
                LEFT JOIN shops s ON u.shop_id = s.id
                WHERE u.role IN ('user', 'admin') 
                AND u.tenant_id = ?
                ORDER BY u.shop_id IS NULL DESC, s.shop_name ASC, u.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $_SESSION['tenant_id']);
    } else if ($isOwnerUser) {
        // Owner viewing users for CURRENT branch only
        // Include: users assigned to this shop + other owners (for visibility)
        $sql = "SELECT u.id, u.username, u.email, u.role, u.status, u.shop_id, 
                       u.updated_at as lastActive,
                       s.shop_name
                FROM users u
                LEFT JOIN shops s ON u.shop_id = s.id
                WHERE u.role IN ('user', 'admin') 
                AND u.tenant_id = ?
                AND (u.shop_id = ? OR u.shop_id IS NULL)
                ORDER BY u.shop_id IS NULL DESC, u.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $_SESSION['tenant_id'], $currentShopId);
    } else {
        // Branch manager sees only users in their shop
        $sql = "SELECT u.id, u.username, u.email, u.role, u.status, u.shop_id,
                       u.updated_at as lastActive,
                       s.shop_name
                FROM users u
                LEFT JOIN shops s ON u.shop_id = s.id
                WHERE u.role = 'user' 
                AND u.shop_id = ?
                ORDER BY u.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $currentShopId);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $row['is_owner'] = $row['shop_id'] === null && $row['role'] === 'admin';
        $row['is_branch_manager'] = $row['shop_id'] !== null && $row['role'] === 'admin';
        $users[] = $row;
    }
    
    // Get shops list for owner (for shop selector in UI)
    $shops = $isOwnerUser ? getShopsForTenant() : [];
    
    echo json_encode([
        'success' => true, 
        'users' => $users,
        'is_owner' => $isOwnerUser,
        'current_shop_id' => $currentShopId,
        'showing_all_branches' => $showAllBranches,
        'shops' => $shops
    ]);
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
    // Default role to 'user' if not specified
    $role = isset($data->role) ? trim($data->role) : 'user';
    
    // Determine shop_id for the new user
    $isOwnerUser = isOwner();
    $currentShopId = getCurrentShopId();
    
    if ($isOwnerUser) {
        // Owner can specify shop_id or create another owner (shop_id = NULL)
        if (isset($data->shop_id)) {
            if ($data->shop_id === null || $data->shop_id === 'null') {
                // Creating another owner (admin with shop_id = NULL)
                if ($role !== 'admin') {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Only admins can be assigned as owners (no branch)']);
                    exit;
                }
                $newUserShopId = null;
            } else {
                // Verify shop belongs to tenant
                $newUserShopId = intval($data->shop_id);
                if (!verifyShopAccess($newUserShopId)) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Invalid shop selection']);
                    exit;
                }
            }
        } else {
            // Default to current shop
            $newUserShopId = $currentShopId;
        }
    } else {
        // Branch manager can only create users for their own shop
        $newUserShopId = $currentShopId;
        
        // Branch managers can only create 'user' role, not other admins
        if ($role !== 'user') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Branch managers can only create staff users']);
            exit;
        }
    }
    
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
        echo json_encode(['success' => false, 'error' => 'Username or email already exists in this business']);
        exit;
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Insert user with tenant_id and shop_id
    if ($newUserShopId === null) {
        $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, role, tenant_id, shop_id, created_by) VALUES (?, ?, ?, ?, ?, NULL, ?)");
        $stmt->bind_param("ssssii", $username, $email, $password_hash, $role, $_SESSION['tenant_id'], $currentUser['id']);
    } else {
        $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, role, tenant_id, shop_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssiii", $username, $email, $password_hash, $role, $_SESSION['tenant_id'], $newUserShopId, $currentUser['id']);
    }
    
    if ($stmt->execute()) {
        $newUserId = $conn->insert_id;
        
        // Get shop name for response
        $shopName = null;
        if ($newUserShopId !== null) {
            $shop = getShopById($newUserShopId);
            $shopName = $shop ? $shop['shop_name'] : null;
        }
        
        logActivity($currentUser['id'], 'create_user', "Created user: $username ($role)" . ($shopName ? " for $shopName" : " as owner"));
        
        echo json_encode(['success' => true, 'user' => [
            'id' => $newUserId,
            'username' => $username,
            'email' => $email,
            'role' => $role,
            'status' => 'active',
            'shop_id' => $newUserShopId,
            'shop_name' => $shopName,
            'is_owner' => $newUserShopId === null && $role === 'admin',
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
    $isOwnerUser = isOwner();
    $currentShopId = getCurrentShopId();
    
    // Prevent modifying self
    if ($id == $currentUser['id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot modify your own account']);
        exit;
    }
    
    // Check that the target user belongs to same tenant and is not a superadmin
    $checkStmt = $conn->prepare("SELECT role, tenant_id, shop_id FROM users WHERE id = ?");
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
        echo json_encode(['success' => false, 'error' => 'Cannot modify users from other businesses']);
        exit;
    }
    
    if ($targetUser['role'] === 'superadmin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot modify superadmin accounts']);
        exit;
    }
    
    // If branch manager, can only modify users in their shop
    if (!$isOwnerUser && $targetUser['shop_id'] != $currentShopId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot modify users from other branches']);
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
        // Only owners can change roles
        if (!$isOwnerUser) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Only owners can change user roles']);
            exit;
        }
        
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
    
    // Shop assignment (owners only)
    if (isset($data->shop_id) && $isOwnerUser) {
        if ($data->shop_id === null || $data->shop_id === 'null') {
            $updates[] = "shop_id = NULL";
        } else {
            $newShopId = intval($data->shop_id);
            if (!verifyShopAccess($newShopId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Invalid shop selection']);
                exit;
            }
            $updates[] = "shop_id = ?";
            $types .= "i";
            $params[] = $newShopId;
        }
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
    
    $isOwnerUser = isOwner();
    $currentShopId = getCurrentShopId();
    
    // Check that the target user belongs to same tenant and is not a superadmin
    $checkStmt = $conn->prepare("SELECT role, tenant_id, shop_id FROM users WHERE id = ?");
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
        echo json_encode(['success' => false, 'error' => 'Cannot delete users from other businesses']);
        exit;
    }
    
    if ($targetUser['role'] === 'superadmin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot delete superadmin accounts']);
        exit;
    }
    
    // Prevent deleting another owner if not owner yourself
    if ($targetUser['shop_id'] === null && $targetUser['role'] === 'admin' && !$isOwnerUser) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot delete owner accounts']);
        exit;
    }
    
    // If branch manager, can only delete users in their shop
    if (!$isOwnerUser && $targetUser['shop_id'] != $currentShopId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot delete users from other branches']);
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
