<?php
// backend/includes/encryption.php

/**
 * Encrypt sensitive data using AES-256-GCM
 */
function encryptSensitiveData($data) {
    if (empty($data)) return null;
    
    // Retrieve key from environment variable
    // Check various sources for the key
    $encryption_key = getenv('ENCRYPTION_KEY');
    if (!$encryption_key && isset($_ENV['ENCRYPTION_KEY'])) {
        $encryption_key = $_ENV['ENCRYPTION_KEY'];
    }
    
    if (!$encryption_key || strlen($encryption_key) < 32) {
        // Fallback or error logging if needed, but for security we should throw exception
        // For development, if key is short, we might proceed but it's risky.
        // Assuming key is properly set in .env
        // If not set, we can't encrypt properly.
        error_log("Encryption Key missing or invalid");
        throw new Exception('Invalid encryption key configuration');
    }
    
    $cipher = "aes-256-gcm";
    $ivlen = openssl_cipher_iv_length($cipher);
    $iv = openssl_random_pseudo_bytes($ivlen);
    $tag = ''; // Passed by reference
    
    $ciphertext = openssl_encrypt($data, $cipher, $encryption_key, 0, $iv, $tag);
    
    if ($ciphertext === false) {
        throw new Exception('Encryption failed');
    }
    
    // Return base64 encoded: iv + tag + ciphertext
    return base64_encode($iv . $tag . $ciphertext);
}

/**
 * Decrypt sensitive data
 */
function decryptSensitiveData($encrypted_data) {
    if (empty($encrypted_data)) return null;
    
    $encryption_key = getenv('ENCRYPTION_KEY');
    if (!$encryption_key && isset($_ENV['ENCRYPTION_KEY'])) {
        $encryption_key = $_ENV['ENCRYPTION_KEY'];
    }
    
    if (!$encryption_key) {
        throw new Exception('Invalid encryption key');
    }
    
    $cipher = "aes-256-gcm";
    $ivlen = openssl_cipher_iv_length($cipher);
    $tag_length = 16;
    
    $data = base64_decode($encrypted_data);
    
    if ($data === false) {
        throw new Exception('Invalid encrypted data format');
    }
    
    // Sanity check length
    if (strlen($data) < $ivlen + $tag_length) {
        throw new Exception('Encrypted data too short');
    }
    
    $iv = substr($data, 0, $ivlen);
    $tag = substr($data, $ivlen, $tag_length);
    $ciphertext = substr($data, $ivlen + $tag_length);
    
    $plaintext = openssl_decrypt($ciphertext, $cipher, $encryption_key, 0, $iv, $tag);
    
    if ($plaintext === false) {
        throw new Exception('Decryption failed - integrity check failed');
    }
    
    return $plaintext;
}

/**
 * Generate secure random reference
 */
function generateSecureReference($prefix = 'REF') {
    return $prefix . '_' . time() . '_' . bin2hex(random_bytes(8));
}
?>
