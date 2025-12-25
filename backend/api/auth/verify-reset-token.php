<?php
require_once '../../config/database.php';

// Load config first to define setCorsHeaders()
require_once '../../config/config.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Set headers
header("Content-Type: application/json; charset=UTF-8");
// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->token) || empty(trim($data->token))) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Token is required"]);
    exit;
}

$token = trim($data->token);

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

    // Token is valid
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "username" => $user['username']
    ]);

} catch (Exception $e) {
    error_log("Token verification error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "An error occurred"]);
}
?>
