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

if (!isset($data->email)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Email is required"]);
    exit;
}

$email = $data->email;

try {
    // Find tenant by email
    $stmt = $conn->prepare("SELECT id, shop_name, email_verified FROM tenants WHERE shop_email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        // Don't reveal if email exists or not for security, or maybe do?
        // For now, let's say "If an account exists, email sent."
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

    // Send email
    $verificationLink = "http://localhost/store/backend/api/auth/verify-email.php?token=" . $verification_token;
    
    $subject = "Verify your Email - Store Management System";
    $body = "
        <h2>Verify your Email Address</h2>
        <p>Please click the link below to verify your email address for <strong>{$tenant['shop_name']}</strong>:</p>
        <p><a href='$verificationLink'>Verify Email Address</a></p>
        <p>Or copy and paste this link: $verificationLink</p>
    ";

    sendEmail($email, $subject, $body);

    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Verification email sent."]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
}
?>
