<?php
/**
 * Customer Analytics Helper Functions
 * Auto-update customer metrics on transactions and payments
 */

function updateCustomerAnalytics($conn, $shopId, $tenantId, $customerPhone, $customerName = null, $transactionAmount = 0) {
    if (!$customerPhone) return;

    try {
        // Clear any whitespace
        $customerPhone = trim($customerPhone);
        
        // Upsert customer record
        $query = "INSERT INTO customer_analytics 
                  (shop_id, tenant_id, customer_phone, customer_name, first_purchase_date, last_purchase_date, total_transactions, total_spent)
                  VALUES (?, ?, ?, ?, CURDATE(), CURDATE(), 1, ?)
                  ON DUPLICATE KEY UPDATE
                  last_purchase_date = CURDATE(),
                  total_transactions = total_transactions + 1,
                  total_spent = total_spent + ?,
                  customer_name = COALESCE(?, customer_name),
                  updated_at = CURRENT_TIMESTAMP";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iissdds", $shopId, $tenantId, $customerPhone, $customerName, 
                         $transactionAmount, $transactionAmount, $customerName);
        $stmt->execute();
        $stmt->close();
        
        // Recalculate derived metrics
        recalculateCustomerMetrics($conn, $shopId, $customerPhone);
        
    } catch (Exception $e) {
        error_log("Customer analytics update error: " . $e->getMessage());
    }
}

function recalculateCustomerMetrics($conn, $shopId, $customerPhone) {
    // 1. Basic metrics update
    $conn->query("UPDATE customer_analytics 
                  SET average_purchase_value = total_spent / NULLIF(total_transactions, 0),
                      days_since_last_purchase = DATEDIFF(CURDATE(), last_purchase_date),
                      lifetime_value = total_spent + current_outstanding_debt
                  WHERE shop_id = $shopId AND customer_phone = '$customerPhone'");
    
    // 2. Frequency calculation
    $conn->query("UPDATE customer_analytics 
                  SET purchase_frequency_days = DATEDIFF(last_purchase_date, first_purchase_date) / NULLIF(total_transactions - 1, 0)
                  WHERE shop_id = $shopId AND customer_phone = '$customerPhone' AND total_transactions > 1");
    
    // 3. Update segment based on rules
    updateCustomerSegment($conn, $shopId, $customerPhone);
}

function updateCustomerSegment($conn, $shopId, $customerPhone) {
    // 1. Get customer stats
    $query = "SELECT total_spent, total_transactions, days_since_last_purchase 
              FROM customer_analytics 
              WHERE shop_id = ? AND customer_phone = ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("is", $shopId, $customerPhone);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    if (!$result) return;
    
    // 2. Get shop rules
    $settingsQuery = "SELECT * FROM shop_settings WHERE shop_id = ?";
    $stmtS = $conn->prepare($settingsQuery);
    $stmtS->bind_param("i", $shopId);
    $stmtS->execute();
    $settings = $stmtS->get_result()->fetch_assoc();
    $stmtS->close();
    
    // Defaults if no settings found (fallback)
    $vipMinSpend = $settings['vip_min_spend'] ?? 5000000;
    $vipMinTx = $settings['vip_min_transactions'] ?? 10;
    $loyalMinSpend = $settings['loyal_min_spend'] ?? 2000000;
    $loyalMinTx = $settings['loyal_min_transactions'] ?? 5;
    $atRiskDays = $settings['at_risk_days'] ?? 60;
    $lostDays = $settings['lost_days'] ?? 180;
    
    $spent = floatval($result['total_spent']);
    $transactions = intval($result['total_transactions']);
    $daysSince = intval($result['days_since_last_purchase']);
    
    // Segmentation Rules
    $segment = 'occasional';
    
    if ($daysSince > $lostDays) {
        $segment = 'lost';
    } elseif ($daysSince > $atRiskDays) {
        $segment = 'at_risk';
    } elseif ($spent > $vipMinSpend && $transactions >= $vipMinTx) {
        $segment = 'vip';
    } elseif ($spent > $loyalMinSpend && $transactions >= $loyalMinTx) {
        $segment = 'loyal';
    } elseif ($transactions >= 2) {
        $segment = 'regular';
    }
    
    // Update segment
    $updateQuery = "UPDATE customer_analytics SET segment = ? WHERE shop_id = ? AND customer_phone = ?";
    $updateStmt = $conn->prepare($updateQuery);
    $updateStmt->bind_param("sis", $segment, $shopId, $customerPhone);
    $updateStmt->execute();
    $updateStmt->close();
}

function updateCustomerDebtMetrics($conn, $shopId, $customerPhone, $amountPaid = 0) {
    if (!$customerPhone) return;
    
    try {
        // Sync outstanding debt from the debts table
        $debtQuery = "SELECT SUM(remaining_balance) as outstanding 
                      FROM debts 
                      WHERE shop_id = ? AND customer_phone = ? AND status != 'written_off'";
        $stmt = $conn->prepare($debtQuery);
        $stmt->bind_param("is", $shopId, $customerPhone);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $outstanding = $res['outstanding'] ?? 0;
        $stmt->close();

        // Check total debt ever created
        $totalDebtQuery = "SELECT SUM(total_amount) as total_debt 
                           FROM debts 
                           WHERE shop_id = ? AND customer_phone = ?";
        $stmt = $conn->prepare($totalDebtQuery);
        $stmt->bind_param("is", $shopId, $customerPhone);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $totalDebtCreated = $res['total_debt'] ?? 0;
        $stmt->close();

        // Update analytics record
        $updateQuery = "UPDATE customer_analytics 
                        SET total_debt_paid = total_debt_paid + ?,
                            total_debt_created = ?,
                            current_outstanding_debt = ?,
                            lifetime_value = total_spent + ?,
                            last_debt_payment_date = IF(? > 0, CURDATE(), last_debt_payment_date)
                        WHERE shop_id = ? AND customer_phone = ?";
        $stmt = $conn->prepare($updateQuery);
        $stmt->bind_param("dddddis", $amountPaid, $totalDebtCreated, $outstanding, $outstanding, $amountPaid, $shopId, $customerPhone);
        $stmt->execute();
        $stmt->close();
        
        // Reliability Score Calculation
        // 1.0 = Perfect (0 debt or all paid)
        // Drops based on outstanding relative to created
        if ($totalDebtCreated > 0) {
            $score = 1 - ($outstanding / $totalDebtCreated);
            $conn->query("UPDATE customer_analytics SET payment_reliability_score = $score WHERE shop_id = $shopId AND customer_phone = '$customerPhone'");
        }

    } catch (Exception $e) {
        error_log("Customer debt analytics error: " . $e->getMessage());
    }
}
