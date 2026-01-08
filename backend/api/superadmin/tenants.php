<?php
/**
 * Tenants Management API (SuperAdmin Only)
 * Manages all tenants in the system
 */

require_once '../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Set CORS headers using centralized config
setCorsHeaders();
require_once __DIR__ . '/../../middleware/role.php';

header("Content-Type: application/json; charset=UTF-8");

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

// Handle different request methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet();
        break;
    case 'PUT':
        handlePut();
        break;
    case 'DELETE':
        handleDelete();
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}

/**
 * Get all tenants with statistics
 */
function handleGet() {
    global $conn;
    
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    
    // Count total for pagination
    $countSql = "SELECT COUNT(*) as total FROM tenants t WHERE 1=1";
    $countParams = [];
    $countTypes = "";
    
    if (!empty($search)) {
        $countSql .= " AND (t.shop_name LIKE ? OR t.shop_email LIKE ?)";
        $searchParam = "%$search%";
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countTypes .= "ss";
    }
    
    if (!empty($status) && $status !== 'all') {
        $countSql .= " AND t.status = ?";
        $countParams[] = $status;
        $countTypes .= "s";
    }
    
    $totalCount = 0;
    if (!empty($countParams)) {
        $countStmt = $conn->prepare($countSql);
        $countStmt->bind_param($countTypes, ...$countParams);
        $countStmt->execute();
        $totalCount = $countStmt->get_result()->fetch_assoc()['total'];
        $countStmt->close();
    } else {
        $totalCount = $conn->query($countSql)->fetch_assoc()['total'];
    }

    $sql = "
        SELECT 
            t.id,
            t.shop_name,
            t.shop_email,
            t.shop_phone,
            t.shop_address,
            t.status,
            t.plan_type,
            t.trial_ends_at,
            t.subscription_ends_at,
            t.email_verified,
            t.created_at,
            t.updated_at,
            (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
            (SELECT COUNT(*) FROM inventory WHERE tenant_id = t.id) as inventory_count,
            (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE tenant_id = t.id) as total_sales
        FROM tenants t
        WHERE 1=1
    ";
    
    $params = [];
    $types = "";
    
    if (!empty($search)) {
        $sql .= " AND (t.shop_name LIKE ? OR t.shop_email LIKE ?)";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= "ss";
    }
    
    if (!empty($status) && $status !== 'all') {
        $sql .= " AND t.status = ?";
        $params[] = $status;
        $types .= "s";
    }
    
    $sql .= " ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database prepare failed: ' . $conn->error]);
        return;
    }
    
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database query failed']);
        return;
    }
    
    $tenants = [];
    while ($row = $result->fetch_assoc()) {
        // Calculate days remaining for trial
        $daysRemaining = null;
        if ($row['trial_ends_at']) {
            $trialEnd = new DateTime($row['trial_ends_at']);
            $now = new DateTime();
            $diff = $now->diff($trialEnd);
            $daysRemaining = $diff->invert ? 0 : $diff->days;
        }
        
        $tenants[] = [
            'id' => (int)$row['id'],
            'shop_name' => $row['shop_name'],
            'shop_email' => $row['shop_email'],
            'shop_phone' => $row['shop_phone'],
            'shop_address' => $row['shop_address'],
            'status' => $row['status'],
            'plan_type' => $row['plan_type'],
            'trial_ends_at' => $row['trial_ends_at'],
            'subscription_ends_at' => $row['subscription_ends_at'],
            'days_remaining' => $daysRemaining,
            'email_verified' => (bool)$row['email_verified'],
            'user_count' => (int)$row['user_count'],
            'inventory_count' => (int)$row['inventory_count'],
            'total_sales' => (float)$row['total_sales'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'tenants' => $tenants,
        'pagination' => [
            'total' => (int)$totalCount,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($totalCount / $limit)
        ]
    ]);
}

/**
 * Update tenant (status, plan, etc.)
 */
