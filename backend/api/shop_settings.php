<?php
/**
 * Shop Settings API - Now uses tenants table instead of shop_settings
 * Returns shop information for the current tenant
 */
require_once '../middleware/auth.php';
require_once '../config/database.php';

// Set headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verify user is authenticated
$user_data = checkAuth();

try {
    global $conn;
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get shop settings from tenants table
        $stmt = $conn->prepare("
            SELECT shop_name, shop_address, shop_phone, shop_email, business_capital 
            FROM tenants 
            WHERE id = ?
        ");
        $stmt->bind_param("i", $_SESSION['tenant_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Shop not found"]);
            exit;
        }
        
        $tenant = $result->fetch_assoc();
        
        // Format as settings object for backward compatibility
        $settings = [
            'shop_name' => $tenant['shop_name'],
            'shop_address' => $tenant['shop_address'],
            'shop_phone' => $tenant['shop_phone'],
            'shop_email' => $tenant['shop_email'],
            'business_capital' => $tenant['business_capital']
        ];
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "settings" => $settings
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Update shop settings (admin only)
        if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superadmin') {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Only admins can update shop settings"]);
            exit;
        }
        
        $data = json_decode(file_get_contents("php://input"));
        
        $updates = [];
        $types = "";
        $params = [];
        
        if (isset($data->shop_name)) {
            $updates[] = "shop_name = ?";
            $types .= "s";
            $params[] = $data->shop_name;
        }
        if (isset($data->shop_address)) {
            $updates[] = "shop_address = ?";
            $types .= "s";
            $params[] = $data->shop_address;
        }
        if (isset($data->shop_phone)) {
            $updates[] = "shop_phone = ?";
            $types .= "s";
            $params[] = $data->shop_phone;
        }
        if (isset($data->shop_email)) {
            $updates[] = "shop_email = ?";
            $types .= "s";
            $params[] = $data->shop_email;
        }
        if (isset($data->business_capital)) {
            $updates[] = "business_capital = ?";
            $types .= "d";
            $params[] = $data->business_capital;
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "No fields to update"]);
            exit;
        }
        
        $sql = "UPDATE tenants SET " . implode(", ", $updates) . " WHERE id = ?";
        $types .= "i";
        $params[] = $_SESSION['tenant_id'];
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Settings updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to update settings"]);
        }
    }

} catch (Exception $e) {
    error_log("Shop settings error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error"
    ]);
}
?>
