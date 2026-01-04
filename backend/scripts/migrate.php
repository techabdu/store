<?php
/**
 * Migration Runner
 * Applies SQL migrations to the database
 */
require_once __DIR__ . '/../config/database.php';

function runMigration($filePath) {
    global $conn;
    
    if (!file_exists($filePath)) {
        echo "File not found: $filePath\n";
        return false;
    }
    
    echo "Applying migration: " . basename($filePath) . "...\n";
    
    $sql = file_get_contents($filePath);
    
    // Split by semicolons, but be careful with stored procedures if any (none here)
    $queries = explode(';', $sql);
    
    $conn->begin_transaction();
    
    try {
        foreach ($queries as $query) {
            $query = trim($query);
            if (empty($query)) continue;
            
            if (!$conn->query($query)) {
                throw new Exception("Error executing query: " . $conn->error . "\nQuery: " . $query);
            }
        }
        $conn->commit();
        echo "Migration applied successfully!\n";
        return true;
    } catch (Exception $e) {
        $conn->rollback();
        echo "Migration failed: " . $e->getMessage() . "\n";
        return false;
    }
}

// Ensure it's run from CLI
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.");
}

$file = isset($argv[1]) ? $argv[1] : '';
if (empty($file)) {
    die("Usage: php migrate.php <path_to_sql_file>\n");
}

runMigration($file);
