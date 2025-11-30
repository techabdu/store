<?php
require_once __DIR__ . '/../config/database.php';

/**
 * Log user activity to database
 * 
 * @param int $userId ID of the user performing action
 * @param string $action Short description of action (e.g., 'login', 'create_user')
 * @param mixed $details Optional details (array or string)
 * @return bool Success status
 */
function logActivity($userId, $action, $details = null) {
    global $conn;
    
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $detailsJson = is_array($details) ? json_encode($details) : $details;
    
    // We should probably log tenant_id too if we want to filter logs by tenant easily later
    // But for now, we can join with users table to get tenant_id
    
    $stmt = $conn->prepare("INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $userId, $action, $detailsJson, $ipAddress);
    
    if ($stmt->execute()) {
        return true;
    } else {
        error_log("Failed to log activity: " . $stmt->error);
        return false;
    }
}

/**
 * Get activity logs based on user role permissions and tenant
 * 
 * @param int $userId Current user ID
 * @param string $role Current user role
 * @param int $tenantId Current user's tenant ID
 * @param int $limit Number of records
 * @param int $offset Pagination offset
 * @return array List of logs
 */
function getActivityLogs($userId, $role, $tenantId, $limit = 50, $offset = 0) {
    global $conn;
    
    $sql = "SELECT l.*, u.username, u.role as user_role 
            FROM activity_logs l 
            JOIN users u ON l.user_id = u.id ";
    
    if ($role === 'superadmin') {
        // SuperAdmin sees all logs? Or just their own?
        // If they want to see all logs, we shouldn't filter by tenant.
        // But if they are viewing a specific tenant, we might want to filter.
        // For now, let's keep existing behavior for SuperAdmin (own logs or all logs?)
        // The previous code had: "SuperAdmin: sees only own logs".
        // Let's stick to that for now to be safe.
        $sql .= "WHERE l.user_id = ? ";
        $params = [$userId];
        $types = "i";
    } elseif ($role === 'admin') {
        // Admin sees logs for users IN THEIR TENANT
        $sql .= "WHERE u.tenant_id = ? AND u.role IN ('admin', 'user') ";
        $params = [$tenantId];
        $types = "i";
    } else {
        // User sees only own logs
        $sql .= "WHERE l.user_id = ? ";
        $params = [$userId];
        $types = "i";
    }
    
    $sql .= "ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    return $result->fetch_all(MYSQLI_ASSOC);
}
?>
