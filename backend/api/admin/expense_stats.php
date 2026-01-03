<?php
/**
 * Admin Expense Stats API
 * GET endpoint to retrieve daily and monthly expense statistics
 * Accessible by: Admin, SuperAdmin
 * 
 * Expense Calculation: 
 * Sum of all expense amounts for the specified period
 */

header('Content-Type: application/json');

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check authentication
checkAuth();

// Check role - allow admin and superadmin only
checkRole(['admin', 'superadmin']);

try {
    // Get current shop context
    $shopId = getCurrentShopId();
    if ($shopId === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No shop context. Please select a branch.']);
        exit;
    }
    
    $tenantId = $_SESSION['tenant_id'];
    
    // Calculate Daily Expenses (today) - now filtered by shop_id
    $dailyExpensesQuery = "
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE DATE(date) = CURDATE()
        AND shop_id = ?
    ";
    
    $dailyStmt = $conn->prepare($dailyExpensesQuery);
    if (!$dailyStmt) {
        throw new Exception("Failed to prepare daily expenses query: " . $conn->error);
    }
    $dailyStmt->bind_param("i", $shopId);
    if (!$dailyStmt->execute()) {
        throw new Exception("Failed to execute daily expenses query: " . $dailyStmt->error);
    }
    $dailyResult = $dailyStmt->get_result()->fetch_assoc();
    $dailyStmt->close();
    
    $dailyExpenses = $dailyResult['total_expenses'];
    
    // Calculate Monthly Expenses (current month) - now filtered by shop_id
    $monthlyExpensesQuery = "
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE MONTH(date) = MONTH(CURRENT_DATE())
        AND YEAR(date) = YEAR(CURRENT_DATE())
        AND shop_id = ?
    ";
    
    $monthlyStmt = $conn->prepare($monthlyExpensesQuery);
    if (!$monthlyStmt) {
        throw new Exception("Failed to prepare monthly expenses query: " . $conn->error);
    }
    $monthlyStmt->bind_param("i", $shopId);
    if (!$monthlyStmt->execute()) {
        throw new Exception("Failed to execute monthly expenses query: " . $monthlyStmt->error);
    }
    $monthlyResult = $monthlyStmt->get_result()->fetch_assoc();
    $monthlyStmt->close();
    
    $monthlyExpenses = $monthlyResult['total_expenses'];
    
    // Store daily expense record - now with shop_id (upsert)
    $today = date('Y-m-d');
    $expenseCountQuery = "
        SELECT COUNT(*) as count
        FROM expenses
        WHERE DATE(date) = CURDATE()
        AND shop_id = ?
    ";
    
    $countStmt = $conn->prepare($expenseCountQuery);
    if (!$countStmt) {
        throw new Exception("Failed to prepare expense count query: " . $conn->error);
    }
    $countStmt->bind_param("i", $shopId);
    if (!$countStmt->execute()) {
        throw new Exception("Failed to execute expense count query: " . $countStmt->error);
    }
    $countResult = $countStmt->get_result()->fetch_assoc();
    $expenseCount = $countResult['count'];
    $countStmt->close();
    
    // Upsert expense record - now with shop_id
    $upsertQuery = "
        INSERT INTO expense_records (tenant_id, shop_id, date, daily_expenses, expense_count)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            daily_expenses = VALUES(daily_expenses),
            expense_count = VALUES(expense_count),
            updated_at = CURRENT_TIMESTAMP
    ";
    
    $upsertStmt = $conn->prepare($upsertQuery);
    if (!$upsertStmt) {
        throw new Exception("Failed to prepare upsert query: " . $conn->error);
    }
    $upsertStmt->bind_param("iisdi", $tenantId, $shopId, $today, $dailyExpenses, $expenseCount);
    if (!$upsertStmt->execute()) {
        throw new Exception("Failed to execute upsert query: " . $upsertStmt->error);
    }
    $upsertStmt->close();
    
    // Return expense statistics
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'daily_expenses' => (float)$dailyExpenses,
            'monthly_expenses' => (float)$monthlyExpenses
        ],
        'shop_id' => $shopId
    ]);
    
} catch (Exception $e) {
    error_log("Expense stats error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to retrieve expense statistics'
    ]);
}

$conn->close();
