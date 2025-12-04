<?php
require_once '../../config/database.php';
require_once '../../config/config.php';
require_once '../../helpers/email_sender.php';

// Set CORS headers using centralized config
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->identifier) || empty(trim($data->identifier))) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Username or email is required"]);
    exit;
}

$identifier = trim($data->identifier);

try {
    // Find user by username or email (via tenant)
    $stmt = $conn->prepare("
        SELECT u.id, u.username, t.shop_email, t.shop_name 
        FROM users u 
        LEFT JOIN tenants t ON u.tenant_id = t.id 
        WHERE u.username = ? OR t.shop_email = ?
        LIMIT 1
    ");
    $stmt->bind_param("ss", $identifier, $identifier);
    $stmt->execute();
    $result = $stmt->get_result();

    // Always return success to prevent user enumeration
    if ($result->num_rows === 0) {
        http_response_code(200);
        echo json_encode([
            "success" => true, 
            "message" => "If an account exists, a password reset link has been sent to the associated email."
        ]);
        exit;
    }

    $user = $result->fetch_assoc();

    // Check if user has an associated email
    if (empty($user['shop_email'])) {
        // SuperAdmin or user without tenant - they should contact support
        http_response_code(200);
        echo json_encode([
            "success" => true, 
            "message" => "If an account exists, a password reset link has been sent to the associated email."
        ]);
        exit;
    }

    // Generate secure reset token
    $reset_token = bin2hex(random_bytes(32)); // 64 character hex string
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // Store token in database
    $updateStmt = $conn->prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?");
    $updateStmt->bind_param("ssi", $reset_token, $expires, $user['id']);
    $updateStmt->execute();

    // Use environment-based frontend URL from config
    $resetLink = FRONTEND_URL . "/reset-password?token=" . $reset_token;

    // Send email
    $subject = "Password Reset Request - Store Management System";
    $body = "
        <h2>Password Reset Request</h2>
        <p>Hello <strong>{$user['username']}</strong>,</p>
        <p>We received a request to reset your password for <strong>{$user['shop_name']}</strong>.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href='$resetLink' style='display: inline-block; padding: 12px 24px; background-color: #7C3AED; color: white; text-decoration: none; border-radius: 6px;'>Reset Password</a></p>
        <p>Or copy and paste this link: <br><code>$resetLink</code></p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr>
        <p style='color: #666; font-size: 0.9em;'>Store Management System</p>
    ";

    $sendResult = sendEmail($user['shop_email'], $subject, $body);

    if (!$sendResult['success']) {
        error_log("Failed to send password reset email: " . $sendResult['message']);
    }

    // Always return success (don't reveal email send failures)
    http_response_code(200);
    echo json_encode([
        "success" => true, 
        "message" => "If an account exists, a password reset link has been sent to the associated email."
    ]);

} catch (Exception $e) {
    error_log("Password reset request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "An error occurred. Please try again later."]);
}
?>
