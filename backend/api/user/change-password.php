<?php
/**
 * Change Password
 * Allows user to change their password
 */

session_start();
header('Content-Type: application/json');
// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

require_once '../../config/database.php';

// Set CORS headers using centralized config
setCorsHeaders();
require_once '../../config/config.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['current_password']) || !isset($input['new_password']) || !isset($input['confirm_password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'All password fields are required']);
    exit;
}

$current_password = $input['current_password'];
$new_password = $input['new_password'];
$confirm_password = $input['confirm_password'];

// Validation
$errors = [];

// Check if new password matches confirmation
if ($new_password !== $confirm_password) {
    $errors[] = 'New password and confirmation do not match';
}

// Check new password length
if (strlen($new_password) < 6) {
    $errors[] = 'New password must be at least 6 characters';
}

// Check if new password is different from current
if ($current_password === $new_password) {
    $errors[] = 'New password must be different from current password';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => implode(', ', $errors)]);
    exit;
}

try {
    // Fetch current password hash
    $stmt = $conn->prepare("SELECT password_hash FROM users WHERE id = ?");
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Verify current password
    if (!password_verify($current_password, $user['password_hash'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Current password is incorrect']);
        exit;
    }
    
    // Hash new password
    $new_password_hash = password_hash($new_password, PASSWORD_BCRYPT);
    
    // Update password
    $stmt = $conn->prepare("
        UPDATE users 
        SET password_hash = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ");
    
    $stmt->bind_param("si", $new_password_hash, $_SESSION['user_id']);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update password");
    }
    
    $stmt->close();
    
    // Return success
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Password changed successfully'
    ]);
    
} catch (Exception $e) {
    error_log("Change password error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to change password']);
}
?>
