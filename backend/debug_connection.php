<?php
// backend/debug_connection.php
// This script is for debugging database connection issues on production
// It prints the environment variables (masked) and attempts to connect to the DB

header('Content-Type: text/plain');

echo "Debug Database Connection Script\n";
echo "================================\n\n";

// 1. Check .env file
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    echo "[OK] .env file found at $envPath\n";
    $envContent = file_get_contents($envPath);
    echo "--- .env content (masked) ---\n";
    $lines = explode("\n", $envContent);
    foreach ($lines as $line) {
        if (empty(trim($line))) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            if (strpos($key, 'PASS') !== false) {
                echo "$key=******** (length: " . strlen($val) . ")\n";
            } else {
                echo "$key=$val\n";
            }
        } else {
            echo "$line\n";
        }
    }
    echo "-----------------------------\n\n";
} else {
    echo "[ERROR] .env file NOT found at $envPath\n\n";
}

// 2. Load Config
require_once 'config/database.php';

echo "Attempting connection...\n";

$db = new Database();
$conn = $db->connect();

if ($conn && !$conn->connect_error) {
    echo "[SUCCESS] Connected to database successfully!\n";
    echo "Host Info: " . $conn->host_info . "\n";
    echo "Server Info: " . $conn->server_info . "\n";
} else {
    echo "[FAILURE] Connection failed.\n";
    if ($conn && $conn->connect_error) {
        echo "Error: " . $conn->connect_error . "\n";
    } else {
        echo "Error: Unable to establish connection (conn is null).\n";
        // Try to get last error
        echo "Last Error: " . error_get_last()['message'] . "\n";
    }
}
?>
