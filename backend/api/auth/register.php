<?php
require_once '../../config/database.php';
require_once '../../config/config.php';
require_once '../../helpers/email_sender.php';
require_once '../../helpers/sanitize.php';
require_once '../../helpers/csrf.php';

// Set CORS headers using centralized config
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");

// Verify CSRF
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
}

require_once '../../classes/SecurityMonitor.php';
$securityMonitor = new SecurityMonitor();
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Check rate limit: 5 registration attempts per hour per IP
if ($securityMonitor->isActionRateLimited('registration_attempt', $ip, null, 5, 60)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many registration attempts. Please try again later.']);
    exit;
}

// Log attempt start (optional, or just fail count? Let's log 'registration_attempt' on failure or sensitive step. 
// Actually to rate limit "attempts", we need to log them.
// Let's log it now.
$securityMonitor->logSecurityEvent('registration_attempt', null, $ip, ['status' => 'initiated']);

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->shop_name) || 
    !isset($data->owner_username) || 
    !isset($data->owner_email) || 
    !isset($data->password) ||
    !isset($data->shop_phone) ||
    !isset($data->shop_address)
) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required fields"]);
    exit;
}

// Sanitize input
$shop_name = sanitizeInput($data->shop_name);
$owner_username = sanitizeInput($data->owner_username);
$owner_email = sanitizeEmail($data->owner_email);
$password = $data->password; // Password will be hashed, no need to sanitize special chars
$shop_phone = sanitizeInput($data->shop_phone);
$shop_address = sanitizeInput($data->shop_address);

// Validate password strength (basic)
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Password must be at least 8 characters long"]);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Check if email or username already exists (globally for now, or per tenant? Owner email should be unique)
    // Check tenants table for email
    $checkTenant = $conn->prepare("SELECT id FROM tenants WHERE shop_email = ?");
    $checkTenant->bind_param("s", $owner_email);
    $checkTenant->execute();
    if ($checkTenant->get_result()->num_rows > 0) {
        throw new Exception("Email already registered");
    }

    // Check users table for username/email
    $checkUser = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $checkUser->bind_param("ss", $owner_username, $owner_email);
    $checkUser->execute();
    if ($checkUser->get_result()->num_rows > 0) {
        throw new Exception("Username or email already taken");
    }

    // 2. Create Tenant
    // Generate verification token
    $verification_token = bin2hex(random_bytes(32));
    $trial_ends_at = date('Y-m-d H:i:s', strtotime('+25 days'));

    $insertTenant = $conn->prepare("INSERT INTO tenants (shop_name, shop_address, shop_phone, shop_email, status, plan_type, trial_ends_at, verification_token) VALUES (?, ?, ?, ?, 'pending', 'free_trial', ?, ?)");
    $insertTenant->bind_param("ssssss", $shop_name, $shop_address, $shop_phone, $owner_email, $trial_ends_at, $verification_token);
    
    if (!$insertTenant->execute()) {
        throw new Exception("Failed to create shop: " . $insertTenant->error);
    }
    
    $tenant_id = $conn->insert_id;
    
    // 2.5 Create the first (main) shop/branch for this tenant
    $insertShop = $conn->prepare("INSERT INTO shops (tenant_id, shop_name, shop_address, shop_phone, shop_email, business_capital, status, is_main_branch) VALUES (?, ?, ?, ?, ?, 0.00, 'active', 1)");
    $insertShop->bind_param("issss", $tenant_id, $shop_name, $shop_address, $shop_phone, $owner_email);
    
    if (!$insertShop->execute()) {
        throw new Exception("Failed to create shop branch: " . $insertShop->error);
    }
    
    $shop_id = $conn->insert_id;

    // 3. Create Admin User for this Tenant (shop_id = NULL for owner access to all branches)
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    $role = 'admin';
    $status = 'active'; // User is active, but tenant might be pending/trial

    $insertUser = $conn->prepare("INSERT INTO users (tenant_id, shop_id, username, email, password_hash, role, status) VALUES (?, NULL, ?, ?, ?, ?, ?)");
    $insertUser->bind_param("isssss", $tenant_id, $owner_username, $owner_email, $password_hash, $role, $status);

    if (!$insertUser->execute()) {
        throw new Exception("Failed to create admin user: " . $insertUser->error);
    }

    // 4. Send Welcome/Verification Email
    $verificationLink = API_URL . "/auth/verify-email.php?token=" . $verification_token;
    
    $subject = "Welcome to PRHUB - Verify Your Email";
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
                                    <h2 style='margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;'>Welcome to PRHUB!</h2>
                                    
                                    <p style='margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                                        Thank you for registering <strong style='color: #667eea;'>$shop_name</strong> with PRHUB.
                                    </p>
                                    
                                    <p style='margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                                        To get started, please verify your email address and activate your <strong>25-day free trial</strong>.
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
                                    
                                    <!-- Trial Info Box -->
                                    <div style='margin: 30px 0 0 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #667eea; border-radius: 4px;'>
                                        <p style='margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;'>
                                            <strong>Your free trial ends on:</strong> $trial_ends_at<br>
                                            <span style='color: #4b5563;'>Enjoy full access to all PRHUB features during your trial period.</span>
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

    $emailResult = sendEmail($owner_email, $subject, $body);
    
    if (!$emailResult['success']) {
        // Log error but don't fail registration? Or fail?
        // Better to warn user but keep account created
        error_log("Failed to send verification email: " . $emailResult['message']);
    }

    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Shop registered successfully! Please check your email to verify your account.",
        "shop_name" => $shop_name,
        "trial_ends_at" => $trial_ends_at,
        "email_sent" => $emailResult['success']
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400); // Bad request or conflict
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>
