<?php
// backend/api/marketplace/identity/check_status.php

require_once '../../../config/config.php';
require_once '../../../middleware/api_logger.php'; // API request logging

setCorsHeaders();
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';
require_once '../../../includes/encryption.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];

$stmt = $conn->prepare("
    SELECT is_verified, verification_level, verification_type, verification_status, verified_at, first_name, last_name, id_number 
    FROM marketplace_identity_verifications 
    WHERE user_id = ?
");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // Decrypt ID number to mask it (show last 4 digits)
    $masked_id = '****';
    try {
        if (!empty($row['id_number'])) {
            $decrypted = decryptSensitiveData($row['id_number']);
            $masked_id = str_repeat('*', strlen($decrypted) - 4) . substr($decrypted, -4);
        }
    } catch (Exception $e) {
        $masked_id = '**** (Decryption Error)';
    }

    echo json_encode([
        'success' => true,
        'is_verified' => (bool)$row['is_verified'],
        'verification_level' => $row['verification_level'],
        'verification_type' => $row['verification_type'],
        'verification_status' => $row['verification_status'],
        'verified_at' => $row['verified_at'],
        'name' => $row['first_name'] . ' ' . $row['last_name'],
        'masked_id' => $masked_id
    ]);
} else {
    echo json_encode([
        'success' => true,
        'is_verified' => false,
        'verification_level' => 'none',
        'message' => 'User not verified'
    ]);
}
?>
