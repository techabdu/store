<?php
// backend/api/marketplace/identity/verify_bvn.php

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

// Session check (Assuming global session management or JWT)
// For now, using standard PHP session
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->bvn) || !isset($data->dob) || !isset($data->consent) || !$data->consent) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields or consent']);
    exit();
}

$bvn = trim($data->bvn);
$dob = trim($data->dob); // Format: YYYY-MM-DD

// Security Check: Rate Limiting
$rate_limiter = new RateLimiter($conn);
if (!$rate_limiter->checkLimit($user_id, 'bvn_verification', 3, 120)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many verification attempts. Please try again later.']);
    exit();
}

// Check if already verified
$stmt = $conn->prepare("SELECT is_verified FROM marketplace_identity_verifications WHERE user_id = ? AND verification_type = 'bvn' AND is_verified = 1");
$stmt->bind_param("i", $user_id);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User already verified with BVN']);
    exit();
}

// Call Kora API
$kora = new KoraAPI();
$request_data = [
    'id' => $bvn,
    'kycType' => 'bvn'
];

$result = $kora->verifyIdentity('identities/ng/bvn', $request_data); // Using verifyIdentity helper which calls KoraAPI

// Log attempt
$status = $result['success'] ? 'success' : 'failed';
$kora_ref = $result['data']['reference'] ?? generateSecureReference('VER');
$cost = $result['cost'] ?? 0;
$log_stmt = $conn->prepare("INSERT INTO marketplace_verification_attempts (user_id, verification_type, attempt_status, kora_reference, verification_cost, ip_address) VALUES (?, 'bvn', ?, ?, ?, ?)");
$ip = $_SERVER['REMOTE_ADDR'];
$log_stmt->bind_param("issds", $user_id, $status, $kora_ref, $cost, $ip);
$log_stmt->execute();

if ($result['success']) {
    $api_data = $result['data'];
    
    // Check key fields match (Name match logic can be complex, doing exact or loose match)
    // For now, storing success.
    // In production, we should match $api_data['first_name'] vs User's DB name if required.
    
    // Encrypt Sensitive Data
    $encrypted_id = encryptSensitiveData($bvn);
    $verification_data = json_encode($api_data);
    
    // Insert/Update Verification Record
    $stmt = $conn->prepare("
        INSERT INTO marketplace_identity_verifications 
        (user_id, is_verified, verification_level, verification_type, kora_reference, id_number, first_name, last_name, date_of_birth, verification_status, verification_data, user_consent_given, consent_timestamp, verified_at)
        VALUES (?, 1, 'basic', 'bvn', ?, ?, ?, ?, ?, 'success', ?, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
        is_verified=1, verification_level='basic', kora_reference=?, id_number=?, first_name=?, last_name=?, date_of_birth=?, verification_status='success', verification_data=?, updated_at=NOW(), verified_at=NOW()
    ");
    
    $fname = $api_data['first_name'] ?? '';
    $lname = $api_data['last_name'] ?? '';
    $dob_api = $api_data['dob'] ?? $dob; // Use API return or input
    
    $stmt->bind_param("issssssss" . "sssssss", 
        $user_id, $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data,
        $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data
    );
    
    if ($stmt->execute()) {
        // Also update main profile verification status if exists
         $conn->query("UPDATE marketplace_profiles SET is_verified = 1, verification_level = 'basic' WHERE user_id = $user_id");
         
        echo json_encode(['success' => true, 'message' => 'BVN Verification Successful']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error saving verification']);
    }

} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $result['error'] ?? 'Verification failed']);
}
?>
