<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db_connect.php';

session_start();

function getTableSchema($conn, $table) {
    $result = $conn->query("DESCRIBE $table");
    $columns = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $columns[] = $row;
        }
    }
    return $columns;
}

echo json_encode([
    'session' => $_SESSION,
    'marketplace_wallet_transactions' => getTableSchema($conn, 'marketplace_wallet_transactions'),
    'marketplace_wallets' => getTableSchema($conn, 'marketplace_wallets'),
    'marketplace_profiles' => getTableSchema($conn, 'marketplace_profiles')
], JSON_PRETTY_PRINT);
?>
