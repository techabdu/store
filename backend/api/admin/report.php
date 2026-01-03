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
        $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
        $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;
        getStats($db, $shopId, $startDate, $endDate);
        break;
    case 'create':
        createReport($db, $user_id, $shopId);
        break;
    case 'history':
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 15;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        getHistory($db, $shopId, $limit, $offset);
        break;
    default:
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid action"]);
        break;
}

function getStats($conn, $shopId, $startDate = null, $endDate = null) {
    try {
        // 1. Total Inventory Cost (in_stock) for current shop
        $queryInventory = "SELECT SUM(cost_price) as total_inventory_cost FROM inventory WHERE status = 'in_stock' AND shop_id = ?";
        $stmtInventory = $conn->prepare($queryInventory);
        $stmtInventory->bind_param("i", $shopId);
        $stmtInventory->execute();
        $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
        $totalInventoryCost = $inventoryResult['total_inventory_cost'] ?? 0;

        // 1.5 Total Sales for current shop (with optional date range)
        $querySales = "SELECT SUM(total_amount) as total_sales FROM transactions WHERE shop_id = ? AND transaction_type = 'sale'";
        if ($startDate && $endDate) {
            $querySales .= " AND DATE(created_at) BETWEEN ? AND ?";
        }
        
        $stmtSales = $conn->prepare($querySales);
        if ($startDate && $endDate) {
            $stmtSales->bind_param("iss", $shopId, $startDate, $endDate);
        } else {
            $stmtSales->bind_param("i", $shopId);
        }
        $stmtSales->execute();
        $salesResult = $stmtSales->get_result()->fetch_assoc();
        $totalSales = $salesResult['total_sales'] ?? 0;

        // 1.6 Total COGS for current shop (with optional date range)
        $queryCOGS = "SELECT SUM(total_cogs) as total_cogs FROM transactions WHERE shop_id = ? AND transaction_type = 'sale'";
        if ($startDate && $endDate) {
            $queryCOGS .= " AND DATE(created_at) BETWEEN ? AND ?";
        }
        
        $stmtCOGS = $conn->prepare($queryCOGS);
        if ($startDate && $endDate) {
            $stmtCOGS->bind_param("iss", $shopId, $startDate, $endDate);
        } else {
            $stmtCOGS->bind_param("i", $shopId);
        }
        $stmtCOGS->execute();
        $cogsResult = $stmtCOGS->get_result()->fetch_assoc();
        $totalCOGS = $cogsResult['total_cogs'] ?? 0;

        // 2. Total Expenses for current shop (with optional date range)
        $queryExpenses = "SELECT SUM(amount) as total_expenses FROM expenses WHERE shop_id = ?";
        if ($startDate && $endDate) {
            $queryExpenses .= " AND date BETWEEN ? AND ?";
        }
        
        $stmtExpenses = $conn->prepare($queryExpenses);
        if ($startDate && $endDate) {
            $stmtExpenses->bind_param("iss", $shopId, $startDate, $endDate);
        } else {
            $stmtExpenses->bind_param("i", $shopId);
        }
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
                "total_sales" => (float)$totalSales,
                "total_cogs" => (float)$totalCOGS,
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

    $cashInHand = isset($data->cash_in_hand) ? (float)$data->cash_in_hand : 0;
    $startDate = isset($data->start_date) ? $data->start_date : null;
    $endDate = isset($data->end_date) ? $data->end_date : null;

    try {
        // 1. Total Inventory Cost
        $queryInventory = "SELECT SUM(cost_price) as total_inventory_cost FROM inventory WHERE status = 'in_stock' AND shop_id = ?";
        $stmtInventory = $conn->prepare($queryInventory);
        $stmtInventory->bind_param("i", $shopId);
        $stmtInventory->execute();
        $inventoryResult = $stmtInventory->get_result()->fetch_assoc();
        $inventoryValue = $inventoryResult['total_inventory_cost'] ?? 0;

        // 1.5 Total Sales
        $querySales = "SELECT SUM(total_amount) as total_sales FROM transactions WHERE shop_id = ? AND transaction_type = 'sale'";
        if ($startDate && $endDate) {
            $querySales .= " AND DATE(created_at) BETWEEN ? AND ?";
        }
        $stmtSales = $conn->prepare($querySales);
        if ($startDate && $endDate) {
            $stmtSales->bind_param("iss", $shopId, $startDate, $endDate);
        } else {
            $stmtSales->bind_param("i", $shopId);
        }
        $stmtSales->execute();
        $salesResult = $stmtSales->get_result()->fetch_assoc();
        $totalSales = $salesResult['total_sales'] ?? 0;

        // 1.6 Total COGS
        $queryCOGS = "SELECT SUM(total_cogs) as total_cogs FROM transactions WHERE shop_id = ? AND transaction_type = 'sale'";
        if ($startDate && $endDate) {
            $queryCOGS .= " AND DATE(created_at) BETWEEN ? AND ?";
        }
        $stmtCOGS = $conn->prepare($queryCOGS);
        if ($startDate && $endDate) {
            $stmtCOGS->bind_param("iss", $shopId, $startDate, $endDate);
        } else {
            $stmtCOGS->bind_param("i", $shopId);
        }
        $stmtCOGS->execute();
        $cogsResult = $stmtCOGS->get_result()->fetch_assoc();
        $totalCOGS = $cogsResult['total_cogs'] ?? 0;

        // 2. Total Expenses (with active filter)
        $queryExpenses = "SELECT SUM(amount) as total_expenses FROM expenses WHERE shop_id = ?";
        if ($startDate && $endDate) {
            $queryExpenses .= " AND date BETWEEN ? AND ?";
        }
        $stmtExpenses = $conn->prepare($queryExpenses);
        if ($startDate && $endDate) {
            $stmtExpenses->bind_param("iss", $shopId, $startDate, $endDate);
        } else {
            $stmtExpenses->bind_param("i", $shopId);
        }
        $stmtExpenses->execute();
        $expensesResult = $stmtExpenses->get_result()->fetch_assoc();
        $totalExpenses = $expensesResult['total_expenses'] ?? 0;

        // 3. Business Capital
        $queryCapital = "SELECT business_capital FROM shops WHERE id = ?";
        $stmtCapital = $conn->prepare($queryCapital);
        $stmtCapital->bind_param("i", $shopId);
        $stmtCapital->execute();
        $capitalResult = $stmtCapital->get_result()->fetch_assoc();
        $businessCapital = $capitalResult['business_capital'] ?? 0;

        // 4. Total Outstanding Debt (Automated)
        $queryDebts = "SELECT SUM(remaining_balance) as total_outstanding FROM debts WHERE shop_id = ? AND status != 'written_off'";
        $stmtDebts = $conn->prepare($queryDebts);
        $stmtDebts->bind_param("i", $shopId);
        $stmtDebts->execute();
        $debtsResult = $stmtDebts->get_result()->fetch_assoc();
        $totalDebt = $debtsResult['total_outstanding'] ?? 0;

        // Calculate Financials
        // 1. Gross Profit = Sales - COGS
        $grossProfit = $totalSales - $totalCOGS;
        
        // 2. Operating Profit (the new Net Profit) = Gross Profit - Expenses
        $operatingProfit = $grossProfit - $totalExpenses;
        
        // 3. For backward compatibility if needed, but we'll use operatingProfit as the main metric
        $netProfit = $operatingProfit; 

        // Insert report
        $query = "INSERT INTO reports (generated_by, inventory_value, total_sales, total_cogs, total_expenses, business_capital, cash_in_hand, total_debt, gross_profit, operating_profit, net_profit, tenant_id, shop_id, expense_start_date, expense_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iddddddddddiiss", 
            $user_id, 
            $inventoryValue, 
            $totalSales, 
            $totalCOGS, 
            $totalExpenses, 
            $businessCapital, 
            $cashInHand, 
            $totalDebt, 
            $grossProfit, 
            $operatingProfit, 
            $netProfit, 
            $_SESSION['tenant_id'], 
            $shopId, 
            $startDate, 
            $endDate
        );

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => "Report saved successfully"]);
        } else {
            throw new Exception("Failed to save report: " . $stmt->error);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error saving report: " . $e->getMessage()]);
    }
}

function getHistory($conn, $shopId, $limit = 15, $offset = 0) {
    try {
        $query = "SELECT r.*, u.username as generated_by_name 
                  FROM reports r 
                  JOIN users u ON r.generated_by = u.id 
                  WHERE r.shop_id = ?
                  ORDER BY r.created_at DESC 
                  LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iii", $shopId, $limit, $offset);
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
