<?php
require_once '../../config/database.php';

// Set CORS headers using centralized config
setCorsHeaders();
require_once '../../config/config.php';
require_once '../../helpers/email_sender.php';

// Set headers
header("Content-Type: application/json; charset=UTF-8");
// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) && !isset($data->username)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Email or Username is required"]);
    exit;
}

$email = null;

if (isset($data->username)) {
    // Find email by username
    $stmt = $conn->prepare("
        SELECT t.shop_email 
        FROM users u 
        JOIN tenants t ON u.tenant_id = t.id 
        WHERE u.username = ?
    ");
    $stmt->bind_param("s", $data->username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $email = $row['shop_email'];
    } else {
        // Username not found or not linked to tenant
        // Return success to avoid enumeration, or error? 
        // For resend flow initiated by user who knows their username, it's safer to say "sent if exists"
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "If an account exists, a verification link has been sent."]);
        exit;
    }
} else {
    $email = $data->email;
}

try {
    // Find tenant by email
    $stmt = $conn->prepare("SELECT id, shop_name, email_verified FROM tenants WHERE shop_email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "If an account exists with this email, a verification link has been sent."]);
        exit;
    }

    $tenant = $result->fetch_assoc();

    if ($tenant['email_verified']) {
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Email is already verified."]);
        exit;
    }

    // Generate new token
    $verification_token = bin2hex(random_bytes(32));
    
    $updateStmt = $conn->prepare("UPDATE tenants SET verification_token = ? WHERE id = ?");
    $updateStmt->bind_param("si", $verification_token, $tenant['id']);
    $updateStmt->execute();

    // Use environment-based verification link
    $verificationLink = API_URL . "/auth/verify-email.php?token=" . $verification_token;
    
    $subject = "PRHUB - Email Verification";
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
                                    <h2 style='margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;'>Verify Your Email</h2>
                                    
                                    <p style='margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                                        You requested a new verification link for <strong style='color: #667eea;'>{$tenant['shop_name']}</strong>.
                                    </p>
                                    
                                    <p style='margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                                        Click the button below to verify your email address and activate your account.
                                    </p>
                                    
                                    <!-- CTA Button -->
                                    <table width='100%' cellpadding='0' cellspacing='0'>
                                        <tr>
                                            <td align='center' style='padding: 20px 0;'>
                                                <a href='$verificationLink' style='display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);'>
                                                    Verify Email Address
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style='padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;'>
                                    <p style='margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-align: center;'>
                                        Need help? Contact us at <a href='mailto:support@prhub.shop' style='color: #667eea; text-decoration: none;'>support@prhub.shop</a>
                                    </p>
                                    <p style='margin: 0; color: #9ca3af; font-size: 12px; text-align: center;'>
                                        © 2024 PRHUB - Phone Retailers Management System. All rights reserved.
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

    $sendResult = sendEmail($email, $subject, $body);

    if ($sendResult['success']) {
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Verification email sent."]);
    } else {
        throw new Exception($sendResult['message']);
    }

} catch (Exception $e) {
    error_log("Resend verification error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Failed to send email. Please try again later."]);
}
?>
