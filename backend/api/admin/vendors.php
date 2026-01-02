<?php
require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/api_logger.php'; // API request logging
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");

$user_data = checkAuth();

// Get method early
$method = $_SERVER['REQUEST_METHOD'];

// Allow GET for all authenticated users (so staff can select vendors in inventory)
// Restrict modifications to admin/superadmin
if ($method !== 'GET' && !in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied"]);
    exit;
}

$shopId = getCurrentShopId();
if (!$shopId) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No shop selected"]);
    exit;
}

function getJsonInput() {
    return json_decode(file_get_contents("php://input"), true);
}

if ($method === 'GET') {
    // Fetch vendors (can filter by status if needed)
    $statusFilter = $_GET['status'] ?? null;
    
    $sql = "SELECT * FROM vendors WHERE shop_id = ? ";
    $params = ["i", $shopId];
    
    if ($statusFilter) {
        $sql .= " AND status = ?";
        $params[0] .= "s";
        $params[] = $statusFilter;
    }
    
    $sql .= " ORDER BY name ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $vendors = [];
    while ($row = $result->fetch_assoc()) {
        $vendors[] = $row;
    }
    
    echo json_encode(["success" => true, "vendors" => $vendors]);
    $stmt->close();
}
elseif ($method === 'POST') {
    // Add vendor
    $data = getJsonInput();
    
    if (empty($data['name'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Vendor name is required"]);
        exit;
    }
    
    $name = trim($data['name']);
    $address = trim($data['address'] ?? '');
    $contact = trim($data['contact_info'] ?? '');
    $status = 'active';
    
    $tenantId = requireTenantContext();
    
    $sql = "INSERT INTO vendors (tenant_id, shop_id, name, address, contact_info, status) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iissss", $tenantId, $shopId, $name, $address, $contact, $status);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Vendor added successfully", "id" => $stmt->insert_id]);
    } else {
         http_response_code(500);
         echo json_encode(["success" => false, "error" => "Failed to add vendor: " . $stmt->error]);
    }
    $stmt->close();
}
elseif ($method === 'PUT') {
    // Update vendor
    $data = getJsonInput();
    
    if (empty($data['id'])) {
         http_response_code(400);
         echo json_encode(["success" => false, "error" => "Vendor ID is required"]);
         exit;
    }
    
    $id = $data['id'];
    $name = trim($data['name']);
    $address = trim($data['address'] ?? '');
    $contact = trim($data['contact_info'] ?? '');
    $status = $data['status'] ?? 'active';
    
    // Validate ownership
    $check = $conn->prepare("SELECT id FROM vendors WHERE id = ? AND shop_id = ?");
    $check->bind_param("ii", $id, $shopId);
    $check->execute();
    if ($check->get_result()->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Vendor not found"]);
        exit;
    }
    $check->close();
    
    $sql = "UPDATE vendors SET name = ?, address = ?, contact_info = ?, status = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssi", $name, $address, $contact, $status, $id);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Vendor updated successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Failed to update vendor: " . $stmt->error]);
    }
    $stmt->close();
}
elseif ($method === 'DELETE') {
    // Delete vendor
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
         $data = getJsonInput();
         $id = $data['id'] ?? null;
    }

    if (!$id) {
         http_response_code(400);
         echo json_encode(["success" => false, "error" => "Vendor ID is required"]);
         exit;
    }
    
    // Validate ownership
    $check = $conn->prepare("SELECT id FROM vendors WHERE id = ? AND shop_id = ?");
    $check->bind_param("ii", $id, $shopId);
    $check->execute();
    if ($check->get_result()->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Vendor not found"]);
        exit;
    }
    $check->close();
    
    $sql = "DELETE FROM vendors WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Vendor deleted successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Failed to delete vendor"]);
    }
    $stmt->close();
}

$conn->close();
?>
