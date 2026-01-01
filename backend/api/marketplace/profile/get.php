<?php
// backend/api/marketplace/profile/get.php

require_once '../../../config/config.php';

setCorsHeaders();
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db_connect.php';


session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
// Optional: Allow getting other users' profiles by ID in query param
$target_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : $user_id;
$target_shop_id = isset($_GET['shop_id']) ? intval($_GET['shop_id']) : ($_SESSION['current_shop_id'] ?? null);

$query = "
    SELECT 
        mp.*, 
        s.shop_name,
        s.shop_address,
        s.shop_phone,
        miv.verification_status as id_verification_status,
        u.full_name
    FROM marketplace_profiles mp
    LEFT JOIN shops s ON mp.shop_id = s.id
    LEFT JOIN marketplace_identity_verifications miv ON mp.user_id = miv.user_id
    LEFT JOIN users u ON mp.user_id = u.id
    WHERE mp.user_id = ?
";

$types = "i";
$params = [$target_user_id];

if ($target_shop_id) {
    $query .= " AND mp.shop_id = ?";
    $types .= "i";
    $params[] = $target_shop_id;
} else {
    // If no shop specified, prefer checking shop_id check is logic handled by frontend context usually
    // But duplicate profiles imply we might get multiple rows. 
    // For now we just get the first one or rely on logic that without shop_id we might get any.
    // Optimal: IF user has shops, frontend SHOULD send shop_id.
}

try {
$stmt = $conn->prepare($query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
    exit();
}
$stmt->bind_param($types, ...$params);

// REMOVED DUPLICATE BIND - The above line was likely the conflict!
// Analysis: 
// Line 75: $stmt->bind_param($types, ...$params); <-- This binds all params including user_id and shop_id
// Line 79 (Original): $stmt->bind_param("i", $target_user_id); <-- This is REDUNDANT and causes "Number of elements in type definition string doesn't match" if repeated or conflict.
// FIX: Remove redundant bind.

$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // Basic sanitization
    unset($row['created_at']); // Optional
    
    // Map verification status for frontend
    $status = $row['id_verification_status'] ?? 'none';
    if ($status === 'success') {
        $status = 'verified';
    } elseif ($status === 'failed') {
        $status = 'rejected';
    } elseif ($status === 'pending') {
        $status = 'pending';
    } else {
        // Fallback: Check if is_verified is set in profile
        if (!empty($row['is_verified']) && $row['is_verified'] == 1) {
            $status = 'verified';
        } else {
            $status = 'none';
        }
    }
    $row['verification_status'] = $status;
    
    echo json_encode(['success' => true, 'profile' => $row]);
} else {
    // Self-Healing: Check if user is verified but missing profile record (legacy data fix)
    $healed = false;
    if ($target_user_id === $user_id) {
        $check_ver = $conn->prepare("SELECT first_name, last_name FROM marketplace_identity_verifications WHERE user_id = ? AND is_verified = 1");
        $check_ver->bind_param("i", $user_id);
        $check_ver->execute();
        $ver_res = $check_ver->get_result();
        
        if ($ver_row = $ver_res->fetch_assoc()) {
            // Create profile now
            $disp_name = trim($ver_row['first_name'] . ' ' . $ver_row['last_name']);
            if (empty($disp_name)) $disp_name = "User " . $user_id;
            
            // Check if creating for a specific shop
            $shop_val = $target_shop_id ? $target_shop_id : null; 
            
            // Fetch tenant_id
            $t_stmt = $conn->prepare("SELECT tenant_id FROM users WHERE id = ?");
            $t_stmt->bind_param("i", $user_id);
            $t_stmt->execute();
            $t_res = $t_stmt->get_result()->fetch_assoc();
            $tenant_id = $t_res['tenant_id'] ?? 1;

            $ins = $conn->prepare("INSERT INTO marketplace_profiles (tenant_id, user_id, shop_id, display_name, is_verified, verification_level, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 'basic', NOW(), NOW())");
            $ins->bind_param("iiis", $tenant_id, $user_id, $shop_val, $disp_name);
            
            try {
                if ($ins->execute()) {
                    // Fetch the newly created profile
                    // Re-run the main fetch query
                    $stmt->execute();
                    $result = $stmt->get_result();
                    if ($row = $result->fetch_assoc()) {
                        // Map verification status for the new row (it will be basic/verified)
                        $row['verification_status'] = 'verified';
                        unset($row['created_at']);
                        echo json_encode(['success' => true, 'profile' => $row]);
                        $healed = true;
                    }
                }
            } catch (Exception $e) {
                // Ignore key violation if race condition
            }
        }
    }

    if (!$healed) {
        // If requesting own profile and not found, return specific status
        if ($target_user_id === $user_id) {
            echo json_encode(['success' => false, 'error' => 'Profile not found', 'code' => 'NO_PROFILE']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User profile not found']);
        }
    }
}

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal Server Error']);
}
?>
