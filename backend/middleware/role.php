<?php
/**
 * Check if authenticated user has one of the allowed roles
 * 
 * @param array $allowedRoles Array of allowed role strings
 * @return void Exits with 403 if forbidden
 */
function checkRole($allowedRoles) {
    // Ensure session is started and user role is available
    // This function should be called AFTER checkAuth()
    
    if (!isset($_SESSION['role'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: Role not defined']);
        exit;
    }
    
    if (!in_array($_SESSION['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: Insufficient permissions']);
        exit;
    }
}

/**
 * Check if user has access to a specific tenant's data
 * SuperAdmin can access all tenants, others can only access their own
 * 
 * @param int $targetTenantId The tenant ID being accessed
 * @return void Exits with 403 if forbidden
 */
function checkTenantAccess($targetTenantId) {
    // SuperAdmin can access all tenants
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'superadmin') {
        return;
    }
    
    // Other users can only access their own tenant
    if (!isset($_SESSION['tenant_id']) || $_SESSION['tenant_id'] != $targetTenantId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: Cannot access other tenant data']);
        exit;
    }
}
?>
