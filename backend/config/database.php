<?php
// Detect environment based on server hostname
$isProduction = $_SERVER['HTTP_HOST'] !== 'localhost';

if ($isProduction) {
    // Production credentials (Hostinger)
    $host = 'localhost';
    $username = 'u464722139_salsabeel';
    $password = 'Aa@store123';
    $database = 'u464722139_store';
} else {
    // Local XAMPP credentials
    $host = '127.0.0.1';
    $username = 'root';
    $password = '';
    $database = 'store';
}

// Create connection
$conn = new mysqli($host, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    // Log error but don't expose details to user
    error_log("Connection failed: " . $conn->connect_error);
    
    // Return JSON error response
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Set charset to utf8mb4
$conn->set_charset("utf8mb4");
?>
