<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db_connect.php';

function getTableColumns($conn, $table) {
    $result = $conn->query("DESCRIBE $table");
    $columns = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $columns[] = $row['Field'];
        }
    }
    return $columns;
}

echo json_encode([
    'marketplace_profiles' => getTableColumns($conn, 'marketplace_profiles'),
    'shops' => getTableColumns($conn, 'shops')
]);
?>
