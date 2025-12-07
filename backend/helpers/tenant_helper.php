<?php
/**
 * Tenant-Aware Query Helper Functions
 * 
 * These helper functions ensure all database queries properly filter by tenant_id
 * to prevent cross-tenant data access and improve code consistency.
 */

/**
 * Verify a record belongs to the current tenant
 * 
 * @param mysqli $conn Database connection
 * @param string $table Table name
 * @param int $recordId Record ID to verify
 * @return bool True if record belongs to current tenant, false otherwise
 * @throws Exception If tenant_id not set in session
 */
function verifyTenantOwnership($conn, $table, $recordId) {
    if (!isset($_SESSION['tenant_id'])) {
        throw new Exception("Tenant ID not set in session");
    }
    
    $stmt = $conn->prepare("SELECT id FROM $table WHERE id = ? AND tenant_id = ?");
    $stmt->bind_param("ii", $recordId, $_SESSION['tenant_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();
    
    return $result->num_rows > 0;
}

/**
 * Get current tenant ID from session
 * 
 * @return int Tenant ID
 * @throws Exception If tenant_id not set in session
 */
function getCurrentTenantId() {
    if (!isset($_SESSION['tenant_id'])) {
        throw new Exception("Tenant ID not set in session");
    }
    return $_SESSION['tenant_id'];
}

/**
 * Ensure a query result belongs to current tenant
 * Use this after fetching a record to double-check tenant ownership
 * 
 * @param array $record Database record with tenant_id field
 * @return bool True if record belongs to current tenant
 * @throws Exception If tenant_id not set in session or record doesn't belong to tenant
 */
function ensureTenantRecord($record) {
    if (!isset($_SESSION['tenant_id'])) {
        throw new Exception("Tenant ID not set in session");
    }
    
    if (!isset($record['tenant_id'])) {
        throw new Exception("Record does not have tenant_id field");
    }
    
    if ($record['tenant_id'] != $_SESSION['tenant_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Access denied: Record belongs to different tenant']);
        exit;
    }
    
    return true;
}

/**
 * Build a tenant-scoped WHERE clause
 * Useful for dynamic query building
 * 
 * @param string $tableAlias Optional table alias (e.g., 'i' for inventory)
 * @return string WHERE clause fragment
 */
function getTenantWhereClause($tableAlias = '') {
    $prefix = $tableAlias ? "$tableAlias." : '';
    return "{$prefix}tenant_id = ?";
}

/**
 * Add tenant_id to parameter binding arrays
 * Helper for prepared statements
 * 
 * @param array &$types Reference to types string (e.g., 'ssi')
 * @param array &$params Reference to params array
 * @return void
 */
function addTenantParam(&$types, &$params) {
    if (!isset($_SESSION['tenant_id'])) {
        throw new Exception("Tenant ID not set in session");
    }
    
    // Prepend tenant_id to the beginning
    $types = 'i' . $types;
    array_unshift($params, $_SESSION['tenant_id']);
}
