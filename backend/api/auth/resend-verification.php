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

    // Determine protocol and host
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'];
    $scriptPath = dirname($_SERVER['PHP_SELF']); // /store/backend/api/auth
    
    // Construct dynamic link
    // Assuming verify-email.php is in the same directory
    $verificationLink = "$protocol://$host$scriptPath/verify-email.php?token=" . $verification_token;
    
    $subject = "Verify your Email - Store Management System";
    $body = "
        <h2>Verify your Email Address</h2>
        <p>Please click the link below to verify your email address for <strong>{$tenant['shop_name']}</strong>:</p>
        <p><a href='$verificationLink'>Verify Email Address</a></p>
        <p>Or copy and paste this link: $verificationLink</p>
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
