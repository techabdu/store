<?php
require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Set headers
header("Content-Type: application/json; charset=UTF-8");
// Check authentication and admin role
$user_data = checkAuth();
if (!$user_data || !in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied"]);
    exit;
}

$user_id = $user_data['id'];

// Get current shop context
$shopId = getCurrentShopId();
if ($shopId === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
    exit;
}

// Use connection from database.php
$db = $conn;

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'stats':
        getStats($db, $shopId);
        break;
    case 'create':
        createReport($db, $user_id, $shopId);
        break;
    case 'history':
        getHistory($db, $shopId);
        break;
    default:
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid action"]);
        break;
}

function getStats($conn, $shopId) {
    try {
        // 1. Total Inventory Cost (in_stock) for current shop
        $queryInventory = "SELECT SUM(cost_price) as total_inventory_cost FROM inventory WHERE status = 'in_stock' AND shop_id = ?";
        $stmtInventory = $conn->prepare($queryInventory);
        $stmtInventory->bind_param("i", $shopId);
        $stmtInventory->execute();
        $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
        $totalInventoryCost = $inventoryResult['total_inventory_cost'] ?? 0;

        // 2. Total Expenses for current shop
        $queryExpenses = "SELECT SUM(amount) as total_expenses FROM expenses WHERE shop_id = ?";
        $stmtExpenses = $conn->prepare($queryExpenses);
        $stmtExpenses->bind_param("i", $shopId);
        $stmtExpenses->execute();
        $expensesResult = $stmtExpenses->get_result()->fetch_assoc();
        $totalExpenses = $expensesResult['total_expenses'] ?? 0;

        // 3. Business Capital from shops table (not tenants)
        $queryCapital = "SELECT business_capital FROM shops WHERE id = ?";
        $stmtCapital = $conn->prepare($queryCapital);
        $stmtCapital->bind_param("i", $shopId);
        $stmtCapital->execute();
        $capitalResult = $stmtCapital->get_result()->fetch_assoc();
        $businessCapital = $capitalResult['business_capital'] ?? 0;

        // 4. Total Outstanding Debt for current shop
        $queryDebts = "SELECT SUM(remaining_balance) as total_outstanding FROM debts WHERE shop_id = ? AND status != 'written_off'";
        $stmtDebts = $conn->prepare($queryDebts);
        $stmtDebts->bind_param("i", $shopId);
        $stmtDebts->execute();
        $debtsResult = $stmtDebts->get_result()->fetch_assoc();
        $totalOutstandingDebt = $debtsResult['total_outstanding'] ?? 0;

        echo json_encode([
            "success" => true,
            "data" => [
                "inventory_value" => (float)$totalInventoryCost,
                "total_expenses" => (float)$totalExpenses,
                "business_capital" => (float)$businessCapital,
                "total_outstanding_debt" => (float)$totalOutstandingDebt
            ],
            "shop_id" => $shopId
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error fetching stats: " . $e->getMessage()]);
    }
}

function createReport($conn, $user_id, $shopId) {
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
        // 1. Total Inventory Cost (in_stock) for current shop
        $queryInventory = "SELECT SUM(cost_price) as total_inventory_cost FROM inventory WHERE status = 'in_stock' AND shop_id = ?";
        $stmtInventory = $conn->prepare($queryInventory);
        $stmtInventory->bind_param("i", $shopId);
        $stmtInventory->execute();
        $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
        $inventoryValue = $inventoryResult['total_inventory_cost'] ?? 0;

        // 2. Total Expenses for current shop
        $queryExpenses = "SELECT SUM(amount) as total_expenses FROM expenses WHERE shop_id = ?";
        $stmtExpenses = $conn->prepare($queryExpenses);
        $stmtExpenses->bind_param("i", $shopId);
        $stmtExpenses->execute();
        $expensesResult = $stmtExpenses->get_result()->fetch_assoc();
        $totalExpenses = $expensesResult['total_expenses'] ?? 0;

        // 3. Business Capital from shops table
        $queryCapital = "SELECT business_capital FROM shops WHERE id = ?";
        $stmtCapital = $conn->prepare($queryCapital);
        $stmtCapital->bind_param("i", $shopId);
        $stmtCapital->execute();
        $capitalResult = $stmtCapital->get_result()->fetch_assoc();
        $businessCapital = $capitalResult['business_capital'] ?? 0;

        // Calculate Net Profit
        // Formula: (Inventory + Cash + Debt) - Expenses - Capital
        $netProfit = ($inventoryValue + $cashInHand + $totalDebt) - $totalExpenses - $businessCapital;

        // Insert report with shop_id
        $query = "INSERT INTO reports (generated_by, inventory_value, total_expenses, business_capital, cash_in_hand, total_debt, net_profit, tenant_id, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iddddddii", $user_id, $inventoryValue, $totalExpenses, $businessCapital, $cashInHand, $totalDebt, $netProfit, $_SESSION['tenant_id'], $shopId);

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

function getHistory($conn, $shopId) {
    try {
        // Get report history for current shop
        $query = "SELECT r.*, u.username as generated_by_name 
                  FROM reports r 
                  JOIN users u ON r.generated_by = u.id 
                  WHERE r.shop_id = ?
                  ORDER BY r.created_at DESC 
                  LIMIT 50";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $shopId);
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
