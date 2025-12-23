<?php
// backend/includes/kora_api.php

class KoraAPI {
    private $secret_key;
    private $public_key;
    private $api_url;
    private $environment;
    
    public function __construct() {
        // Ensure .env is loaded if not already
        if (empty(getenv('KORA_SECRET_KEY')) && empty($_ENV['KORA_SECRET_KEY'])) {
            try {
                // Adjust path as needed based on where this is called from
                $dotenvPath = __DIR__ . '/..';
                if (file_exists($dotenvPath . '/.env')) {
                    $dotenv = \Dotenv\Dotenv::createImmutable($dotenvPath);
                    $dotenv->safeLoad();
                }
            } catch (\Exception $e) {
                error_log("KoraAPI: Dotenv auto-load fail: " . $e->getMessage());
            }
        }

        $this->secret_key = getenv('KORA_SECRET_KEY') ?: ($_ENV['KORA_SECRET_KEY'] ?? '');
        $this->public_key = getenv('KORA_PUBLIC_KEY') ?: ($_ENV['KORA_PUBLIC_KEY'] ?? '');
        $this->api_url = getenv('KORA_API_URL') ?: ($_ENV['KORA_API_URL'] ?? 'https://api.korapay.com/merchant/api/v1');
        $this->environment = getenv('KORA_ENVIRONMENT') ?: ($_ENV['KORA_ENVIRONMENT'] ?? 'test');
        
        if (!$this->secret_key) {
            error_log("Kora API configuration error: Secret key missing or failed to load from environment.");
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
    public function initiatePayment($amount, $customer_data, $reference, $redirect_url = null) {
        $url = $this->api_url . '/charges/initialize'; 
        
        $frontend_url = getenv('FRONTEND_URL') ?: 'http://localhost:5173';
        $backend_url = getenv('APP_URL') ?: 'http://localhost/store';
        
        // Log warning in production if URLs are missing
        if ($this->environment === 'production' && (getenv('FRONTEND_URL') === false || getenv('APP_URL') === false)) {
            error_log("KoraAPI Warning: FRONTEND_URL or APP_URL not set in production environment. Defaulting to localhost.");
        }
        
        $notification_url = $backend_url . '/api/marketplace/wallet/webhooks/kora_webhook.php';
        $final_redirect_url = $redirect_url ?: ($frontend_url . '/marketplace/wallet?status=processing&reference=' . $reference);
        
        $data = [
            'reference' => $reference,
            'amount' => $amount,
            'currency' => 'NGN',
            'customer' => $customer_data, // [name, email]
            'notification_url' => $notification_url,
            'redirect_url' => $final_redirect_url, // For browser redirect
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
            'destination' => [
                'type' => 'bank_account',
                'amount' => $amount,
                'currency' => 'NGN',
                'bank_account' => [
                    'bank' => $bank_details['bank_code'],
                    'account' => $bank_details['account_number']
                ]
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
     * Get transaction details from Kora
     */
    public function getPaymentStatus($reference) {
        $url = $this->api_url . '/charges/' . $reference;
        return $this->makeRequest($url, null, 'GET');
    }

    /**
     * Make HTTP request to Kora API
     */
    private function makeRequest($url, $data = null, $method = 'POST') {
        $headers = [
            'Authorization: Bearer ' . $this->secret_key,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } else {
            curl_setopt($ch, CURLOPT_HTTPGET, true);
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("Kora API Request Failed. URL: $url");
            error_log("Kora API cURL Error: " . $curl_error);
            return ['success' => false, 'error' => 'Connection error: ' . $curl_error];
        }
        
        $response_data = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Kora API JSON Decode Error: " . json_last_error_msg());
            return [
                'success' => false,
                'data' => null,
                'message' => 'Invalid response from payment gateway',
                'http_code' => $http_code
            ];
        }
        
        // Kora usually returns status: true/false or 'success' in body
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
