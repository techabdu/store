<?php
/**
 * Test Data Generator for Performance Testing
 * 
 * This script generates dummy inventory and transaction data
 * to test performance with varying data volumes across tenants.
 * 
 * Usage: php generate_test_data.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

// Configuration
$TENANT_CONFIGS = [
    1 => ['inventory' => 10000, 'transactions' => 5000, 'name' => 'Large Tenant A'],
    2 => ['inventory' => 500, 'transactions' => 250, 'name' => 'Medium Tenant B'],
    3 => ['inventory' => 50, 'transactions' => 25, 'name' => 'Small Tenant C'],
];

$BRANDS = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Huawei', 'Oppo', 'Vivo'];
$MODELS = ['Pro Max', 'Ultra', 'Plus', 'Lite', 'Standard', 'Pro', 'Edge', 'Note'];
$COLORS = ['Black', 'White', 'Blue', 'Red', 'Green', 'Silver', 'Gold', 'Purple'];
$STORAGE = ['64GB', '128GB', '256GB', '512GB', '1TB'];
$CONDITIONS = ['new', 'used'];
$STATUSES = ['in_stock', 'sold'];

echo "🚀 Starting test data generation...\n\n";

foreach ($TENANT_CONFIGS as $tenantId => $config) {
    echo "📦 Generating data for {$config['name']} (Tenant ID: $tenantId)\n";
    
    // Check if tenant exists
    $checkTenant = $conn->query("SELECT id FROM tenants WHERE id = $tenantId");
    if ($checkTenant->num_rows === 0) {
        echo "   ⚠️  Tenant $tenantId does not exist. Skipping...\n\n";
        continue;
    }
    
    // Generate inventory items
    echo "   📱 Generating {$config['inventory']} inventory items...\n";
    $stmt = $conn->prepare(
        "INSERT INTO inventory (brand, model, imei, color, storage, condition_status, price, cost_price, status, tenant_id, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
    );
    
    for ($i = 0; $i < $config['inventory']; $i++) {
        $brand = $BRANDS[array_rand($BRANDS)];
        $model = $MODELS[array_rand($MODELS)];
        $imei = str_pad(rand(100000000000000, 999999999999999), 15, '0', STR_PAD_LEFT);
        $color = $COLORS[array_rand($COLORS)];
        $storage = $STORAGE[array_rand($STORAGE)];
        $condition = $CONDITIONS[array_rand($CONDITIONS)];
        $price = rand(200, 1500);
        $costPrice = $price * 0.7; // 30% margin
        $status = $STATUSES[array_rand($STATUSES)];
        
        $stmt->bind_param(
            "ssssssddsii",
            $brand, $model, $imei, $color, $storage, $condition,
            $price, $costPrice, $status, $tenantId
        );
        
        try {
            $stmt->execute();
        } catch (Exception $e) {
            // Skip duplicates
            if (strpos($e->getMessage(), 'Duplicate') === false) {
                echo "   ❌ Error: " . $e->getMessage() . "\n";
            }
        }
        
        // Progress indicator
        if (($i + 1) % 1000 === 0) {
            echo "      ✓ " . ($i + 1) . " items created\n";
        }
    }
    $stmt->close();
    
    echo "   ✅ Inventory generation complete\n";
    
    // Generate transactions
    echo "   💰 Generating {$config['transactions']} transactions...\n";
    
    // Get some inventory IDs for this tenant
    $inventoryIds = [];
    $result = $conn->query("SELECT id FROM inventory WHERE tenant_id = $tenantId AND status = 'in_stock' LIMIT 1000");
    while ($row = $result->fetch_assoc()) {
        $inventoryIds[] = $row['id'];
    }
    
    if (count($inventoryIds) > 0) {
        $transStmt = $conn->prepare(
            "INSERT INTO transactions (user_id, customer_name, customer_phone, customer_address, total_amount, payment_method, tenant_id) 
             VALUES (1, ?, ?, ?, ?, ?, ?)"
        );
        
        for ($i = 0; $i < $config['transactions']; $i++) {
            $customerName = "Customer " . rand(1, 1000);
            $customerPhone = "+1" . rand(1000000000, 9999999999);
            $customerAddress = rand(1, 999) . " Main St, City";
            $totalAmount = rand(200, 2000);
            $paymentMethod = ['cash', 'card', 'transfer'][array_rand(['cash', 'card', 'transfer'])];
            
            $transStmt->bind_param(
                "sssdsi",
                $customerName, $customerPhone, $customerAddress,
                $totalAmount, $paymentMethod, $tenantId
            );
            
            $transStmt->execute();
            
            // Progress indicator
            if (($i + 1) % 500 === 0) {
                echo "      ✓ " . ($i + 1) . " transactions created\n";
            }
        }
        $transStmt->close();
        echo "   ✅ Transaction generation complete\n";
    } else {
        echo "   ⚠️  No inventory available for transactions\n";
    }
    
    echo "\n";
}

// Summary
echo "📊 Test Data Summary:\n";
$summary = $conn->query("
    SELECT 
        t.id as tenant_id,
        t.shop_name,
        COUNT(DISTINCT i.id) as inventory_count,
        COUNT(DISTINCT tr.id) as transaction_count
    FROM tenants t
    LEFT JOIN inventory i ON t.id = i.tenant_id
    LEFT JOIN transactions tr ON t.id = tr.tenant_id
    GROUP BY t.id
    ORDER BY t.id
");

while ($row = $summary->fetch_assoc()) {
    echo "   Tenant {$row['tenant_id']} ({$row['shop_name']}): ";
    echo "{$row['inventory_count']} inventory items, {$row['transaction_count']} transactions\n";
}

echo "\n✅ Test data generation complete!\n";
echo "💡 You can now test performance with varying data volumes\n";

$conn->close();
