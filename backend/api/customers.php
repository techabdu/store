<?php
require_once '../config/database.php';
require_once '../middleware/auth.php';
require_once '../middleware/role.php';

// Set headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verify authentication
$user_data = checkAuth();

// Verify admin role (or superadmin)
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Access denied"]);
    exit();
}

// Use the $conn variable from database.php
$db = $conn;

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'get_customers') {
    try {
        // Aggregate customers from transactions
        // Group by name and phone to identify unique customers
        $query = "SELECT 
                    customer_name, 
                    customer_phone, 
                    MAX(created_at) as last_purchase_date,
                    COUNT(id) as total_purchases,
                    SUM(total_amount) as total_spent
                  FROM transactions 
                  GROUP BY customer_name, customer_phone
                  ORDER BY last_purchase_date DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $customers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $customers
        ]);
    } catch (Exception $e) {
        error_log("Error fetching customers: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "An internal error occurred while fetching customers."
        ]);
    }
} elseif ($action === 'get_customer_details') {
    $name = isset($_GET['name']) ? $_GET['name'] : '';
    $phone = isset($_GET['phone']) ? $_GET['phone'] : '';

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Customer name is required"]);
        exit();
    }

    try {
        // Get all transactions for this customer
        // We match by name. If phone is provided, we match that too.
        // If phone is empty in DB, we match where phone is null or empty? 
        // For simplicity and best effort matching:
        
        $query = "SELECT 
                    t.id as transaction_id,
                    t.created_at as purchase_date,
                    t.total_amount,
                    ti.price as item_price,
                    i.brand,
                    i.model,
                    i.imei,
                    i.color,
                    i.storage,
                    i.condition_status
                  FROM transactions t
                  JOIN transaction_items ti ON t.id = ti.transaction_id
                  JOIN inventory i ON ti.inventory_id = i.id
                  WHERE t.customer_name = ?";
        
        $params = ["s", $name];
        
        if (!empty($phone)) {
            $query .= " AND t.customer_phone = ?";
            $params[0] .= "s";
            $params[] = $phone;
        } else {
             // If phone is not provided in request, we might want to fetch transactions where phone is strictly empty 
             // OR just rely on name. Let's rely on name AND phone if phone exists in the specific transaction record we clicked on.
             // But wait, the list view groups by name AND phone. So we should filter by both if possible.
             // If the list view item has a phone, we pass it. If it has NULL phone, we pass empty string?
             
             // Let's assume strict matching to what was clicked in the list.
             // If the grouped item had a NULL phone, we should probably match NULL or empty phone.
             $query .= " AND (t.customer_phone IS NULL OR t.customer_phone = '')";
        }

        $query .= " ORDER BY t.created_at DESC";

        $stmt = $db->prepare($query);
        
        // Dynamic binding
        $bind_names = array();
        if (count($params) > 1) {
            $type = array_shift($params);
            $bind_names[] = & $type;
            for ($i = 0; $i < count($params); $i++) {
                $bind_names[] = & $params[$i];
            }
            call_user_func_array(array($stmt, 'bind_param'), $bind_names);
        }
        
        $stmt->execute();
        $history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $history
        ]);

    } catch (Exception $e) {
        error_log("Error fetching customer details: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "An internal error occurred while fetching customer details."
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid action"]);
}

$conn->close();
