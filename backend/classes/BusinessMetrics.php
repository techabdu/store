<?php
/**
 * BusinessMetrics Class
 * 
 * Tracks business-related metrics including user statistics,
 * transaction volumes, inventory status, and revenue trends
 */

require_once __DIR__ . '/../config/database.php';

class BusinessMetrics {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->connect();
    }
    
    /**
     * Get user statistics by role
     * 
     * @return array User counts by role
     */
    public function getUserStatsByRole() {
        try {
            $stmt = $this->conn->prepare(
                "SELECT role, COUNT(*) as count 
                 FROM users 
                 GROUP BY role 
                 ORDER BY 
                     CASE role 
                         WHEN 'superadmin' THEN 1 
                         WHEN 'admin' THEN 2 
                         WHEN 'user' THEN 3 
                     END"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $stats = [];
            $total = 0;
            
            while ($row = $result->fetch_assoc()) {
                $stats[$row['role']] = $row['count'];
                $total += $row['count'];
            }
            $stmt->close();
            
            return [
                'by_role' => $stats,
                'total_users' => $total,
                'checked_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to get user stats by role: " . $e->getMessage());
            return [
                'by_role' => [],
                'total_users' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get inactive users (no login in X days)
     * 
     * @param int $days Days of inactivity (default: 30)
     * @return array Inactive user statistics
     */
    public function getInactiveUsers($days = 30) {
        try {
            // Get users with no activity in specified days
            $stmt = $this->conn->prepare(
                "SELECT u.id, u.username, u.role, MAX(al.created_at) as last_activity
                 FROM users u
                 LEFT JOIN activity_logs al ON u.id = al.user_id
                 GROUP BY u.id, u.username, u.role
                 HAVING last_activity IS NULL OR last_activity < DATE_SUB(NOW(), INTERVAL ? DAY)
                 ORDER BY last_activity ASC"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $inactiveUsers = [];
            while ($row = $result->fetch_assoc()) {
                $inactiveUsers[] = $row;
            }
            $stmt->close();
            
            // Get total user count for percentage calculation
            $stmt = $this->conn->prepare("SELECT COUNT(*) as total FROM users");
            $stmt->execute();
            $result = $stmt->get_result();
            $totalRow = $result->fetch_assoc();
            $stmt->close();
            
            $inactiveCount = count($inactiveUsers);
            $inactivePercentage = $totalRow['total'] > 0 ? 
                ($inactiveCount / $totalRow['total']) * 100 : 0;
            
            return [
                'inactive_days_threshold' => $days,
                'inactive_count' => $inactiveCount,
                'total_users' => $totalRow['total'],
                'inactive_percentage' => round($inactivePercentage, 2),
                'inactive_users' => $inactiveUsers
            ];
        } catch (Exception $e) {
            error_log("Failed to get inactive users: " . $e->getMessage());
            return [
                'inactive_days_threshold' => $days,
                'inactive_count' => 0,
                'total_users' => 0,
                'inactive_percentage' => 0,
                'inactive_users' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get transaction volume trends
     * 
     * @param int $days Number of days to analyze (default: 7)
     * @return array Transaction volume data
     */
    public function getTransactionVolume($days = 7) {
        try {
            // Daily transaction counts and totals
            $stmt = $this->conn->prepare(
                "SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as transaction_count,
                    SUM(total_amount) as daily_revenue,
                    AVG(total_amount) as avg_transaction_value
                 FROM transactions
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY date ASC"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $dailyData = [];
            $totalTransactions = 0;
            $totalRevenue = 0;
            
            while ($row = $result->fetch_assoc()) {
                $dailyData[] = [
                    'date' => $row['date'],
                    'transaction_count' => $row['transaction_count'],
                    'daily_revenue' => round($row['daily_revenue'], 2),
                    'avg_transaction_value' => round($row['avg_transaction_value'], 2)
                ];
                $totalTransactions += $row['transaction_count'];
                $totalRevenue += $row['daily_revenue'];
            }
            $stmt->close();
            
            $avgDailyTransactions = count($dailyData) > 0 ? 
                $totalTransactions / count($dailyData) : 0;
            
            return [
                'period_days' => $days,
                'total_transactions' => $totalTransactions,
                'total_revenue' => round($totalRevenue, 2),
                'avg_daily_transactions' => round($avgDailyTransactions, 2),
                'daily_data' => $dailyData
            ];
        } catch (Exception $e) {
            error_log("Failed to get transaction volume: " . $e->getMessage());
            return [
                'period_days' => $days,
                'total_transactions' => 0,
                'total_revenue' => 0,
                'avg_daily_transactions' => 0,
                'daily_data' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get inventory status overview
     * 
     * @return array Inventory metrics
     */
    public function getInventoryStatus() {
        try {
            // Total inventory value
            $stmt = $this->conn->prepare(
                "SELECT 
                    COUNT(*) as total_items,
                    SUM(quantity) as total_quantity,
                    SUM(price * quantity) as total_value
                 FROM inventory"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            // Count items by stock level
            $stmt = $this->conn->prepare(
                "SELECT 
                    SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
                    SUM(CASE WHEN quantity > 0 AND quantity < 10 THEN 1 ELSE 0 END) as low_stock,
                    SUM(CASE WHEN quantity >= 10 THEN 1 ELSE 0 END) as in_stock
                 FROM inventory"
            );
            
            $stmt->execute();
            $result = $stmt->get_result();
            $stockLevels = $result->fetch_assoc();
            $stmt->close();
            
            return [
                'total_items' => $row['total_items'],
                'total_quantity' => $row['total_quantity'],
                'total_value' => round($row['total_value'], 2),
                'stock_levels' => [
                    'out_of_stock' => $stockLevels['out_of_stock'],
                    'low_stock' => $stockLevels['low_stock'],
                    'in_stock' => $stockLevels['in_stock']
                ],
                'checked_at' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            error_log("Failed to get inventory status: " . $e->getMessage());
            return [
                'total_items' => 0,
                'total_quantity' => 0,
                'total_value' => 0,
                'stock_levels' => [
                    'out_of_stock' => 0,
                    'low_stock' => 0,
                    'in_stock' => 0
                ],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get revenue trends over time
     * 
     * @param int $days Number of days to analyze (default: 30)
     * @return array Revenue trend data
     */
    public function getRevenueTrends($days = 30) {
        try {
            // Get daily revenue
            $stmt = $this->conn->prepare(
                "SELECT 
                    DATE(created_at) as date,
                    SUM(total_amount) as revenue,
                    COUNT(*) as transaction_count
                 FROM transactions
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY date ASC"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $dailyRevenue = [];
            $totalRevenue = 0;
            $maxRevenue = 0;
            $minRevenue = PHP_FLOAT_MAX;
            
            while ($row = $result->fetch_assoc()) {
                $revenue = round($row['revenue'], 2);
                $dailyRevenue[] = [
                    'date' => $row['date'],
                    'revenue' => $revenue,
                    'transaction_count' => $row['transaction_count']
                ];
                
                $totalRevenue += $revenue;
                $maxRevenue = max($maxRevenue, $revenue);
                $minRevenue = min($minRevenue, $revenue);
            }
            $stmt->close();
            
            $avgDailyRevenue = count($dailyRevenue) > 0 ? 
                $totalRevenue / count($dailyRevenue) : 0;
            
            // Get expenses for profit calculation
            $stmt = $this->conn->prepare(
                "SELECT SUM(amount) as total_expenses 
                 FROM expenses
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)"
            );
            
            $stmt->bind_param("i", $days);
            $stmt->execute();
            $result = $stmt->get_result();
            $expenseRow = $result->fetch_assoc();
            $stmt->close();
            
            $totalExpenses = $expenseRow['total_expenses'] ?? 0;
            $netProfit = $totalRevenue - $totalExpenses;
            
            return [
                'period_days' => $days,
                'total_revenue' => round($totalRevenue, 2),
                'total_expenses' => round($totalExpenses, 2),
                'net_profit' => round($netProfit, 2),
                'avg_daily_revenue' => round($avgDailyRevenue, 2),
                'max_daily_revenue' => $maxRevenue,
                'min_daily_revenue' => $minRevenue === PHP_FLOAT_MAX ? 0 : $minRevenue,
                'daily_revenue' => $dailyRevenue
            ];
        } catch (Exception $e) {
            error_log("Failed to get revenue trends: " . $e->getMessage());
            return [
                'period_days' => $days,
                'total_revenue' => 0,
                'total_expenses' => 0,
                'net_profit' => 0,
                'avg_daily_revenue' => 0,
                'max_daily_revenue' => 0,
                'min_daily_revenue' => 0,
                'daily_revenue' => [],
                'error' => $e->getMessage()
            ];
        }
    }
}
