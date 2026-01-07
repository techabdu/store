<?php
/**
 * SubscriptionService.php
 * 
 * Centralized subscription validation and limit checking service.
 * Handles trial status, plan limits, and feature access control.
 */

class SubscriptionService {
    private $conn;
    private $planLimitsCache = [];
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Get the current subscription status for a tenant
     * 
     * @param int $tenantId
     * @return array Subscription status including plan, trial info, and limits
     */
    public function getSubscriptionStatus($tenantId) {
        $stmt = $this->conn->prepare("
            SELECT 
                t.id,
                t.status,
                t.plan_type,
                t.subscription_plan,
                t.trial_ends_at,
                t.subscription_started_at,
                t.created_at
            FROM tenants t
            WHERE t.id = ?
        ");
        $stmt->bind_param("i", $tenantId);
        $stmt->execute();
        $result = $stmt->get_result();
        $tenant = $result->fetch_assoc();
        $stmt->close();
        
        if (!$tenant) {
            return [
                'success' => false,
                'error' => 'Tenant not found'
            ];
        }
        
        // Determine active plan (subscription_plan takes precedence over plan_type)
        $activePlan = $tenant['subscription_plan'] ?: $tenant['plan_type'] ?: 'basic';
        
        // Normalize plan name
        if ($activePlan === 'free_trial' || $activePlan === 'trial') {
            $activePlan = 'basic';
        }
        
        // Calculate trial status
        $trialEndsAt = $tenant['trial_ends_at'] ? strtotime($tenant['trial_ends_at']) : null;
        $now = time();
        $isTrialActive = $trialEndsAt && $trialEndsAt > $now;
        $isTrialExpired = $trialEndsAt && $trialEndsAt <= $now;
        $daysRemaining = $trialEndsAt ? max(0, ceil(($trialEndsAt - $now) / 86400)) : 0;
        
        // Get plan limits
        $limits = $this->getPlanLimits($activePlan);
        
        return [
            'success' => true,
            'subscription' => [
                'tenant_id' => $tenantId,
                'plan' => $activePlan,
                'display_name' => $limits['display_name'] ?? ucfirst($activePlan),
                'status' => $tenant['status'],
                'trial_ends_at' => $tenant['trial_ends_at'],
                'is_trial_active' => $isTrialActive,
                'is_trial_expired' => $isTrialExpired && $activePlan === 'basic',
                'days_remaining' => $daysRemaining,
                'subscription_started_at' => $tenant['subscription_started_at'],
                'limits' => $limits
            ]
        ];
    }
    
    /**
     * Check if the tenant's trial has expired
     * 
     * @param int $tenantId
     * @return bool
     */
    public function isTrialExpired($tenantId) {
        $status = $this->getSubscriptionStatus($tenantId);
        return $status['success'] && $status['subscription']['is_trial_expired'];
    }
    
    /**
     * Get remaining trial days for a tenant
     * 
     * @param int $tenantId
     * @return int Days remaining (0 if expired)
     */
    public function getTrialDaysRemaining($tenantId) {
        $status = $this->getSubscriptionStatus($tenantId);
        return $status['success'] ? $status['subscription']['days_remaining'] : 0;
    }
    
    /**
     * Get subscription limits for a specific plan
     * 
     * @param string $planName
     * @return array Plan limits and features
     */
    public function getPlanLimits($planName) {
        // Check cache first
        if (isset($this->planLimitsCache[$planName])) {
            return $this->planLimitsCache[$planName];
        }
        
        $stmt = $this->conn->prepare("
            SELECT * FROM subscription_limits WHERE plan_name = ?
        ");
        $stmt->bind_param("s", $planName);
        $stmt->execute();
        $result = $stmt->get_result();
        $plan = $result->fetch_assoc();
        $stmt->close();
        
        if (!$plan) {
            // Return default basic limits if plan not found
            return [
                'plan_name' => 'basic',
                'display_name' => 'Starter',
                'price_monthly' => 39999.00,
                'max_inventory_items' => 29,
                'max_sales_history_display' => 50,
                'max_users' => 2,
                'restricted_pages' => ['customer-insights', 'abc-analysis', 'branch-comparison', 'cash-flow', 'budgeting', 'customers', 'branches', 'marketplace'],
                'features' => []
            ];
        }
        
        // Decode JSON fields
        $plan['restricted_pages'] = json_decode($plan['restricted_pages'], true) ?: [];
        $plan['features'] = json_decode($plan['features'], true) ?: [];
        
        // Cache for future calls
        $this->planLimitsCache[$planName] = $plan;
        
        return $plan;
    }
    
    /**
     * Check if a tenant can access a specific feature/page
     * 
     * @param int $tenantId
     * @param string $feature Page path or feature name
     * @return bool
     */
    public function canAccessFeature($tenantId, $feature) {
        $status = $this->getSubscriptionStatus($tenantId);
        
        if (!$status['success']) {
            return false;
        }
        
        // If trial is expired on basic plan, block all access
        if ($status['subscription']['is_trial_expired']) {
            return false;
        }
        
        $restrictedPages = $status['subscription']['limits']['restricted_pages'] ?? [];
        
        // Check if feature/page is in restricted list
        return !in_array($feature, $restrictedPages);
    }
    
    /**
     * Check if tenant can add more inventory items
     * 
     * @param int $tenantId
     * @return array ['allowed' => bool, 'current' => int, 'limit' => int, 'message' => string]
     */
    public function canAddInventory($tenantId) {
        $status = $this->getSubscriptionStatus($tenantId);
        
        if (!$status['success']) {
            return ['allowed' => false, 'message' => 'Unable to verify subscription'];
        }
        
        $limit = $status['subscription']['limits']['max_inventory_items'] ?? 29;
        
        // -1 means unlimited
        if ($limit === -1) {
            return ['allowed' => true, 'current' => 0, 'limit' => -1, 'message' => 'Unlimited'];
        }
        
        // Count current inventory items
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as count FROM inventory 
            WHERE tenant_id = ? AND status != 'deleted'
        ");
        $stmt->bind_param("i", $tenantId);
        $stmt->execute();
        $result = $stmt->get_result();
        $count = $result->fetch_assoc()['count'];
        $stmt->close();
        
        $allowed = $count < $limit;
        $remaining = max(0, $limit - $count);
        
        return [
            'allowed' => $allowed,
            'current' => $count,
            'limit' => $limit,
            'remaining' => $remaining,
            'message' => $allowed 
                ? "You can add {$remaining} more items" 
                : "Inventory limit reached ({$limit} items). Upgrade to add more."
        ];
    }
    
    /**
     * Check if tenant can add more users
     * 
     * @param int $tenantId
     * @return array ['allowed' => bool, 'current' => int, 'limit' => int, 'message' => string]
     */
    public function canAddUser($tenantId) {
        $status = $this->getSubscriptionStatus($tenantId);
        
        if (!$status['success']) {
            return ['allowed' => false, 'message' => 'Unable to verify subscription'];
        }
        
        $limit = $status['subscription']['limits']['max_users'] ?? 2;
        
        // -1 means unlimited
        if ($limit === -1) {
            return ['allowed' => true, 'current' => 0, 'limit' => -1, 'message' => 'Unlimited'];
        }
        
        // Count current active users
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as count FROM users 
            WHERE tenant_id = ? AND status = 'active'
        ");
        $stmt->bind_param("i", $tenantId);
        $stmt->execute();
        $result = $stmt->get_result();
        $count = $result->fetch_assoc()['count'];
        $stmt->close();
        
        $allowed = $count < $limit;
        $remaining = max(0, $limit - $count);
        
        return [
            'allowed' => $allowed,
            'current' => $count,
            'limit' => $limit,
            'remaining' => $remaining,
            'message' => $allowed 
                ? "You can add {$remaining} more user(s)" 
                : "User limit reached ({$limit} users). Upgrade to add more."
        ];
    }
    
    /**
     * Get sales history limit for a tenant's plan
     * 
     * @param int $tenantId
     * @return int Limit (-1 for unlimited)
     */
    public function getSalesHistoryLimit($tenantId) {
        $status = $this->getSubscriptionStatus($tenantId);
        
        if (!$status['success']) {
            return 50; // Default to basic limit
        }
        
        return $status['subscription']['limits']['max_sales_history_display'] ?? 50;
    }
    
    /**
     * Get all available subscription plans
     * 
     * @return array List of plans with their details
     */
    public function getAllPlans() {
        $stmt = $this->conn->prepare("
            SELECT * FROM subscription_limits 
            WHERE is_active = 1 
            ORDER BY sort_order ASC
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        $plans = [];
        
        while ($plan = $result->fetch_assoc()) {
            $plan['restricted_pages'] = json_decode($plan['restricted_pages'], true) ?: [];
            $plan['features'] = json_decode($plan['features'], true) ?: [];
            $plans[] = $plan;
        }
        $stmt->close();
        
        return $plans;
    }
    
    /**
     * Get tenants with trials expiring in X days (for cron reminder emails)
     * 
     * @param int $daysFromNow
     * @return array List of tenants
     */
    public function getTenantsWithExpiringTrials($daysFromNow) {
        $targetDate = date('Y-m-d', strtotime("+{$daysFromNow} days"));
        
        $stmt = $this->conn->prepare("
            SELECT 
                t.id,
                t.shop_name,
                t.shop_email,
                t.trial_ends_at,
                DATEDIFF(t.trial_ends_at, NOW()) as days_remaining
            FROM tenants t
            LEFT JOIN trial_reminder_log trl ON t.id = trl.tenant_id 
                AND trl.reminder_type = ?
            WHERE t.subscription_plan IN ('basic', 'trial')
                AND DATE(t.trial_ends_at) = ?
                AND t.status = 'active'
                AND trl.id IS NULL
        ");
        
        $reminderType = "{$daysFromNow}_days";
        if ($daysFromNow === 7) $reminderType = '7_days';
        if ($daysFromNow === 3) $reminderType = '3_days';
        if ($daysFromNow === 1) $reminderType = '1_day';
        
        $stmt->bind_param("ss", $reminderType, $targetDate);
        $stmt->execute();
        $result = $stmt->get_result();
        $tenants = [];
        
        while ($tenant = $result->fetch_assoc()) {
            $tenants[] = $tenant;
        }
        $stmt->close();
        
        return $tenants;
    }
    
    /**
     * Log that a reminder was sent
     * 
     * @param int $tenantId
     * @param string $reminderType ('7_days', '3_days', '1_day', 'expired')
     * @param string $email
     * @return bool
     */
    public function logReminderSent($tenantId, $reminderType, $email) {
        $stmt = $this->conn->prepare("
            INSERT INTO trial_reminder_log (tenant_id, reminder_type, email_sent_to)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE sent_at = CURRENT_TIMESTAMP
        ");
        $stmt->bind_param("iss", $tenantId, $reminderType, $email);
        $result = $stmt->execute();
        $stmt->close();
        
        return $result;
    }
}
?>
