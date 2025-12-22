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

// DEBUG: Enable error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../../../config/db_connect.php';
require_once '../../../vendor/autoload.php';
// Load .env
try {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(dirname(dirname(__DIR__))));
    $dotenv->safeLoad();
} catch (Exception $e) {
    // Ignore if .env missing or already loaded
}

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

try {
    $raw_input = file_get_contents("php://input");
file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Request Data: " . $raw_input . "\n", FILE_APPEND);
$data = json_decode($raw_input);

if (!isset($data->nin) || !isset($data->consent) || !$data->consent) {
    file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Error: Missing fields\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing NIN or consent']);
    exit();
}

$nin = trim($data->nin);

// Security Check: Rate Limiting
$rate_limiter = new RateLimiter($conn);
// ALLOWED ATTEMPTS: 50, TIME WINDOW: 60 minutes (1 hour)
// To reduce later, change '50' to a lower number (e.g., 3) and '60' to desired minutes (e.g., 120 for 2 hours)
if (!$rate_limiter->checkLimit($user_id, 'nin_verification', 50, 60)) {
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
// API expects verification_consent => true (boolean)
// Assuming endpoint /identities/ng/nin
$request_data = [
    'id' => $nin,
    'verification_consent' => true // Should be boolean true
];

$result = $kora->verifyIdentity('identities/ng/nin', $request_data);
file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Kora Result: " . print_r($result, true) . "\n", FILE_APPEND);

// Log attempt
$status = $result['success'] ? 'success' : 'failed';
$kora_ref = $result['data']['reference'] ?? generateSecureReference('VER');
$cost = $result['cost'] ?? 0;
$log_stmt = $conn->prepare("INSERT INTO marketplace_verification_attempts (user_id, verification_type, attempt_status, kora_reference, verification_cost, ip_address) VALUES (?, 'nin', ?, ?, ?, ?)");
$ip = $_SERVER['REMOTE_ADDR'];
$log_stmt->bind_param("issds", $user_id, $status, $kora_ref, $cost, $ip);
file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Logging attempt for user $user_id...\n", FILE_APPEND);
$log_stmt->execute();
file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Attempt logged. Moving to result processing.\n", FILE_APPEND);

if ($result['success']) {
    $api_data = $result['data'];
    
    file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Success block entered. Encrypting...\n", FILE_APPEND);
    // Encrypt Sensitive Data
    $encrypted_id = encryptSensitiveData($nin);
    file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Encryption done. Preparing Save...\n", FILE_APPEND);
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
    
    // 7 params for INSERT, 7 for UPDATE = 14 total
    // Types: i (user_id) + s (kora_ref) + s (id) + s (fname) + s (lname) + s (dob) + s (data) = issssss
    // Update: s (kora_ref) + s (id) + s (fname) + s (lname) + s (dob) + s (data) = ssssss
    // Wait, let's recount: 
    // INSERT: (?, 1, 'basic', 'nin', ?, ?, ?, ?, ?, 'success', ?, 1, NOW(), NOW()) -> 7 question marks
    // UPDATE: kora_reference=?, id_number=?, first_name=?, last_name=?, date_of_birth=?, verification_data=? -> 6 question marks
    // Total = 13. My previous count was 13. Let's verify the SQL.
    /*
    INSERT INTO marketplace_identity_verifications 
        (user_id, is_verified, verification_level, verification_type, kora_reference, id_number, first_name, last_name, date_of_birth, verification_status, verification_data, user_consent_given, consent_timestamp, verified_at)
        VALUES (?, 1, 'basic', 'nin', ?, ?, ?, ?, ?, 'success', ?, 1, NOW(), NOW()) -> 1:user_id, 2:kora_ref, 3:id, 4:fname, 5:lname, 6:dob, 7:data
    ON DUPLICATE KEY UPDATE 
        is_verified=1, verification_level='basic', kora_reference=?, id_number=?, first_name=?, last_name=?, date_of_birth=?, verification_status='success', verification_data=?, updated_at=NOW(), verified_at=NOW() -> 8:kora_ref, 9:id, 10:fname, 11:lname, 12:dob, 13:data
    */
    // Yes, 13 is correct. I miscounted in my thought process.
    $stmt->bind_param("issssssssssss", 
        $user_id, $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data,
        $kora_ref, $encrypted_id, $fname, $lname, $dob_api, $verification_data
    );
    
    if ($stmt->execute()) {
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
                'message' => 'NIN Verification Successful',
                'verification_details' => [
                    'verification_type' => 'nin',
                    'name' => trim("$fname $lname"),
                    'verified_at' => date('Y-m-d H:i:s')
                ]
            ]);
        } else {
            error_log("Verification Save Failed: " . $stmt->error);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error saving verification: ' . $stmt->error]);
        }
    } else {
        // Force a 400 error if Kora failed, even if they returned HTTP 200
        $httpCode = ($result['http_code'] >= 200 && $result['http_code'] < 300) ? 400 : ($result['http_code'] ?: 400);
        http_response_code($httpCode);
        // Extract specific error message
        $errorMsg = 'Verification failed';
        if (!empty($result['error'])) {
            $errorMsg = $result['error'];
        } elseif (!empty($result['message'])) {
            $errorMsg = $result['message'];
        }
        
        // Log detailed failure for admin
        $log_data = [
            'user_id' => $user_id,
            'http_code' => $result['http_code'],
            'kora_message' => $result['message'] ?? 'No message',
            'kora_data' => $result['data'] ?? []
        ];
        error_log("NIN Verification Failed: " . json_encode($log_data));
        
        // Append detailed debug info if available (remove in production if strict)
        if (isset($result['data']['message'])) {
            $errorMsg .= ': ' . $result['data']['message'];
        }
        echo json_encode(['success' => false, 'error' => $errorMsg]);
    }

} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/debug_verify.log', date('[Y-m-d H:i:s] ') . "Global Crash: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . "\n", FILE_APPEND);
    error_log("Verification Crash: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred: ' . $e->getMessage()]);
}
?>
