# Complete Execution Task List - Days 13-30
## SuperAdmin Monitoring System Implementation (Continuation)

**This continues from EXECUTION_TASK_LIST.md (Days 1-12)**

---

### DAY 13: Platform Metrics APIs

#### Create Platform Metrics API File
- [x] Create file: `backend/api/superadmin/platform_metrics.php`
- [x] Add PHP opening tag
- [x] Add CORS headers
- [x] Start session
- [x] Check role: `checkRole(['superadmin'])`
- [x] Set Content-Type: application/json
- [x] Get query parameters: type, period (default '30d')

#### Metric Type: Growth
- [x] If type === 'growth':
  - [x] Parse period into days (30d = 30)
  - [x] Query: New tenants in period
    ```sql
    SELECT COUNT(*) FROM tenants 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ```
  - [x] Query: Churned tenants in period
    ```sql
    SELECT COUNT(*) FROM tenants 
    WHERE cancelled_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ```
  - [x] Query: Current MRR
    ```sql
    SELECT SUM(mrr) FROM tenants WHERE status = 'active'
    ```
  - [x] Query: Previous period MRR (for growth calculation)
  - [x] Calculate MRR growth rate percentage
  - [x] Query: ARR = MRR * 12
  - [x] Query: Tenant growth chart (last 12 months)
    ```sql
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
    FROM tenants
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month
    ```
  - [x] Return JSON with all growth metrics

#### Metric Type: Inventory
- [x] If type === 'inventory':
  - [x] Query: Total devices tracked (all tenants)
    ```sql
    SELECT COUNT(*) FROM inventory
    ```
  - [x] Query: Devices by brand
    ```sql
    SELECT brand, COUNT(*) as count 
    FROM inventory 
    GROUP BY brand 
    ORDER BY count DESC
    ```
  - [x] Query: Devices by model (top 10)
    ```sql
    SELECT model, COUNT(*) as count 
    FROM inventory 
    GROUP BY model 
    ORDER BY count DESC 
    LIMIT 10
    ```
  - [x] Query: Average inventory per tenant
    ```sql
    SELECT AVG(device_count) FROM (
        SELECT tenant_id, COUNT(*) as device_count 
        FROM inventory 
        GROUP BY tenant_id
    ) as subquery
    ```
  - [x] Calculate: Inventory turnover rate
    - [x] Query sold devices in period
    - [x] Query average inventory
    - [x] turnover = sold / average_inventory
  - [x] Query: Total inventory value
    ```sql
    SELECT SUM(price * quantity) FROM inventory
    ```
  - [x] Return JSON with inventory metrics

#### Metric Type: Transactions
- [x] If type === 'transactions':
  - [x] Query: GMV (Gross Merchandise Value)
    ```sql
    SELECT SUM(total_amount) FROM transactions
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ```
  - [x] Query: Transaction count
  - [x] Calculate: Average transaction value = GMV / count
  - [x] Query: Top selling devices
    ```sql
    SELECT device_name, SUM(quantity) as units_sold, SUM(total_amount) as revenue
    FROM transactions
    GROUP BY device_name
    ORDER BY units_sold DESC
    LIMIT 10
    ```
  - [x] Query: Payment method breakdown
    ```sql
    SELECT payment_method, COUNT(*) as count
    FROM transactions
    GROUP BY payment_method
    ```
  - [x] Query: Commission revenue (if applicable)
    ```sql
    SELECT SUM(commission_amount) FROM transactions
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ```
  - [x] Return JSON with transaction metrics

