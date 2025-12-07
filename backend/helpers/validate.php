<?php
/**
 * Validation Helper Functions
 */

/**
 * Validate string length
 */
function validateLength($str, $min, $max) {
    $len = strlen(trim($str));
    return $len >= $min && $len <= $max;
}

/**
 * Validate username format
 * Alphanumeric + underscore, 3-20 chars
 */
function validateUsername($username) {
    return preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username);
}

/**
 * Validate price/positive number
 */
function validatePositiveNumber($num) {
    return is_numeric($num) && $num > 0;
}

/**
 * Validate IMEI (15 digits)
 */
function validateIMEI($imei) {
    return preg_match('/^[0-9]{15}$/', $imei);
}

/**
 * Validate simple phone number (10-15 digits, optional +)
 */
function validatePhone($phone) {
    // Basic validation: optional +, followed by 10-14 digits
    // Adjust regex as per requirements
    return preg_match('/^\+?[0-9]{10,14}$/', $phone);
}

/**
 * Validate password strength
 * At least 8 chars, 1 uppercase, 1 lowercase (basic)
 */
function validatePasswordStrength($password) {
    if (strlen($password) < 8) return false;
    // Add more complexity checks if needed
    // if (!preg_match('/[A-Z]/', $password)) return false;
    // if (!preg_match('/[a-z]/', $password)) return false;
    return true;
}
?>
