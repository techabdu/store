<?php
/**
 * Budgets API
 * 
 * Purpose: Manage budgets and perform variance analysis (Budget vs Actual)
 * Method: GET, POST
 * Authentication: Required (SuperAdmin/Admin)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers
setCorsHeaders();

// Check authentication
$user_data = checkAuth();

// Only allow SuperAdmin or Admin
if ($user_data['role'] !== 'superadmin' && $user_data['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit;
}

$shopId = getCurrentShopId();
$tenantId = $_SESSION['tenant_id'];

if (!$shopId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No shop context']);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : 'performance';

try {
    switch ($action) {
        case 'performance':
            $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
            
            // 1. Fetch Budget for the month
            $budgetQuery = "SELECT * FROM budgets WHERE shop_id = ? AND tenant_id = ? AND budget_month = ?";
            $stmtB = $conn->prepare($budgetQuery);
            $stmtB->bind_param("iis", $shopId, $tenantId, $month);
            $stmtB->execute();
            $budget = $stmtB->get_result()->fetch_assoc();
            
            if (!$budget) {
                // Return defaults if no budget set
                $budget = [
                    'target_sales' => 0,
                    'target_profit' => 0,
                    'max_expenses' => 0,
                    'budget_month' => $month
                ];
            }
            
            // 2. Fetch Actuals
            $startDate = $month . "-01";
            $endDate = date('Y-m-t', strtotime($startDate));
            
            $actualsQuery = "SELECT 
                                SUM(total_amount) as actual_sales,
                                SUM(gross_profit) as actual_gross_profit
                             FROM transactions 
                             WHERE shop_id = ? AND tenant_id = ? 
                             AND transaction_type = 'sale'
                             AND (created_at BETWEEN ? AND ?)";
            $stmtA = $conn->prepare($actualsQuery);
            $endDateTime = $endDate . " 23:59:59";
            $stmtA->bind_param("iiss", $shopId, $tenantId, $startDate, $endDateTime);
            $stmtA->execute();
            $actuals = $stmtA->get_result()->fetch_assoc();
            
            // Operating Expenses
            $expenseQuery = "SELECT SUM(amount) as actual_opex FROM expenses 
                             WHERE shop_id = ? AND tenant_id = ?
                             AND (date BETWEEN ? AND ?)";
            $stmtE = $conn->prepare($expenseQuery);
            $stmtE->bind_param("iiss", $shopId, $tenantId, $startDate, $endDate);
            $stmtE->execute();
            $opexData = $stmtE->get_result()->fetch_assoc();
            
            // Inventory Purchase Costs (Stock additions)
            $inventoryQuery = "SELECT SUM(cost_price) as actual_inventory_cost FROM inventory 
                               WHERE shop_id = ? AND tenant_id = ?
                               AND (created_at BETWEEN ? AND ?)
                               AND status != 'returned'";
            $stmtI = $conn->prepare($inventoryQuery);
            $stmtI->bind_param("iiss", $shopId, $tenantId, $startDate, $endDateTime);
            $stmtI->execute();
            $inventoryData = $stmtI->get_result()->fetch_assoc();

            $actSales = floatval($actuals['actual_sales'] ?? 0);
            $actGrossProfit = floatval($actuals['actual_gross_profit'] ?? 0);
            $actOpex = floatval($opexData['actual_opex'] ?? 0);
            $actInventory = floatval($inventoryData['actual_inventory_cost'] ?? 0);
            
            // Total Outflows for Budgeting (Operating Exp + Inventory Purchases)
            $actTotalExpenses = $actOpex + $actInventory;
            
            // Net Profit = Gross Profit - Operating Expenses
            // Note: Inventory purchase is an outflow but not an "expense" in P&L terms until sold, 
            // but for "Budgeting/Cash Control", it's usually treated as something to track against limits.
            $actNetProfit = $actGrossProfit - $actOpex;
            
            echo json_encode([
                'success' => true,
                'budget' => $budget,
                'actuals' => [
                    'sales' => $actSales,
                    'operating_expenses' => $actOpex,
                    'inventory_purchases' => $actInventory,
                    'total_expenses' => $actTotalExpenses,
                    'net_profit' => $actNetProfit,
                    'gross_profit' => $actGrossProfit
                ],
                'variance' => [
                    'sales' => $actSales - floatval($budget['target_sales']),
                    'expenses' => floatval($budget['max_expenses']) - $actTotalExpenses, // Positive is good (under budget)
                    'net_profit' => $actNetProfit - floatval($budget['target_profit'])
                ]
            ]);
            break;
            
        case 'save':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception("Method not allowed");
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $month = $input['budget_month'] ?? date('Y-m');
            $targetSales = floatval($input['target_sales'] ?? 0);
            $targetProfit = floatval($input['target_profit'] ?? 0);
            $maxExpenses = floatval($input['max_expenses'] ?? 0);
            
            $saveQuery = "INSERT INTO budgets (tenant_id, shop_id, budget_month, target_sales, target_profit, max_expenses)
                          VALUES (?, ?, ?, ?, ?, ?)
                          ON DUPLICATE KEY UPDATE 
                          target_sales = VALUES(target_sales),
                          target_profit = VALUES(target_profit),
                          max_expenses = VALUES(max_expenses)";
            
            $stmtS = $conn->prepare($saveQuery);
            $stmtS->bind_param("iisddd", $tenantId, $shopId, $month, $targetSales, $targetProfit, $maxExpenses);
            
            if (!$stmtS->execute()) {
                throw new Exception("Failed to save budget");
            }
            
            echo json_encode(['success' => true, 'message' => 'Budget saved successfully']);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    error_log("Budgets API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
