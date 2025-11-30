<?php
require_once '../../middleware/auth.php';

// Set headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

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

    // Map old keys to tenants table columns
    $updates = [];
    $types = "";
    $params = [];

    // Map frontend keys to database columns
    $keyMap = [
        'shop_name' => 'shop_name',
        'shop_address' => 'shop_address',
        'shop_phone' => 'shop_phone',
        'shop_email' => 'shop_email',
        'business_capital' => 'business_capital'
    ];

    foreach ($data as $key => $value) {
        if (array_key_exists($key, $keyMap)) {
            $column = $keyMap[$key];
            $updates[] = "$column = ?";
            
            // Handle business_capital as decimal/float
            if ($column === 'business_capital') {
                $types .= "d";
                $params[] = floatval($value);
            } else {
                $types .= "s";
                $params[] = (string)$value;
            }
        }
    }

    if (empty($updates)) {
        http_response_code(200); // Nothing to update is technically success
        echo json_encode(["success" => true, "message" => "No changes made"]);
        exit;
    }

    $sql = "UPDATE tenants SET " . implode(", ", $updates) . " WHERE id = ?";
    $types .= "i";
    $params[] = $_SESSION['tenant_id'];

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Settings updated successfully"
        ]);
    } else {
        throw new Exception("Failed to update settings");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
}
?>
