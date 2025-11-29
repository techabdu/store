<?php
require_once 'config/database.php';
require_once 'helpers/email_sender.php';

// Set headers for JSON output
header('Content-Type: application/json');

// Check if run from command line or browser
$isCli = (php_sapi_name() === 'cli');

// Get recipient from query param or command line arg, or default to SMTP username
$to = $_GET['to'] ?? ($argv[1] ?? getenv('SMTP_USERNAME'));

echo "Attempting to send test email to: " . ($to ?: 'NOT SET') . "\n";
echo "Using SMTP Host: " . getenv('SMTP_HOST') . "\n";
echo "Using SMTP Port: " . getenv('SMTP_PORT') . "\n";
echo "Using SMTP User: " . getenv('SMTP_USERNAME') . "\n";

if (!$to) {
    echo json_encode(['success' => false, 'message' => 'No recipient specified. Usage: php test_email.php user@example.com']);
    exit;
}

$subject = "Test Email from Store System";
$body = "<h1>It Works!</h1><p>This is a test email from your Store Management System.</p><p>If you are reading this, your SMTP configuration is correct.</p>";

$result = sendEmail($to, $subject, $body);

echo json_encode($result, JSON_PRETTY_PRINT);
?>
