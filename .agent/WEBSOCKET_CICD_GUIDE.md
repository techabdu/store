# WebSocket & CI/CD Implementation Guide

## Overview

This document covers two critical infrastructurecomponents now **required** (not optional):
1. **WebSocket real-time updates** for the SuperAdmin dashboard
2. **Multi-environment CI/CD pipeline** (localhost + production)

---

## Part 1: WebSocket Implementation

### Why WebSockets?

**Real-time updates without polling:**
- Dashboard updates every 5 seconds automatically
- New alerts appear instantly
- Metrics refresh without page reload
- Live activity feed

### Architecture

```
┌─────────────────────────────────────────────────┐
│         React Dashboard (Client)                │
│    - Opens WebSocket connection on mount        │
│    - Subscribes to channels: alerts, metrics    │
│    - Updates UI when messages received          │
└─────────────────┬───────────────────────────────┘
                  │ WebSocket (ws://)
                  │
┌─────────────────▼───────────────────────────────┐
│    WebSocket Server (Ratchet PHP or Node.js)    │
│    - Listens on port 8080                       │
│    - Manages client connections                 │
│    - Broadcasts updates to subscribed clients   │
└─────────────────┬───────────────────────────────┘
                  │ Reads from
                  │
┌─────────────────▼───────────────────────────────┐
│         MySQL Database (store)                   │
│    - system_alerts                               │
│    - metrics_hourly                              │
│    - application_errors                          │
└──────────────────────────────────────────────────┘
                  ▲
                  │ Writes to
                  │
┌─────────────────┴───────────────────────────────┐
│    Background Workers (MetricsAggregator, etc.)  │
│    - After writing data, notify WebSocket server │
│    - Send message to broadcast to clients        │
└──────────────────────────────────────────────────┘
```

### Option 1: Ratchet PHP WebSocket Server (Recommended for PHP Developers)

**Pros:**
- Pure PHP, no Node.js needed
- Easy integration with existing codebase
- Direct access to MySQL

**Cons:**
- Slightly less performant than Node.js for high concurrency

**Installation:**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/store/backend
composer require cboden/ratchet
```

**Implementation:**

```php
<?php
// backend/websocket/server.php

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../config/database.php';

class SuperAdminDashboard implements MessageComponentInterface {
    protected $clients;
    protected $subscriptions;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->subscriptions = [];
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "New connection: {$conn->resourceId}\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (!$data) return;

        switch ($data['type']) {
            case 'subscribe':
                // Client subscribes to a channel (e.g., 'alerts', 'metrics')
                $channel = $data['channel'];
                if (!isset($this->subscriptions[$channel])) {
                    $this->subscriptions[$channel] = new \SplObjectStorage;
                }
                $this->subscriptions[$channel]->attach($from);
                echo "Client {$from->resourceId} subscribed to {$channel}\n";
                break;

            case 'unsubscribe':
                $channel = $data['channel'];
                if (isset($this->subscriptions[$channel])) {
                    $this->subscriptions[$channel]->detach($from);
                }
                break;

            case 'ping':
                $from->send(json_encode(['type' => 'pong']));
                break;
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        
        // Remove from all subscriptions
        foreach ($this->subscriptions as $channel => $clients) {
            $clients->detach($conn);
        }
        
        echo "Connection {$conn->resourceId} disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Error: {$e->getMessage()}\n";
        $conn->close();
    }

    // Method to broadcast to a specific channel
    public function broadcastToChannel($channel, $message) {
        if (!isset($this->subscriptions[$channel])) return;

        $payload = json_encode($message);
        foreach ($this->subscriptions[$channel] as $client) {
            $client->send($payload);
        }
    }
}

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new SuperAdminDashboard()
        )
    ),
    8080 // Port
);

echo "WebSocket server started on port 8080\n";
$server->run();
```

**Run the server:**

```bash
# Development (XAMPP)
php /Applications/XAMPP/xamppfiles/htdocs/store/backend/websocket/server.php

# Production (background process)
nohup php /path/to/backend/websocket/server.php > /var/log/websocket.log 2>&1 &

# OR use Supervisor (recommended for production)
```

**Supervisor Configuration (Production):**

```ini
# /etc/supervisor/conf.d/websocket-server.conf
[program:websocket-server]
command=/usr/bin/php /path/to/backend/websocket/server.php
directory=/path/to/backend/websocket
autostart=true
autorestart=true
user=www-data
stdout_logfile=/var/log/websocket-server.log
stderr_logfile=/var/log/websocket-server-error.log
```

### Broadcasting Updates from Workers

**When MetricsAggregator calculates new metrics, notify WebSocket clients:**

```php
<?php
// backend/helpers/WebSocketNotifier.php

class WebSocketNotifier {
    private static $websocketUrl = 'http://localhost:8080';

    public static function notifyMetricsUpdate($metrics) {
        // Simple HTTP POST to WebSocket server's internal endpoint
        // Or use React ZMQ for internal messaging
        
        // For now, we'll use a direct database trigger approach
        // Workers write to a 'websocket_queue' table, and WebSocket server polls it
    }
}
```

**Alternative approach (simpler for MVP):**

WebSocket server polls database every 5 seconds for new data and broadcasts changes

```php
// In SuperAdminDashboard class, add:

