<?php
/**
 * Support Ticket Email Notifier
 * 
 * Handles sending emails for ticket creation, responses, and status changes
 */

require_once __DIR__ . '/email_sender.php';

class EmailNotifier {
    /**
     * Send confirmation email to the user who created the ticket
     * 
     * @param int $ticketId
     * @param string $userEmail
     * @param string $username
     * @param string $ticketNumber
     * @param string $subject
     * @return array
     */
    public function sendTicketConfirmation($ticketId, $userEmail, $username, $ticketNumber, $subject) {
        $body = "
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                    <h2 style='color: #2c3e50;'>Support Ticket Confirmation</h2>
                    <p>Hello <strong>{$username}</strong>,</p>
                    <p>Your support ticket has been successfully created. Our team will review your request and get back to you as soon as possible.</p>
                    
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;'>
                        <p style='margin: 0;'><strong>Ticket Number:</strong> {$ticketNumber}</p>
                        <p style='margin: 5px 0 0 0;'><strong>Subject:</strong> {$subject}</p>
                    </div>
                    
                    <p>You can track the status of your ticket in the 'Support' section of your dashboard.</p>
                    <p>If you have any additional information to provide, please reply to this email or update the ticket online.</p>
                    
                    <p style='margin-top: 30px;'>Best regards,<br>The Phone Retailer Management Team</p>
                </div>
            </body>
            </html>
        ";

        return sendEmail($userEmail, "Support Ticket Created: {$ticketNumber}", $body);
    }

    /**
     * Send alert email to superadmin about a new ticket
     * 
     * @param int $ticketId
     * @param string $adminEmail
     * @param string $ticketNumber
     * @param string $type
     * @param string $subject
     * @param string $priority
     * @return array
     */
    public function sendTicketAlert($ticketId, $adminEmail, $ticketNumber, $type, $subject, $priority) {
        $priorityColor = [
            'urgent' => '#d32f2f',
            'high' => '#f57c00',
            'medium' => '#fbc02d',
            'low' => '#388e3c'
        ];

        $color = isset($priorityColor[$priority]) ? $priorityColor[$priority] : '#7f8c8d';

        $body = "
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                    <h2 style='color: #c0392b;'>New Support Ticket Alert</h2>
                    <p>A new support ticket has been submitted and requires attention.</p>
                    
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;'>
                        <p style='margin: 0;'><strong>Ticket Number:</strong> {$ticketNumber}</p>
                        <p style='margin: 5px 0 0 0;'><strong>Type:</strong> " . ucfirst($type) . "</p>
                        <p style='margin: 5px 0 0 0;'><strong>Priority:</strong> <span style='color: {$color}; font-weight: bold;'>" . ucfirst($priority) . "</span></p>
                        <p style='margin: 5px 0 0 0;'><strong>Subject:</strong> {$subject}</p>
                    </div>
                    
                    <p><a href='" . getenv('ADMIN_DASHBOARD_URL') . "/superadmin/support/ticket/{$ticketId}' style='background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;'>View Ticket Details</a></p>
                    
                    <p style='margin-top: 30px;'>Automated System Alert</p>
                </div>
            </body>
            </html>
        ";

        return sendEmail($adminEmail, "[NEW TICKET] {$ticketNumber} - {$subject}", $body);
    }

    /**
     * Send notification about a response on a ticket
     */
    public function sendResponseNotification($recipientEmail, $username, $ticketNumber, $isFromAdmin, $messageSnippet) {
        $sender = $isFromAdmin ? "Support Team" : "User";
        $subjectPrefix = $isFromAdmin ? "New Response from Support" : "New User Response";

        $body = "
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                    <h2 style='color: #2c3e50;'>New Response on Ticket</h2>
                    <p>Hello <strong>{$username}</strong>,</p>
                    <p>There is a new response on ticket <strong>{$ticketNumber}</strong> from <strong>{$sender}</strong>:</p>
                    
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 4px; font-style: italic; margin: 20px 0;'>
                        \"" . (strlen($messageSnippet) > 200 ? substr($messageSnippet, 0, 200) . "..." : $messageSnippet) . "\"
                    </div>
                    
                    <p>Please log in to your dashboard to view the full response and reply.</p>
                    
                    <p style='margin-top: 30px;'>Best regards,<br>The Phone Retailer Management Team</p>
                </div>
            </body>
            </html>
        ";

        return sendEmail($recipientEmail, "{$subjectPrefix}: {$ticketNumber}", $body);
    }
}
