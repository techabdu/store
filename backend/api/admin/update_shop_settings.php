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

// Get posted data
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No data provided"]);
    exit;
}

try {
    $shopId = getCurrentShopId();
    if (!$shopId) {
        throw new Exception("No active shop context");
    }

    $conn->begin_transaction();

    // 1. Update SHOPS table (General Info)
    $shopFields = [
        'shop_name', 'shop_address', 'shop_phone', 'shop_email', 
        'business_capital', 'low_stock_threshold'
    ];
    
    $shopUpdates = [];
    $shopParams = [];
    $shopTypes = "";
    
    foreach ($data as $key => $value) {
        if (in_array($key, $shopFields)) {
            $shopUpdates[] = "$key = ?";
            if (in_array($key, ['business_capital', 'low_stock_threshold'])) {
                $shopTypes .= "d"; // Use double/decimal for numbers
                $shopParams[] = $value;
            } else {
                $shopTypes .= "s";
                $shopParams[] = $value;
            }
        }
    }
    
    if (!empty($shopUpdates)) {
        $sql = "UPDATE shops SET " . implode(", ", $shopUpdates) . " WHERE id = ?";
        $shopTypes .= "i";
        $shopParams[] = $shopId;
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($shopTypes, ...$shopParams);
        $stmt->execute();
        $stmt->close();
    }

    // 2. Update SHOP_SETTINGS table (Rules)
    $ruleFields = [
        'vip_min_spend', 'vip_min_transactions',
        'loyal_min_spend', 'loyal_min_transactions',
        'at_risk_days', 'lost_days'
    ];
    
    // We use INSERT ... ON DUPLICATE KEY UPDATE
    // But first, let's just use UPDATE since we seeded the table. 
    // Actually, safer to use UPSERT logic or just UPDATE if we are sure row exists.
    // For simplicity given I seeded it: UPDATE.
    
    $ruleUpdates = [];
    $ruleParams = [];
    $ruleTypes = "";
    
    foreach ($data as $key => $value) {
        if (in_array($key, $ruleFields)) {
            $ruleUpdates[] = "$key = ?";
            $ruleTypes .= "s"; // internal logic handles validation, safe to treat as string or number
            $ruleParams[] = $value;
        }
    }
    
    if (!empty($ruleUpdates)) {
        // Ensure row exists (just in case)
        $conn->query("INSERT IGNORE INTO shop_settings (shop_id) VALUES ($shopId)");
        
        $sql = "UPDATE shop_settings SET " . implode(", ", $ruleUpdates) . " WHERE shop_id = ?";
        $ruleTypes .= "i";
        $ruleParams[] = $shopId;
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($ruleTypes, ...$ruleParams);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();

    // Trigger update of customer segments if rules changed?
    // Ideally yes, but that might be expensive. Let's leave it for now.
    // Users can assume it applies to future updates or next action.

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Settings updated successfully"
    ]);

} catch (Exception $e) {
    if ($conn->in_transaction) $conn->rollback();
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
}
?>
