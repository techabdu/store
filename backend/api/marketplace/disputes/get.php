<?php
/**
 * Get Dispute Details
 * 
 * Retrieves details of a specific dispute.
 * Only accessible by parties involved in the dispute.
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

$dispute_id = isset($_GET['dispute_id']) ? intval($_GET['dispute_id']) : 0;
$user_id = $_SESSION['user_id'];

if (!$dispute_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dispute ID is required']);
    exit;
}

try {
    // Fetch dispute with order details
    $stmt = $conn->prepare("
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
            o.delivery_status,
            l.title as product_name
        FROM order_disputes d
        JOIN users reporter ON d.reporter_id = reporter.id
        JOIN users reported ON d.reported_id = reported.id
        JOIN marketplace_orders o ON d.order_id = o.id
        JOIN marketplace_listings l ON o.listing_id = l.id
        WHERE d.id = ?
    ");
    $stmt->bind_param("i", $dispute_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Dispute not found']);
        exit;
    }
    
    $dispute = $result->fetch_assoc();
    $stmt->close();

    // Verify user is involved in the dispute
    if ($dispute['reporter_id'] != $user_id && $dispute['reported_id'] != $user_id) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Access denied']);
        exit;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'dispute' => $dispute
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

$conn->close();
?>
