<?php
/**
 * Subscription Status API
 * 
 * Returns the current subscription status, plan limits, and trial information
 * for the authenticated user's tenant.
 * 
 * GET /api/subscription/status.php
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../classes/SubscriptionService.php';

// Set CORS headers
setCorsHeaders();

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Require authentication
$user = checkAuth();

$tenantId = $_SESSION['tenant_id'];

// SuperAdmin doesn't have subscription limits
if ($user['role'] === 'superadmin') {
    echo json_encode([
        'success' => true,
        'subscription' => [
            'plan' => 'superadmin',
            'display_name' => 'SuperAdmin',
            'status' => 'active',
            'is_trial_active' => false,
            'is_trial_expired' => false,
            'days_remaining' => 0,
            'limits' => [
                'max_inventory_items' => -1,
                'max_sales_history_display' => -1,
                'max_users' => -1,
                'restricted_pages' => []
            ]
        ]
    ]);
    exit;
}

try {
    $subscriptionService = new SubscriptionService($conn);
    $status = $subscriptionService->getSubscriptionStatus($tenantId);
    
    if (!$status['success']) {
        http_response_code(404);
        echo json_encode($status);
        exit;
    }
    
    echo json_encode($status);
    
} catch (Exception $e) {
    error_log("Subscription Status Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to retrieve subscription status'
    ]);
}
?>
