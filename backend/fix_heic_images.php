<?php
// backend/fix_heic_images.php
require_once 'config/db_connect.php';

echo "Starting HEIC to JPG migration...\n";

// 1. Get all listings with .heic images
$query = "SELECT id, image_url FROM marketplace_listing_images WHERE image_url LIKE '%.heic' OR image_url LIKE '%.HEIC'";
$result = $conn->query($query);

if ($result->num_rows > 0) {
    echo "Found " . $result->num_rows . " images to convert.\n";
    
    while ($row = $result->fetch_assoc()) {
        $id = $row['id'];
        $url = $row['image_url'];
        
        // Extract filename from URL
        // URL format is likely /store/backend/uploads/marketplace/filename.heic
        // We need the absolute file path
        
        // Assuming strictly relative structure based on URL construction in upload_image.php
        $filename = basename($url);
        $file_path = __DIR__ . '/uploads/marketplace/' . $filename;
        
        if (file_exists($file_path)) {
            echo "Processing ID $id: $filename\n";
            
            try {
                $imagick = new Imagick();
                $imagick->readImage($file_path);
                $imagick->setImageFormat('jpeg');
                
                $new_filename = pathinfo($filename, PATHINFO_FILENAME) . '.jpg';
                $new_file_path = __DIR__ . '/uploads/marketplace/' . $new_filename;
                
                $imagick->writeImage($new_file_path);
                $imagick->clear();
                $imagick->destroy();
                
                echo "  -> Converted to $new_filename\n";
                
                // Update Database
                $new_url = str_replace($filename, $new_filename, $url);
                $update_stmt = $conn->prepare("UPDATE marketplace_listing_images SET image_url = ? WHERE id = ?");
                $update_stmt->bind_param("si", $new_url, $id);
                
                if ($update_stmt->execute()) {
                    echo "  -> Database updated.\n";
                } else {
                    echo "  -> Database update FAILED: " . $conn->error . "\n";
                }
                
            } catch (Exception $e) {
                echo "  -> Error converting: " . $e->getMessage() . "\n";
            }
            
        } else {
            echo "File not found locally: $file_path\n";
        }
    }
} else {
    echo "No .heic images found in database.\n";
}

echo "Migration complete.\n";
?>
