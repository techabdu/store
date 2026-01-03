<?php
/**
 * Tenant Support API (SuperAdmin Only)
 * 
 * Purpose: View and manage support tickets for a specific tenant
 * Method: GET (tickets, communications), POST (add_note)
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=tickets: Get all support tickets for tenant
 * - action=communications: Get email/notification history
 * - action=add_note: Add SuperAdmin internal note (POST)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

global $conn;

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'tickets';

if ($method === 'GET') {
    $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
    
    if ($tenant_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
        exit;
    }
    
    if ($action === 'tickets') {
        $status_filter = isset($_GET['status']) ? $_GET['status'] : '';
        
        // Get all support tickets for this tenant
        $query = "
            SELECT 
                t.id, t.ticket_number, t.type, t.subject, t.description,
                t.status, t.priority, t.created_at, t.updated_at, t.resolved_at,
                u.username as creator_name, u.email as creator_email
            FROM support_tickets t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.tenant_id = ?
        ";
        
        $params = [$tenant_id];
        $types = "i";
        
        if (!empty($status_filter)) {
            $query .= " AND t.status = ?";
            $params[] = $status_filter;
            $types .= "s";
        }
        
        $query .= " ORDER BY t.created_at DESC";
        
        $tickets_stmt = $conn->prepare($query);
        if (!$tickets_stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
            exit;
        }
        
        $tickets_stmt->bind_param($types, ...$params);
        $tickets_stmt->execute();
        $tickets_result = $tickets_stmt->get_result();
        
        $tickets = [];
        while ($row = $tickets_result->fetch_assoc()) {
            // Get response count for each ticket
            $response_count_stmt = $conn->prepare("
                SELECT COUNT(*) as response_count 
                FROM support_ticket_responses 
                WHERE ticket_id = ?
            ");
            $response_count_stmt->bind_param("i", $row['id']);
            $response_count_stmt->execute();
            $response_count_result = $response_count_stmt->get_result();
            $row['response_count'] = $response_count_result->fetch_assoc()['response_count'];
            $response_count_stmt->close();
            
            $tickets[] = $row;
        }
        $tickets_stmt->close();
        
        // Get ticket stats
        $stats_stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent
            FROM support_tickets
            WHERE tenant_id = ?
        ");
        $stats_stmt->bind_param("i", $tenant_id);
        $stats_stmt->execute();
        $stats_result = $stats_stmt->get_result();
        $stats = $stats_result->fetch_assoc();
        $stats_stmt->close();
        
        echo json_encode([
            'success' => true,
            'tickets' => $tickets,
            'stats' => $stats
        ]);
        
    } elseif ($action === 'communications') {
        // Get communication/notification history for tenant
        // This would include emails sent, notifications, etc.
        
        // For now, get activity logs related to communications
        $comm_stmt = $conn->prepare("
            SELECT 
                al.id, al.action, al.details, al.created_at,
                u.username as actor_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = ?
            AND (
                al.action LIKE '%email%' OR 
                al.action LIKE '%notification%' OR
                al.action LIKE '%support%'
            )
            ORDER BY al.created_at DESC
            LIMIT 50
        ");
        
        $comm_stmt->bind_param("i", $tenant_id);
        $comm_stmt->execute();
        $comm_result = $comm_stmt->get_result();
        
        $communications = [];
        while ($row = $comm_result->fetch_assoc()) {
            $communications[] = $row;
        }
        $comm_stmt->close();
        
        echo json_encode([
            'success' => true,
            'communications' => $communications,
            'note' => 'Full email integration pending'
        ]);
        
    } elseif ($action === 'notes') {
        // Get all SuperAdmin notes for this tenant
        $notes_stmt = $conn->prepare("
            SELECT 
                n.id, n.note_type, n.content, n.is_pinned,
                n.created_at, n.updated_at,
                u.username as created_by_name
            FROM superadmin_notes n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.tenant_id = ?
            ORDER BY n.is_pinned DESC, n.created_at DESC
        ");
        
        $notes_stmt->bind_param("i", $tenant_id);
        $notes_stmt->execute();
        $notes_result = $notes_stmt->get_result();
        
        $notes = [];
        while ($row = $notes_result->fetch_assoc()) {
            $notes[] = $row;
        }
        $notes_stmt->close();
        
        echo json_encode([
            'success' => true,
            'notes' => $notes
        ]);
    }
    
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'add_note') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $content = isset($data['content']) ? trim($data['content']) : '';
        $note_type = isset($data['note_type']) ? $data['note_type'] : 'general';
        $is_pinned = isset($data['is_pinned']) ? intval($data['is_pinned']) : 0;
        
        if ($tenant_id <= 0 || empty($content)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id and content are required']);
            exit;
        }
        
        // Validate note type
        $valid_types = ['general', 'billing', 'support', 'technical', 'sales'];
        if (!in_array($note_type, $valid_types)) {
            $note_type = 'general';
        }
        
        // Insert note
        $note_stmt = $conn->prepare("
            INSERT INTO superadmin_notes (tenant_id, created_by, note_type, content, is_pinned)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $admin_id = $_SESSION['user_id'];
        $note_stmt->bind_param("iissi", $tenant_id, $admin_id, $note_type, $content, $is_pinned);
        
        if ($note_stmt->execute()) {
            $note_id = $conn->insert_id;
            
            // Log activity
            $activity_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, 'note_added', 'tenant', ?, ?)
            ");
            $activity_stmt->bind_param("iiis", $tenant_id, $admin_id, $tenant_id, $content);
            $activity_stmt->execute();
            $activity_stmt->close();
            
            echo json_encode([
                'success' => true,
                'message' => 'Note added successfully',
                'note_id' => $note_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to add note: ' . $note_stmt->error]);
        }
        $note_stmt->close();
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
