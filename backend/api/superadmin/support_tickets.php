<?php
/**
 * SuperAdmin Support Tickets API
 * 
 * Purpose: Manage all support tickets (list, view details, respond, change status)
 * Method: GET (list, detail), POST (respond, change_status)
 * Authentication: Required (SuperAdmin only)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/EmailNotifier.php';

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

$admin_id = $_SESSION['user_id'];

// Database connection is already initialized in database.php as $conn
global $conn;

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

if ($method === 'GET') {
    if ($action === 'list') {
        // Filters
        $status = isset($_GET['status']) ? $_GET['status'] : '';
        $priority = isset($_GET['priority']) ? $_GET['priority'] : '';
        $type = isset($_GET['type']) ? $_GET['type'] : '';
        
        $query = "
            SELECT t.*, u.username as creator_name, u.email as creator_email, tn.shop_name as tenant_name 
            FROM support_tickets t
            JOIN users u ON t.user_id = u.id
            JOIN tenants tn ON t.tenant_id = tn.id
            WHERE 1=1
        ";
        
        $params = [];
        $types = "";
        
        if (!empty($status)) {
            $query .= " AND t.status = ?";
            $params[] = $status;
            $types .= "s";
        }
        
        if (!empty($priority)) {
            $query .= " AND t.priority = ?";
            $params[] = $priority;
            $types .= "s";
        }
        
        if (!empty($type)) {
            $query .= " AND t.type = ?";
            $params[] = $type;
            $types .= "s";
        }
        
        $query .= " ORDER BY t.created_at DESC";
        
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $conn->error]);
            exit;
        }

        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $tickets = [];
        while ($row = $result->fetch_assoc()) {
            $tickets[] = $row;
        }
        
        // Basic stats
        $stats_query = "
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'awaiting_response' THEN 1 ELSE 0 END) as awaiting,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
            FROM support_tickets
        ";
        $stats_result = $conn->query($stats_query);
        $stats = $stats_result ? $stats_result->fetch_assoc() : [
            'total' => 0, 'open_tickets' => 0, 'in_progress' => 0, 'awaiting' => 0, 'resolved' => 0
        ];
        
        echo json_encode([
            'success' => true, 
            'tickets' => $tickets,
            'stats' => $stats
        ]);
        $stmt->close();
        
    } elseif ($action === 'detail') {
        $ticket_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        if ($ticket_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid ticket ID']);
            exit;
        }
        
        // Fetch ticket details
        $stmt = $conn->prepare("
            SELECT t.*, u.username as creator_name, u.email as creator_email, tn.shop_name as tenant_name 
            FROM support_tickets t
            JOIN users u ON t.user_id = u.id
            JOIN tenants tn ON t.tenant_id = tn.id
            WHERE t.id = ?
        ");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $conn->error]);
            exit;
        }
        $stmt->bind_param("i", $ticket_id);
        $stmt->execute();
        $ticket_result = $stmt->get_result();
        
        if ($ticket_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Ticket not found']);
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
        if ($resp_stmt) {
            $resp_stmt->bind_param("i", $ticket_id);
            $resp_stmt->execute();
            $resp_result = $resp_stmt->get_result();
            
            $responses = [];
            while ($row = $resp_result->fetch_assoc()) {
                $responses[] = $row;
            }
            $resp_stmt->close();
        } else {
            $responses = [];
        }
        
        // Fetch history
        $hist_stmt = $conn->prepare("
            SELECT h.*, u.username as actor_name 
            FROM support_ticket_status_history h
            JOIN users u ON h.changed_by = u.id
            WHERE h.ticket_id = ?
            ORDER BY h.changed_at DESC
        ");
        if ($hist_stmt) {
            $hist_stmt->bind_param("i", $ticket_id);
            $hist_stmt->execute();
            $hist_result = $hist_stmt->get_result();
            
            $history = [];
            while ($row = $hist_result->fetch_assoc()) {
                $history[] = $row;
            }
            $hist_stmt->close();
        } else {
            $history = [];
        }
        
        echo json_encode([
            'success' => true, 
            'ticket' => $ticket,
            'responses' => $responses,
            'history' => $history
        ]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'respond') {
        $ticket_id = isset($data['ticket_id']) ? intval($data['ticket_id']) : 0;
        $message = isset($data['message']) ? trim($data['message']) : '';
        
        if ($ticket_id <= 0 || empty($message)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Ticket ID and message are required']);
            exit;
        }
        
        // Insert response
        $ins_stmt = $conn->prepare("
            INSERT INTO support_ticket_responses (ticket_id, user_id, is_admin_response, message) 
            VALUES (?, ?, 1, ?)
        ");
        if (!$ins_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $conn->error]);
            exit;
        }
        $ins_stmt->bind_param("iis", $ticket_id, $admin_id, $message);
        
        if ($ins_stmt->execute()) {
            // Update ticket status to 'awaiting_response' if it was 'open' or 'in_progress'
            $update_stmt = $conn->prepare("
                UPDATE support_tickets 
                SET status = 'awaiting_response', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND status IN ('open', 'in_progress')
            ");
            if ($update_stmt) {
                $update_stmt->bind_param("i", $ticket_id);
                $update_stmt->execute();
                $update_stmt->close();
            }
            
            // Notify user about admin response
            try {
                $user_stmt = $conn->prepare("
                    SELECT u.email, u.username, t.ticket_number 
                    FROM support_tickets t 
                    JOIN users u ON t.user_id = u.id 
                    WHERE t.id = ?
                ");
                if ($user_stmt) {
                    $user_stmt->bind_param("i", $ticket_id);
                    $user_stmt->execute();
                    $user_res = $user_stmt->get_result();
                    if ($target_user = $user_res->fetch_assoc()) {
                        $notifier = new EmailNotifier();
                        $notifier->sendResponseNotification(
                            $target_user['email'],
                            $target_user['username'],
                            $target_user['ticket_number'],
                            true,
                            $message
                        );
                    }
                    $user_stmt->close();
                }
            } catch (Exception $e) {
                error_log("Failed to send response notification to user: " . $e->getMessage());
            }
            
            echo json_encode(['success' => true, 'message' => 'Response added successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to add response: ' . $ins_stmt->error]);
        }
        $ins_stmt->close();
        
    } elseif ($action === 'change_status') {
        $ticket_id = isset($data['ticket_id']) ? intval($data['ticket_id']) : 0;
        $new_status = isset($data['status']) ? $data['status'] : '';
        $notes = isset($data['notes']) ? trim($data['notes']) : '';
        
        if ($ticket_id <= 0 || empty($new_status)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Ticket ID and new status are required']);
            exit;
        }
        
        // Get current status
        $cur_stmt = $conn->prepare("SELECT status FROM support_tickets WHERE id = ?");
        if (!$cur_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $conn->error]);
            exit;
        }
        $cur_stmt->bind_param("i", $ticket_id);
        $cur_stmt->execute();
        $cur_res = $cur_stmt->get_result();
        
        if ($cur_res->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Ticket not found']);
            exit;
        }
        
        $old_status = $cur_res->fetch_assoc()['status'];
        $cur_stmt->close();
        
        if ($old_status === $new_status) {
            echo json_encode(['success' => true, 'message' => 'Status is already ' . $new_status]);
            exit;
        }
        
        // Update status
        $resolved_at_sql = ($new_status === 'resolved') ? ", resolved_at = CURRENT_TIMESTAMP" : "";
        $upd_stmt = $conn->prepare("UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP $resolved_at_sql WHERE id = ?");
        if (!$upd_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $conn->error]);
            exit;
        }
        $upd_stmt->bind_param("si", $new_status, $ticket_id);
        
        if ($upd_stmt->execute()) {
            // Log history
            $hist_stmt = $conn->prepare("
                INSERT INTO support_ticket_status_history (ticket_id, from_status, to_status, changed_by, notes) 
                VALUES (?, ?, ?, ?, ?)
            ");
            if ($hist_stmt) {
                $hist_stmt->bind_param("issis", $ticket_id, $old_status, $new_status, $admin_id, $notes);
                $hist_stmt->execute();
                $hist_stmt->close();
            }
            
            echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update status: ' . $upd_stmt->error]);
        }
        $upd_stmt->close();
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
