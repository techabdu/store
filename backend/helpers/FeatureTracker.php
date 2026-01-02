<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/EventLogger.php';

class FeatureTracker {
    public static function track($featureName, $action, $userId, $tenantId, $shopId = null) {
        global $conn;
        
        // Ensure connection exists
        if (!$conn) {
            $db = new Database();
            $conn = $db->connect();
        }
        
        try {
            $stmt = $conn->prepare("INSERT INTO feature_usage (tenant_id, shop_id, user_id, feature_name, action, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            
            // Be careful with shop_id being null
            // MySQL bind_param strictness might vary. If shop_id is null, bind param expects matching type.
            // iissi -> int, int, int, string, string
            // If shop_id is null, we can't easily pass it as 'i'.
            // Better to use dynamic SQL or ensure shop_id is 0/null correctly.
            // With mysqli, passing null to 'i' works if strict mode is not crazy, or use variable reference.
            
            $stmt->bind_param("iiiss", $tenantId, $shopId, $userId, $featureName, $action);
            
            if ($stmt->execute()) {
                return true;
            } else {
                EventLogger::logError('feature_tracking_failed', "Failed to track feature: " . $stmt->error, [
                    'feature' => $featureName,
                    'action' => $action,
                    'tenant_id' => $tenantId
                ]);
                return false;
            }
        } catch (Exception $e) {
            EventLogger::logError('feature_tracking_exception', $e->getMessage(), [
                'feature' => $featureName,
                'action' => $action
            ]);
            return false;
        }
    }
}
?>
