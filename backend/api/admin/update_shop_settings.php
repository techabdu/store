<?php
require_once '../../middleware/auth.php';

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

// Verify admin or superadmin
$user_data = checkAuth();
if (!$user_data || !in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied"]);
    exit;
}

// Get posted data
$data = json_decode(file_get_contents("php://input"), true); // Decode as array

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No data provided"]);
    exit;
}

try {
    global $conn;

    $conn->begin_transaction();

    $query = "INSERT INTO shop_settings (setting_key, setting_value) VALUES (?, ?) 
              ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)";
    
    $stmt = $conn->prepare($query);

    foreach ($data as $key => $value) {
        // Ensure value is a string
        $strValue = (string)$value;
        $stmt->bind_param("ss", $key, $strValue);
        $stmt->execute();
    }

    $conn->commit();

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Settings updated successfully"
    ]);

} catch (Exception $e) {
    if ($conn) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
}
?>