#### Metric Type: Usage
- [x] If type === 'usage':
  - [x] Query: API calls per tenant (top 20)
    ```sql
    SELECT tenant_id, COUNT(*) as api_calls
    FROM api_request_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY tenant_id
    ORDER BY api_calls DESC
    LIMIT 20
    ```
  - [x] Query: Storage consumption per tenant
    ```sql
    SELECT tenant_id, database_size_mb, file_storage_mb,
           (database_size_mb + file_storage_mb) as total_mb
    FROM storage_metrics
    WHERE measured_at = (SELECT MAX(measured_at) FROM storage_metrics)
    ORDER BY total_mb DESC
    LIMIT 20
    ```
  - [x] Query: Feature adoption heatmap data
    ```sql
    SELECT feature_name, COUNT(DISTINCT tenant_id) as tenant_count
    FROM feature_usage
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY feature_name
    ```
  - [x] Query: Module usage breakdown
    ```sql
    SELECT module, COUNT(*) as usage_count
    FROM api_request_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY module
    ```
  - [x] Return JSON with usage metrics

#### Error Handling
- [x] Wrap all queries in try-catch
- [x] Return 500 on database errors
- [x] Return 400 if type parameter invalid
- [x] Return empty data with success: true if no results

#### Test All Metric Types
- [x] Test growth metrics: `GET /api/superadmin/platform_metrics?type=growth&period=30d`
- [x] Verify all growth data returned
- [x] Test inventory metrics
- [x] Verify brand/model breakdowns
- [x] Test transaction metrics
- [x] Verify GMV and payment methods
- [x] Test usage metrics
- [x] Verify API calls and storage data
- [x] Test invalid type (should return 400)
- [x] Test with different periods (7d, 30d, 90d)

#### Performance Optimization
- [x] Check query execution times (should be <500ms)
- [x] Add indexes if queries slow
- [x] Consider caching for expensive queries
- [x] Add LIMIT clauses where appropriate

#### Day 13 Validation
- [x] All 4 metric types implemented
- [x] Period filtering works correctly
- [x] Data aggregation accurate (verify against database)
- [x] Response time <500ms
- [x] Proper error handling
- [x] Returns consistent JSON structure
- [x] Commit: `git add . && git commit -m "Day 13: Platform metrics APIs"`

---

### DAY 14: Feature Usage Tracking

#### Create FeatureTracker Helper
- [ ] Create file: `backend/helpers/FeatureTracker.php`
- [ ] Add PHP opening tag
- [ ] Require database config

- [ ] Create FeatureTracker class
- [ ] Add static track() method
- [ ] Parameters: $featureName, $action, $userId, $tenantId, $shopId = null
- [ ] Get global $conn
- [ ] Prepare INSERT statement
- [ ] ```sql
    INSERT INTO feature_usage (tenant_id, shop_id, user_id, feature_name, action, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
    ```
- [ ] Bind parameters
- [ ] Execute
- [ ] Return true/false
- [ ] Add error logging if fails

#### Instrument Inventory Endpoints
- [ ] Open `backend/api/inventory/create.php`
- [ ] Add at top: `require_once __DIR__ . '/../../helpers/FeatureTracker.php';`
- [ ] After successful creation, add:
  ```php
  FeatureTracker::track('inventory', 'create', $_SESSION['id'], $_SESSION['tenant_id'], $_SESSION['shop_id']);
  ```
- [ ] Save file

- [ ] Repeat for inventory/update.php (action: 'update')
- [ ] Repeat for inventory/delete.php (action: 'delete')
- [ ] Repeat for inventory/list.php or read.php (action: 'view')
- [ ] Test each endpoint, verify feature_usage entries created

#### Instrument POS/Sales Endpoints
- [ ] Open transaction creation endpoint
- [ ] Add FeatureTracker call: track('pos_sales', 'create', ...)
- [ ] Test transaction creation
- [ ] Verify feature_usage logged

#### Instrument Marketplace Endpoints
- [ ] Marketplace listing creation:
  - [ ] track('marketplace', 'create_listing', ...)
- [ ] Marketplace order placement:
  - [ ] track('marketplace', 'place_order', ...)
- [ ] Marketplace message send:
  - [ ] track('marketplace', 'send_message', ...)
- [ ] Test each action

#### Instrument Report Generation
- [ ] Open report generation endpoint
- [ ] Add track('reports', 'generate', ...)
- [ ] Add track('reports', 'export', ...) if export action exists
- [ ] Test report generation

