<?php
// backend/includes/security.php

/**
 * Rate limiter class
 */
class RateLimiter {
    private $conn;
    
    public function __construct($db_connection) {
        $this->conn = $db_connection;
    }
    
    /**
     * Check if user has exceeded rate limit
     * @param int $user_id
     * @param string $action
     * @param int $max_attempts
     * @param int $time_window_minutes
     * @return bool True if within limit, False if exceeded
     */
    public function checkLimit($user_id, $action, $max_attempts, $time_window_minutes) {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as attempt_count 
            FROM rate_limit_log 
            WHERE user_id = ? 
            AND action = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ");
        
        $stmt->bind_param("isi", $user_id, $action, $time_window_minutes);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        $current_attempts = $result['attempt_count'];
        
        // Log this attempt
        $this->logAttempt($user_id, $action);
        
        if ($current_attempts >= $max_attempts) {
            return false;  // Rate limit exceeded
        }
        
        return true;  // Within limit
    }
    
    private function logAttempt($user_id, $action) {
        $stmt = $this->conn->prepare("INSERT INTO rate_limit_log (user_id, action, ip_address) VALUES (?, ?, ?)");
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $stmt->bind_param("iss", $user_id, $action, $ip);
        $stmt->execute();
    }
}

/**
 * Detect suspicious activity
 */
function detectSuspiciousActivity($conn, $user_id, $amount, $action) {
    if ($amount <= 0) return false;
    
    $flags = [];
    
    // Rule 1: Large transaction for new user (account < 7 days old)
    // Assuming 'users' table has 'created_at'
    $stmt = $conn->prepare("SELECT DATEDIFF(NOW(), created_at) as account_age FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    
    if ($user && $user['account_age'] < 7 && $amount > 50000) {
        $flags[] = 'large_transaction_new_account';
    }
    
    // Rule 2: Multiple withdrawals in short time (e.g., > 3 in 1 hour)
    if ($action === 'withdraw') {
        $stmt = $conn->prepare("
            SELECT COUNT(*) as withdrawal_count 
            FROM marketplace_wallet_transactions 
            WHERE user_id = ? 
            AND transaction_type = 'withdraw' 
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        if ($result['withdrawal_count'] >= 3) {
            $flags[] = 'multiple_withdrawals_rapid';
        }
    }
    
    // Rule 3: Unusual transaction amount (e.g., 5x average)
    // Only check if user has history (e.g. at least 5 transactions)
    $stmt = $conn->prepare("SELECT COUNT(*) as cnt, AVG(amount) as avg_amount FROM marketplace_wallet_transactions WHERE user_id = ? AND transaction_type = ?");
    $stmt->bind_param("is", $user_id, $action);
    $stmt->execute();
    $history = $stmt->get_result()->fetch_assoc();
    
    if ($history['cnt'] > 5 && $amount > ($history['avg_amount'] * 5)) {
        $flags[] = 'unusual_amount_anomaly';
    }
    
    // If any flags, create fraud alert
    if (count($flags) > 0) {
        $stmt = $conn->prepare("
            INSERT INTO fraud_alerts (user_id, transaction_type, amount, flags, status)
            VALUES (?, ?, ?, ?, 'pending_review')
        ");
        $flags_json = json_encode($flags);
        $stmt->bind_param("isds", $user_id, $action, $amount, $flags_json);
        $stmt->execute();
        
        return true;  // Suspicious
    }
    
    return false;  // Clean
}

/**
 * Check if user is restricted
 */
function checkUserRestriction($conn, $user_id, $restriction_type) {
    if (!$user_id) return false;
    
    // Check for specific restriction or full ban
    // Also check if restriction is active and not expired
    $stmt = $conn->prepare("
        SELECT id FROM marketplace_restrictions 
        WHERE user_id = ? 
        AND (restriction_type = ? OR restriction_type = 'full_ban')
        AND is_active = 1
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (lifted_at IS NULL)
    ");
    
    $stmt->bind_param("is", $user_id, $restriction_type);
    $stmt->execute();
    $result = $stmt->get_result();
    
    return $result->num_rows > 0;  // TRUE if restricted
}
?>