function handlePut() {
    global $conn;
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Tenant ID is required']);
        return;
    }
    
    $tenantId = (int)$data->id;
    
    // Build update query dynamically based on provided fields
    $updates = [];
    $params = [];
    $types = '';
    
    if (isset($data->status)) {
        $validStatuses = ['active', 'suspended', 'pending', 'trial'];
        if (!in_array($data->status, $validStatuses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid status']);
            return;
        }
        $updates[] = "status = ?";
        $params[] = $data->status;
        $types .= 's';
    }
    
    if (isset($data->plan_type)) {
        $validPlans = ['free_trial', 'basic', 'premium', 'enterprise'];
        if (!in_array($data->plan_type, $validPlans)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid plan type']);
            return;
        }
        $updates[] = "plan_type = ?";
        $params[] = $data->plan_type;
        $types .= 's';
    }
    
    if (isset($data->subscription_ends_at)) {
        $updates[] = "subscription_ends_at = ?";
        $params[] = $data->subscription_ends_at;
        $types .= 's';
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }
    
    // Add tenant ID to params
    $params[] = $tenantId;
    $types .= 'i';
    
    $sql = "UPDATE tenants SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Tenant updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update tenant']);
    }
}

/**
 * Delete tenant (with cascade warning)
 * Deletes all related data in the correct order to avoid foreign key constraint errors
 */
