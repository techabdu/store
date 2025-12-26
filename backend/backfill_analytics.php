<?php
/**
 * Backfill Customer Analytics Data
 * 
 * Purpose: Populate customer_analytics table from existing transactions and debts
 */

require_once 'config/config.php';
require_once 'config/database.php';
require_once 'helpers/customer_analytics.php';

echo "Starting backfill of customer analytics...\n";

// 1. Get all unique customers from transactions
$query = "SELECT shop_id, tenant_id, customer_phone, customer_name, 
                 MIN(DATE(created_at)) as first_purchase,
                 MAX(DATE(created_at)) as last_purchase,
                 COUNT(*) as tx_count,
                 SUM(total_amount) as total_spent
          FROM transactions 
          WHERE transaction_type = 'sale' AND customer_phone IS NOT NULL AND customer_phone != ''
          GROUP BY shop_id, tenant_id, customer_phone";

$res = $conn->query($query);
$count = 0;

while ($row = $res->fetch_assoc()) {
    $shopId = $row['shop_id'];
    $tenantId = $row['tenant_id'];
    $phone = $row['customer_phone'];
    $name = $row['customer_name'];
    $first = $row['first_purchase'];
    $last = $row['last_purchase'];
    $txCount = $row['tx_count'];
    $spent = $row['total_spent'];

    // Insert into analytics
    $stmt = $conn->prepare("INSERT INTO customer_analytics 
        (shop_id, tenant_id, customer_phone, customer_name, first_purchase_date, last_purchase_date, total_transactions, total_spent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        first_purchase_date = VALUES(first_purchase_date),
        last_purchase_date = VALUES(last_purchase_date),
        total_transactions = VALUES(total_transactions),
        total_spent = VALUES(total_spent)");
    
    $stmt->bind_param("iissssii", $shopId, $tenantId, $phone, $name, $first, $last, $txCount, $spent);
    $stmt->execute();
    $stmt->close();
    
    // Update debt metrics and segments
    updateCustomerDebtMetrics($conn, $shopId, $phone);
    recalculateCustomerMetrics($conn, $shopId, $phone);
    
    $count++;
}

echo "Successfully processed $count customers.\n";
