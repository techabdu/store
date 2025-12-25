<?php
/**
 * Record Debt Payment API
 * 
 * Purpose: Record a payment towards an existing debt
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
    if (!isset($input['debt_id']) || !is_numeric($input['debt_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Debt ID is required']);
        exit;
    }
    
    if (!isset($input['amount_paid']) || !is_numeric($input['amount_paid'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Payment amount is required']);
        exit;
    }
    
    $shop_id = getCurrentShopId();
    $debt_id = intval($input['debt_id']);
    $amount_paid = floatval($input['amount_paid']);
    $notes = isset($input['notes']) ? trim($input['notes']) : null;
    $payment_method = isset($input['payment_method']) ? $input['payment_method'] : 'cash';
    $recorded_by = $user_data['id'];
    
    // Validate amount
    if ($amount_paid <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Payment amount must be greater than 0']);
        exit;
    }

    // Validate payment method
    $allowed_methods = ['cash', 'card', 'transfer', 'mixed'];
    if (!in_array($payment_method, $allowed_methods)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid payment method']);
        exit;
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Fetch debt and verify it belongs to the shop
        $debt_stmt = $conn->prepare("SELECT * FROM debts WHERE id = ? AND shop_id = ?");
        $debt_stmt->bind_param("ii", $debt_id, $shop_id);
        $debt_stmt->execute();
        $debt_result = $debt_stmt->get_result();
        
        if ($debt_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Debt not found']);
            $conn->rollback();
            exit;
        }
        
        $debt = $debt_result->fetch_assoc();
        $debt_stmt->close();
        
        // Check if debt is already fully paid or written off
        if ($debt['status'] === 'fully_paid') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Debt is already fully paid']);
            $conn->rollback();
            exit;
        }
        
        if ($debt['status'] === 'written_off') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Cannot add payment to a written-off debt']);
            $conn->rollback();
            exit;
        }
        
        $current_remaining = floatval($debt['remaining_balance']);
        
        // Validate payment doesn't exceed remaining balance
        if ($amount_paid > $current_remaining) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'error' => 'Payment amount exceeds remaining balance',
                'remaining_balance' => number_format($current_remaining, 2, '.', '')
            ]);
            $conn->rollback();
            exit;
        }
        
        // Insert payment record
        $payment_stmt = $conn->prepare(
            "INSERT INTO debt_payments (debt_id, amount_paid, payment_method, recorded_by, notes) 
             VALUES (?, ?, ?, ?, ?)"
        );
        
        $payment_stmt->bind_param("idsis", $debt_id, $amount_paid, $payment_method, $recorded_by, $notes);
        
        if (!$payment_stmt->execute()) {
            throw new Exception("Failed to record payment");
        }
        
        $payment_id = $conn->insert_id;
        $payment_stmt->close();

        // Also record this in transactions table so it reflects in Sales History
        $tx_stmt = $conn->prepare(
            "INSERT INTO transactions (tenant_id, shop_id, user_id, customer_name, customer_phone, customer_address, total_amount, payment_method, transaction_type, debt_payment_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'debt_payment', ?)"
        );
        
        $tenant_id = $_SESSION['tenant_id'];
        $tx_stmt->bind_param(
            "iiisssdsi",
            $tenant_id,
            $shop_id,
            $recorded_by,
            $debt['customer_name'],
            $debt['customer_phone'],
            $debt['customer_address'],
            $amount_paid,
            $payment_method,
            $payment_id
        );
        
        if (!$tx_stmt->execute()) {
            throw new Exception("Failed to track payment in sales history");
        }
        $tx_stmt->close();
        
        // Update debt record
        $new_paid_amount = floatval($debt['paid_amount']) + $amount_paid;
        $new_remaining_balance = floatval($debt['total_amount']) - $new_paid_amount;
        
        // Determine new status
        $new_status = 'partially_paid';
        if ($new_remaining_balance <= 0.01) { // Account for floating point precision
            $new_status = 'fully_paid';
            $new_remaining_balance = 0;
        }
        
        $update_stmt = $conn->prepare(
            "UPDATE debts 
             SET paid_amount = ?, remaining_balance = ?, status = ? 
             WHERE id = ?"
        );
        
        $update_stmt->bind_param("ddsi", $new_paid_amount, $new_remaining_balance, $new_status, $debt_id);
        
        if (!$update_stmt->execute()) {
            throw new Exception("Failed to update debt");
        }
        
        $update_stmt->close();
        
        // Commit transaction
        $conn->commit();
        
        // Fetch updated debt
        $fetch_stmt = $conn->prepare(
            "SELECT d.*, u.username as recorded_by_name 
             FROM debts d 
             JOIN users u ON d.recorded_by = u.id 
             WHERE d.id = ?"
        );
        
        $fetch_stmt->bind_param("i", $debt_id);
        $fetch_stmt->execute();
        $fetch_result = $fetch_stmt->get_result();
        $updated_debt = $fetch_result->fetch_assoc();
        $fetch_stmt->close();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Payment recorded successfully',
            'payment_id' => $payment_id,
            'debt' => [
                'id' => intval($updated_debt['id']),
                'total_amount' => number_format($updated_debt['total_amount'], 2, '.', ''),
                'paid_amount' => number_format($updated_debt['paid_amount'], 2, '.', ''),
                'remaining_balance' => number_format($updated_debt['remaining_balance'], 2, '.', ''),
                'status' => $updated_debt['status']
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        error_log("Record payment transaction error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to record payment']);
        exit;
    }
    
} catch (Exception $e) {
    error_log("Record debt payment API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>
