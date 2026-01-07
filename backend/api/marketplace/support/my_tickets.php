<?php
/**
 * My Tickets API
 * 
 * Purpose: Manage user's own support tickets (list, view details, respond)
 * Method: GET (list, detail), POST (respond)
 * Authentication: Required
 * 
 * Actions:
 * - action=list: Get all tickets for the logged-in user
 * - action=detail&id={id}: Get ticket details and conversation thread
 * - action=respond (POST): Add a response to a ticket
 */

require_once '../../config/database.php';
require_once '../../config/config.php';
require_once '../../helpers/EmailNotifier.php';
require_once '../../middleware/api_logger.php'; // API request logging

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Start session and check authentication
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

$user_id = $_SESSION['user_id'];
$tenant_id = $_SESSION['tenant_id'];

// Get database connection
$database = new Database();
$conn = $database->connect();

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

if ($method === 'GET') {
    if ($action === 'list') {
        // List user's tickets
        $stmt = $conn->prepare("
            SELECT id, ticket_number, type, subject, status, priority, created_at, updated_at 
            FROM support_tickets 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $tickets = [];
        while ($row = $result->fetch_assoc()) {
            $tickets[] = $row;
        }
        
        echo json_encode(['success' => true, 'tickets' => $tickets]);
        $stmt->close();
        
    } elseif ($action === 'detail') {
        // View ticket detail and conversation
        $ticket_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        if ($ticket_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid ticket ID']);
            exit;
        }
        
        // Fetch ticket (ensure it belongs to user)
        $stmt = $conn->prepare("
            SELECT * FROM support_tickets 
            WHERE id = ? AND user_id = ?
        ");
        $stmt->bind_param("ii", $ticket_id, $user_id);
        $stmt->execute();
        $ticket_result = $stmt->get_result();
        
        if ($ticket_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Ticket not found or access denied']);
            exit;
        }
        
        $ticket = $ticket_result->fetch_assoc();
        $stmt->close();
        
        // Fetch responses
        $resp_stmt = $conn->prepare("
            SELECT r.*, u.username as responder_name 
            FROM support_ticket_responses r
            JOIN users u ON r.user_id = u.id
            WHERE r.ticket_id = ?
            ORDER BY r.created_at ASC
        ");
        $resp_stmt->bind_param("i", $ticket_id);
        $resp_stmt->execute();
        $resp_result = $resp_stmt->get_result();
        
        $responses = [];
        while ($row = $resp_result->fetch_assoc()) {
            $responses[] = $row;
        }
        $resp_stmt->close();
        
        echo json_encode([
            'success' => true, 
            'ticket' => $ticket,
            'responses' => $responses
        ]);
    }
} elseif ($method === 'POST' && $action === 'respond') {
    // Respond to ticket
    $data = json_decode(file_get_contents('php://input'), true);
    $ticket_id = isset($data['ticket_id']) ? intval($data['ticket_id']) : 0;
    $message = isset($data['message']) ? trim($data['message']) : '';
    
    if ($ticket_id <= 0 || empty($message)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ticket ID and message are required']);
        exit;
    }
    
    // Verify ticket ownership and status
    $stmt = $conn->prepare("SELECT id, ticket_number, subject, status FROM support_tickets WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $ticket_id, $user_id);
    $stmt->execute();
    $ticket_result = $stmt->get_result();
    
    if ($ticket_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Ticket not found']);
        exit;
    }
    
    $ticket_data = $ticket_result->fetch_assoc();
    
    if ($ticket_data['status'] === 'closed') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot respond to a closed ticket']);
        exit;
    }
    $stmt->close();
    
    // Insert response
    $ins_stmt = $conn->prepare("
        INSERT INTO support_ticket_responses (ticket_id, user_id, is_admin_response, message) 
        VALUES (?, ?, 0, ?)
    ");
    $ins_stmt->bind_param("iis", $ticket_id, $user_id, $message);
    
    if ($ins_stmt->execute()) {
        // Update ticket updated_at and move to 'open' or 'in_progress' if it was awaiting response
        $update_stmt = $conn->prepare("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $update_stmt->bind_param("i", $ticket_id);
        $update_stmt->execute();
        $update_stmt->close();
        
        // Notify admin about user response
        try {
            $admin_stmt = $conn->prepare("SELECT email FROM users WHERE role = 'superadmin' LIMIT 1");
            $admin_stmt->execute();
            $admin_res = $admin_stmt->get_result();
            if ($admin_user = $admin_res->fetch_assoc()) {
                $notifier = new EmailNotifier();
                $notifier->sendResponseNotification(
                    $admin_user['email'],
                    'SuperAdmin',
                    $ticket_data['ticket_number'],
                    false,
                    $message
                );
            }
            $admin_stmt->close();
        } catch (Exception $e) {
            error_log("Failed to send response notification: " . $e->getMessage());
        }
        
        echo json_encode(['success' => true, 'message' => 'Response added successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to add response']);
    }
    $ins_stmt->close();
}

$conn->close();
?>
