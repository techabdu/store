<?php
/**
 * Get User Profile
 * Fetches the current user's profile information
 */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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

try {
    // Fetch user profile data
    $stmt = $conn->prepare("
        SELECT 
            id, 
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
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Remove sensitive data
    unset($user['id']);
    
    // Return user profile
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'user' => $user
    ]);
    
} catch (Exception $e) {
    error_log("Get profile error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to fetch profile']);
}
?>
