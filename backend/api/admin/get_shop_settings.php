require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Set headers
header("Content-Type: application/json; charset=UTF-8");
// Verify admin or superadmin
$user_data = checkAuth();
if (!$user_data || !in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied"]);
    exit;
}

try {
    global $conn;

    // Get shop settings from tenants table for current tenant
    $query = "SELECT shop_name, shop_address, shop_phone, shop_email, business_capital FROM tenants WHERE id = ?";
    $stmt = $conn->prepare($query);
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

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
}
?>
