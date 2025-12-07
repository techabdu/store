<?php
require_once __DIR__ . '/../config/database.php';

try {
    $db = new Database();
    $conn = $db->connect();

    echo "Updating security_logs schema...\n";

    // 1. Drop foreign key first if it exists (might need to query constraints to find exact name)
    // MySQL often names it something like security_logs_ibfk_1
    // We'll try to modify the column first, if it fails due to FK, we might need a more complex script.
    // Actually, usually you can modify the column to NULL without dropping FK if the FK allows NULL.
    // Let's try direct modification.

    $sql = "ALTER TABLE security_logs MODIFY tenant_id INT NULL COMMENT 'Which shop this security event relates to (NULL for unknown)'";
    
    if ($conn->query($sql)) {
        echo "✅ Schema updated: tenant_id in security_logs is now NULLable.\n";
    } else {
        throw new Exception("Error updating schema: " . $conn->error);
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