function handleDelete() {
    global $conn;
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Tenant ID is required']);
        return;
    }
    
    $tenantId = (int)$data->id;
    
    // Check if tenant exists
    $stmt = $conn->prepare("SELECT shop_name FROM tenants WHERE id = ?");
    $stmt->bind_param("i", $tenantId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Tenant not found']);
        return;
    }
    
    $tenantName = $result->fetch_assoc()['shop_name'];
    $stmt->close();
    
    // Get all shop IDs for this tenant (needed for some tables that reference shops)
    $shopIds = [];
    $shopStmt = $conn->prepare("SELECT id FROM shops WHERE tenant_id = ?");
    $shopStmt->bind_param("i", $tenantId);
    $shopStmt->execute();
    $shopResult = $shopStmt->get_result();
    while ($row = $shopResult->fetch_assoc()) {
        $shopIds[] = (int)$row['id'];
    }
    $shopStmt->close();
    
    // Get all user IDs for this tenant (needed for tables that reference users)
    $userIds = [];
    $userStmt = $conn->prepare("SELECT id FROM users WHERE tenant_id = ?");
    $userStmt->bind_param("i", $tenantId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    while ($row = $userResult->fetch_assoc()) {
        $userIds[] = (int)$row['id'];
    }
    $userStmt->close();
    
    // Start transaction for cascade delete
    $conn->begin_transaction();
    
    try {
        // Delete tables that reference users first (by user_id or recorded_by)
        // These must be deleted before the users table
        if (!empty($userIds)) {
            $userIdList = implode(',', $userIds);
            
            // Tables with recorded_by -> users(id) foreign key (NO CASCADE)
            $userReferenceTables = [
                ['table' => 'debt_payments', 'column' => 'recorded_by'],
                ['table' => 'debts', 'column' => 'recorded_by'],
                // Marketplace tables that reference users
                ['table' => 'marketplace_wallet_transactions', 'column' => 'user_id'],
                ['table' => 'marketplace_reviews', 'column' => 'reviewer_id'],
                ['table' => 'marketplace_reviews', 'column' => 'reviewed_user_id'],
                ['table' => 'marketplace_order_history', 'column' => 'changed_by'],
                ['table' => 'marketplace_messages', 'column' => 'sender_id'],
                ['table' => 'marketplace_messages', 'column' => 'receiver_id'],
                ['table' => 'marketplace_listing_views', 'column' => 'user_id'],
                ['table' => 'marketplace_interests', 'column' => 'user_id'],
                ['table' => 'marketplace_identity_verifications', 'column' => 'user_id'],
                ['table' => 'marketplace_favorites', 'column' => 'user_id'],
                ['table' => 'marketplace_conversations', 'column' => 'buyer_id'],
                ['table' => 'marketplace_conversations', 'column' => 'seller_id'],
                ['table' => 'marketplace_auction_bids', 'column' => 'bidder_id'],
                ['table' => 'kora_payment_references', 'column' => 'user_id'],
                ['table' => 'fraud_alerts', 'column' => 'user_id'],
                ['table' => 'fraud_alerts', 'column' => 'reviewed_by'],
            ];
            
            foreach ($userReferenceTables as $ref) {
                // Check if table exists before trying to delete
                $tableCheck = $conn->query("SHOW TABLES LIKE '{$ref['table']}'");
                if ($tableCheck && $tableCheck->num_rows > 0) {
                    // Use direct query with escaped values since we can't use IN with prepared statements easily
                    $deleteQuery = "DELETE FROM `{$ref['table']}` WHERE `{$ref['column']}` IN ($userIdList)";
                    $conn->query($deleteQuery);
                }
            }
        }
        
        // Delete tables that reference shops
        if (!empty($shopIds)) {
            $shopIdList = implode(',', $shopIds);
            
            // Tables with shop_id column
            $shopReferenceTables = [
                ['table' => 'marketplace_listings', 'column' => 'shop_id'],
                ['table' => 'marketplace_profiles', 'column' => 'shop_id'],
                ['table' => 'customer_analytics', 'column' => 'shop_id'],
                ['table' => 'debts', 'column' => 'shop_id'],
                ['table' => 'marketplace_wallets', 'column' => 'shop_id'],
                ['table' => 'marketplace_interests', 'column' => 'shop_id'],
                ['table' => 'marketplace_reviews', 'column' => 'shop_id'],
                ['table' => 'marketplace_identity_verifications', 'column' => 'shop_id'],
                ['table' => 'marketplace_auction_bids', 'column' => 'shop_id'],
                ['table' => 'marketplace_verification_attempts', 'column' => 'shop_id'],
                ['table' => 'marketplace_withdrawal_requests', 'column' => 'shop_id'],
                ['table' => 'order_disputes', 'column' => 'shop_id'],
                // marketplace_orders has special shop columns
                ['table' => 'marketplace_orders', 'column' => 'seller_shop_id'],
                ['table' => 'marketplace_orders', 'column' => 'buyer_shop_id'],
            ];
            
            foreach ($shopReferenceTables as $ref) {
                $tableCheck = $conn->query("SHOW TABLES LIKE '{$ref['table']}'");
                if ($tableCheck && $tableCheck->num_rows > 0) {
                    $conn->query("DELETE FROM `{$ref['table']}` WHERE `{$ref['column']}` IN ($shopIdList)");
                }
            }
        }
        
        // Delete related data by tenant_id (tables that directly reference tenant_id)
        // Order matters: delete dependent tables first
        $tenantTables = [
            'activity_logs',
            'transaction_items',  // Must be before transactions
            'transactions',
            'inventory',
            'expenses',
            'expense_records',
            'reports',
            'debts',             // After debt_payments
            'users',             // After all user references are deleted
            'shops',             // After all shop references are deleted
        ];
        
        foreach ($tenantTables as $table) {
            // Check if table exists before trying to delete
            $tableCheck = $conn->query("SHOW TABLES LIKE '$table'");
            if ($tableCheck && $tableCheck->num_rows > 0) {
                $deleteStmt = $conn->prepare("DELETE FROM `$table` WHERE tenant_id = ?");
                if ($deleteStmt) {
                    $deleteStmt->bind_param("i", $tenantId);
                    $deleteStmt->execute();
                    $deleteStmt->close();
                }
            }
        }
        
        // Finally delete tenant
        $stmt = $conn->prepare("DELETE FROM tenants WHERE id = ?");
        $stmt->bind_param("i", $tenantId);
        $stmt->execute();
        $stmt->close();
        
        $conn->commit();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Tenant '$tenantName' and all related data deleted successfully"
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        // Log the detailed error for debugging but don't expose it to users
        error_log("Tenant delete failed for ID $tenantId: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Unable to delete the shop. Please try again or contact support.']);
    }
}
?>
