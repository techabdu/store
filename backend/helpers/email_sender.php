<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../config/database.php'; // Ensures autoloader is loaded

/**
 * Send email using PHPMailer
 * 
 * @param string $to Recipient email
 * @param string $subject Email subject
 * @param string $body Email body (HTML)
 * @return array ['success' => bool, 'message' => string]
 */
function sendEmail($to, $subject, $body) {
    // Check if PHPMailer class exists
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        // Fallback to mail() if PHPMailer is not installed
        // But for Hostinger/SMTP, mail() might not work well without config
        // Let's try mail() as fallback but log warning
        error_log("PHPMailer not found. Falling back to mail().");
        
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: ' . (getenv('SMTP_FROM_EMAIL') ?: 'noreply@store.com') . "\r\n";
        
        if (mail($to, $subject, $body, $headers)) {
            return ['success' => true, 'message' => 'Email sent via mail()'];
        } else {
            return ['success' => false, 'message' => 'Failed to send email via mail()'];
        }
    }

    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = getenv('SMTP_HOST');
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USERNAME');
        $mail->Password   = getenv('SMTP_PASSWORD');
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // Enable implicit TLS encryption
        $mail->Port       = getenv('SMTP_PORT') ?: 465;

        // Recipients
        $mail->setFrom(getenv('SMTP_FROM_EMAIL') ?: 'noreply@store.com', getenv('SMTP_FROM_NAME') ?: 'Store Admin');
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->AltBody = strip_tags($body);

        $mail->send();
        return ['success' => true, 'message' => 'Email has been sent'];
    } catch (Exception $e) {
        error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
        return ['success' => false, 'message' => "Message could not be sent. Mailer Error: {$mail->ErrorInfo}"];
    }
}
?>
