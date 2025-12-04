<?php
require_once '../../config/database.php';
require_once '../../config/config.php';
require_once '../../helpers/email_sender.php';

// Set CORS headers using centralized config
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8"); // Default to JSON, but might redirect

$token = $_GET['token'] ?? null;

if (!$token) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing verification token"]);
    exit;
}

try {
    // Find tenant with this token
    $stmt = $conn->prepare("SELECT id, shop_name, shop_email, status FROM tenants WHERE verification_token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid or expired token"]);
        exit;
    }

    $tenant = $result->fetch_assoc();
    $tenant_id = $tenant['id'];

    // Update tenant status
    // If status was 'pending', move to 'trial'. If already 'trial' or 'active', just verify email.
    $newStatus = ($tenant['status'] === 'pending') ? 'trial' : $tenant['status'];
    
    $updateStmt = $conn->prepare("UPDATE tenants SET email_verified = 1, status = ?, verification_token = NULL WHERE id = ?");
    $updateStmt->bind_param("si", $newStatus, $tenant_id);
    
    if ($updateStmt->execute()) {
        // Send confirmation email? Optional.
        
        // Redirect to frontend login page with success message
        header("Location: " . FRONTEND_URL . "/login?verified=true");
        exit;
    } else {
        throw new Exception("Failed to update tenant status");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
}
?>