#### Instrument Expense Tracking
- [ ] Expense create: track('expenses', 'create', ...)
- [ ] Expense update: track('expenses', 'update', ...)
- [ ] Test expense operations

#### Instrument Customer Management
- [ ] Customer create: track('customers', 'create', ...)
- [ ] Customer update: track('customers', 'update', ...)
- [ ] Test customer operations

#### Instrument Vendor Management
- [ ] Vendor create: track('vendors', 'create', ...)
- [ ] Test vendor operations

#### Create Feature Usage API
- [ ] Create file: `backend/api/superadmin/feature_usage.php`
- [ ] Add PHP opening tag, CORS, session, role check
- [ ] Get parameters: action, tenant_id, period

#### Action: tenant_usage
- [ ] If action === 'tenant_usage':
  - [ ] Require tenant_id parameter
  - [ ] Parse period (default 30d)
  - [ ] Query feature usage for tenant:
    ```sql
    SELECT feature_name, action, COUNT(*) as usage_count
    FROM feature_usage
    WHERE tenant_id = ? 
    AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY feature_name, action
    ORDER BY usage_count DESC
    ```
  - [ ] Return JSON with usage data

#### Action: heatmap
- [ ] If action === 'heatmap':
  - [ ] Query all tenants
  - [ ] Query feature usage per tenant:
    ```sql
    SELECT tenant_id, feature_name, COUNT(*) as usage_count
    FROM feature_usage
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY tenant_id, feature_name
    ```
  - [ ] Format as matrix: rows = tenants, columns = features
  - [ ] Return JSON with heatmap data structure:
    ```json
    {
      "tenants": [...],
      "features": [...],
      "usage_matrix": [[tenant1_feature1_count, ...], ...]
    }
    ```

#### Test Feature Tracking
- [ ] Perform 10 different actions across features
- [ ] Check feature_usage table, verify 10 entries
- [ ] Verify feature_name and action correct
- [ ] Verify tenant_id and user_id captured

#### Test Feature Usage API
- [ ] Test tenant_usage for a specific tenant
- [ ] Verify returns correct features
- [ ] Test heatmap generation
- [ ] Verify matrix structure correct
- [ ] Test with different periods

#### Day 14 Validation
- [ ] FeatureTracker helper created and working
- [ ] 20+ endpoints instrumented
- [ ] Feature usage logged correctly
- [ ] API endpoints return correct data
- [ ] Heatmap data structure valid
- [ ] Commit: `git add . && git commit -m "Day 14: Feature usage tracking"`

---

### DAY 15: Health Scores & Storage Tracking

#### Create Health Scores API
- [ ] Create file: `backend/api/superadmin/health_scores.php`
- [ ] Add PHP opening tag, CORS, session, role check
- [ ] Get parameters: category, tenant_id, sort

#### List Health Scores with Filters
- [ ] Build SELECT query:
  ```sql
  SELECT rhs.*, t.name as tenant_name, t.email
  FROM retailer_health_scores rhs
  JOIN tenants t ON rhs.tenant_id = t.id
  WHERE 1=1
  ```
- [ ] Add AND category = ? if category filter provided
- [ ] Add AND tenant_id = ? if filtering by tenant
- [ ] Add ORDER BY clause based on sort parameter:
  - [ ] sort='score_desc': ORDER BY health_score DESC
  - [ ] sort='score_asc': ORDER BY health_score ASC
  - [ ] default: ORDER BY calculated_at DESC
- [ ] Execute query
- [ ] Return JSON with health scores array

#### Get Tenant Health Score Detail
- [ ] If tenant_id parameter provided
- [ ] Query latest health score for tenant
- [ ] Query health score history (last 30 days):
  ```sql
  SELECT * FROM retail er_health_scores
  WHERE tenant_id = ?
  ORDER BY calculated_at DESC
  LIMIT 30
  ```
- [ ] Return JSON with:
  - [ ] current_score (latest)
  - [ ] history (array)
  - [ ] trend (improving/declining based on history)

