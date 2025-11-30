<?php
require_once '../../config/database.php';
require_once '../../helpers/email_sender.php';

// Set headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
$shop_name = htmlspecialchars(strip_tags($data->shop_name));
$owner_username = htmlspecialchars(strip_tags($data->owner_username));
$owner_email = htmlspecialchars(strip_tags($data->owner_email));
$password = $data->password; // Password will be hashed, no need to sanitize special chars
$shop_phone = htmlspecialchars(strip_tags($data->shop_phone));
$shop_address = htmlspecialchars(strip_tags($data->shop_address));

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

    // 3. Create Admin User for this Tenant
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    $role = 'admin';
    $status = 'active'; // User is active, but tenant might be pending/trial

    $insertUser = $conn->prepare("INSERT INTO users (tenant_id, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)");
    $insertUser->bind_param("isssss", $tenant_id, $owner_username, $owner_email, $password_hash, $role, $status);

    if (!$insertUser->execute()) {
        throw new Exception("Failed to create admin user: " . $insertUser->error);
    }

    // 4. Send Welcome/Verification Email
    $verificationLink = "http://localhost/store/backend/api/auth/verify-email.php?token=" . $verification_token;
    
    $subject = "Welcome to Store Management System - Verify your Email";
    $body = "
        <h2>Welcome to Store Management System!</h2>
        <p>Thank you for registering <strong>$shop_name</strong>.</p>
        <p>Please click the link below to verify your email address and activate your 25-day free trial:</p>
        <p><a href='$verificationLink'>Verify Email Address</a></p>
        <p>Or copy and paste this link: $verificationLink</p>
        <br>
        <p>Your trial ends on: $trial_ends_at</p>
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
