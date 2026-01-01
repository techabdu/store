<?php
// backend/api/marketplace/listings/upload_image.php

require_once '../../../config/config.php';

setCorsHeaders();
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';

session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

try {
    if (!isset($_FILES['image'])) {
        throw new Exception('No image file provided');
    }

    $file = $_FILES['image'];
    
    // Validate error
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error: ' . $file['error']);
    }

    // Validate size (5MB max)
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('File too large (max 5MB)');
    }

    // Validate type
    // Expanded list to include GIF, BMP, and HEIC (iOS)
    // Note: HEIC display support depends on browser/OS, but we allow upload.
    $allowed_types = [
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'image/jpg', 
        'image/gif', 
        'image/bmp'
    ];
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime_type = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    // Logging for debugging
    error_log("Upload attempt: Filename=" . $file['name'] . " MIME=" . $mime_type);

    if (!in_array($mime_type, $allowed_types)) {
        throw new Exception('Invalid file type (' . $mime_type . '). Allowed: JPG, PNG, WEBP, GIF, BMP');
    }

    // Generate filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    // Map mime to extension if empty
    $mime_map = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'image/bmp' => 'bmp',
        'image/heic' => 'heic',
        'image/heif' => 'heic'
    ];
    
    if (empty($extension) && isset($mime_map[$mime_type])) {
        $extension = $mime_map[$mime_type];
    }
    
    if (empty($extension)) {
         $extension = 'jpg'; // Fallback
    }
    
    $filename = uniqid('listing_', true) . '.' . $extension;
    $upload_dir = '../../../uploads/marketplace/';
    
    // Ensure dir exists
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    $target_path = $upload_dir . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $target_path)) {
        // Return public URL (adjust based on your server config)
        // Assuming /store/backend/uploads/marketplace/ is accessible via web
        // The structure usually allows access if .htaccess permits
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'];
        
        // Return public URL relative to server root
        // Dynamically determine offset
        // Script is at: [root]/backend/api/marketplace/listings/upload_image.php
        // Uploads are at: [root]/backend/uploads/marketplace/filename.jpg
        
        $script_path = $_SERVER['SCRIPT_NAME']; 
        // e.g., /store/backend/api/marketplace/listings/upload_image.php
        
        // Find position of '/backend/' to determine root
        $backend_pos = strpos($script_path, '/backend/');
        
        if ($backend_pos !== false) {
            $root_path = substr($script_path, 0, $backend_pos); // e.g., /store
            $public_url = $root_path . "/backend/uploads/marketplace/" . $filename;
        } else {
            // Fallback: Assume we are in standard structure even if URL rewriting is weird
            $public_url = "/backend/uploads/marketplace/" . $filename;
        }
        echo json_encode([
            'success' => true, 
            'url' => $public_url,
            'filename' => $filename
        ]);
    } else {
        throw new Exception('Failed to save file');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
