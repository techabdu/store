<?php
// backend/verification_test.php

session_start();
$_SESSION['user_id'] = 1;

require_once 'config/db_connect.php';
require_once 'includes/kora_api.php';
require_once 'includes/encryption.php';

echo "Verifying fixes...\n";

$user_id = $_SESSION['user_id'];
$amount = 500;
$reference = generateSecureReference('VERIFY');

echo "Inserting into kora_payment_references using correct schema...\n";
try {
    $stmt = $conn->prepare("
        INSERT INTO kora_payment_references 
        (user_id, kora_reference, transaction_type, amount, status, created_at)
        VALUES (?, ?, 'pay_in', ?, 'pending', NOW())
    ");
    
    if (!$stmt) {
        echo "PREPARE FAILED: " . $conn->error . "\n";
        exit;
    }

    $stmt->bind_param("isd", $user_id, $reference, $amount);
    
    if ($stmt->execute()) {
        echo "SUCCESS: Record inserted correctly.\n";
        
        // Clean up test record
        $conn->query("DELETE FROM kora_payment_references WHERE kora_reference = '$reference'");
        echo "Cleanup: Test record removed.\n";
    } else {
        echo "FAILED: " . $stmt->error . "\n";
    }
} catch (Throwable $e) {
    echo "CRASH: " . $e->getMessage() . "\n";
}

echo "Verification complete.\n";
?>
