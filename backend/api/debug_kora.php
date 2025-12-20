<?php
header('Content-Type: application/json');
require_once '../../config/db_connect.php';

$key = getenv('KORA_SECRET_KEY') ?: ($_ENV['KORA_SECRET_KEY'] ?? '');

echo json_encode([
    'kora_key_loaded' => !empty($key),
    'key_preview' => !empty($key) ? substr($key, 0, 5) . '...' : null,
    'env_vars' => array_keys($_ENV),
    'server_vars' => array_keys($_SERVER)
]);
?>
