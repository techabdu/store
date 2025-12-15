<?php
// backend/api/marketplace/identity/verify_nin.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';
require_once '../../../includes/kora_api.php';
require_once '../../../includes/encryption.php';
require_once '../../../includes/security.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->nin) || !isset($data->consent) || !$data->consent) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing NIN or consent']);
    exit();
}

$nin = trim($data->nin);

// Security Check: Rate Limiting
$rate_limiter = new RateLimiter($conn);
if (!$rate_limiter->checkLimit($user_id, 'nin_verification', 3, 120)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many verification attempts. Please try again later.']);
    exit();
}

// Check if already verified
$stmt = $conn->prepare("SELECT is_verified FROM marketplace_identity_verifications WHERE user_id = ? AND verification_type = 'nin' AND is_verified = 1");
$stmt->bind_param("i", $user_id);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User already verified with NIN']);
    exit();
}

// Call Kora API
$kora = new KoraAPI();
$request_data = [
    'id' => $nin,
    'kycType' => 'nin'
];

$result = $kora->verifyIdentity('identities/ng/nin', $request_data);

// Log attempt
$status = $result['success'] ? 'success' : 'failed';
$kora_ref = $result['data']['reference'] ?? generateSecureReference('VER');
$cost = $result['cost'] ?? 0;
$log_stmt = $conn->prepare("INSERT INTO marketplace_verification_attempts (user_id, verification_type, attempt_status, kora_reference, verification_cost, ip_address) VALUES (?, 'nin', ?, ?, ?, ?)");
$ip = $_SERVER['REMOTE_ADDR'];
$log_stmt->bind_param("issds", $user_id, $status, $kora_ref, $cost, $ip);
$log_stmt->execute();

if ($result['success']) {
    $api_data = $result['data'];
    
    // Encrypt Sensitive Data
    $encrypted_id = encryptSensitiveData($nin);
    $verification_data = json_encode($api_data);
    
    // Insert/Update Verification Record
    $stmt = $conn->prepare("
        INSERT INTO marketplace_identity_verifications 
        (user_id, is_verified, verification_level, verification_type, kora_reference, id_number, first_name, last_name, date_of_birth, verification_status, verification_data, user_consent_given, consent_timestamp, verified_at)
        VALUES (?, 1, 'basic', 'nin', ?, ?, ?, ?, ?, 'success', ?, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
        is_verified=1, verification_level='basic', kora_reference=?, id_number=?, first_name=?, last_name=?, date_of_birth=?, verification_status='success', verification_data=?, updated_at=NOW(), verified_at=NOW()
    ");
    
    $fname = $api_data['firstname'] ?? $api_data['first_name'] ?? '';
    $lname = $api_data['surname'] ?? $api_data['last_name'] ?? '';
    $dob_api = $api_data['birthdate'] ?? $api_data['dob'] ?? null; 
    
    $stmt->bind_param("issssssss" . "sssssss", 
        $user_id, $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data,
        $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data
    );
    
    if ($stmt->execute()) {
         $conn->query("UPDATE marketplace_profiles SET is_verified = 1, verification_level = 'basic' WHERE user_id = $user_id");
         
        echo json_encode(['success' => true, 'message' => 'NIN Verification Successful']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error saving verification']);
    }

} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $result['error'] ?? 'Verification failed']);
}
?>
