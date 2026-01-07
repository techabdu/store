<?php
/**
 * Subscription Check Middleware
 * 
 * Validates subscription status and enforces limits on protected API endpoints.
 * Include this at the top of API endpoints that need subscription enforcement.
 * 
 * Usage:
 *   require_once '../middleware/subscription_check.php';
 *   
 *   // Check trial expiry (blocks all access if expired on basic plan)
 *   requireActiveSubscription($conn, $tenantId);
 *   
 *   // Check specific feature access
 *   requireFeatureAccess($conn, $tenantId, 'budgeting');
 *   
 *   // Check inventory limit before adding
 *   checkInventoryLimit($conn, $tenantId);
 */

require_once __DIR__ . '/../classes/SubscriptionService.php';

/**
 * Require an active (non-expired) subscription
 * Returns 402 Payment Required if trial expired
 * 
 * @param mysqli $conn
 * @param int $tenantId
 * @return array Subscription status
 */
function requireActiveSubscription($conn, $tenantId) {
    $subscriptionService = new SubscriptionService($conn);
    $status = $subscriptionService->getSubscriptionStatus($tenantId);
    
    if (!$status['success']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Unable to verify subscription',
            'subscription_required' => true
        ]);
        exit;
    }
    
    // Check if trial expired on basic plan
    if ($status['subscription']['is_trial_expired']) {
        http_response_code(402); // Payment Required
        echo json_encode([
            'success' => false,
            'error' => 'Your trial has expired. Please subscribe to continue.',
            'subscription_required' => true,
            'subscription_expired' => true,
            'redirect' => '/subscribe'
        ]);
        exit;
    }
    
    return $status;
}

/**
 * Require access to a specific feature/page
 * Returns 403 Forbidden if feature is restricted on current plan
 * 
 * @param mysqli $conn
 * @param int $tenantId
 * @param string $feature Feature/page name to check
 * @return bool
 */
function requireFeatureAccess($conn, $tenantId, $feature) {
    $subscriptionService = new SubscriptionService($conn);
    
    if (!$subscriptionService->canAccessFeature($tenantId, $feature)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'This feature requires a Pro subscription.',
            'feature_restricted' => true,
            'required_plan' => 'pro',
            'redirect' => '/subscribe'
        ]);
        exit;
    }
    
    return true;
}

/**
 * Check inventory limit before adding items
 * Returns 403 with limit info if limit reached
 * 
 * @param mysqli $conn
 * @param int $tenantId
 * @return array Limit status
 */
function checkInventoryLimit($conn, $tenantId) {
    $subscriptionService = new SubscriptionService($conn);
    $limitCheck = $subscriptionService->canAddInventory($tenantId);
    
    if (!$limitCheck['allowed']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => $limitCheck['message'],
            'limit_reached' => true,
            'limit_type' => 'inventory',
            'current' => $limitCheck['current'],
            'limit' => $limitCheck['limit'],
            'redirect' => '/subscribe'
        ]);
        exit;
    }
    
    return $limitCheck;
}

/**
 * Check user limit before adding users
 * Returns 403 with limit info if limit reached
 * 
 * @param mysqli $conn
 * @param int $tenantId
 * @return array Limit status
 */
function checkUserLimit($conn, $tenantId) {
    $subscriptionService = new SubscriptionService($conn);
    $limitCheck = $subscriptionService->canAddUser($tenantId);
    
    if (!$limitCheck['allowed']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => $limitCheck['message'],
            'limit_reached' => true,
            'limit_type' => 'users',
            'current' => $limitCheck['current'],
            'limit' => $limitCheck['limit'],
            'redirect' => '/subscribe'
        ]);
        exit;
    }
    
    return $limitCheck;
}

/**
 * Get sales history limit for current plan
 * 
 * @param mysqli $conn
 * @param int $tenantId
 * @return int Limit (-1 for unlimited)
 */
function getSalesHistoryLimit($conn, $tenantId) {
    $subscriptionService = new SubscriptionService($conn);
    return $subscriptionService->getSalesHistoryLimit($tenantId);
}

/**
 * Get full subscription status without blocking
 * Useful for informational purposes
 * 
 * @param mysqli $conn
 * @param int $tenantId
 * @return array Subscription details
 */
function getSubscriptionInfo($conn, $tenantId) {
    $subscriptionService = new SubscriptionService($conn);
    return $subscriptionService->getSubscriptionStatus($tenantId);
}
?>
