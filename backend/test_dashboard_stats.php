<?php
/**
 * Test script to verify dashboard stats are filtered by tenant_id
 * This script simulates API calls for different tenants
 */

require_once __DIR__ . '/config/database.php';

echo "=== Dashboard Stats Tenant Filtering Test ===\n\n";

// Get all tenants
$tenantsQuery = "SELECT id, shop_name FROM tenants ORDER BY id LIMIT 5";
$tenantsResult = $conn->query($tenantsQuery);

if ($tenantsResult->num_rows === 0) {
    echo "No tenants found in database.\n";
    exit;
}

echo "Testing dashboard stats for each tenant:\n";
echo str_repeat("-", 80) . "\n\n";

while ($tenant = $tenantsResult->fetch_assoc()) {
    $tenant_id = $tenant['id'];
    $shop_name = $tenant['shop_name'];
    
    echo "Tenant ID: $tenant_id | Shop: $shop_name\n";
    echo str_repeat("-", 80) . "\n";
    
    // 1. Inventory Count
    $inventoryQuery = "SELECT COUNT(*) as count FROM inventory WHERE status = 'in_stock' AND tenant_id = ?";
    $stmt = $conn->prepare($inventoryQuery);
    $stmt->bind_param("i", $tenant_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $inventoryCount = $result->fetch_assoc()['count'];
    $stmt->close();
    
    // 2. Monthly Sales
    $salesQuery = "SELECT SUM(total_amount) as total FROM transactions 
                   WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
                   AND YEAR(created_at) = YEAR(CURRENT_DATE())
                   AND tenant_id = ?";
    $stmt = $conn->prepare($salesQuery);
    $stmt->bind_param("i", $tenant_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $monthlySales = $result->fetch_assoc()['total'] ?? 0;
    $stmt->close();
    
    // 3. Monthly Expenses
    $expensesQuery = "SELECT SUM(amount) as total FROM expenses 
                      WHERE MONTH(date) = MONTH(CURRENT_DATE()) 
                      AND YEAR(date) = YEAR(CURRENT_DATE())
                      AND tenant_id = ?";
    $stmt = $conn->prepare($expensesQuery);
    $stmt->bind_param("i", $tenant_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $monthlyExpenses = $result->fetch_assoc()['total'] ?? 0;
    $stmt->close();
    
    // 4. Weekly Sales Count
    $weeklyQuery = "SELECT COUNT(*) as count FROM transactions 
                    WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURRENT_DATE(), 1)
                    AND tenant_id = ?";
    $stmt = $conn->prepare($weeklyQuery);
    $stmt->bind_param("i", $tenant_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $weeklySalesCount = $result->fetch_assoc()['count'];
    $stmt->close();
    
    // Display results
    echo "  Total Inventory (in stock): $inventoryCount\n";
    echo "  Monthly Sales: ₦" . number_format($monthlySales, 2) . "\n";
    echo "  Monthly Expenses: ₦" . number_format($monthlyExpenses, 2) . "\n";
    echo "  Weekly Sales Count: $weeklySalesCount\n";
    echo "\n";
}

echo str_repeat("=", 80) . "\n";
echo "Test completed. If values differ between tenants, filtering is working correctly.\n";

$conn->close();
?>
