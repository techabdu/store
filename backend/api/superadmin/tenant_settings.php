<?php
/**
 * Tenant Settings API (SuperAdmin Only)
 * 
 * Purpose: Manage tenant-specific settings and features
 * Method: GET (get_features, get_notes), POST (toggle_feature, update_limits, update_note, delete_note, verify_email, delete_tenant)
 * Authentication: Required (SuperAdmin only)
 * 
 * Actions:
 * - action=get_features: Get feature access settings
 * - action=toggle_feature: Enable/disable feature (POST)
 * - action=update_limits: Set custom limits (POST)
 * - action=get_notes: Get all SuperAdmin notes
 * - action=update_note: Update existing note (POST)
 * - action=delete_note: Delete note (POST)
 * - action=verify_email: Manually verify tenant email (POST)
 * - action=delete_tenant: Delete tenant with cascade (POST)
 */

require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';
require_once '../../middleware/role.php';

// Set headers
header('Content-Type: application/json');
setCorsHeaders();

// Authenticate and verify SuperAdmin role
$user = checkAuth();
checkRole(['superadmin']);

global $conn;

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'get_features';

if ($method === 'GET') {
    $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : 0;
    
    if ($tenant_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid tenant_id is required']);
        exit;
    }
    
    if ($action === 'get_features') {
        // Get all feature access settings for tenant with modifier names
        $features_stmt = $conn->prepare("
            SELECT 
                f.id, f.feature_key, f.is_enabled, f.custom_limit, f.notes,
                f.modified_by, f.modified_at,
                COALESCE(u.username, 'System') as modified_by_name
            FROM tenant_feature_access f
            LEFT JOIN users u ON f.modified_by = u.id
            WHERE f.tenant_id = ?
            ORDER BY f.feature_key ASC
        ");
        
        $features_stmt->bind_param("i", $tenant_id);
        $features_stmt->execute();
        $features_result = $features_stmt->get_result();
        
        $features = [];
        while ($row = $features_result->fetch_assoc()) {
            $features[] = $row;
        }
        $features_stmt->close();
        
        // If no features set, return default features
        if (empty($features)) {
            $default_features = [
                ['feature_key' => 'marketplace', 'is_enabled' => true, 'custom_limit' => null],
                ['feature_key' => 'multi_branch', 'is_enabled' => true, 'custom_limit' => 5],
                ['feature_key' => 'advanced_reports', 'is_enabled' => false, 'custom_limit' => null],
                ['feature_key' => 'api_access', 'is_enabled' => false, 'custom_limit' => 1000],
                ['feature_key' => 'custom_branding', 'is_enabled' => false, 'custom_limit' => null]
            ];
            
            echo json_encode([
                'success' => true,
                'features' => $default_features,
                'note' => 'Default features - not yet configured'
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'features' => $features
            ]);
        }
        
    } elseif ($action === 'get_notes') {
        // Get all SuperAdmin notes (alternative endpoint, same as tenant_support.php)
        $notes_stmt = $conn->prepare("
            SELECT 
                n.id, n.note_type, n.content, n.is_pinned,
                n.created_at, n.updated_at,
                u.username as created_by_name
            FROM superadmin_notes n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.tenant_id = ?
            ORDER BY n.is_pinned DESC, n.created_at DESC
        ");
        
        $notes_stmt->bind_param("i", $tenant_id);
        $notes_stmt->execute();
        $notes_result = $notes_stmt->get_result();
        
        $notes = [];
        while ($row = $notes_result->fetch_assoc()) {
            $notes[] = $row;
        }
        $notes_stmt->close();
        
        echo json_encode([
            'success' => true,
            'notes' => $notes
        ]);
    }
    
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'toggle_feature') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $feature_key = isset($data['feature_key']) ? trim($data['feature_key']) : '';
        $is_enabled = isset($data['is_enabled']) ? intval($data['is_enabled']) : 0;
        $notes = isset($data['notes']) ? trim($data['notes']) : '';
        
        if ($tenant_id <= 0 || empty($feature_key)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id and feature_key are required']);
            exit;
        }
        
        // Check if feature exists
        $check_stmt = $conn->prepare("
            SELECT id FROM tenant_feature_access 
            WHERE tenant_id = ? AND feature_key = ?
        ");
        $check_stmt->bind_param("is", $tenant_id, $feature_key);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        $exists = $check_result->num_rows > 0;
        $check_stmt->close();
        
        $admin_id = $_SESSION['user_id'];
        
        if ($exists) {
            // Update existing
            $update_stmt = $conn->prepare("
                UPDATE tenant_feature_access 
                SET is_enabled = ?, notes = ?, modified_by = ?
                WHERE tenant_id = ? AND feature_key = ?
            ");
            $update_stmt->bind_param("isiis", $is_enabled, $notes, $admin_id, $tenant_id, $feature_key);
            $success = $update_stmt->execute();
            $update_stmt->close();
        } else {
            // Insert new
            $insert_stmt = $conn->prepare("
                INSERT INTO tenant_feature_access 
                (tenant_id, feature_key, is_enabled, notes, modified_by)
                VALUES (?, ?, ?, ?, ?)
            ");
            $insert_stmt->bind_param("isisi", $tenant_id, $feature_key, $is_enabled, $notes, $admin_id);
            $success = $insert_stmt->execute();
            $insert_stmt->close();
        }
        
        if ($success) {
            // Log activity
            $status = $is_enabled ? 'enabled' : 'disabled';
            $details = "Feature '$feature_key' $status";
            $activity_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, 'feature_toggled', 'tenant', ?, ?)
            ");
            $activity_stmt->bind_param("iiis", $tenant_id, $admin_id, $tenant_id, $details);
            $activity_stmt->execute();
            $activity_stmt->close();
            
            echo json_encode([
                'success' => true,
                'message' => "Feature $feature_key " . ($is_enabled ? 'enabled' : 'disabled')
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to toggle feature']);
        }
        
    } elseif ($action === 'update_limits') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $feature_key = isset($data['feature_key']) ? trim($data['feature_key']) : '';
        $custom_limit = isset($data['custom_limit']) ? intval($data['custom_limit']) : null;
        
        if ($tenant_id <= 0 || empty($feature_key)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id and feature_key are required']);
            exit;
        }
        
        $admin_id = $_SESSION['user_id'];
        
        // Upsert feature with custom limit
        $upsert_stmt = $conn->prepare("
            INSERT INTO tenant_feature_access 
            (tenant_id, feature_key, custom_limit, modified_by)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            custom_limit = VALUES(custom_limit),
            modified_by = VALUES(modified_by)
        ");
        $upsert_stmt->bind_param("isii", $tenant_id, $feature_key, $custom_limit, $admin_id);
        
        if ($upsert_stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => "Custom limit updated for $feature_key"
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update limit: ' . $upsert_stmt->error]);
        }
        $upsert_stmt->close();
        
    } elseif ($action === 'update_note') {
        $note_id = isset($data['note_id']) ? intval($data['note_id']) : 0;
        $content = isset($data['content']) ? trim($data['content']) : '';
        $is_pinned = isset($data['is_pinned']) ? intval($data['is_pinned']) : 0;
        
        if ($note_id <= 0 || empty($content)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'note_id and content are required']);
            exit;
        }
        
        $update_stmt = $conn->prepare("
            UPDATE superadmin_notes 
            SET content = ?, is_pinned = ?
            WHERE id = ?
        ");
        $update_stmt->bind_param("sii", $content, $is_pinned, $note_id);
        
        if ($update_stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Note updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update note']);
        }
        $update_stmt->close();
        
    } elseif ($action === 'delete_note') {
        $note_id = isset($data['note_id']) ? intval($data['note_id']) : 0;
        
        if ($note_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'note_id is required']);
            exit;
        }
        
        $delete_stmt = $conn->prepare("DELETE FROM superadmin_notes WHERE id = ?");
        $delete_stmt->bind_param("i", $note_id);
        
        if ($delete_stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Note deleted successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to delete note']);
        }
        $delete_stmt->close();
        
    } elseif ($action === 'verify_email') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id is required']);
            exit;
        }
        
        // Manually verify tenant email
        $verify_stmt = $conn->prepare("
            UPDATE tenants 
            SET email_verified = 1, verification_token = NULL
            WHERE id = ?
        ");
        $verify_stmt->bind_param("i", $tenant_id);
        
        if ($verify_stmt->execute()) {
            // Log activity
            $admin_id = $_SESSION['user_id'];
            $activity_stmt = $conn->prepare("
                INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, 'email_verified', 'tenant', ?, 'Email manually verified by SuperAdmin')
            ");
            $activity_stmt->bind_param("iii", $tenant_id, $admin_id, $tenant_id);
            $activity_stmt->execute();
            $activity_stmt->close();
            
            echo json_encode(['success' => true, 'message' => 'Email verified successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to verify email']);
        }
        $verify_stmt->close();
        
    } elseif ($action === 'delete_tenant') {
        $tenant_id = isset($data['tenant_id']) ? intval($data['tenant_id']) : 0;
        $confirmation = isset($data['confirmation']) ? trim($data['confirmation']) : '';
        
        if ($tenant_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'tenant_id is required']);
            exit;
        }
        
        // Require confirmation
        if ($confirmation !== 'DELETE') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Confirmation required. Send "DELETE" to confirm.']);
            exit;
        }
        
        // Get tenant name for logging
        $name_stmt = $conn->prepare("SELECT shop_name FROM tenants WHERE id = ?");
        $name_stmt->bind_param("i", $tenant_id);
        $name_stmt->execute();
        $name_result = $name_stmt->get_result();
        
        if ($name_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Tenant not found']);
            exit;
        }
        
        $shop_name = $name_result->fetch_assoc()['shop_name'];
        $name_stmt->close();
        
        // Start transaction
        $conn->begin_transaction();
        
        try {
            // Delete will cascade due to foreign keys
            $delete_stmt = $conn->prepare("DELETE FROM tenants WHERE id = ?");
            $delete_stmt->bind_param("i", $tenant_id);
            $delete_stmt->execute();
            $delete_stmt->close();
            
            $conn->commit();
            
            // Log to system (can't log to tenant's activity_logs as it's deleted)
            error_log("SuperAdmin deleted tenant: $shop_name (ID: $tenant_id) by user " . $_SESSION['user_id']);
            
            echo json_encode([
                'success' => true,
                'message' => "Tenant '$shop_name' deleted successfully"
            ]);
            
        } catch (Exception $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to delete tenant: ' . $e->getMessage()]);
        }
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
