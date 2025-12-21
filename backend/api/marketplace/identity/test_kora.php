<?php
// backend/api/marketplace/identity/test_kora.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once '../../../vendor/autoload.php';
require_once '../../../includes/kora_api.php';

$response = [
    'success' => false,
    'step' => 'init',
    'diagnostics' => []
];

try {
    // 1. Check if .env is loaded
    $response['diagnostics']['env_loaded'] = !empty(getenv('KORA_SECRET_KEY')) || !empty($_ENV['KORA_SECRET_KEY']);
    
    // 2. Initialize KoraAPI
    $kora = new KoraAPI();
    
    // 3. Reflect non-sensitive config
    $reflector = new ReflectionClass($kora);
    
    $secret_prop = $reflector->getProperty('secret_key');
    $secret_prop->setAccessible(true);
    $sk = $secret_prop->getValue($kora);
    
    $url_prop = $reflector->getProperty('api_url');
    $url_prop->setAccessible(true);
    $url = $url_prop->getValue($kora);
    
    $env_prop = $reflector->getProperty('environment');
    $env_prop->setAccessible(true);
    $env = $env_prop->getValue($kora);

    $response['diagnostics']['secret_key_present'] = !empty($sk);
    $response['diagnostics']['secret_key_length'] = strlen($sk);
    $response['diagnostics']['secret_key_preview'] = !empty($sk) ? '...' . substr($sk, -4) : 'none';
    $response['diagnostics']['api_url'] = $url;
    $response['diagnostics']['environment'] = $env;

    if (empty($sk)) {
        throw new Exception("Kora Secret Key is missing from environment.");
    }

    // 4. Try a simple "GET" request to Kora (e.g. check balances if possible, or just hit a known endpoint)
    // For Kora, even a GET to /charges with a random ref will tell us if Authorization is accepted
    $test_res = $kora->getPaymentStatus('DIAGNOSTIC_' . time());
    
    $response['kora_response'] = [
        'http_code' => $test_res['http_code'],
        'message' => $test_res['message'],
        'success' => $test_res['success'] // Likely false because ref doesn't exist, but we check if it's 401
    ];

    if ($test_res['http_code'] === 401) {
        $response['error'] = "Authorization Failed: The API key is rejected by Kora.";
    } else if ($test_res['http_code'] === 404 || $test_res['http_code'] === 200 || $test_res['http_code'] === 400) {
        $response['success'] = true;
        $response['message'] = "Authorization Accepted: Your API key is valid.";
    } else {
        $response['error'] = "Unexpected response code: " . $test_res['http_code'];
    }

} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
