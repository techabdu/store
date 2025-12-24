<?php
/**
 * Write Off Debt API
 * 
 * Purpose: Admin-only endpoint to write off (forgive) a debt
 * Method: POST
 * Authentication: Required (session + admin role)
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

// Verify admin or superadmin role
if (!in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden - Admin access required']);
    exit;
}

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
    
    $shop_id = getCurrentShopId();
    $debt_id = intval($input['debt_id']);
    $notes = isset($input['notes']) ? trim($input['notes']) : 'Debt written off by admin';
    $recorded_by = $user_data['id'];
    
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
        
        // Check if debt is already written off
        if ($debt['status'] === 'written_off') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Debt is already written off']);
            $conn->rollback();
            exit;
        }
        
        // Check if debt is already fully paid
        if ($debt['status'] === 'fully_paid') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Cannot write off a fully paid debt']);
            $conn->rollback();
            exit;
        }
        
        $remaining_balance = floatval($debt['remaining_balance']);
        
        // Log the write-off as a special entry in debt_payments (with negative or zero amount)
        // This maintains audit trail
        $payment_stmt = $conn->prepare(
            "INSERT INTO debt_payments (debt_id, amount_paid, recorded_by, notes) 
             VALUES (?, 0, ?, ?)"
        );
        
        $write_off_note = "WRITE-OFF: " . $notes;
        $payment_stmt->bind_param("iis", $debt_id, $recorded_by, $write_off_note);
        
        if (!$payment_stmt->execute()) {
            throw new Exception("Failed to log write-off");
        }
        
        $payment_stmt->close();
        
        // Update debt to written_off status
        $update_stmt = $conn->prepare(
            "UPDATE debts 
             SET status = 'written_off', remaining_balance = 0 
             WHERE id = ?"
        );
        
        $update_stmt->bind_param("i", $debt_id);
        
        if (!$update_stmt->execute()) {
            throw new Exception("Failed to update debt status");
        }
        
        $update_stmt->close();
        
        // Commit transaction
        $conn->commit();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Debt written off successfully',
            'debt' => [
                'id' => $debt_id,
                'status' => 'written_off',
                'amount_written_off' => number_format($remaining_balance, 2, '.', '')
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        error_log("Write-off transaction error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to write off debt']);
        exit;
    }
    
} catch (Exception $e) {
    error_log("Write off debt API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>
