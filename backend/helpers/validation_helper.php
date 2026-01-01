<?php
/**
 * Input Validation Helper Functions
 * 
 * Provides secure validation for user inputs to prevent:
 * - Negative numbers in IDs and amounts
 * - Invalid data types
 * - Malicious input
 * - SQL injection attempts
 */

/**
 * Validate and sanitize a positive integer (for IDs)
 * 
 * @param mixed $value The value to validate
 * @param string $fieldName Name of the field for error messages
 * @return int Validated positive integer
 * @throws Exception if validation fails
 */
function validatePositiveInt($value, $fieldName = 'ID') {
    if (!isset($value) || $value === '' || $value === null) {
        throw new Exception("$fieldName is required");
    }
    
    $intValue = filter_var($value, FILTER_VALIDATE_INT);
    
    if ($intValue === false) {
        throw new Exception("$fieldName must be a valid number");
    }
    
    if ($intValue <= 0) {
        throw new Exception("$fieldName must be a positive number");
    }
    
    return $intValue;
}

/**
 * Validate and sanitize a positive decimal (for amounts, prices)
 * 
 * @param mixed $value The value to validate
 * @param string $fieldName Name of the field for error messages
 * @param float $maxValue Optional maximum allowed value
 * @return float Validated positive decimal
 * @throws Exception if validation fails
 */
function validatePositiveDecimal($value, $fieldName = 'Amount', $maxValue = null) {
    if (!isset($value) || $value === '' || $value === null) {
        throw new Exception("$fieldName is required");
    }
    
    $floatValue = filter_var($value, FILTER_VALIDATE_FLOAT);
    
    if ($floatValue === false) {
        throw new Exception("$fieldName must be a valid number");
    }
    
    if ($floatValue < 0) {
        throw new Exception("$fieldName cannot be negative");
    }
    
    if ($maxValue !== null && $floatValue > $maxValue) {
        throw new Exception("$fieldName cannot exceed " . number_format($maxValue, 2));
    }
    
    return $floatValue;
}

/**
 * Validate email address
 * 
 * @param string $email Email to validate
 * @return string Validated email
 * @throws Exception if validation fails
 */
function validateEmail($email) {
    if (!isset($email) || empty(trim($email))) {
        throw new Exception("Email is required");
    }
    
    $sanitized = filter_var(trim($email), FILTER_SANITIZE_EMAIL);
    $validated = filter_var($sanitized, FILTER_VALIDATE_EMAIL);
    
    if ($validated === false) {
        throw new Exception("Invalid email format");
    }
    
    return $validated;
}

/**
 * Validate and sanitize a string
 * 
 * @param string $value String to validate
 * @param string $fieldName Name of the field for error messages
 * @param int $minLength Minimum length (default: 1)
 * @param int $maxLength Maximum length (default: 255)
 * @return string Validated and trimmed string
 * @throws Exception if validation fails
 */
function validateString($value, $fieldName = 'Field', $minLength = 1, $maxLength = 255) {
    if (!isset($value) || $value === null) {
        throw new Exception("$fieldName is required");
    }
    
    $trimmed = trim($value);
    $length = mb_strlen($trimmed);
    
    if ($length < $minLength) {
        throw new Exception("$fieldName must be at least $minLength characters");
    }
    
    if ($length > $maxLength) {
        throw new Exception("$fieldName cannot exceed $maxLength characters");
    }
    
    return $trimmed;
}

/**
 * Validate date format (YYYY-MM-DD)
 * 
 * @param string $date Date string to validate
 * @param string $fieldName Name of the field for error messages
 * @return string Validated date string
 * @throws Exception if validation fails
 */
function validateDate($date, $fieldName = 'Date') {
    if (!isset($date) || empty(trim($date))) {
        throw new Exception("$fieldName is required");
    }
    
    $d = DateTime::createFromFormat('Y-m-d', $date);
    
    if (!$d || $d->format('Y-m-d') !== $date) {
        throw new Exception("$fieldName must be in YYYY-MM-DD format");
    }
    
    return $date;
}

/**
 * Validate enum value (must be in allowed list)
 * 
 * @param mixed $value Value to validate
 * @param array $allowedValues Array of allowed values
 * @param string $fieldName Name of the field for error messages
 * @return mixed Validated value
 * @throws Exception if validation fails
 */
function validateEnum($value, $allowedValues, $fieldName = 'Field') {
    if (!isset($value) || $value === null) {
        throw new Exception("$fieldName is required");
    }
    
    if (!in_array($value, $allowedValues, true)) {
        throw new Exception("$fieldName must be one of: " . implode(', ', $allowedValues));
    }
    
    return $value;
}

/**
 * Sanitize output for JSON responses
 * Prevents XSS in JSON responses
 * 
 * @param mixed $data Data to sanitize
 * @return mixed Sanitized data
 */
function sanitizeJsonOutput($data) {
    if (is_string($data)) {
        return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
    
    if (is_array($data)) {
        return array_map('sanitizeJsonOutput', $data);
    }
    
    return $data;
}

/**
 * Validate pagination parameters
 * 
 * @param int $page Page number
 * @param int $limit Items per page
 * @param int $maxLimit Maximum allowed limit
 * @return array ['page' => int, 'limit' => int, 'offset' => int]
 */
function validatePagination($page = 1, $limit = 20, $maxLimit = 100) {
    $page = max(1, intval($page));
    $limit = max(1, min($maxLimit, intval($limit)));
    $offset = ($page - 1) * $limit;
    
    return [
        'page' => $page,
        'limit' => $limit,
        'offset' => $offset
    ];
}
?>
