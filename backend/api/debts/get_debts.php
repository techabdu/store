<?php
/**
 * Get Debts API
 * 
 * Purpose: Fetch debts list with filtering, search, and pagination
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
    // Current shop ID correctly retrieved from session helper
    $shop_id = getCurrentShopId();
    
    // Get query parameters
    $status = isset($_GET['status']) ? trim($_GET['status']) : 'all';
    $start_date = isset($_GET['start_date']) ? trim($_GET['start_date']) : null;
    $end_date = isset($_GET['end_date']) ? trim($_GET['end_date']) : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : null;
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 20;
    
    // Calculate offset
    $offset = ($page - 1) * $limit;
    
    // Build base query
    $where_conditions = ["d.shop_id = ?"];
    $params = [$shop_id];
    $param_types = "i";
    
    // Add status filter
    if ($status !== 'all') {
        $valid_statuses = ['unpaid', 'partially_paid', 'fully_paid', 'written_off'];
        if (in_array($status, $valid_statuses)) {
            $where_conditions[] = "d.status = ?";
            $params[] = $status;
            $param_types .= "s";
        }
    }
    
    // Add date range filter
    if ($start_date) {
        $where_conditions[] = "DATE(d.created_at) >= ?";
        $params[] = $start_date;
        $param_types .= "s";
    }
    
    if ($end_date) {
        $where_conditions[] = "DATE(d.created_at) <= ?";
        $params[] = $end_date;
        $param_types .= "s";
    }
    
    // Add search filter
    if ($search) {
        $where_conditions[] = "(d.customer_name LIKE ? OR d.customer_phone LIKE ?)";
        $search_term = "%{$search}%";
        $params[] = $search_term;
        $params[] = $search_term;
        $param_types .= "ss";
    }
    
    $where_clause = implode(" AND ", $where_conditions);
    
    // Get total count
    $count_query = "SELECT COUNT(*) as total FROM debts d WHERE {$where_clause}";
    $count_stmt = $conn->prepare($count_query);
    
    if ($param_types) {
        $count_stmt->bind_param($param_types, ...$params);
    }
    
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_count = $count_result->fetch_assoc()['total'];
    $total_pages = ceil($total_count / $limit);
    $count_stmt->close();
    
    // Get debts
    $query = "SELECT d.*, u.username as recorded_by_name 
              FROM debts d 
              JOIN users u ON d.recorded_by = u.id 
              WHERE {$where_clause}
              ORDER BY d.created_at DESC 
              LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($query);
    
    // Add limit and offset to params
    $params[] = $limit;
    $params[] = $offset;
    $param_types .= "ii";
    
    $stmt->bind_param($param_types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $debts = [];
    while ($row = $result->fetch_assoc()) {
        $debts[] = [
            'id' => intval($row['id']),
            'customer_name' => $row['customer_name'],
            'customer_phone' => $row['customer_phone'],
            'customer_address' => $row['customer_address'],
            'total_amount' => number_format($row['total_amount'], 2, '.', ''),
            'paid_amount' => number_format($row['paid_amount'], 2, '.', ''),
            'remaining_balance' => number_format($row['remaining_balance'], 2, '.', ''),
            'status' => $row['status'],
            'transaction_id' => $row['transaction_id'],
            'created_at' => $row['created_at'],
            'recorded_by_name' => $row['recorded_by_name']
        ];
    }
    
    $stmt->close();
    
    // Also get summary statistics
    $summary_query = "SELECT 
                        COUNT(*) as total_debts,
                        COALESCE(SUM(CASE WHEN status IN ('unpaid', 'partially_paid') THEN remaining_balance ELSE 0 END), 0) as total_outstanding,
                        COUNT(CASE WHEN status = 'fully_paid' THEN 1 END) as fully_paid_count
                      FROM debts 
                      WHERE shop_id = ?";
    
    $summary_stmt = $conn->prepare($summary_query);
    $summary_stmt->bind_param("i", $shop_id);
    $summary_stmt->execute();
    $summary_result = $summary_stmt->get_result();
    $summary = $summary_result->fetch_assoc();
    $summary_stmt->close();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'debts' => $debts,
        'total_count' => intval($total_count),
        'page' => $page,
        'total_pages' => intval($total_pages),
        'limit' => $limit,
        'summary' => [
            'total_debts' => intval($summary['total_debts']),
            'total_outstanding' => number_format($summary['total_outstanding'], 2, '.', ''),
            'fully_paid_count' => intval($summary['fully_paid_count'])
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get debts API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>
