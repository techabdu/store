<?php
// backend/websocket/server.php

require __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class SuperAdminDashboard implements MessageComponentInterface {
    protected $clients;
    protected $subscriptions;
    protected $conn;
    protected $lastAlertCheck = 0;
    protected $lastMetricCheck = 0;
    protected $lastActivityCheck = 0;
    protected $lastErrorCheck = 0;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->subscriptions = [];
        
        // Initialize database connection
        $db = new Database();
        $this->conn = $db->connect();
        
        echo "WebSocket server initialized\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "New connection: {$conn->resourceId}\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        if (!$data || !isset($data['type'])) return;
        
        switch ($data['type']) {
            case 'subscribe':
                $channel = $data['channel'] ?? '';
                if ($channel) {
                    if (!isset($this->subscriptions[$channel])) {
                        $this->subscriptions[$channel] = new \SplObjectStorage;
                    }
                    $this->subscriptions[$channel]->attach($from);
                    echo "Client {$from->resourceId} subscribed to {$channel}\n";
                }
                break;
                
            case 'unsubscribe':
                $channel = $data['channel'] ?? '';
                if ($channel && isset($this->subscriptions[$channel])) {
                    $this->subscriptions[$channel]->detach($from);
                    echo "Client {$from->resourceId} unsubscribed from {$channel}\n";
                }
                break;
                
            case 'ping':
                $from->send(json_encode(['type' => 'pong']));
                break;
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        
        foreach ($this->subscriptions as $channel => $storage) {
            $storage->detach($conn);
        }
        
        echo "Connection closed: {$conn->resourceId}\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Error: {$e->getMessage()}\n";
        $conn->close();
    }
    
    public function broadcastToChannel($channel, $message) {
        if (!isset($this->subscriptions[$channel])) return;
        
        $payload = json_encode($message);
        foreach ($this->subscriptions[$channel] as $client) {
            $client->send($payload);
        }
    }
    
    // Check for new alerts - Poll every 5 seconds
    public function checkForNewAlerts() {
        $now = time();
        $lastCheck = $this->lastAlertCheck ?: ($now - 10);
        
        // Use DATE_SUB interval based on poll time to capture recent alerts
        // Ideally we check alerts created > last check timestamp
        $queryCheckTime = date('Y-m-d H:i:s', $lastCheck);
        
        try {
            $stmt = $this->conn->prepare("
                SELECT * FROM system_alerts
                WHERE resolved = 0
                AND created_at > ?
                ORDER BY created_at DESC
            ");
            $stmt->bind_param("s", $queryCheckTime);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $alerts = [];
            while ($row = $result->fetch_assoc()) {
                $alerts[] = $row;
            }
            
            if (!empty($alerts)) {
                echo "Broadcasting " . count($alerts) . " new alerts\n";
                $this->broadcastToChannel('alerts', ['type' => 'new_alerts', 'data' => $alerts]);
            }
            
            $this->lastAlertCheck = $now;
        } catch (Exception $e) {
            echo "Alert check error: " . $e->getMessage() . "\n";
            // Reconnect DB if gone away
            if (strpos($e->getMessage(), 'gone away') !== false) {
                 $this->reconnectDb();
            }
        }
    }
    
    // Check for metrics - Poll every 30 seconds
    public function checkForNewMetrics() {
        // Here we might query 'platform_metrics' endpoint logic or dedicated table
        // For simplicity, let's query the latest entry from 'metrics_hourly' if we had one, 
        // OR calculate on the fly (expensive) OR rely on recently inserted tracked metrics.
        // Let's assume we query transaction count in last minute as a "live" metric.
        
        try {
            // Live Metric: Transactions in last minute
            $stmt = $this->conn->query("
                SELECT COUNT(*) as txn_count, SUM(total_amount) as txn_volume 
                FROM transactions 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
            ");
            $mtx = $stmt->fetch_assoc();
            
            // Live Metric: Active Users (Activity in last 5 mins)
            $stmt = $this->conn->query("
                SELECT COUNT(DISTINCT user_id) as active_users 
                FROM activity_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ");
            $act = $stmt->fetch_assoc();
            
            $metrics = [
                'transactions_last_min' => $mtx['txn_count'],
                'volume_last_min' => $mtx['txn_volume'] ?? 0,
                'active_users_5min' => $act['active_users'],
                'timestamp' => date('c')
            ];
            
            $this->broadcastToChannel('metrics', ['type' => 'metrics_update', 'data' => $metrics]);
            
        } catch (Exception $e) {
             echo "Metrics check error: " . $e->getMessage() . "\n";
             if (strpos($e->getMessage(), 'gone away') !== false) {
                 $this->reconnectDb();
            }
        }
    }
    
    // Check for recent activity - Poll every 10 seconds
    public function checkForNewActivity() {
        $now = time();
        $lastCheck = $this->lastActivityCheck ?: ($now - 10);
        $queryCheckTime = date('Y-m-d H:i:s', $lastCheck);

        try {
            $stmt = $this->conn->prepare("
                SELECT al.*, u.username 
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.created_at > ?
                ORDER BY al.created_at DESC
                LIMIT 10
            ");
            $stmt->bind_param("s", $queryCheckTime);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $activities = [];
            while ($row = $result->fetch_assoc()) {
                $activities[] = $row;
            }
            
            if (!empty($activities)) {
                $this->broadcastToChannel('activity', ['type' => 'new_activity', 'data' => $activities]);
            }
            
            $this->lastActivityCheck = $now;
        } catch (Exception $e) {
             echo "Activity check error: " . $e->getMessage() . "\n";
             if (strpos($e->getMessage(), 'gone away') !== false) {
                 $this->reconnectDb();
            }
        }
    }
    
    // Check for errors - Poll every 10 seconds
    public function checkForNewErrors() {
        $now = time();
        $lastCheck = $this->lastErrorCheck ?: ($now - 10);
        $queryCheckTime = date('Y-m-d H:i:s', $lastCheck);

        try {
            $stmt = $this->conn->prepare("
                SELECT * FROM application_errors
                WHERE error_level IN ('critical', 'error')
                AND created_at > ?
                ORDER BY created_at DESC
            ");
            $stmt->bind_param("s", $queryCheckTime);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $errors = [];
            while ($row = $result->fetch_assoc()) {
                $errors[] = $row;
            }
            
            if (!empty($errors)) {
                $this->broadcastToChannel('errors', ['type' => 'new_errors', 'data' => $errors]);
            }
            
            $this->lastErrorCheck = $now;
        } catch (Exception $e) {
             echo "Error check error: " . $e->getMessage() . "\n";
             if (strpos($e->getMessage(), 'gone away') !== false) {
                 $this->reconnectDb();
            }
        }
    }
    
    private function reconnectDb() {
        echo "Reconnecting to database...\n";
        $db = new Database();
        $this->conn = $db->connect();
    }
}

// Set up the event loop and server
$loop = \React\EventLoop\Loop::get();
$dashboard = new SuperAdminDashboard();

// Schedule periodic checks
$loop->addPeriodicTimer(5, function() use ($dashboard) {
    $dashboard->checkForNewAlerts();
});

$loop->addPeriodicTimer(30, function() use ($dashboard) {
    $dashboard->checkForNewMetrics();
});

$loop->addPeriodicTimer(10, function() use ($dashboard) {
    $dashboard->checkForNewActivity();
});

$loop->addPeriodicTimer(10, function() use ($dashboard) {
    $dashboard->checkForNewErrors();
});

// Create WebSocket server on port 8080
$server = new IoServer(
    new HttpServer(
        new WsServer(
            $dashboard
        )
    ),
    new React\Socket\SocketServer('0.0.0.0:8080', [], $loop),
    $loop
);

echo "WebSocket server running on port 8080...\n";
$server->run();
?>
