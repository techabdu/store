<?php
// backend/workers/StorageCalculator.php

require_once __DIR__ . '/../config/database.php';

// Initialize DB
$db = new Database();
$conn = $db->connect();

echo "[" . date('Y-m-d H:i:s') . "] Starting StorageCalculator...\n";

// 1. Get All Active Tenants
$tenantsResult = $conn->query("SELECT id, shop_name FROM tenants WHERE status IN ('active', 'trial', 'suspended')");
$tenants = [];
while ($row = $tenantsResult->fetch_assoc()) {
    $tenants[] = $row;
}

echo "Found " . count($tenants) . " tenants to process.\n";

$totalPlatformDbSize = 0;
$totalPlatformFileSize = 0;

foreach ($tenants as $tenant) {
    try {
        $tenantId = $tenant['id'];
        
        // 2. Calculate Database Records (Approximate Size)
        // We count rows in main tables associated with this tenant
        // Tables: inventory, transactions, activity_logs, expenses, customers (analytics), etc.
        
        $recordCounts = [
            'inventory' => 0,
            'transactions' => 0,
            'activity_logs' => 0
            // Add more as needed
        ];
        
        // Count Inventory
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM inventory WHERE tenant_id = ?");
        $stmt->bind_param("i", $tenantId);
        $stmt->execute();
        $recordCounts['inventory'] = $stmt->get_result()->fetch_assoc()['count'];
        
        // Count Transactions
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM transactions WHERE tenant_id = ?");
        $stmt->bind_param("i", $tenantId);
        $stmt->execute();
        $recordCounts['transactions'] = $stmt->get_result()->fetch_assoc()['count'];
        
        // Activity Logs
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM activity_logs WHERE tenant_id = ?");
        $stmt->bind_param("i", $tenantId);
        $stmt->execute();
        $recordCounts['activity_logs'] = $stmt->get_result()->fetch_assoc()['count'];
        
        $totalRecords = array_sum($recordCounts);
        
        // Estimate DB Size: Average 1KB per record (very rough estimate)
        // Better: 2KB for transactions (items + log), 1KB for inventory, 0.5KB for activity
        $estDbSizeMB = ($recordCounts['inventory'] * 0.001) + 
                       ($recordCounts['transactions'] * 0.002) + 
                       ($recordCounts['activity_logs'] * 0.0005);
        $estDbSizeMB = round($estDbSizeMB, 2);
        
        // 3. Calculate File Storage
        // Path: /Applications/XAMPP/xamppfiles/htdocs/store/uploads/tenants/{tenant_id}/
        // OR common path /assets/uploads/ but separated?
        // Assuming /uploads/tenant_<id>/ or similar structure.
        // If not structured yet, we'll placeholder 0 or scan generic uploads if tagged.
        
        $uploadDir = __DIR__ . '/../../uploads/tenant_' . $tenantId;
        $fileStorageMB = 0;
        
        if (is_dir($uploadDir)) {
            $fileStorageMB = getDirectorySize($uploadDir);
        }
        
        // Convert bytes to MB
        $fileStorageMB = round($fileStorageMB / 1024 / 1024, 2);
        
        // 4. Store Metrics
        $insertStmt = $conn->prepare("
            INSERT INTO storage_metrics (tenant_id, database_size_mb, file_storage_mb, total_records, measured_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $insertStmt->bind_param("iddi", $tenantId, $estDbSizeMB, $fileStorageMB, $totalRecords);
        $insertStmt->execute();
        
        echo "Tenant #$tenantId ({$tenant['shop_name']}): DB {$estDbSizeMB}MB ($totalRecords recs), Files {$fileStorageMB}MB\n";
        
        $totalPlatformDbSize += $estDbSizeMB;
        $totalPlatformFileSize += $fileStorageMB;
        
    } catch (Exception $e) {
        echo "Error processing tenant #{$tenant['id']}: " . $e->getMessage() . "\n";
    }
}

echo "------------------------------------------------\n";
echo "Total Platform DB Size: {$totalPlatformDbSize} MB\n";
echo "Total Platform File Storage: {$totalPlatformFileSize} MB\n";
echo "[" . date('Y-m-d H:i:s') . "] StorageCalculator completed.\n";


function getDirectorySize($path) {
    if (!file_exists($path)) return 0;
    
    $bytestotal = 0;
    $path = realpath($path);
    if ($path !== false && $path != '' && file_exists($path)) {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)) as $object) {
            $bytestotal += $object->getSize();
        }
    }
    return $bytestotal;
}
?>
