<?php
/**
 * List Disputes
 * 
 * Retrieves all disputes for the current user (as reporter or reported party).
 */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../config/database.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$user_id = $_SESSION['user_id'];
$status_filter = isset($_GET['status']) ? $_GET['status'] : null;

try {
    // Build query to fetch disputes where user is involved
    $query = "
        SELECT 
            d.id,
            d.order_id,
            d.reporter_id,
            d.reported_id,
            d.issue_type,
            d.description,
            d.status,
            d.created_at,
            d.updated_at,
            reporter.username as reporter_name,
            reported.username as reported_name,
            o.agreed_price as total_amount,
            o.order_status as status,
            l.title as product_name,
            CASE 
                WHEN d.reporter_id = ? THEN 'reporter'
                ELSE 'reported'
            END as user_role
        FROM order_disputes d
        JOIN users reporter ON d.reporter_id = reporter.id
        JOIN users reported ON d.reported_id = reported.id
        JOIN marketplace_orders o ON d.order_id = o.id
        JOIN marketplace_listings l ON o.listing_id = l.id
        WHERE (d.reporter_id = ? OR d.reported_id = ?)
    ";
    
    // Add status filter if provided
    if ($status_filter && in_array($status_filter, ['open', 'under_review', 'resolved', 'closed'])) {
        $query .= " AND d.status = ?";
    }
    
    $query .= " ORDER BY d.created_at DESC";

    $stmt = $conn->prepare($query);
    
    if ($status_filter && in_array($status_filter, ['open', 'under_review', 'resolved', 'closed'])) {
        $stmt->bind_param("iiis", $user_id, $user_id, $user_id, $status_filter);
    } else {
        $stmt->bind_param("iii", $user_id, $user_id, $user_id);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $disputes = [];
    while ($row = $result->fetch_assoc()) {
        $disputes[] = $row;
    }
    
    $stmt->close();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'disputes' => $disputes,
        'count' => count($disputes)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

$conn->close();
?>
