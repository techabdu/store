<?php
/**
 * Get Debt Details API
 * 
 * Purpose: Get single debt with complete payment history
 * Method: GET
 * Authentication: Required (session)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers
setCorsHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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
    $shop_id = getCurrentShopId();
    
    // Get debt_id from query parameters
    if (!isset($_GET['debt_id']) || !is_numeric($_GET['debt_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Debt ID is required']);
        exit;
    }
    
    $debt_id = intval($_GET['debt_id']);
    
    // Fetch debt details
    $debt_query = "SELECT d.*, u.username as recorded_by_name 
                   FROM debts d 
                   JOIN users u ON d.recorded_by = u.id 
                   WHERE d.id = ? AND d.shop_id = ?";
    
    $debt_stmt = $conn->prepare($debt_query);
    $debt_stmt->bind_param("ii", $debt_id, $shop_id);
    $debt_stmt->execute();
    $debt_result = $debt_stmt->get_result();
    
    if ($debt_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Debt not found']);
        exit;
    }
    
    $debt = $debt_result->fetch_assoc();
    $debt_stmt->close();
    
    // Fetch payment history
    $payment_query = "SELECT dp.*, u.username as recorded_by_name 
                      FROM debt_payments dp 
                      JOIN users u ON dp.recorded_by = u.id 
                      WHERE dp.debt_id = ? 
                      ORDER BY dp.payment_date DESC";
    
    $payment_stmt = $conn->prepare($payment_query);
    $payment_stmt->bind_param("i", $debt_id);
    $payment_stmt->execute();
    $payment_result = $payment_stmt->get_result();
    
    $payment_history = [];
    while ($row = $payment_result->fetch_assoc()) {
        $payment_history[] = [
            'id' => intval($row['id']),
            'amount_paid' => number_format($row['amount_paid'], 2, '.', ''),
            'payment_date' => $row['payment_date'],
            'recorded_by_name' => $row['recorded_by_name'],
            'notes' => $row['notes']
        ];
    }
    
    $payment_stmt->close();
    
    // Format debt data
    $debt_data = [
        'id' => intval($debt['id']),
        'customer_name' => $debt['customer_name'],
        'customer_phone' => $debt['customer_phone'],
        'customer_address' => $debt['customer_address'],
        'total_amount' => number_format($debt['total_amount'], 2, '.', ''),
        'paid_amount' => number_format($debt['paid_amount'], 2, '.', ''),
        'remaining_balance' => number_format($debt['remaining_balance'], 2, '.', ''),
        'status' => $debt['status'],
        'transaction_id' => $debt['transaction_id'],
        'created_at' => $debt['created_at'],
        'updated_at' => $debt['updated_at'],
        'recorded_by_name' => $debt['recorded_by_name']
    ];
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'debt' => $debt_data,
        'payment_history' => $payment_history
    ]);
    
} catch (Exception $e) {
    error_log("Get debt details API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>
