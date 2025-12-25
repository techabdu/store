<?php
require_once '../../config/database.php';
require_once '../../config/config.php';
require_once '../../helpers/email_sender.php';

// Set CORS headers using centralized config
setCorsHeaders();

$token = $_GET['token'] ?? null;

if (!$token) {
    header("Location: " . rtrim(FRONTEND_URL, '/') . "/verify-status?status=invalid");
    exit;
}

try {
    // Find tenant with this token
    $stmt = $conn->prepare("SELECT id, shop_name, shop_email, status, email_verified FROM tenants WHERE verification_token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        // Token doesn't exist. It might be already used (set to NULL) or invalid.
        // We can't easily distinguish without more state, but we can assume common cases.
        header("Location: " . rtrim(FRONTEND_URL, '/') . "/verify-status?status=invalid");
        exit;
    }

    $tenant = $result->fetch_assoc();
    $tenant_id = $tenant['id'];

    if ($tenant['email_verified'] == 1) {
        header("Location: " . rtrim(FRONTEND_URL, '/') . "/verify-status?status=already_verified");
        exit;
    }

    // Update tenant status
    // If status was 'pending', move to 'trial'. If already 'trial' or 'active', just verify email.
    $newStatus = ($tenant['status'] === 'pending') ? 'trial' : $tenant['status'];
    
    $updateStmt = $conn->prepare("UPDATE tenants SET email_verified = 1, status = ?, verification_token = NULL WHERE id = ?");
    $updateStmt->bind_param("si", $newStatus, $tenant_id);
    
    if ($updateStmt->execute()) {
        // Redirect to frontend login page with success message
        $redirectUrl = rtrim(FRONTEND_URL, '/') . "/login?verified=true";
        header("Location: " . $redirectUrl);
        exit;
    } else {
        throw new Exception("Failed to update tenant status");
    }

} catch (Exception $e) {
    header("Location: " . rtrim(FRONTEND_URL, '/') . "/verify-status?status=invalid");
    exit;
}
?>
