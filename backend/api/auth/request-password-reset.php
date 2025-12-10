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

// Get JSON input
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->identifier) || empty(trim($data->identifier))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Username or email is required']);
    exit;
}

require_once '../../helpers/sanitize.php';
$identifier = sanitizeInput($data->identifier);

// Rate Limiting
require_once '../../classes/SecurityMonitor.php';
$securityMonitor = new SecurityMonitor();
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Limit: 3 requests per 15 minutes per IP or Identifier
if ($securityMonitor->isActionRateLimited('password_reset_request', $ip, $identifier, 3, 15)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many password reset requests. Please try again later.']);
    exit;
}

// Log the request attempt
$securityMonitor->logSecurityEvent('password_reset_request', $identifier, $ip, ['status' => 'initiated']);

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
    $subject = "Reset Your PRHUB Password";
    $body = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        </head>
        <body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif; background-color: #f5f5f5;'>
            <table width='100%' cellpadding='0' cellspacing='0' style='background-color: #f5f5f5; padding: 40px 0;'>
                <tr>
                    <td align='center'>
                        <table width='600' cellpadding='0' cellspacing='0' style='background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'>
                            <!-- Header -->
                            <tr>
                                <td style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;'>
                                    <h1 style='margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;'>PRHUB</h1>
                                    <p style='margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;'>Phone Retailers Management System</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style='padding: 40px;'>
                                    <h2 style='margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;'>Password Reset Request</h2>
                                    
                                    <p style='margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                                        Hello <strong style='color: #667eea;'>{$user['username']}</strong>,
                                    </p>
                                    
                                    <p style='margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                                        We received a request to reset your password for <strong>{$user['shop_name']}</strong>.
                                    </p>
                                    
                                    <!-- CTA Button -->
                                    <table width='100%' cellpadding='0' cellspacing='0'>
                                        <tr>
                                            <td align='center' style='padding: 20px 0;'>
                                                <a href='$resetLink' style='display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);'>
                                                    Reset Password
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Warning Box -->
                                    <div style='margin: 30px 0 0 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;'>
                                        <p style='margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;'>
                                            <strong>Important:</strong> This link will expire in <strong>1 hour</strong> for security reasons.
                                        </p>
                                    </div>
                                    
                                    <!-- Security Notice -->
                                    <div style='margin: 20px 0 0 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;'>
                                        <p style='margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;'>
                                            <strong>Security Notice:</strong><br>
                                            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style='padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;'>
                                    <p style='margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-align: center;'>
                                        Need help? Contact us at <a href='mailto:support@prhub.shop' style='color: #667eea; text-decoration: none;'>support@prhub.shop</a>
                                    </p>
                                    <p style='margin: 0; color: #9ca3af; font-size: 12px; text-align: center;'>
                                        © 2025 PRHUB - Phone Retailers Management System. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
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
