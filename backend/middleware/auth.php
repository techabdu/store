<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/session_helper.php';

/**
 * Initialize session with centralized configuration
 */
initializeSecureSession();

/**
 * Check if user is authenticated and session is valid
 * Also verifies tenant status and stores tenant_id in session
 * 
 * @return array|void Returns user data if valid, or exits with 401/403
 */
function checkAuth() {
    global $conn;
    
    // Check if user_id is in session
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized: No session']);
        exit;
    }
    
    // Check session timeout using centralized helper
    if (!checkSessionTimeout()) {
        destroySession();
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Session expired']);
        exit;
    }
    
    // Verify user exists and is active, and get tenant_id and shop_id
    
    try {
        $stmt = $conn->prepare("SELECT id, username, role, status, tenant_id, shop_id FROM users WHERE id = ?");
        if (!$stmt) {
             throw new Exception("Prepare failed: " . $conn->error);
        }
        $stmt->bind_param("i", $_SESSION['user_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            destroySession();
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }
        
        $user = $result->fetch_assoc();
        
        if ($user['status'] !== 'active') {
            destroySession();
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Account inactive']);
            exit;
        }
        
        // Store tenant_id in session if not already set
        if (!isset($_SESSION['tenant_id']) || $_SESSION['tenant_id'] !== $user['tenant_id']) {
            $_SESSION['tenant_id'] = $user['tenant_id'];
        }
        
        // Store user's assigned shop_id (NULL for owners who can access all shops)
        $_SESSION['user_shop_id'] = $user['shop_id'];
        $_SESSION['role'] = $user['role'];
        
        // Initialize shop context if not already set
        if (!isset($_SESSION['current_shop_id']) && $user['role'] !== 'superadmin') {
            if ($user['shop_id'] !== null) {
                // Branch manager or staff - set their assigned shop
                $_SESSION['current_shop_id'] = $user['shop_id'];
            } else if ($user['role'] === 'admin') {
                // Owner - set main branch as default
                $shopStmt = $conn->prepare("SELECT id FROM shops WHERE tenant_id = ? AND is_main_branch = 1 LIMIT 1");
                if ($shopStmt) {
                    $shopStmt->bind_param("i", $user['tenant_id']);
                    $shopStmt->execute();
                    $shopResult = $shopStmt->get_result();
                    if ($shopResult->num_rows > 0) {
                        $mainShop = $shopResult->fetch_assoc();
                        $_SESSION['current_shop_id'] = $mainShop['id'];
                    } else {
                        // Fallback: get any shop for this tenant
                        $anyShopStmt = $conn->prepare("SELECT id FROM shops WHERE tenant_id = ? ORDER BY id LIMIT 1");
                        if ($anyShopStmt) {
                            $anyShopStmt->bind_param("i", $user['tenant_id']);
                            $anyShopStmt->execute();
                            $anyShopResult = $anyShopStmt->get_result();
                            if ($anyShopResult->num_rows > 0) {
                                $anyShop = $anyShopResult->fetch_assoc();
                                $_SESSION['current_shop_id'] = $anyShop['id'];
                            }
                            $anyShopStmt->close();
                        }
                    }
                    $shopStmt->close();
                }
            }
        }
        

        // Verify tenant status (skip for superadmin)
        if ($user['role'] !== 'superadmin') {
            $tenantStmt = $conn->prepare("SELECT status, plan_type, trial_ends_at FROM tenants WHERE id = ?");
            if (!$tenantStmt) {
                throw new Exception("Tenant prepare failed: " . $conn->error);
            }
            $tenantStmt->bind_param("i", $user['tenant_id']);
            $tenantStmt->execute();
            $tenantResult = $tenantStmt->get_result();
            
            if ($tenantResult->num_rows === 0) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Tenant not found']);
                exit;
            }
            
            $tenant = $tenantResult->fetch_assoc();
            
            // Check tenant status
            if ($tenant['status'] === 'suspended') {
                destroySession();
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Your shop has been suspended. Please contact support.']);
                exit;
            }
            
            if ($tenant['status'] === 'pending') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Please verify your email to activate your account.']);
                exit;
            }
            
            // Check trial expiration
            if ($tenant['status'] === 'trial' && $tenant['trial_ends_at']) {
                $trialEnds = strtotime($tenant['trial_ends_at']);
                if (time() > $trialEnds) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Your free trial has expired. Please subscribe to continue.']);
                    exit;
                }
            }
        }
        
        return $user;
    } catch (Exception $e) {
        header("HTTP/1.1 500 Internal Server Error");
        echo json_encode(['success' => false, 'error' => 'Auth error: ' . $e->getMessage()]);
        exit;
    }
}
?>