private $lastAlertCheck;
private $lastMetricCheck;

public function checkForUpdates() {
    global $conn;
    
    // Check for new alerts every 5 seconds
    $now = time();
    if (!$this->lastAlertCheck || ($now - $this->lastAlertCheck) >= 5) {
        $stmt = $conn->query("
            SELECT id, type, severity, message, created_at 
            FROM system_alerts 
            WHERE resolved = FALSE 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
            ORDER BY created_at DESC
        ");
        
        $newAlerts = $stmt->fetch_all(MYSQLI_ASSOC);
        
        if (count($newAlerts) > 0) {
            $this->broadcastToChannel('alerts', [
                'type' => 'new_alerts',
                'data' => $newAlerts,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }
        
        $this->lastAlertCheck = $now;
    }
    
    // Check for new metrics
    if (!$this->lastMetricCheck || ($now - $this->lastMetricCheck) >= 30) {
        $metrics = $this->getLatestMetrics();
        
        $this->broadcastToChannel('metrics', [
            'type' => 'metrics_update',
            'data' => $metrics,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        $this->lastMetricCheck = $now;
    }
}

// Call this in a loop
public function run() {
    $loop = \React\EventLoop\Factory::create();
    
    $loop->addPeriodicTimer(5, function() {
        $this->checkForUpdates();
    });
    
    $loop->run();
}
```

### React Frontend Integration

**Install WebSocket client:**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/store/frontend
npm install react-use-websocket
```

**Create WebSocket hook:**

```jsx
// frontend/src/hooks/useRealtimeUpdates.jsx

import { useEffect, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export const useRealtimeUpdates = (channel, onMessage) => {
  const { sendMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  // Subscribe to channel on connect
  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({
        type: 'subscribe',
        channel: channel
      }));
    }
  }, [readyState, channel, sendMessage]);

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type !== 'pong') {
          onMessage(data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, onMessage]);

  // Heartbeat ping every 30s
  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      const interval = setInterval(() => {
        sendMessage(JSON.stringify({ type: 'ping' }));
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [readyState, sendMessage]);

  return {
    connectionStatus: readyState,
    isConnected: readyState === ReadyState.OPEN
  };
};
```

**Use in dashboard:**

```jsx
// frontend/src/pages/SuperAdmin/Dashboard.jsx

import { useState, useCallback } from 'react';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // Subscribe to alerts channel
  const handleAlertsMessage = useCallback((data) => {
    if (data.type === 'new_alerts') {
      setAlerts(prev => [...data.data, ...prev]);
      // Show toast notification
      showNotification(`New alert: ${data.data[0].message}`);
    }
  }, []);

  // Subscribe to metrics channel
  const handleMetricsMessage = useCallback((data) => {
    if (data.type === 'metrics_update') {
      setMetrics(data.data);
    }
  }, []);

  const { isConnected: alertsConnected } = useRealtimeUpdates('alerts', handleAlertsMessage);
  const { isConnected: metricsConnected } = useRealtimeUpdates('metrics', handleMetricsMessage);

  return (
    <div>
      {/* Connection indicator */}
      <div className="fixed top-4 right-4">
        {alertsConnected && metricsConnected ? (
          <span className="text-green-500">🟢 Live</span>
        ) : (
          <span className="text-red-500">🔴 Disconnected</span>
        )}
      </div>

      {/* Dashboard content */}
      {/* metrics and alerts will update in real-time */}
    </div>
  );
}
```

### Environment Configuration

**`.env` (Development):**
```env
VITE_WS_URL=ws://localhost:8080
```

**`.env.production` (Production):**
```env
VITE_WS_URL=wss://administration.prhub.shop:8080
```

**Note**: For production, you need SSL (wss://) and proper firewall rules.

---

## Part 2: Multi-Environment CI/CD Pipeline

### Goal

**Same codebase works on:**
- ✅ Development (XAMPP localhost)
- ✅ Production (prhub.shop)
- ✅ Automated deployment via GitHub Actions

### Environment-Aware Configuration

**Backend Configuration:**

```php
<?php
// backend/config/environment.php

class Environment {
    private static $env = null;

    public static function get() {
        if (self::$env === null) {
            self::$env = getenv('APP_ENV') ?: 'development';
        }
        return self::$env;
    }

    public static function isDevelopment() {
        return self::get() === 'development';
    }

    public static function isProduction() {
        return self::get() === 'production';
    }

    public static function config($key, $default = null) {
        $configs = [
            'development' => [
                'db_host' => 'localhost',
                'db_name' => 'store',
                'db_user' => 'root',
                'db_pass' => '',
                'api_url' => 'http://localhost/store/backend/api',
                'frontend_url' => 'http://localhost:5173',
                'smtp_host' => 'smtp.mailtrap.io',
                'smtp_port' => 2525,
                'smtp_user' => getenv('SMTP_USER'),
                'smtp_pass' => getenv('SMTP_PASS'),
                'ws_url' => 'ws://localhost:8080',
                'log_level' => 'DEBUG'
            ],
            'production' => [
                'db_host' => getenv('DB_HOST'),
                'db_name' => getenv('DB_NAME'),
                'db_user' => getenv('DB_USER'),
                'db_pass' => getenv('DB_PASS'),
                'api_url' => 'https://prhub.shop/api',
                'frontend_url' => 'https://administration.prhub.shop',
                'smtp_host' => getenv('SMTP_HOST'),
                'smtp_port' => getenv('SMTP_PORT'),
                'smtp_user' => getenv('SMTP_USER'),
                'smtp_pass' => getenv('SMTP_PASS'),
                'ws_url' => 'wss://administration.prhub.shop:8080',
                'log_level' => 'ERROR'
            ]
        ];

        $env = self::get();
        return $configs[$env][$key] ?? $default;
    }
}
```

**Update database.php:**

```php
<?php
// backend/config/database.php

require_once __DIR__ . '/environment.php';

class Database {
    private $host = null;
    private $db_name = null;
    private $username = null;
    private $password = null;
    public $conn;

    public function __construct() {
        $this->host = Environment::config('db_host');
        $this->db_name = Environment::config('db_name');
        $this->username = Environment::config('db_user');
        $this->password = Environment::config('db_pass');
    }

    // ... rest of Database class
}
```

### Frontend Environment Configuration

**Create environment files:**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/store/frontend

# Development (create/update)
cat > .env.development <<EOF
VITE_API_URL=http://localhost/store/backend/api
VITE_WS_URL=ws://localhost:8080
VITE_APP_ENV=development
EOF

# Production (create/update)
cat > .env.production <<EOF
VITE_API_URL=https://prhub.shop/api
VITE_WS_URL=wss://administration.prhub.shop:8080
VITE_APP_ENV=production
EOF
```

**Use in code:**

```javascript
// frontend/src/config/api.js

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'production';

export { API_URL, WS_URL, IS_PRODUCTION };
```

### GitHub Actions CI/CD Pipeline

**Create workflow file:**

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'

      - name: Install Composer dependencies
        working-directory: ./backend
        run: composer install --no-dev --optimize-autoloader

      - name: Deploy backend to server via SSH
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "backend/*"
          target: "/path/to/production/backend"
          strip_components: 1

      - name: Run database migrations
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/production/backend
            php artisan migrate --force

      - name: Restart services
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            sudo supervisorctl restart websocket-server
            sudo systemctl restart php-fpm

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build frontend
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_URL: https://prhub.shop/api
          VITE_WS_URL: wss://administration.prhub.shop:8080
          VITE_APP_ENV: production

      - name: Deploy frontend to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "frontend/dist/*"
          target: "/path/to/production/frontend"
          strip_components: 2
```

**GitHub Secrets to Add:**

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add:
- `SERVER_HOST` - Your production server IP/domain
- `SERVER_USER` - SSH username
- `SSH_PRIVATE_KEY` - Your SSH private key for deployment
- `DB_HOST` - Production database host
- `DB_NAME` - Production database name
- `DB_USER` - Production database user
- `DB_PASS` - Production database password
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email credentials

### `.htaccess` Configuration (Production)

```apache
# backend/.htaccess (ensure environment variables are set)

<IfModule mod_env.c>
    SetEnv APP_ENV production
</IfModule>

# OR use .env file (better practice)
```

**Create `.env` for production:**

```bash
# backend/.env (production)
APP_ENV=production
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASS=your_db_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**Load `.env` in PHP:**

```php
<?php
// backend/config/environment.php (updated)

// Load .env file
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}
```

### Testing Multi-Environment Setup

**Development (localhost):**

```bash
# Terminal 1: Start XAMPP
sudo /Applications/XAMPP/xamppfiles/xampp start

# Terminal 2: Start WebSocket server
cd /Applications/XAMPP/xamppfiles/htdocs/store/backend
php websocket/server.php

# Terminal 3: Start frontend
cd /Applications/XAMPP/xamppfiles/htdocs/store/frontend
npm run dev

# Visit: http://localhost:5173
```

**Production:**

```bash
# SSH into server
ssh user@prhub.shop

# Check services
sudo supervisorctl status websocket-server
sudo systemctl status php-fpm
sudo systemctl status nginx

# Check logs
tail -f /var/log/websocket-server.log
tail -f /var/log/nginx/error.log
```

---

## Summary

✅ **WebSocket Server**: Real-time updates using Ratchet PHP
✅ **React WebSocket Client**: `react-use-websocket` hook
✅ **Environment Configuration**: Development vs Production
✅ **CI/CD Pipeline**: GitHub Actions auto-deployment
✅ **Multi-Environment Support**: Works on localhost and production

**Next Steps:**
1. Install Ratchet: `composer require cboden/ratchet`
2. Create `backend/websocket/server.php`
3. Create `frontend/src/hooks/useRealtimeUpdates.jsx`
4. Set up environment files (`.env`, `.env.production`)
5. Configure GitHub Actions workflow
6. Test locally, then deploy to production

Let me know which part you'd like to implement first!
