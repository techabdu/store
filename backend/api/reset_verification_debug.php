<?php
// backend/api/reset_verification_debug.php
require_once __DIR__ . '/../config/db_connect.php';
session_start();

// Allow execution via CLI or secret param
if (php_sapi_name() !== 'cli' && !isset($_GET['secret']) && !isset($_SESSION['user_id'])) {
    die("Login first");
}

$user_id = $_SESSION['user_id'] ?? 67; // Default to 67 for CLI/Test if no session
$conn->query("DELETE FROM marketplace_identity_verifications WHERE user_id = $user_id");
$conn->query("DELETE FROM marketplace_verification_attempts WHERE user_id = $user_id");
$conn->query("UPDATE marketplace_profiles SET is_verified = 0, verification_level = 'none' WHERE user_id = $user_id");

// Reset rate limiter too? 
// Table: rate_limits
// $conn->query("DELETE FROM rate_limits WHERE user_id = $user_id AND action IN ('nin_verification', 'bvn_verification')");

echo json_encode(['success' => true, 'message' => 'Verification reset for user ' . $user_id]);
?>
