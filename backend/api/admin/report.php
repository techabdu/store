<?php
require_once '../../config/database.php';
require_once '../../middleware/auth.php';

// Set headers
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication and admin role
$user_data = checkAuth();
if (!$user_data || !in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied"]);
    exit;
}

$user_id = $user_data['id'];

// Use connection from database.php
$db = $conn;

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'stats':
        getStats($db);
        break;
    case 'create':
        createReport($db, $user_id);
        break;
    case 'history':
        getHistory($db);
        break;
    default:
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid action"]);
        break;
}

function getStats($conn) {
    try {
        // 1. Total Inventory Cost (in_stock) for current tenant
        $queryInventory = "SELECT SUM(cost_price) as total_inventory_cost FROM inventory WHERE status = 'in_stock' AND tenant_id = ?";
        $stmtInventory = $conn->prepare($queryInventory);
        $stmtInventory->bind_param("i", $_SESSION['tenant_id']);
        $stmtInventory->execute();
        $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
        $totalInventoryCost = $inventoryResult['total_inventory_cost'] ?? 0;

        // 2. Total Expenses for current tenant
        $queryExpenses = "SELECT SUM(amount) as total_expenses FROM expenses WHERE tenant_id = ?";
        $stmtExpenses = $conn->prepare($queryExpenses);
        $stmtExpenses->bind_param("i", $_SESSION['tenant_id']);
        $stmtExpenses->execute();
        $expensesResult = $stmtExpenses->get_result()->fetch_assoc();
        $totalExpenses = $expensesResult['total_expenses'] ?? 0;

        // 3. Business Capital from tenants table
        $queryCapital = "SELECT business_capital FROM tenants WHERE id = ?";
        $stmtCapital = $conn->prepare($queryCapital);
        $stmtCapital->bind_param("i", $_SESSION['tenant_id']);
        $stmtCapital->execute();
        $capitalResult = $stmtCapital->get_result()->fetch_assoc();
        $businessCapital = $capitalResult['business_capital'] ?? 0;

        echo json_encode([
            "success" => true,
            "data" => [
                "inventory_value" => (float)$totalInventoryCost,
                "total_expenses" => (float)$totalExpenses,
                "business_capital" => (float)$businessCapital
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error fetching stats: " . $e->getMessage()]);
    }
}

function createReport($conn, $user_id) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed"]);
        return;
    }

    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->cash_in_hand) || !isset($data->total_debt)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        return;
    }

    $cashInHand = $data->cash_in_hand;
    $totalDebt = $data->total_debt;

    try {
        // 1. Total Inventory Cost (in_stock) for current tenant
        $queryInventory = "SELECT SUM(cost_price) as total_inventory_cost FROM inventory WHERE status = 'in_stock' AND tenant_id = ?";
        $stmtInventory = $conn->prepare($queryInventory);
        $stmtInventory->bind_param("i", $_SESSION['tenant_id']);
        $stmtInventory->execute();
        $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
        $inventoryValue = $inventoryResult['total_inventory_cost'] ?? 0;

        // 2. Total Expenses for current tenant
        $queryExpenses = "SELECT SUM(amount) as total_expenses FROM expenses WHERE tenant_id = ?";
        $stmtExpenses = $conn->prepare($queryExpenses);
        $stmtExpenses->bind_param("i", $_SESSION['tenant_id']);
        $stmtExpenses->execute();
        $expensesResult = $stmtExpenses->get_result()->fetch_assoc();
        $totalExpenses = $expensesResult['total_expenses'] ?? 0;

        // 3. Business Capital from tenants table
        $queryCapital = "SELECT business_capital FROM tenants WHERE id = ?";
        $stmtCapital = $conn->prepare($queryCapital);
        $stmtCapital->bind_param("i", $_SESSION['tenant_id']);
        $stmtCapital->execute();
        $capitalResult = $stmtCapital->get_result()->fetch_assoc();
        $businessCapital = $capitalResult['business_capital'] ?? 0;

        // Calculate Net Profit
        // Formula: (Inventory + Cash + Debt) - Expenses - Capital
        $netProfit = ($inventoryValue + $cashInHand + $totalDebt) - $totalExpenses - $businessCapital;

        $query = "INSERT INTO reports (generated_by, inventory_value, total_expenses, business_capital, cash_in_hand, total_debt, net_profit, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iddddddi", $user_id, $inventoryValue, $totalExpenses, $businessCapital, $cashInHand, $totalDebt, $netProfit, $_SESSION['tenant_id']);

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => "Report saved successfully"]);
        } else {
            throw new Exception("Failed to save report");
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error saving report: " . $e->getMessage()]);
    }
}

function getHistory($conn) {
    try {
        $query = "SELECT r.*, u.username as generated_by_name 
                  FROM reports r 
                  JOIN users u ON r.generated_by = u.id 
                  WHERE r.tenant_id = ?
                  ORDER BY r.created_at DESC 
                  LIMIT 50";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $_SESSION['tenant_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $history = [];
        while ($row = $result->fetch_assoc()) {
            $history[] = $row;
        }

        echo json_encode(["success" => true, "data" => $history]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error fetching history: " . $e->getMessage()]);
    }
}
?>
