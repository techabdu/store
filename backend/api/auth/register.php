<?php
/**
 * Shop Owner Registration Endpoint
 * Creates a new tenant (shop) and admin user
 * 
 * NOTE: Email verification will be implemented in Phase 3
 * For now, shops are automatically activated
 */

require_once __DIR__ . '/../../config/database.php';
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get input
$data = json_decode(file_get_contents("php://input"));

// Validate required fields
$required = ['shop_name', 'owner_username', 'owner_email', 'password', 'shop_phone'];
foreach ($required as $field) {
    if (!isset($data->$field) || empty(trim($data->$field))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
        exit;
    }
}

$shopName = trim($data->shop_name);
$ownerUsername = trim($data->owner_username);
$ownerEmail = trim($data->owner_email);
$password = trim($data->password);
$shopPhone = trim($data->shop_phone);
$shopAddress = isset($data->shop_address) ? trim($data->shop_address) : '';

// Validate email format
if (!filter_var($ownerEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    exit;
}

// Validate password strength
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']);
    exit;
}

// Check if email or username already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
$stmt->bind_param("ss", $ownerEmail, $ownerUsername);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => 'Email or username already exists']);
    exit;
}

// Check if shop email already exists
$stmt = $conn->prepare("SELECT id FROM tenants WHERE shop_email = ?");
$stmt->bind_param("s", $ownerEmail);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => 'Shop email already registered']);
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    // Calculate trial end date (25 days from now)
    $trialEndsAt = date('Y-m-d H:i:s', strtotime('+25 days'));
    
    // Create tenant (shop)
    $stmt = $conn->prepare("
        INSERT INTO tenants (
            shop_name, shop_address, shop_phone, shop_email, 
            status, plan_type, trial_ends_at, email_verified, created_at
        ) VALUES (?, ?, ?, ?, 'trial', 'free_trial', ?, 1, NOW())
    ");
    $stmt->bind_param("sssss", $shopName, $shopAddress, $shopPhone, $ownerEmail, $trialEndsAt);
    $stmt->execute();
    $tenantId = $conn->insert_id;
    
    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    
    // Create admin user for this tenant
    $stmt = $conn->prepare("
        INSERT INTO users (
            username, email, password_hash, role, status, tenant_id, created_at
        ) VALUES (?, ?, ?, 'admin', 'active', ?, NOW())
    ");
    $stmt->bind_param("sssi", $ownerUsername, $ownerEmail, $passwordHash, $tenantId);
    $stmt->execute();
    
    // Commit transaction
    $conn->commit();
    
    // Success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Shop registered successfully! You can now login.',
        'shop_name' => $shopName,
        'trial_ends_at' => $trialEndsAt
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    error_log("Registration error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Registration failed. Please try again.']);
}
?>
