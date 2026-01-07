<?php
/**
 * Create Support Ticket API
 * 
 * Purpose: Allow users to create support tickets for disputes, reports, and issues
 * Method: POST
 * Authentication: Required
 * 
 * Request Body:
 * - type: string (required) - dispute, report_buyer, report_seller, technical, billing, other
 * - subject: string (required) - ticket subject
 * - description: string (required) - detailed description
 * - order_id: int (optional) - related order ID
 * - listing_id: int (optional) - related listing ID
 * - priority: string (optional) - low, medium, high, urgent (default: medium)
 */

require_once '../../config/database.php';
require_once '../../config/config.php';
require_once '../../helpers/EmailNotifier.php';
require_once '../../middleware/api_logger.php'; // API request logging

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Start session and check authentication
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

// Get database connection
$database = new Database();
$conn = $database->connect();

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Get request body
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (empty($data['type']) || empty($data['subject']) || empty($data['description'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Type, subject, and description are required'
    ]);
    exit;
}

// Validate ticket type
$valid_types = ['dispute', 'report_buyer', 'report_seller', 'technical', 'billing', 'other'];
if (!in_array($data['type'], $valid_types)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid ticket type'
    ]);
    exit;
}

// Validate priority if provided
$priority = isset($data['priority']) ? $data['priority'] : 'medium';
$valid_priorities = ['low', 'medium', 'high', 'urgent'];
if (!in_array($priority, $valid_priorities)) {
    $priority = 'medium';
}

// Get user details
$user_id = $_SESSION['user_id'];
$tenant_id = $_SESSION['tenant_id'];
$shop_id = isset($_SESSION['shop_id']) ? $_SESSION['shop_id'] : null;

try {
    // Generate unique ticket number: TKT-YYYYMMDD-XXX
    $date_prefix = date('Ymd');
    $random_suffix = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
    $ticket_number = "TKT-{$date_prefix}-{$random_suffix}";
    
    // Check if ticket number already exists (very unlikely, but handle it)
    $check_stmt = $conn->prepare("SELECT id FROM support_tickets WHERE ticket_number = ?");
    $check_stmt->bind_param("s", $ticket_number);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    // If exists, regenerate
    while ($check_result->num_rows > 0) {
        $random_suffix = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        $ticket_number = "TKT-{$date_prefix}-{$random_suffix}";
        $check_stmt->bind_param("s", $ticket_number);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
    }
    $check_stmt->close();
    
    // Prepare insert statement
    $stmt = $conn->prepare("
        INSERT INTO support_tickets 
        (ticket_number, tenant_id, user_id, shop_id, type, order_id, listing_id, subject, description, priority, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    ");
    
    $order_id = isset($data['order_id']) ? $data['order_id'] : null;
    $listing_id = isset($data['listing_id']) ? $data['listing_id'] : null;
    
    $stmt->bind_param(
        "siiisiisss",
        $ticket_number,
        $tenant_id,
        $user_id,
        $shop_id,
        $data['type'],
        $order_id,
        $listing_id,
        $data['subject'],
        $data['description'],
        $priority
    );
    
    if ($stmt->execute()) {
        $ticket_id = $conn->insert_id;
        
        // Get user email for confirmation
        $user_stmt = $conn->prepare("SELECT email, username FROM users WHERE id = ?");
        $user_stmt->bind_param("i", $user_id);
        $user_stmt->execute();
        $user_result = $user_stmt->get_result();
        $user_data = $user_result->fetch_assoc();
        $user_stmt->close();
        
        // Send confirmation email to user
        try {
            $emailNotifier = new EmailNotifier();
            $emailNotifier->sendTicketConfirmation(
                $ticket_id,
                $user_data['email'],
                $user_data['username'],
                $ticket_number,
                $data['subject']
            );
        } catch (Exception $e) {
            // Log email error but don't fail the ticket creation
            error_log("Failed to send ticket confirmation email: " . $e->getMessage());
        }
        
        // Send alert email to superadmin
        try {
            // Get superadmin email
            $admin_stmt = $conn->prepare("SELECT email FROM users WHERE role = 'superadmin' LIMIT 1");
            $admin_stmt->execute();
            $admin_result = $admin_stmt->get_result();
            if ($admin_data = $admin_result->fetch_assoc()) {
                $emailNotifier = new EmailNotifier();
                $emailNotifier->sendTicketAlert(
                    $ticket_id,
                    $admin_data['email'],
                    $ticket_number,
                    $data['type'],
                    $data['subject'],
                    $priority
                );
            }
            $admin_stmt->close();
        } catch (Exception $e) {
            // Log email error but don't fail the ticket creation
            error_log("Failed to send ticket alert email: " . $e->getMessage());
        }
        
        // Return success with ticket details
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Support ticket created successfully',
            'ticket' => [
                'id' => $ticket_id,
                'ticket_number' => $ticket_number,
                'type' => $data['type'],
                'subject' => $data['subject'],
                'status' => 'open',
                'priority' => $priority,
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        throw new Exception('Failed to create ticket');
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to create support ticket',
        'details' => $e->getMessage()
    ]);
}


?>