#### Test Health Scores API
- [ ] Test list all health scores
- [ ] Test filter by category='at_risk'
- [ ] Test filter by category='power_user'
- [ ] Test sort by score ascending
- [ ] Test get specific tenant health score
- [ ] Verify trend calculation works

#### Create StorageCalculator Worker
- [ ] Create file: `backend/workers/StorageCalculator.php`
- [ ] Add PHP opening tag
- [ ] Require database config
- [ ] Initialize connection

#### Calculate Database Size Per Tenant
- [ ] Get list of all tenants
- [ ] For each tenant:
  - [ ] Query total rows for this tenant across all tables:
    ```sql
    SELECT 
      (SELECT COUNT(*) FROM inventory WHERE tenant_id = ?) +
      (SELECT COUNT(*) FROM transactions WHERE tenant_id = ?) +
      (SELECT COUNT(*) FROM activity_logs WHERE tenant_id = ?) +
      ... (all tenant-specific tables)
    AS total_records
    ```
  - [ ] Estimate database size (rows * avg_row_size)
  - [ ] Or use table size query:
    ```sql
    SELECT SUM(data_length + index_length) / 1024 / 1024 AS size_mb
    FROM information_schema.TABLES
    WHERE table_schema = 'store'
    AND table_name IN (...)
    ```
  - [ ] (This gets total, need to calculate per-tenant portion)
  - [ ] Store in variable

#### Calculate File Storage Per Tenant
- [ ] For each tenant:
  - [ ] Check if uploads directory exists for tenant
  - [ ] Calculate directory size:
    ```php
    function getDirectorySize($path) {
        $totalSize = 0;
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path)
        );
        foreach ($files as $file) {
            $totalSize += $file->getSize();
        }
        return $totalSize;
    }
    ```
  - [ ] Convert to MB
  - [ ] Store in variable

#### Store Storage Metrics
- [ ] For each tenant:
  - [ ] INSERT INTO storage_metrics (tenant_id, database_size_mb, file_storage_mb, total_records, measured_at)
  - [ ] VALUES (?, ?, ?, ?, NOW())
  - [ ] Execute

#### Add Logging
- [ ] Echo: "Calculated storage for X tenants"
- [ ] Echo: "Total platform database size: X MB"
- [ ] Echo: "Total platform file storage: Y MB"

#### Test StorageCalculator
- [ ] Run manually: `php backend/workers/StorageCalculator.php`
- [ ] Check storage_metrics table
- [ ] Verify entries for all tenants
- [ ] Verify sizes reasonable
- [ ] Check execution time

#### Add to Cron (if not already scheduled)
- [ ] Open crontab: `crontab -e`
- [ ] Add line (if not exists):
  ```
  0 4 * * * /usr/bin/php /path/to/backend/workers/StorageCalculator.php >> /path/to/backend/logs/storage_calculator.log 2>&1
  ```
- [ ] Save

#### Day 15 Validation
- [ ] Health scores API works
- [ ] Filtering and sorting functional
- [ ] History and trends calculated correctly
- [ ] StorageCalculator worker runs successfully
- [ ] Storage metrics stored for all tenants
- [ ] Cron job scheduled
- [ ] Commit: `git add . && git commit -m "Day 15: Health scores API and storage calculator"`
- [ ] Tag: `git tag phase-3-complete`

#### Phase 3 Complete
- [ ] All SaaS metrics backend complete
- [ ] Tenant management working
- [ ] Platform metrics calculated
- [ ] Feature usage tracked
- [ ] Health scores and storage metrics operational

---

## PHASE 4: WEBSOCKET & REAL-TIME UPDATES (WEEK 4)

### DAY 16-17: WebSocket Server Implementation (2 days)

#### Install Ratchet (if not already done Day 1)
- [ ] Verify Ratchet installed: `composer show cboden/ratchet`
- [ ] If not: `composer require cboden/ratchet`

