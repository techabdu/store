<?php
// backend/api/superadmin/health_scores.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../middleware/api_logger.php'; // API request logging

// Set CORS headers
if (function_exists('setCorsHeaders')) {
    setCorsHeaders();
} else {
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Start session if not started
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.gc_maxlifetime', 172800);
    ini_set('session.cookie_lifetime', 172800);
    session_start();
}

// Auth Check: Superadmin only
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit;
}

$db = new Database();
$conn = $db->connect();

$category = $_GET['category'] ?? null;
$tenantId = isset($_GET['tenant_id']) ? (int)$_GET['tenant_id'] : null;
$sort = $_GET['sort'] ?? 'calculated_at_desc';

try {
    if ($tenantId) {
        // Detail view for specific tenant
        // 1. Get current score (latest based on calculated_at)
        // Wait, retailer_health_scores might have history. The "latest" is simply ordered by date DESC limit 1.
        
        $currentStmt = $conn->prepare("
            SELECT rhs.*, t.shop_name as tenant_name, t.shop_email as email
            FROM retailer_health_scores rhs
            JOIN tenants t ON rhs.tenant_id = t.id
            WHERE rhs.tenant_id = ?
            ORDER BY rhs.calculated_at DESC
            LIMIT 1
        ");
        $currentStmt->bind_param("i", $tenantId);
        $currentStmt->execute();
        $currentResult = $currentStmt->get_result();
        $currentScore = $currentResult->fetch_assoc();
        
        // 2. Get History (last 30)
        $historyStmt = $conn->prepare("
            SELECT health_score, category, calculated_at
            FROM retailer_health_scores
            WHERE tenant_id = ?
            ORDER BY calculated_at DESC
            LIMIT 30
        ");
        $historyStmt->bind_param("i", $tenantId);
        $historyStmt->execute();
        $historyResult = $historyStmt->get_result();
        
        $history = [];
        while ($row = $historyResult->fetch_assoc()) {
            $history[] = $row;
        }
        
        // 3. Calculate Trend
        $trend = 'stable';
        if (count($history) >= 2) {
            $latest = $history[0]['health_score'];
            $previous = $history[1]['health_score'];
            
            if ($latest > $previous) {
                $trend = 'improving';
            } elseif ($latest < $previous) {
                $trend = 'declining';
            }
        }
        
        echo json_encode([
            'success' => true,
            'current_score' => $currentScore,
            'history' => $history,
            'trend' => $trend
        ]);
        
    } else {
        // List view
        
        // To show "latest" score for each tenant, we need a subquery or join with max date.
        // Assuming retailer_health_scores has MULTIPLE entries per tenant over time.
        // We only want the LATEST entry for each tenant in the list.
        
        // Efficient query:
        // SELECT rhs.* FROM retailer_health_scores rhs
        // JOIN (SELECT tenant_id, MAX(calculated_at) as max_date FROM retailer_health_scores GROUP BY tenant_id) latest 
        // ON rhs.tenant_id = latest.tenant_id AND rhs.calculated_at = latest.max_date
        
        $sql = "
            SELECT rhs.*, t.shop_name as tenant_name, t.shop_email as email
            FROM retailer_health_scores rhs
            JOIN (
                SELECT tenant_id, MAX(calculated_at) as max_date 
                FROM retailer_health_scores 
                GROUP BY tenant_id
            ) latest ON rhs.tenant_id = latest.tenant_id AND rhs.calculated_at = latest.max_date
            JOIN tenants t ON rhs.tenant_id = t.id
            WHERE 1=1
        ";
        
        $params = [];
        $types = "";
        
        if ($category) {
            $sql .= " AND rhs.category = ?";
            $params[] = $category;
            $types .= "s";
        }
        
        // Sorting
        switch ($sort) {
            case 'score_desc':
                $sql .= " ORDER BY rhs.health_score DESC";
                break;
            case 'score_asc':
                $sql .= " ORDER BY rhs.health_score ASC";
                break;
            case 'calculated_at_desc':
            default:
                $sql .= " ORDER BY rhs.calculated_at DESC";
                break;
        }
        
        $stmt = $conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $scores = [];
        while ($row = $result->fetch_assoc()) {
            $scores[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'count' => count($scores),
            'data' => $scores
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
