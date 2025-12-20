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
require_once '../../../vendor/autoload.php';
// Load .env
try {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(dirname(dirname(__DIR__))));
    $dotenv->safeLoad();
} catch (Exception $e) {
    // Ignore
}

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
// ALLOWED ATTEMPTS: 50, TIME WINDOW: 60 minutes (1 hour)
// To reduce later, change '50' to a lower number (e.g., 3) and '60' to desired minutes (e.g., 120 for 2 hours)
if (!$rate_limiter->checkLimit($user_id, 'bvn_verification', 50, 60)) {
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
// API expects verification_consent => true (boolean)
$request_data = [
    'id' => $bvn,
    'verification_consent' => true
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
    
    // 7 params for INSERT, 6 for UPDATE = 13 total
    $stmt->bind_param("issssssssssss", 
        $user_id, $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data,
        $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data
    );
    
    if ($stmt->execute()) {
        // Also update main profile verification status if exists
         // Create or Update Marketplace Profile
         $display_name = trim("$fname $lname");
         if (empty($display_name)) $display_name = "User $user_id";
         
         $profile_query = "
            INSERT INTO marketplace_profiles (user_id, display_name, is_verified, verification_level, created_at, updated_at) 
            VALUES (?, ?, 1, 'basic', NOW(), NOW())
            ON DUPLICATE KEY UPDATE is_verified = 1, verification_level = 'basic', updated_at = NOW()
         ";
         
         $profile_stmt = $conn->prepare($profile_query);
         
         if ($profile_stmt) {
             $profile_stmt->bind_param("is", $user_id, $display_name);
             if (!$profile_stmt->execute()) {
                 error_log("Profile update failed: " . $profile_stmt->error);
             }
         } else {
             error_log("Profile prepare failed: " . $conn->error);
         }
         
        echo json_encode([
            'success' => true, 
            'message' => 'BVN Verification Successful',
            'verification_details' => [
                'verification_type' => 'bvn',
                'name' => trim("$fname $lname"),
                'verified_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error saving verification']);
    }

} else {
    http_response_code(400);
    $errorMsg = $result['error'] ?? $result['message'] ?? 'Verification failed';
    // Append detailed debug info if available
    if (isset($result['data']['message'])) {
        $errorMsg .= ': ' . $result['data']['message'];
    }
    echo json_encode(['success' => false, 'error' => $errorMsg]);
}
?>
