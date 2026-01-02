<?php
/**
 * Transaction Read API
 * GET endpoint to retrieve transactions with details
 * Accessible by: User, Admin, SuperAdmin
 */

header('Content-Type: application/json');
// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Check authentication
checkAuth();

// Check role - allow user, admin, and superadmin
checkRole(['user', 'admin', 'superadmin']);

// Get filter parameters
$transactionId = isset($_GET['id']) ? intval($_GET['id']) : null;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

try {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    if ($transactionId) {
        // Get single transaction with items (must belong to current shop)
        $stmt = $conn->prepare(
            "SELECT 
                t.id,
                t.user_id,
                t.customer_name,
                t.customer_phone,
                t.total_amount,
                t.payment_method,
                t.transaction_type,
                t.debt_payment_id,
                (SELECT d.transaction_id FROM debt_payments dp JOIN debts d ON dp.debt_id = d.id WHERE dp.id = t.debt_payment_id) as parent_transaction_id,
                t.created_at,
                u.username as processed_by,
                d.id as debt_id,
                d.paid_amount as debt_paid,
                d.remaining_balance as debt_remaining
             FROM transactions t
             LEFT JOIN users u ON t.user_id = u.id
             LEFT JOIN debts d ON t.id = d.transaction_id
             WHERE t.id = ? AND t.shop_id = ?"
        );

        $stmt->bind_param("ii", $transactionId, $shopId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Transaction not found in this branch']);
            exit;
        }
        
        $transaction = $result->fetch_assoc();
        $stmt->close();
        
        // Get transaction items
        $itemsStmt = $conn->prepare(
            "SELECT 
                ti.id,
                ti.inventory_id,
                ti.price,
                ti.type,
                ti.description,
                i.brand,
                i.model,
                i.imei,
                i.color,
                i.storage,
                i.condition_status
             FROM transaction_items ti
             LEFT JOIN inventory i ON ti.inventory_id = i.id
             WHERE ti.transaction_id = ? AND ti.shop_id = ?"
        );
        
        $itemsStmt->bind_param("ii", $transactionId, $shopId);
        $itemsStmt->execute();
        $itemsResult = $itemsStmt->get_result();
        
        $items = [];
        while ($row = $itemsResult->fetch_assoc()) {
            $items[] = $row;
        }
        
        $transaction['items'] = $items;
        $itemsStmt->close();

        // If this transaction is a debt payment, fetch the specific payment info
        if ($transaction['transaction_type'] === 'debt_payment' && !empty($transaction['debt_payment_id'])) {
            $payStmt = $conn->prepare(
                "SELECT 
                    dp.*,
                    d.total_amount as original_debt_total,
                    (SELECT SUM(amount_paid) FROM debt_payments dp2 WHERE dp2.debt_id = dp.debt_id AND dp2.payment_date <= dp.payment_date) as cumulative_paid
                 FROM debt_payments dp
                 JOIN debts d ON dp.debt_id = d.id
                 WHERE dp.id = ?"
            );
            $payStmt->bind_param("i", $transaction['debt_payment_id']);
            $payStmt->execute();
            $payResult = $payStmt->get_result();
            
            if ($payResult->num_rows > 0) {
                $payInfo = $payResult->fetch_assoc();
                $transaction['installment_info'] = [
                    'amount_paid' => $payInfo['amount_paid'],
                    'previous_balance' => $payInfo['original_debt_total'] - ($payInfo['cumulative_paid'] - $payInfo['amount_paid']),
                    'new_balance' => $payInfo['original_debt_total'] - $payInfo['cumulative_paid'],
                    'notes' => $payInfo['notes'],
                    'receipt_number' => "PMT-" . str_pad($payInfo['id'], 6, '0', STR_PAD_LEFT)
                ];
            }
            $payStmt->close();
        }

        // If this transaction has a debt (it was a sale with debt), fetch the payment history
        if (!empty($transaction['debt_id'])) {
            $historyStmt = $conn->prepare(
                "SELECT 
                    dp.id,
                    dp.amount_paid,
                    dp.payment_date,
                    dp.notes,
                    u.username as recorded_by_name
                 FROM debt_payments dp
                 LEFT JOIN users u ON dp.recorded_by = u.id
                 WHERE dp.debt_id = ?
                 ORDER BY dp.payment_date ASC"
            );
            $historyStmt->bind_param("i", $transaction['debt_id']);
            $historyStmt->execute();
            $historyResult = $historyStmt->get_result();
            
            $payment_history = [];
            while ($row = $historyResult->fetch_assoc()) {
                $payment_history[] = $row;
            }
            $transaction['payment_history'] = $payment_history;
            $historyStmt->close();
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'transaction' => $transaction
        ]);
        
    } else {
        // Get list of transactions for current shop
        $query = "SELECT 
                    t.id,
                    t.user_id,
                    t.customer_name,
                    t.customer_phone,
                    t.total_amount,
                    t.payment_method,
                    t.transaction_type,
                    t.debt_payment_id,
                    (SELECT d.transaction_id FROM debt_payments dp JOIN debts d ON dp.debt_id = d.id WHERE dp.id = t.debt_payment_id) as parent_transaction_id,
                    t.created_at,
                    u.username as processed_by,
                    COUNT(ti.id) as item_count
                  FROM transactions t
                  LEFT JOIN users u ON t.user_id = u.id
                  LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
                  WHERE t.shop_id = ?
                  GROUP BY t.id
                  ORDER BY t.created_at DESC
                  LIMIT ? OFFSET ?";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iii", $shopId, $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $transactions = [];
        while ($row = $result->fetch_assoc()) {
            $transactions[] = $row;
        }
        
        // Get total count for current shop
        $countStmt = $conn->prepare("SELECT COUNT(*) as total FROM transactions WHERE shop_id = ?");
        $countStmt->bind_param("i", $shopId);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $totalCount = $countResult->fetch_assoc()['total'];
        $countStmt->close();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'transactions' => $transactions,
            'total' => $totalCount,
            'limit' => $limit,
            'offset' => $offset
        ]);
        
        $stmt->close();
    }
    
} catch (Exception $e) {
    error_log("Transaction read error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve transactions']);
}

$conn->close();
?>