#### Create WebSocket Server File
- [ ] Create file: `backend/websocket/server.php`
- [ ] Add PHP opening tag
- [ ] Add use statements:
  ```php
  use Ratchet\Server\IoServer;
  use Ratchet\Http\HttpServer;
  use Ratchet\WebSocket\WsServer;
  use Ratchet\MessageComponentInterface;
  use Ratchet\ConnectionInterface;
  ```
- [ ] Require autoload: `require __DIR__ . '/../vendor/autoload.php';`
- [ ] Require database config

#### Create SuperAdminDashboard WebSocket Class
- [ ] Create class SuperAdminDashboard implements MessageComponentInterface
- [ ] Add protected $clients property (SplObjectStorage)
- [ ] Add protected $subscriptions property (array)
- [ ] Add protected $conn property (database connection)

#### Implement __construct()
- [ ] Initialize $this->clients = new \SplObjectStorage
- [ ] Initialize $this->subscriptions = []
- [ ] Initialize database connection
- [ ] Echo "WebSocket server initialized"

#### Implement onOpen()
- [ ] Parameter: ConnectionInterface $conn
- [ ] Attach connection to clients: $this->clients->attach($conn)
- [ ] Echo "New connection: {$conn->resourceId}"

#### Implement onMessage()
- [ ] Parameters: ConnectionInterface $from, $msg
- [ ] Decode JSON: $data = json_decode($msg, true)
- [ ] If !$data, return
- [ ] Switch on $data['type']:

- [ ] Case 'subscribe':
  - [ ] Get channel from $data['channel']
  - [ ] If channel not in subscriptions, create new SplObjectStorage
  - [ ] Attach connection to channel subscriptions
  - [ ] Echo "Client subscribed to {$channel}"
  
- [ ] Case 'unsubscribe':
  - [ ] Get channel
  - [ ] Detach connection from channel subscriptions
  
- [ ] Case 'ping':
  - [ ] Send pong: $from->send(json_encode(['type' => 'pong']))

#### Implement onClose()
- [ ] Parameter: ConnectionInterface $conn
- [ ] Detach from clients: $this->clients->detach($conn)
- [ ] Loop through all subscription channels
- [ ] Detach from each channel
- [ ] Echo "Connection closed: {$conn->resourceId}"

#### Implement onError()
- [ ] Parameters: ConnectionInterface $conn, \Exception $e
- [ ] Echo "Error: {$e->getMessage()}"
- [ ] Close connection: $conn->close()

#### Implement broadcastToChannel()
- [ ] Parameters: $channel, $message
- [ ] Check if channel exists in subscriptions
- [ ] If not, return
- [ ] Encode message to JSON
- [ ] Loop through channel subscribers
- [ ] Send message to each: $client->send($payload)

#### Implement Polling Logic for Alerts Channel
- [ ] Add private $lastAlertCheck property
- [ ] Create checkForNewAlerts() method
- [ ] Get current time
- [ ] If not checked before or >5 seconds since last check:
  - [ ] Query new alerts:
    ```sql
    SELECT * FROM system_alerts
    WHERE resolved = FALSE
    AND created_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
    ORDER BY created_at DESC
    ```
  - [ ] If results found:
    - [ ] Call broadcastToChannel('alerts', ['type' => 'new_alerts', 'data' => $alerts])
  - [ ] Update $lastAlertCheck = $now

#### Implement Polling Logic for Metrics Channel
- [ ] Add private $lastMetricCheck property
- [ ] Create checkForNewMetrics() method
- [ ] If Not checked or >30 seconds:
  - [ ] Query latest metrics from metrics_hourly (last entry)
  - [ ] Get key metrics (API latency, error rate, active users, revenue)
  - [ ] Call broadcastToChannel('metrics', ['type' => 'metrics_update', 'data' => $metrics])
  - [ ] Update $lastMetricCheck

#### Implement Polling Logic for Activity Channel
- [ ] Create checkForNewActivity() method
- [ ] Query recent activity (last 10 entries):
  ```sql
  SELECT * FROM activity_logs
  ORDER BY created_at DESC
  LIMIT 10
  ```
