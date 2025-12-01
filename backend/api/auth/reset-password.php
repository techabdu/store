<?php
require_once '../../config/database.php';
require_once '../../helpers/activity_log.php';

// Set headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->token) || !isset($data->password) || empty(trim($data->token)) || empty(trim($data->password))) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Token and password are required"]);
    exit;
}

$token = trim($data->token);
$password = trim($data->password);

// Validate password strength
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Password must be at least 8 characters long"]);
    exit;
}

try {
    // Find user with this token
    $stmt = $conn->prepare("
        SELECT id, username, reset_token_expires 
        FROM users 
        WHERE reset_token = ?
    ");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(400);
        echo json_encode([
            "success" => false, 
            "error" => "Invalid reset token"
        ]);
        exit;
    }

    $user = $result->fetch_assoc();

    // Check if token has expired
    $now = new DateTime();
    $expires = new DateTime($user['reset_token_expires']);

    if ($now > $expires) {
        http_response_code(400);
        echo json_encode([
            "success" => false, 
            "error" => "Reset token has expired. Please request a new password reset."
        ]);
        exit;
    }

    // Hash the new password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    // Update password and clear reset token
    $updateStmt = $conn->prepare("
        UPDATE users 
        SET password_hash = ?, 
            reset_token = NULL, 
            reset_token_expires = NULL 
        WHERE id = ?
    ");
    $updateStmt->bind_param("si", $password_hash, $user['id']);
    $updateStmt->execute();

    // Log activity
    logActivity($user['id'], 'password_reset', 'Password was reset via email link');

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Password has been reset successfully. You can now login with your new password."
    ]);

} catch (Exception $e) {
    error_log("Password reset error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "An error occurred. Please try again later."]);
}
?>
