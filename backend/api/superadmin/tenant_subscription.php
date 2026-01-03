<?php
/**
 * Tenant Subscription API (SuperAdmin Only)
 * 
 * Purpose: Manage tenant subscriptions and billing
 * Method: GET (current_plan, billing_history), POST (upgrade, extend_trial, cancel)
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=current_plan: Get current subscription details
 * - action=upgrade: Manually upgrade plan (POST)
 * - action=extend_trial: Extend trial period (POST)
 * - action=cancel: Cancel subscription with reason (POST)
 * - action=billing_history: Get payment/subscription history
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

global $conn;

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'current_plan';

if ($method === 'GET') {
    if ($action === 'current_plan') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // Get current subscription details
        $sub_stmt = $conn->prepare("
            SELECT 
                id, shop_name, status, plan_type, subscription_plan,
                trial_ends_at, subscription_ends_at, mrr,
                created_at, cancelled_at, cancellation_reason
            FROM tenants 
            WHERE id = ?
        ");
        
        if (!$sub_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
            exit;
        }
        
        $sub_stmt->bind_param("i", $tenant_id);
        $sub_stmt->execute();
        $result = $sub_stmt->get_result();
        
        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Tenant not found']);
            exit;
        }
        
        $subscription = $result->fetch_assoc();
        $sub_stmt->close();
        
        // Calculate days remaining for trial
        $days_remaining = null;
        $is_trial_active = false;
        if ($subscription['trial_ends_at']) {
            $trial_end = new DateTime($subscription['trial_ends_at']);
            $now = new DateTime();
            $diff = $now->diff($trial_end);
            $days_remaining = $diff->invert ? 0 : $diff->days;
            $is_trial_active = !$diff->invert;
        }
        
        // Determine active plan
        $active_plan = $subscription['plan_type'];
        if ($subscription['subscription_plan'] && $subscription['subscription_plan'] !== 'trial') {
            $active_plan = $subscription['subscription_plan'];
        }
        
        // Get subscription history
        $history_stmt = $conn->prepare("
            SELECT 
                id, from_plan, to_plan, changed_by, changed_at, notes
            FROM subscription_history 
            WHERE tenant_id = ?
            ORDER BY changed_at DESC
            LIMIT 10
        ");
        
        $history = [];
        if ($history_stmt) {
            $history_stmt->bind_param("i", $tenant_id);
            $history_stmt->execute();
            $history_result = $history_stmt->get_result();
            
            while ($row = $history_result->fetch_assoc()) {
                // Get admin username
                $admin_stmt = $conn->prepare("SELECT username FROM users WHERE id = ?");
                $admin_stmt->bind_param("i", $row['changed_by']);
                $admin_stmt->execute();
                $admin_result = $admin_stmt->get_result();
                $row['changed_by_name'] = $admin_result->num_rows > 0 ? $admin_result->fetch_assoc()['username'] : 'System';
                $admin_stmt->close();
                
                $history[] = $row;
            }
            $history_stmt->close();
        }
        
        echo json_encode([
            'success' => true,
            'subscription' => [
                'tenant_id' => $subscription['id'],
                'shop_name' => $subscription['shop_name'],
                'status' => $subscription['status'],
                'active_plan' => $active_plan,
                'plan_type' => $subscription['plan_type'],
                'subscription_plan' => $subscription['subscription_plan'],
                'trial_ends_at' => $subscription['trial_ends_at'],
                'subscription_ends_at' => $subscription['subscription_ends_at'],
                'days_remaining' => $days_remaining,
                'is_trial_active' => $is_trial_active,
                'mrr' => floatval($subscription['mrr']),
                'is_cancelled' => !is_null($subscription['cancelled_at']),
                'cancelled_at' => $subscription['cancelled_at'],
                'cancellation_reason' => $subscription['cancellation_reason']
            ],
            'history' => $history
        ]);
        
    } elseif ($action === 'billing_history') {
        $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
            exit;
        }
        
        // TODO: Implement when payments table is created
        // For now, return subscription history as billing history
        $history_stmt = $conn->prepare("
            SELECT 
                id, from_plan, to_plan, changed_by, changed_at, notes
            FROM subscription_history 
            WHERE tenant_id = ?
            ORDER BY changed_at DESC
        ");
        
        $billing = [];
        if ($history_stmt) {
            $history_stmt->bind_param("i", $tenant_id);
            $history_stmt->execute();
            $result = $history_stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $billing[] = $row;
            }
            $history_stmt->close();
        }
        
        echo json_encode([
            'success' => true,
            'billing_history' => $billing,
            'note' => 'Full payment integration pending'
        ]);
    }
    
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'upgrade') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $new_plan = isset($data['new_plan']) ? trim($data['new_plan']) : '';
        $subscription_ends_at = isset($data['subscription_ends_at']) ? $data['subscription_ends_at'] : null;
        $mrr = isset($data['mrr']) ? floatval($data['mrr']) : 0;
        $notes = isset($data['notes']) ? trim($data['notes']) : '';
        
        if ($tenant_id <= 0 || empty($new_plan)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id and new_plan are required']);
            exit;
        }
        
        // Validate plan
        $valid_plans = ['free_trial', 'basic', 'premium', 'enterprise'];
        if (!in_array($new_plan, $valid_plans)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid plan type. Must be: ' . implode(', ', $valid_plans)]);
            exit;
        }
        
        // Get current plan
        $current_stmt = $conn->prepare("SELECT plan_type, subscription_plan, status FROM tenants WHERE id = ?");
        $current_stmt->bind_param("i", $tenant_id);
        $current_stmt->execute();
        $current_result = $current_stmt->get_result();
        
        if ($current_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Tenant not found']);
            exit;
        }
        
        $current = $current_result->fetch_assoc();
        $old_plan = $current['subscription_plan'] ?: $current['plan_type'];
        $current_stmt->close();
        
        // Set subscription end date if not provided (default: 1 year)
        if (empty($subscription_ends_at)) {
            $subscription_ends_at = date('Y-m-d H:i:s', strtotime('+1 year'));
        }
        
        // Update tenant subscription
        $update_stmt = $conn->prepare("
            UPDATE tenants 
            SET plan_type = ?, 
                subscription_plan = ?,
                subscription_ends_at = ?,
                mrr = ?,
                status = 'active',
                cancelled_at = NULL,
                cancellation_reason = NULL
            WHERE id = ?
        ");
        
        $update_stmt->bind_param("sssdi", $new_plan, $new_plan, $subscription_ends_at, $mrr, $tenant_id);
        
        if ($update_stmt->execute()) {
            // Log to subscription history
            $history_stmt = $conn->prepare("
                INSERT INTO subscription_history 
                (tenant_id, from_plan, to_plan, changed_by, notes) 
                VALUES (?, ?, ?, ?, ?)
            ");
            
            if ($history_stmt) {
                $admin_id = $_SESSION['user_id'];
                $history_stmt->bind_param("issis", $tenant_id, $old_plan, $new_plan, $admin_id, $notes);
                $history_stmt->execute();
                $history_stmt->close();
            }
            
            // Log activity
            $activity_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, 'subscription_upgraded', 'tenant', ?, ?)
            ");
            if ($activity_stmt) {
                $details = "Upgraded from $old_plan to $new_plan";
                $activity_stmt->bind_param("iiis", $tenant_id, $_SESSION['user_id'], $tenant_id, $details);
                $activity_stmt->execute();
                $activity_stmt->close();
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Subscription upgraded to $new_plan successfully",
                'old_plan' => $old_plan,
                'new_plan' => $new_plan
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to upgrade subscription: ' . $update_stmt->error]);
        }
        $update_stmt->close();
        
    } elseif ($action === 'extend_trial') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $days_to_add = isset($data['days']) ? intval($data['days']) : 0;
        $reason = isset($data['reason']) ? trim($data['reason']) : '';
        
        if ($tenant_id <= 0 || $days_to_add <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id and days (> 0) are required']);
            exit;
        }
        
        // Get current trial end date
        $trial_stmt = $conn->prepare("SELECT trial_ends_at FROM tenants WHERE id = ?");
        $trial_stmt->bind_param("i", $tenant_id);
        $trial_stmt->execute();
        $trial_result = $trial_stmt->get_result();
        
        if ($trial_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Tenant not found']);
            exit;
        }
        
        $current_trial = $trial_result->fetch_assoc()['trial_ends_at'];
        $trial_stmt->close();
        
        // Calculate new trial end date
        if (empty($current_trial) || strtotime($current_trial) < time()) {
            // If trial expired or not set, start from now
            $new_trial_end = date('Y-m-d H:i:s', strtotime("+$days_to_add days"));
        } else {
            // Extend from current end date
            $new_trial_end = date('Y-m-d H:i:s', strtotime($current_trial . " +$days_to_add days"));
        }
        
        // Update trial end date
        $extend_stmt = $conn->prepare("UPDATE tenants SET trial_ends_at = ?, status = 'trial' WHERE id = ?");
        $extend_stmt->bind_param("si", $new_trial_end, $tenant_id);
        
        if ($extend_stmt->execute()) {
            // Log activity
            $activity_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, 'trial_extended', 'tenant', ?, ?)
            ");
            if ($activity_stmt) {
                $details = "Trial extended by $days_to_add days. Reason: $reason";
                $activity_stmt->bind_param("iiis", $tenant_id, $_SESSION['user_id'], $tenant_id, $details);
                $activity_stmt->execute();
                $activity_stmt->close();
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Trial extended by $days_to_add days",
                'new_trial_end' => $new_trial_end
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to extend trial: ' . $extend_stmt->error]);
        }
        $extend_stmt->close();
        
    } elseif ($action === 'cancel') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $reason = isset($data['reason']) ? trim($data['reason']) : '';
        
        if ($tenant_id <= 0 || empty($reason)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id and reason are required']);
            exit;
        }
        
        // Cancel subscription
        $cancel_stmt = $conn->prepare("
            UPDATE tenants 
            SET status = 'suspended',
                cancelled_at = CURRENT_TIMESTAMP,
                cancellation_reason = ?
            WHERE id = ?
        ");
        
        $cancel_stmt->bind_param("si", $reason, $tenant_id);
        
        if ($cancel_stmt->execute()) {
            // Log activity
            $activity_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, 'subscription_cancelled', 'tenant', ?, ?)
            ");
            if ($activity_stmt) {
                $details = "Subscription cancelled. Reason: $reason";
                $activity_stmt->bind_param("iiis", $tenant_id, $_SESSION['user_id'], $tenant_id, $details);
                $activity_stmt->execute();
                $activity_stmt->close();
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Subscription cancelled successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to cancel subscription: ' . $cancel_stmt->error]);
        }
        $cancel_stmt->close();
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
