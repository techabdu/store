<?php
require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../helpers/shop_helper.php';

// Set CORS headers
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

$user_data = checkAuth();
if (!$user_data || !in_array($user_data['role'], ['admin', 'superadmin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied"]);
    exit;
}

try {
    $shopId = getCurrentShopId();
    
    if (!$shopId) {
        // Fallback or error? For now, if no shop selected, we can't show shop settings
        // But owners might be in "all shops" mode?
        // Let's force them to have a current shop context or use the main one.
        // If getting shop settings, we usually mean the current one.
         http_response_code(400);
         echo json_encode(["success" => false, "error" => "No active shop selected"]);
         exit;
    }

    // 1. Get basic shop info
    $stmt = $conn->prepare("SELECT shop_name, shop_address, shop_phone, shop_email, business_capital, low_stock_threshold FROM shops WHERE id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $shopRes = $stmt->get_result();
    
    if ($shopRes->num_rows === 0) {
        throw new Exception("Shop not found");
    }
    
    $shop = $shopRes->fetch_assoc();
    $stmt->close();

    // 2. Get extended settings (rules)
    $stmt = $conn->prepare("SELECT * FROM shop_settings WHERE shop_id = ?");
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $rulesRes = $stmt->get_result();
    $rules = $rulesRes->fetch_assoc();
    $stmt->close();

    // If rules don't exist yet (shouldn't happen due to previous insert, but just in case), return defaults
    if (!$rules) {
        $rules = [
            'vip_min_spend' => 5000000,
            'vip_min_transactions' => 10,
            'loyal_min_spend' => 2000000,
            'loyal_min_transactions' => 5,
            'at_risk_days' => 60,
            'lost_days' => 180
        ];
    }

    // Merge for frontend
    $settings = array_merge($shop, [
        'vip_min_spend' => $rules['vip_min_spend'],
        'vip_min_transactions' => $rules['vip_min_transactions'],
        'loyal_min_spend' => $rules['loyal_min_spend'],
        'loyal_min_transactions' => $rules['loyal_min_transactions'],
        'at_risk_days' => $rules['at_risk_days'],
        'lost_days' => $rules['lost_days']
    ]);

    echo json_encode([
        "success" => true,
        "settings" => $settings
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
}
?>
