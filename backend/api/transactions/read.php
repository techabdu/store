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
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';

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
    if ($transactionId) {
        // Get single transaction with items
        $stmt = $conn->prepare(
            "SELECT 
                t.id,
                t.user_id,
                t.customer_name,
                t.customer_phone,
                t.total_amount,
                t.payment_method,
                t.created_at,
                u.username as processed_by
             FROM transactions t
             LEFT JOIN users u ON t.user_id = u.id
             WHERE t.id = ? AND t.tenant_id = ?"
        );

        $stmt->bind_param("ii", $transactionId, $_SESSION['tenant_id']);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Transaction not found']);
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
                i.brand,
                i.model,
                i.imei,
                i.color,
                i.storage,
                i.condition_status
             FROM transaction_items ti
             LEFT JOIN inventory i ON ti.inventory_id = i.id
             WHERE ti.transaction_id = ?"
        );
        
        $itemsStmt->bind_param("i", $transactionId);
        $itemsStmt->execute();
        $itemsResult = $itemsStmt->get_result();
        
        $items = [];
        while ($row = $itemsResult->fetch_assoc()) {
            $items[] = $row;
        }
        
        $transaction['items'] = $items;
        $itemsStmt->close();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'transaction' => $transaction
        ]);
        
    } else {
        // Get list of transactions for current tenant
        $query = "SELECT 
                    t.id,
                    t.user_id,
                    t.customer_name,
                    t.customer_phone,
                    t.total_amount,
                    t.payment_method,
                    t.created_at,
                    u.username as processed_by,
                    COUNT(ti.id) as item_count
                  FROM transactions t
                  LEFT JOIN users u ON t.user_id = u.id
                  LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
                  WHERE t.tenant_id = ?
                  GROUP BY t.id
                  ORDER BY t.created_at DESC
                  LIMIT ? OFFSET ?";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iii", $_SESSION['tenant_id'], $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $transactions = [];
        while ($row = $result->fetch_assoc()) {
            $transactions[] = $row;
        }
        
        // Get total count for current tenant
        $countStmt = $conn->prepare("SELECT COUNT(*) as total FROM transactions WHERE tenant_id = ?");
        $countStmt->bind_param("i", $_SESSION['tenant_id']);
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
