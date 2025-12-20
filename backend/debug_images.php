<?php
require_once 'config/db_connect.php';

$query = "SELECT * FROM marketplace_listing_images LIMIT 10";
$result = $conn->query($query);

while ($row = $result->fetch_assoc()) {
    echo "ID: " . $row['id'] . " | URL: " . $row['image_url'] . "\n";
}
?>
