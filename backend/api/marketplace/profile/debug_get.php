<?php
// backend/api/marketplace/profile/debug_get.php

header("Content-Type: application/json");
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once dirname(dirname(dirname(__DIR__))) . '/config/db_connect.php';

session_start();

$log_file = __DIR__ . '/debug_regression.log';
file_put_contents($log_file, "\n--- NEW DEBUG REQUEST [" . date('Y-m-d H:i:s') . "] ---\n", FILE_APPEND);

// FORCE USER ID FOR DEBUGGING IF NOT SET
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 2; // Default to user 2
    file_put_contents($log_file, "Forcing User ID: 2\n", FILE_APPEND);
}

// Parse CLI args into $_GET
if (php_sapi_name() === 'cli' && isset($argv)) {
    foreach ($argv as $arg) {
        $e = explode("=", $arg);
        if (count($e) == 2) {
            $_GET[$e[0]] = $e[1];
        }
    }
}

$user_id = $_SESSION['user_id'];
// Get shop_id from query or default to a known shop ID for testing
$target_shop_id = isset($_GET['shop_id']) ? intval($_GET['shop_id']) : 1;  

file_put_contents($log_file, "User ID: $user_id, Target Shop ID: " . var_export($target_shop_id, true) . "\n", FILE_APPEND);

// 1. Check Verification Status
$check_ver = $conn->prepare("SELECT * FROM marketplace_identity_verifications WHERE user_id = ?");
$check_ver->bind_param("i", $user_id);
$check_ver->execute();
$ver_res = $check_ver->get_result();
$ver_data = $ver_res->fetch_all(MYSQLI_ASSOC);
file_put_contents($log_file, "Identity Verifications in DB: " . print_r($ver_data, true) . "\n", FILE_APPEND);

// 2. Check Existing Profiles
$check_prof = $conn->prepare("SELECT * FROM marketplace_profiles WHERE user_id = ?");
$check_prof->bind_param("i", $user_id);
$check_prof->execute();
$prof_res = $check_prof->get_result();
$prof_data = $prof_res->fetch_all(MYSQLI_ASSOC);
file_put_contents($log_file, "Profiles in DB: " . print_r($prof_data, true) . "\n", FILE_APPEND);


// 3. Run Logic from get.php
$query = "
    SELECT 
        mp.*, 
        s.shop_name,
        s.shop_address,
        miv.verification_status as id_verification_status
    FROM marketplace_profiles mp
    LEFT JOIN shops s ON mp.shop_id = s.id
    LEFT JOIN marketplace_identity_verifications miv ON mp.user_id = miv.user_id
    WHERE mp.user_id = ?
";

$types = "i";
$params = [$user_id];

if ($target_shop_id) {
    $query .= " AND mp.shop_id = ?";
    $types .= "i";
    $params[] = $target_shop_id;
}

file_put_contents($log_file, "Query: $query\nParams: " . print_r($params, true) . "\n", FILE_APPEND);

$stmt = $conn->prepare($query);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    file_put_contents($log_file, "Profile FOUND: " . print_r($row, true) . "\n", FILE_APPEND);
    echo json_encode(['success' => true, 'profile' => $row]);
} else {
    file_put_contents($log_file, "Profile NOT FOUND. Attempting Self-Healing...\n", FILE_APPEND);
    
    // Self-Healing Logic Trace
    $check_ver = $conn->prepare("SELECT first_name, last_name FROM marketplace_identity_verifications WHERE user_id = ? AND is_verified = 1");
    $check_ver->bind_param("i", $user_id);
    $check_ver->execute();
    $ver_res = $check_ver->get_result();
    
    if ($ver_row = $ver_res->fetch_assoc()) {
        file_put_contents($log_file, "Verified User Data: " . print_r($ver_row, true) . "\n", FILE_APPEND);
        
        $disp_name = trim($ver_row['first_name'] . ' ' . $ver_row['last_name']);
        if (empty($disp_name)) $disp_name = "User " . $user_id;
        
        $shop_val = $target_shop_id ? $target_shop_id : null;
        
        file_put_contents($log_file, "Attempting INSERT with Shop ID: " . var_export($shop_val, true) . "\n", FILE_APPEND);
        
        $ins = $conn->prepare("INSERT INTO marketplace_profiles (user_id, shop_id, display_name, is_verified, verification_level, created_at, updated_at) VALUES (?, ?, ?, 1, 'basic', NOW(), NOW())");
        $ins->bind_param("iis", $user_id, $shop_val, $disp_name);
        
        try {
            if ($ins->execute()) {
                file_put_contents($log_file, "INSERT SUCCESS\n", FILE_APPEND);
                echo json_encode(['success' => true, 'status' => 'healed']);
            } else {
                file_put_contents($log_file, "INSERT FAILED: " . $ins->error . "\n", FILE_APPEND);
                echo json_encode(['success' => false, 'error' => $ins->error]);
            }
        } catch (Exception $e) {
            file_put_contents($log_file, "INSERT EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        file_put_contents($log_file, "User NOT Verified in DB\n", FILE_APPEND);
        echo json_encode(['success' => false, 'error' => 'Not verified']);
    }
}
?>