- [ ] Broadcast to 'activity' channel

#### Implement Polling Logic for Errors Channel
- [ ] Create checkForNewErrors() method
- [ ] Query recent critical errors:
  ```sql
  SELECT * FROM application_errors
  WHERE error_level = 'critical'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
  ```
- [ ] Broadcast to 'errors' channel

#### Create Periodic Checker
- [ ] Use React EventLoop (comes with Ratchet)
- [ ] After creating IoServer, add:
  ```php
  $loop = \React\EventLoop\Factory::create();
  
  $loop->addPeriodicTimer(5, function() use ($dashboardInstance) {
      $dashboardInstance->checkForNewAlerts();
      $dashboardInstance->checkForNewErrors();
  });
  
  $loop->addPeriodicTimer(30, function() use ($dashboardInstance) {
      $dashboardInstance->checkForNewMetrics();
  });
  
  $loop->addPeriodicTimer(10, function() use ($dashboardInstance) {
      $dashboardInstance->checkForNewActivity();
  });
  ```

#### Create Server Instance
- [ ] Create instance: $dashboard = new SuperAdminDashboard()
- [ ] Create server:
  ```php
  $server = IoServer::factory(
      new HttpServer(
          new WsServer($dashboard)
      ),
      8080
  );
  ```
- [ ] Echo "WebSocket server started on port 8080"
- [ ] Run server: $server->run()

#### Test WebSocket Server Locally
- [ ] Open terminal
- [ ] Run: `php backend/websocket/server.php`
- [ ] Should see "WebSocket server started on port 8080"
- [ ] Open browser console
- [ ] Test connection:
  ```javascript
  const ws = new WebSocket('ws://localhost:8080');
  ws.onopen = () => console.log('Connected');
  ws.onmessage = (e) => console.log('Message:', e.data);
  ws.send(JSON.stringify({type: 'subscribe', channel: 'alerts'}));
  ```
- [ ] Should see connection successful
- [ ] Create test alert in database
- [ ] Should receive alert via WebSocket within 5 seconds
- [ ] Test unsubscribe
- [ ] Test ping/pong
- [ ] Close connection

#### Setup Supervisor (Production)
- [ ] Create supervisor config file: `/etc/supervisor/conf.d/websocket-server.conf`
- [ ] Add configuration:
  ```ini
  [program:websocket-server]
  command=/usr/bin/php /path/to/backend/websocket/server.php
  directory=/path/to/backend/websocket
  autostart=true
  autorestart=true
  user=www-data
  stdout_logfile=/var/log/websocket-server.log
  stderr_logfile=/var/log/websocket-server-error.log
  ```
- [ ] Reload supervisor: `sudo supervisorctl reread`
- [ ] Update: `sudo supervisorctl update`
- [ ] Start: `sudo supervisorctl start websocket-server`
- [ ] Check status: `sudo supervisorctl status websocket-server`

#### Day 16-17 Validation
- [ ] WebSocket server file created
- [ ] All MessageComponentInterface methods implemented
- [ ] 4 channels implemented (alerts, metrics, activity, errors)
- [ ] Polling logic works for all channels
- [ ] Can connect from browser
- [ ] Subscribe/unsubscribe works
- [ ] Broadcasts received
- [ ] Supervisor configured (for production)
- [ ] Server stable (no crashes after 1 hour)
- [ ] Commit: `git add . && git commit -m "Day 16-17: WebSocket server implementation"`

---

### DAY 18: React WebSocket Integration

#### Create useRealtimeUpdates Hook
- [ ] Create file: `frontend/src/hooks/useRealtimeUpdates.jsx`
- [ ] Import: `import { useEffect, useCallback } from 'react';`
- [ ] Import: `import useWebSocket, { ReadyState } from 'react-use-websocket';`

