<?php
/**
 * Update User Profile
 * Updates the current user's personal information and avatar color
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

require_once '../../config/config.php';
require_once '../../config/database.php';

// Set CORS headers using centralized config
setCorsHeaders();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['full_name']) || !isset($input['email']) || !isset($input['avatar_color'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

// Sanitize and validate inputs
$full_name = trim($input['full_name']);
$email = trim($input['email']);
$phone = isset($input['phone']) ? trim($input['phone']) : null;
$avatar_color = trim($input['avatar_color']);

// Validation
$errors = [];

// Validate full name
if (empty($full_name) || strlen($full_name) < 2 || strlen($full_name) > 255) {
    $errors[] = 'Full name must be between 2 and 255 characters';
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

// Validate phone (optional)
if (!empty($phone) && !preg_match('/^[0-9+\-\s()]{7,20}$/', $phone)) {
    $errors[] = 'Invalid phone number format';
}

// Validate avatar color (hex format)
if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $avatar_color)) {
    $errors[] = 'Invalid color format';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => implode(', ', $errors)]);
    exit;
}

try {
    // Check if email is already taken by another user
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmt->bind_param("si", $email, $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email already in use']);
        exit;
    }
    $stmt->close();
    
    // Update user profile
    $stmt = $conn->prepare("
        UPDATE users 
        SET full_name = ?, 
            email = ?, 
            phone = ?, 
            avatar_color = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ");
    
    $stmt->bind_param("ssssi", $full_name, $email, $phone, $avatar_color, $_SESSION['user_id']);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update profile");
    }
    
    $stmt->close();
    
    // Fetch updated user data
    $stmt = $conn->prepare("
        SELECT 
            username, 
            full_name,
            email, 
            phone,
            role, 
            status,
            avatar_color,
            created_at, 
            updated_at 
        FROM users 
        WHERE id = ?
    ");
    
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Update session data
    $_SESSION['username'] = $user['username'];
    
    // Return success with updated user data
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully',
        'user' => $user
    ]);
    
} catch (Exception $e) {
    error_log("Update profile error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update profile']);
}
?>
