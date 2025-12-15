<?php
// backend/includes/kora_api.php

class KoraAPI {
    private $secret_key;
    private $public_key;
    private $api_url;
    private $environment;
    
    public function __construct() {
        $this->secret_key = getenv('KORA_SECRET_KEY') ?: ($_ENV['KORA_SECRET_KEY'] ?? '');
        $this->public_key = getenv('KORA_PUBLIC_KEY') ?: ($_ENV['KORA_PUBLIC_KEY'] ?? '');
        $this->api_url = getenv('KORA_API_URL') ?: ($_ENV['KORA_API_URL'] ?? 'https://api.korapay.com/merchant/api/v1');
        $this->environment = getenv('KORA_ENVIRONMENT') ?: ($_ENV['KORA_ENVIRONMENT'] ?? 'test');
        
        if (!$this->secret_key) {
            error_log("Kora API configuration error: Secret key missing");
            // We don't throw exception in constructor to avoid crashing app on init, 
            // but methods will fail.
        }
    }
    
    /**
     * Verify identity using Kora Identity API
     */
    public function verifyIdentity($endpoint, $data) {
        // Remove leading slash if present
        $endpoint = ltrim($endpoint, '/');
        $url = $this->api_url . '/' . $endpoint;
        
        return $this->makeRequest($url, $data);
    }
    
    /**
     * Initiate payment (Pay-in)
     */
    public function initiatePayment($amount, $customer_data, $reference) {
        $url = $this->api_url . '/charges/initialize'; 
        // Note: Check exact endpoint for Kora pay-in. Usually /charges/initialize for checkout or /charges for direct charge.
        // Assuming checkout flow for safety.
        
        $callback_url = getenv('APP_URL') ? getenv('APP_URL') . '/api/marketplace/wallet/webhooks/kora_webhook.php' : 'http://localhost/store/api/marketplace/wallet/webhooks/kora_webhook.php';
        
        $data = [
            'reference' => $reference,
            'amount' => $amount,
            'currency' => 'NGN',
            'customer' => $customer_data, // [name, email]
            'notification_url' => $callback_url,
            'redirect_url' => $callback_url, // For frontend redirect
            'channels' => ['card', 'bank_transfer', 'mobile_money']
        ];
        
        return $this->makeRequest($url, $data);
    }
    
    /**
     * Initiate payout (Withdrawal)
     */
    public function initiatePayout($amount, $bank_details, $reference) {
        $url = $this->api_url . '/transactions/disburse'; // Verify endpoint for payouts
        
        $data = [
            'reference' => $reference,
            'amount' => $amount,
            'currency' => 'NGN',
            'destination' => [
                'type' => 'bank_account',
                'amount' => $amount,
                'currency' => 'NGN',
                'bank_account' => $bank_details // [bank_code, account_number]
            ],
            'narration' => 'Withdrawal from Marketplace Wallet'
        ];
        
        return $this->makeRequest($url, $data);
    }
    
    /**
     * Verify webhook signature
     */
    public function verifyWebhookSignature($payload, $signature) {
        $webhook_secret = getenv('KORA_WEBHOOK_SECRET') ?: ($_ENV['KORA_WEBHOOK_SECRET'] ?? '');
        
        if (!$webhook_secret) {
            // In test mode without webhook secret configured, we might want to allow 
            // but for security default to false.
            if ($this->environment === 'test') {
                 // warning: webhook verification skipped due to missing secret in test mode
                 return true; 
            }
            return false;
        }
        
        $computed_signature = hash_hmac('sha256', $payload, $webhook_secret);
        
        return hash_equals($computed_signature, $signature);
    }
    
    /**
     * Make HTTP request to Kora API
     */
    private function makeRequest($url, $data) {
        $headers = [
            'Authorization: Bearer ' . $this->secret_key,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Should be true in production
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("Kora API cURL Error: " . $curl_error);
            return ['success' => false, 'error' => 'Connection error: ' . $curl_error];
        }
        
        $response_data = json_decode($response, true);
        
        // Kora usually returns status: true/false in body
        $is_success = ($http_code >= 200 && $http_code < 300) && ($response_data['status'] ?? false);
        
        return [
            'success' => $is_success,
            'data' => $response_data['data'] ?? $response_data,
            'message' => $response_data['message'] ?? '',
            'http_code' => $http_code
        ];
    }
}

// Global helper function for convenience
if (!function_exists('callKoraIdentityAPI')) {
    function callKoraIdentityAPI($endpoint, $data) {
        $kora = new KoraAPI();
        return $kora->verifyIdentity($endpoint, $data);
    }
}
?>
