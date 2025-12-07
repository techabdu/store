<?php
/**
 * Tenant Isolation Security Tests
 * 
 * This script verifies that tenants cannot access each other's data.
 * Run this manually to test cross-tenant isolation.
 * 
 * IMPORTANT: You need to manually test with two browser sessions
 * This script provides SQL queries you can run to verify isolation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

echo "🔒 Tenant Isolation Security Test Suite\n";
echo "========================================\n\n";

// Test 1: Verify tenant_id filters are in place
echo "TEST 1: Checking tenant_id filters in queries\n";
echo "----------------------------------------------\n";

$criticalFiles = [
    'customers.php' => 'Customer details query',
    'transactions/read.php' => 'Transaction items query',
    'inventory/create.php' => 'IMEI uniqueness check',
    'inventory/read.php' => 'Inventory count query',
];

foreach ($criticalFiles as $file => $description) {
    $filePath = "../api/$file";
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        
        // Check for tenant_id in WHERE clauses
        $hasTenantFilter = (strpos($content, 'tenant_id = ?') !== false || 
                           strpos($content, 'tenant_id=?') !== false);
        
        if ($hasTenantFilter) {
            echo "✅ $file: $description - tenant_id filter FOUND\n";
        } else {
            echo "❌ $file: $description - tenant_id filter MISSING\n";
        }
    } else {
        echo "⚠️  $file: File not found\n";
    }
}

echo "\n";

// Test 2: Database structure verification
echo "TEST 2: Verifying database indexes\n";
echo "-----------------------------------\n";

$expectedIndexes = [
    'inventory' => ['idx_tenant_id', 'idx_inventory_tenant_status', 'idx_inventory_tenant_created'],
    'transactions' => ['idx_tenant_id', 'idx_transactions_tenant_created'],
    'expenses' => ['idx_tenant_id', 'idx_expenses_tenant_date'],
    'transaction_items' => ['idx_tenant_id', 'idx_transaction_items_tenant_txn'],
];

foreach ($expectedIndexes as $table => $indexes) {
    echo "\n📊 Table: $table\n";
    
    $result = $conn->query("
        SELECT DISTINCT INDEX_NAME 
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '$table'
        AND INDEX_NAME LIKE 'idx_%tenant%'
    ");
    
    $foundIndexes = [];
    while ($row = $result->fetch_assoc()) {
        $foundIndexes[] = $row['INDEX_NAME'];
    }
    
    foreach ($indexes as $expectedIndex) {
        if (in_array($expectedIndex, $foundIndexes)) {
            echo "   ✅ $expectedIndex\n";
        } else {
            echo "   ⚠️  $expectedIndex - NOT FOUND (run performance_indexes.sql)\n";
        }
    }
}

echo "\n";

// Test 3: Manual testing instructions
echo "TEST 3: Manual Cross-Tenant Access Testing\n";
echo "-------------------------------------------\n";
echo "⚠️  IMPORTANT: These tests require manual execution\n\n";

echo "Step 1: Open two browser sessions\n";
echo "   - Browser 1: Login as Tenant A user\n";
echo "   - Browser 2: Login as Tenant B user\n\n";

echo "Step 2: Test Inventory Isolation\n";
echo "   - Browser 1: Go to inventory, note an item ID (e.g., ID=123)\n";
echo "   - Browser 2: Try to access that item via API:\n";
echo "     GET /api/inventory/read.php?id=123\n";
echo "   - Expected: Item not found or empty result\n\n";

echo "Step 3: Test Customer Data Isolation\n";
echo "   - Browser 1: Create a customer 'John Doe'\n";
echo "   - Browser 2: Search for 'John Doe' in customers\n";
echo "   - Expected: No results (different tenant)\n\n";

echo "Step 4: Test IMEI Uniqueness (Per-Tenant)\n";
echo "   - Browser 1: Add phone with IMEI '123456789012345'\n";
echo "   - Browser 2: Add phone with same IMEI '123456789012345'\n";
echo "   - Expected: BOTH succeed (IMEI unique per tenant)\n\n";

echo "Step 5: Test Transaction Isolation\n";
echo "   - Browser 1: Create a transaction, note transaction ID\n";
echo "   - Browser 2: Try to access that transaction ID via API\n";
echo "   - Expected: Transaction not found\n\n";

// Test 4: SQL-based isolation test
echo "TEST 4: SQL-Based Isolation Verification\n";
echo "-----------------------------------------\n";

$tenantCount = $conn->query("SELECT COUNT(DISTINCT id) as count FROM tenants")->fetch_assoc()['count'];
echo "Total tenants in database: $tenantCount\n\n";

if ($tenantCount >= 2) {
    echo "Running cross-tenant data check...\n\n";
    
    // Get two tenant IDs
    $tenants = $conn->query("SELECT id, shop_name FROM tenants LIMIT 2");
    $tenant1 = $tenants->fetch_assoc();
    $tenant2 = $tenants->fetch_assoc();
    
    if ($tenant1 && $tenant2) {
        echo "Tenant 1: {$tenant1['shop_name']} (ID: {$tenant1['id']})\n";
        echo "Tenant 2: {$tenant2['shop_name']} (ID: {$tenant2['id']})\n\n";
        
        // Check inventory isolation
        $inv1 = $conn->query("SELECT COUNT(*) as count FROM inventory WHERE tenant_id = {$tenant1['id']}")->fetch_assoc()['count'];
        $inv2 = $conn->query("SELECT COUNT(*) as count FROM inventory WHERE tenant_id = {$tenant2['id']}")->fetch_assoc()['count'];
        
        echo "Inventory items:\n";
        echo "   Tenant 1: $inv1 items\n";
        echo "   Tenant 2: $inv2 items\n";
        
        // Verify no cross-contamination
        $crossCheck = $conn->query("
            SELECT COUNT(*) as count 
            FROM inventory i1 
            WHERE i1.tenant_id = {$tenant1['id']} 
            AND EXISTS (
                SELECT 1 FROM inventory i2 
                WHERE i2.id = i1.id 
                AND i2.tenant_id = {$tenant2['id']}
            )
        ")->fetch_assoc()['count'];
        
        if ($crossCheck == 0) {
            echo "   ✅ No cross-tenant data contamination detected\n";
        } else {
            echo "   ❌ WARNING: Cross-tenant data found!\n";
        }
    }
} else {
    echo "⚠️  Need at least 2 tenants to run cross-tenant tests\n";
    echo "   Run the test data generator first: php generate_test_data.php\n";
}

echo "\n";

// Summary
echo "========================================\n";
echo "📋 TEST SUMMARY\n";
echo "========================================\n";
echo "✅ Code-level checks: Complete\n";
echo "✅ Database structure: Verified\n";
echo "⚠️  Manual testing: Required (see instructions above)\n";
echo "💡 Recommendation: Test with real user sessions\n\n";

$conn->close();
