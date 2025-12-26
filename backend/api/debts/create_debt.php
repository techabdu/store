<?php
/**
 * Create Debt API
 * 
 * Purpose: Create a new debt record from POS transaction
 * Method: POST
 * Authentication: Required (session)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers
setCorsHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
$user_data = checkAuth();
$shop_id = getCurrentShopId();

if ($shop_id === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
    exit;
}

try {
    // Get and decode request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required_fields = ['customer_name', 'customer_phone', 'customer_address', 'total_amount', 'paid_amount'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || trim($input[$field]) === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => ucfirst(str_replace('_', ' ', $field)) . ' is required']);
            exit;
        }
    }
    
    // Extract and sanitize inputs
    $shop_id = getCurrentShopId();
    $transaction_id = isset($input['transaction_id']) ? intval($input['transaction_id']) : null;
    $customer_name = trim($input['customer_name']);
    $customer_phone = trim($input['customer_phone']);
    $customer_address = trim($input['customer_address']);
    $total_amount = floatval($input['total_amount']);
    $paid_amount = floatval($input['paid_amount']);
    $payment_method = isset($input['payment_method']) ? $input['payment_method'] : 'cash';
    $recorded_by = $user_data['id'];
    
    // Validate payment method
    $allowed_methods = ['cash', 'card', 'transfer', 'mixed'];
    if (!in_array($payment_method, $allowed_methods)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid payment method']);
        exit;
    }

    // Validate amounts
    if ($total_amount <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Total amount must be greater than 0']);
        exit;
    }
    
    if ($paid_amount < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Paid amount cannot be negative']);
        exit;
    }
    
    if ($paid_amount > $total_amount) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Paid amount cannot exceed total amount']);
        exit;
    }
    
    // Validate phone number format (Nigerian format)
    if (!preg_match('/^(\+234|0)[789][01]\d{8}$/', $customer_phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid phone number format. Use Nigerian format: +234XXXXXXXXXX or 0XXXXXXXXXX']);
        exit;
    }
    
    // Calculate remaining balance
    $remaining_balance = $total_amount - $paid_amount;
    
    // Determine status
    $status = 'unpaid';
    if ($paid_amount > 0 && $paid_amount < $total_amount) {
        $status = 'partially_paid';
    } elseif ($paid_amount >= $total_amount) {
        $status = 'fully_paid';
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Insert debt record
        $stmt = $conn->prepare(
            "INSERT INTO debts (tenant_id, shop_id, transaction_id, customer_name, customer_phone, customer_address, 
             total_amount, paid_amount, remaining_balance, status, recorded_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        $tenant_id = $_SESSION['tenant_id'];
        $stmt->bind_param(
            "iiisssddssi",
            $tenant_id,
            $shop_id,
            $transaction_id,
            $customer_name,
            $customer_phone,
            $customer_address,
            $total_amount,
            $paid_amount,
            $remaining_balance,
            $status,
            $recorded_by
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to create debt record");
        }
        
        $debt_id = $conn->insert_id;
        
        // If there's an initial payment, record it in debt_payments
        if ($paid_amount > 0) {
            $payment_stmt = $conn->prepare(
                "INSERT INTO debt_payments (debt_id, amount_paid, payment_method, recorded_by, notes) 
                 VALUES (?, ?, ?, ?, ?)"
            );
            
            $initial_payment_note = "Initial payment";
            $payment_stmt->bind_param("idsis", $debt_id, $paid_amount, $payment_method, $recorded_by, $initial_payment_note);
            
            if (!$payment_stmt->execute()) {
                throw new Exception("Failed to record initial payment");
            }
            
            $payment_stmt->close();
        }
        
        // Commit transaction
        $conn->commit();
        
        // Fetch the created debt with user details
        $fetch_stmt = $conn->prepare(
            "SELECT d.*, u.username as recorded_by_name 
             FROM debts d 
             JOIN users u ON d.recorded_by = u.id 
             WHERE d.id = ?"
        );
        
        $fetch_stmt->bind_param("i", $debt_id);
        $fetch_stmt->execute();
        $result = $fetch_stmt->get_result()->fetch_assoc();
        
        if ($result) {
            // NEW: Update Customer Analytics
            require_once '../../helpers/customer_analytics.php';
            updateCustomerAnalytics($conn, $shop_id, $_SESSION['tenant_id'], $customer_phone, $customer_name, 0); // Updates/creates customer record
            updateCustomerDebtMetrics($conn, $shop_id, $customer_phone, $paid_amount); // Recalculates debt specific metrics

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Debt created successfully',
                'debt' => [
                    'id' => $debt_id,
                    'customer_name' => $customer_name,
                    'customer_phone' => $customer_phone,
                    'customer_address' => $customer_address,
                    'total_amount' => number_format($total_amount, 2, '.', ''),
                    'paid_amount' => number_format($paid_amount, 2, '.', ''),
                    'remaining_balance' => number_format($remaining_balance, 2, '.', ''),
                    'status' => $status
                ]
            ]);
        } else {
            throw new Exception("Failed to fetch created debt");
        }
        
        $stmt->close();
        $fetch_stmt->close();
        
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        error_log("Create debt error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create debt record']);
        exit;
    }
    
} catch (Exception $e) {
    error_log("Create debt API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>
