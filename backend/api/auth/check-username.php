<?php
require_once '../../config/config.php';
require_once '../../config/database.php';

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->username) || empty(trim($data->username))) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Username is required"]);
    exit;
}

$username = trim($data->username);

// Simple username validation (regex)
if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
    echo json_encode(["success" => true, "available" => false, "error" => "Invalid format"]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(["success" => true, "available" => false]);
    } else {
        echo json_encode(["success" => true, "available" => true]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error"]);
}
?>