- [ ] Create hook function:
  ```javascript
  export const useRealtimeUpdates = (channel, onMessage) => {
      const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
      
      const { sendMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
          shouldReconnect: () => true,
          reconnectAttempts: 10,
          reconnectInterval: 3000,
      });
      
      // Subscribe on connection
      useEffect(() => {
          if (readyState === ReadyState.OPEN) {
              sendMessage(JSON.stringify({
                  type: 'subscribe',
                  channel: channel
              }));
          }
      }, [readyState, channel, sendMessage]);
      
      // Handle messages
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
      
      // Heartbeat ping
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

#### Create useRealtimeAlerts Hook
- [ ] Create file: `frontend/src/hooks/useRealtimeAlerts.jsx`
- [ ] Import useRealtimeUpdates
- [ ] Import useState, useCallback
- [ ] Create hook:
  ```javascript
  export const useRealtimeAlerts = () => {
      const [alerts, setAlerts] = useState([]);
      
      const handleMessage = useCallback((data) => {
          if (data.type === 'new_alerts') {
              setAlerts(prev => [...data.data, ...prev]);
              // Optional: Show toast notification
          }
      }, []);
      
      const { isConnected } = useRealtimeUpdates('alerts', handleMessage);
      
      return { alerts, isConnected };
  };
  ```

#### Create useRealtimeMetrics Hook
- [ ] Create file: `frontend/src/hooks/useRealtimeMetrics.jsx`
- [ ] Similar structure to useRealtimeAlerts
- [ ] Subscribe to 'metrics' channel
- [ ] Store latest metrics in state
- [ ] Return { metrics, isConnected }

#### Create useRealtimeActivity Hook
- [ ] Create file: `frontend/src/hooks/useRealtimeActivity.jsx`
- [ ] Subscribe to 'activity' channel
- [ ] Store recent activity in state
- [ ] Return { activity, isConnected }

#### Create useRealtimeErrors Hook
- [ ] Create file: `frontend/src/hooks/useRealtimeErrors.jsx`
- [ ] Subscribe to 'errors' channel
- [ ] Store critical errors in state
- [ ] Return { errors, isConnected }

#### Create Connection Indicator Component
- [ ] Create file: `frontend/src/components/ConnectionIndicator.jsx`
- [ ] Accept isConnected prop
- [ ] Render:
  ```jsx
  <div className="fixed top-4 right-4 z-50">
      {isConnected ? (
          <span className="flex items-center gap-2 px-3 py-1 rounded-full glass-card">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm" style={{color: 'var(--success)'}}>Live</span>
          </span>
      ) : (
          <span className="flex items-center gap-2 px-3 py-1 rounded-full glass-card">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-sm" style={{color: 'var(--error)'}}>Reconnecting...</span>
          </span>
      )}
  </div>
  ```
- [ ] Add CSS for glass-card if needed
- [ ] Export component

#### Test WebSocket Hooks
- [ ] Create test page component
- [ ] Import and use useRealtimeAlerts
- [ ] Display connection indicator
- [ ] Display alerts list
- [ ] Run app: `npm run dev`
- [ ] Navigate to test page
- [ ] Verify connection indicator shows "Live"
- [ ] Create test alert in database
- [ ] Should appear in UI within 5 seconds
- [ ] Test disconnect (stop WebSocket server)
- [ ] Should show "Reconnecting..."
- [ ] Restart server
- [ ] Should reconnect automatically

#### Day 18 Validation
- [ ] useRealtimeUpdates hook created
- [ ] All 4 specialized hooks created (alerts, metrics, activity, errors)
- [ ] Connection indicator component created
- [ ] Auto-reconnect works
- [ ] Messages received in real-time
- [ ] Ping/pong heartbeat functional
- [ ] No memory leaks (test with React DevTools Profiler)
- [ ] Commit: `git add . && git commit -m "Day 18: React WebSocket integration"`

---

[Content continues with Days 19-30...]

**Note:** This is becoming very long. Should I:
1. **Continue in this file** with all granular tasks for Days 19-30?
2. **Create a separate appendix file** for Days 19-30?
3. **Merge into the main EXECUTION_TASK_LIST.md**?

Let me know and I'll complete all remaining days with design integration!
