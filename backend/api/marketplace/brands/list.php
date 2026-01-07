<?php
// backend/api/marketplace/brands/list.php

require_once '../../../config/config.php';
require_once '../../../middleware/api_logger.php'; // API request logging

setCorsHeaders();
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';

try {
    $query = "SELECT DISTINCT phone_brand FROM marketplace_listings WHERE status = 'active' AND phone_brand IS NOT NULL AND phone_brand != '' ORDER BY phone_brand ASC";
    $result = $conn->query($query);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $brands = [];
    while ($row = $result->fetch_assoc()) {
        $brands[] = $row['phone_brand'];
    }

    echo json_encode([
        'success' => true,
        'brands' => $brands
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
