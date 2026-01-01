<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';

// Set CORS headers
setCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];

if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No file uploaded or upload error']);
    exit();
}

$file = $_FILES['avatar'];
$allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$max_size = 5 * 1024 * 1024; // 5MB

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime_type, $allowed_types)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.']);
    exit();
}

if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File too large. Max size is 5MB.']);
    exit();
}

// Create uploads directory if not exists
// Path on disk: htdocs/store/uploads/profile_images/
$upload_dir = __DIR__ . '/../../../../uploads/profile_images/';

if (!file_exists($upload_dir)) {
    if (!mkdir($upload_dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create upload directory']);
        exit();
    }
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
// Sanitize extension
$extension = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $extension));
$filename = 'avatar_' . $user_id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
$filepath = $upload_dir . $filename;

if (move_uploaded_file($file['tmp_name'], $filepath)) {
    // URL to access the file: determine relative to root
    // Script is in /backend/api/marketplace/profile/
    // Uploads are in /uploads/
    
    // Attempt to determine the base URL path dynamically
    $script_dir = dirname($_SERVER['SCRIPT_NAME']);
    // Go up 4 levels from /store/backend/api/marketplace/profile to /store (or / from root)
    $url_root = dirname(dirname(dirname(dirname($script_dir))));
    
    // If we are at root ('/' or '\'), url_root might be just a slash or empty on some systems
    // Normalize to ensure no trailing slash unless it's just '/'
    $url_root = rtrim($url_root, '/');
    if ($url_root === '\\') $url_root = ''; // Windows root fix if needed
    
    $public_url = $url_root . '/uploads/profile_images/' . $filename;

    try {
        // Update database
        $stmt = $conn->prepare("UPDATE marketplace_profiles SET profile_image = ? WHERE user_id = ?");
        $stmt->bind_param("si", $public_url, $user_id);
        
        if ($stmt->execute()) {
             echo json_encode(['success' => true, 'image_url' => $public_url, 'message' => 'Profile picture updated']);
        } else {
             throw new Exception("Database update failed");
        }
    } catch (Exception $e) {
        // Attempt to delete the file if DB update fails
        if (file_exists($filepath)) {
            unlink($filepath);
        }
        error_log("update_avatar.php Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update profile picture.']);
    }

} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file']);
}
?>
