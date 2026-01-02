<?php
/**
 * Payment Plans API
 * Manages subscription plans and tenant plan information
 */

require_once '../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/role.php';

// Set CORS headers using centralized config
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

// Authenticate user
$user = checkAuth();

// Handle different request methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($user);
        break;
    case 'POST':
        handlePost($user);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}

/**
 * Get payment plans or current tenant's plan
 */
function handleGet($user) {
    global $conn;
    
    // Check if requesting current plan
    $path = $_GET['path'] ?? '';
    
    if ($path === 'current') {
        // Get current tenant's plan information
        $stmt = $conn->prepare("
            SELECT 
                plan_type,
                status,
                trial_ends_at,
                subscription_ends_at,
                email_verified,
                created_at
            FROM tenants 
            WHERE id = ?
        ");
        $stmt->bind_param("i", $user['tenant_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Tenant not found']);
            return;
        }
        
        $plan = $result->fetch_assoc();
        
        // Calculate days remaining
        $daysRemaining = null;
        if ($plan['trial_ends_at']) {
            $trialEnd = new DateTime($plan['trial_ends_at']);
            $now = new DateTime();
            $diff = $now->diff($trialEnd);
            $daysRemaining = $diff->invert ? 0 : $diff->days;
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'plan' => [
                'plan_type' => $plan['plan_type'],
                'status' => $plan['status'],
                'trial_ends_at' => $plan['trial_ends_at'],
                'subscription_ends_at' => $plan['subscription_ends_at'],
                'days_remaining' => $daysRemaining,
                'email_verified' => (bool)$plan['email_verified'],
                'created_at' => $plan['created_at']
            ]
        ]);
        
    } else {
        // Get available payment plans (static for now)
        $plans = [
            [
                'id' => 'free_trial',
                'name' => 'Free Trial',
                'price' => 0,
                'duration' => '25 days',
                'features' => [
                    'Full access to all features',
                    'Up to 5 users',
                    'Unlimited inventory items',
                    'Basic support'
                ]
            ],
            [
                'id' => 'basic',
                'name' => 'Basic Plan',
                'price' => 29.99,
                'duration' => 'per month',
                'features' => [
                    'All trial features',
                    'Up to 10 users',
                    'Priority support',
                    'Advanced reporting'
                ]
            ],
            [
                'id' => 'premium',
                'name' => 'Premium Plan',
                'price' => 79.99,
                'duration' => 'per month',
                'features' => [
                    'All basic features',
                    'Unlimited users',
                    '24/7 support',
                    'Custom integrations',
                    'API access'
                ]
            ],
            [
                'id' => 'enterprise',
                'name' => 'Enterprise Plan',
                'price' => 199.99,
                'duration' => 'per month',
                'features' => [
                    'All premium features',
                    'Dedicated account manager',
                    'Custom development',
                    'SLA guarantee',
                    'White-label options'
                ]
            ]
        ];
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'plans' => $plans
        ]);
    }
}

/**
 * Subscribe to a plan (placeholder for future payment integration)
 */
function handlePost($user) {
    global $conn;
    
    // Only admin can change plan
    checkRole(['admin']);
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->plan_type)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Plan type is required']);
        return;
    }
    
    $planType = $data->plan_type;
    $validPlans = ['free_trial', 'basic', 'premium', 'enterprise'];
    
    if (!in_array($planType, $validPlans)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid plan type']);
        return;
    }
    
    // For now, just update the plan type
    // In the future, this would integrate with Stripe/PayPal
    $newStatus = ($planType === 'free_trial') ? 'trial' : 'active';
    $subscriptionEnds = ($planType !== 'free_trial') ? date('Y-m-d H:i:s', strtotime('+30 days')) : null;
    
    $stmt = $conn->prepare("
        UPDATE tenants 
        SET plan_type = ?, 
            status = ?,
            subscription_ends_at = ?
        WHERE id = ?
    ");
    $stmt->bind_param("sssi", $planType, $newStatus, $subscriptionEnds, $user['tenant_id']);
    
    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Plan updated successfully',
            'plan_type' => $planType,
            'status' => $newStatus
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update plan']);
    }
}
?>
