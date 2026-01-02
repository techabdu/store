# Master Implementation Plan - SuperAdmin Monitoring System
## Complete Phase-by-Phase Implementation Guide

**Project**: Phone Retailer Management System - Monitoring & SaaS Metrics  
**Timeline**: 6 weeks (30 working days)  
**Updated**: 2026-01-02 based on user requirements

---

## Executive Summary

This plan implements:
1. **System Monitoring** - Errors, performance, health tracking
2. **SaaS Metrics** - Tenant management, growth, health scores
3. **Real-time Updates** - WebSocket implementation (mandatory)
4. **Internal Support** - Marketplace dispute/report ticketing system
5. **Multi-environment** - Localhost + production with CI/CD

**Key Decisions:**
- ❌ No repair/refurbishment tracking
- ⚠️ Optional commission tracking (tables ready if needed later)
- ✅ Internal support ticketing system with email notifications
- ✅ Marketplace report tracking with wizard/focus view on profile page
- ✅ All features implemented in phases

---

## Phase Overview

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|--------------|
| **Phase 1** | Week 1 (5 days) | Foundation & Logging | Database tables, EventLogger, error handlers |
| **Phase 2** | Week 2 (5 days) | Workers & Alerting | Background workers, email alerts, cron jobs |
| **Phase 3** | Week 3 (5 days) | SaaS Metrics Backend | Tenant APIs, health scores, feature tracking |
| **Phase 4** | Week 4 (5 days) | WebSocket & Real-time | WebSocket server, React hooks, live updates |
| **Phase 5** | Week 5 (5 days) | Dashboard UI - Core | 6 main dashboards, charts, visualizations |
| **Phase 6** | Week 6 (5 days) | Support System & Polish | Marketplace reports, ticket tracking, deployment |

---

## PHASE 1: Foundation & Logging System (Week 1)

### Goals
- Set up structured logging infrastructure
- Create database schema for monitoring
- Implement error tracking with shop_id/tenant_id
- Environment configuration for dev/prod

### Day 1: Environment Setup & Dependencies

**Tasks:**
1. Install backend dependencies
2. Install frontend dependencies
3. Create environment configuration
4. Set up directory structure

**Commands:**
```bash
# Backend
cd /Applications/XAMPP/xamppfiles/htdocs/store/backend
composer require monolog/monolog
composer require cboden/ratchet
composer require phpmailer/phpmailer  # if not already installed

# Frontend
cd /Applications/XAMPP/xamppfiles/htdocs/store/frontend
npm install @tanstack/react-query
npm install chart.js react-chartjs-2
npm install react-use-websocket
npm install recharts

# Create directories
mkdir -p backend/workers
mkdir -p backend/websocket
mkdir -p backend/logs
chmod 777 backend/logs
```

**Files to Create:**

**1. `backend/config/environment.php`**
```php
<?php
class Environment {
    private static $env = null;
    
    public static function get() {
        if (self::$env === null) {
            // Load from .env file
            if (file_exists(__DIR__ . '/../.env')) {
                $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                        list($key, $value) = explode('=', $line, 2);
                        putenv(trim($key) . '=' . trim($value));
                    }
                }
            }
            self::$env = getenv('APP_ENV') ?: 'development';
        }
        return self::$env;
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
                'ws_url' => 'ws://localhost:8080',
                'smtp_host' => getenv('SMTP_HOST') ?: 'smtp.mailtrap.io',
                'smtp_port' => getenv('SMTP_PORT') ?: 2525,
                'smtp_user' => getenv('SMTP_USER'),
                'smtp_pass' => getenv('SMTP_PASS'),
            ],
            'production' => [
                'db_host' => getenv('DB_HOST'),
                'db_name' => getenv('DB_NAME'),
                'db_user' => getenv('DB_USER'),
                'db_pass' => getenv('DB_PASS'),
                'api_url' => 'https://prhub.shop/api',
                'frontend_url' => 'https://prhub.shop',
                'ws_url' => 'wss://prhub.shop:8080',
                'smtp_host' => getenv('SMTP_HOST'),
                'smtp_port' => getenv('SMTP_PORT'),
                'smtp_user' => getenv('SMTP_USER'),
                'smtp_pass' => getenv('SMTP_PASS'),
            ]
        ];
        
        $env = self::get();
        return $configs[$env][$key] ?? $default;
    }
}
```

**2. Frontend environment files**
```bash
# .env.development
VITE_API_URL=http://localhost/store/backend/api
VITE_WS_URL=ws://localhost:8080
VITE_APP_ENV=development

# .env.production
VITE_API_URL=https://prhub.shop/api
VITE_WS_URL=wss://prhub.shop:8080
VITE_APP_ENV=production
```

**Checklist:**
- [ ] All dependencies installed
- [ ] Environment files created
- [ ] Directories created with correct permissions
- [ ] Test that environment config works

---

### Day 2: Database Schema - Monitoring Tables

**Create:** `backend/sql/migrations/001_monitoring_tables.sql`

**Tables to create:**

1. **application_errors** - Comprehensive error logging
2. **api_request_logs** - API performance tracking  
3. **metrics_hourly** - Pre-aggregated hourly metrics
4. **metrics_daily** - Pre-aggregated daily metrics
5. **email_notifications** - Email tracking

**Update existing tables:**
- `tenants` - Add subscription fields
- `transactions` - Add commission fields (optional)
- `api_request_logs` - Add module field

**SQL Migration:**
```sql
-- See full SQL in separate file due to length
-- Key points:
-- - All tables have tenant_id, shop_id where applicable
-- - Proper indexes on created_at, tenant_id, error_level
-- - JSON columns for flexible metadata
-- - Foreign keys with proper cascades
```

**Checklist:**
- [ ] Migration SQL file created
- [ ] Run migration on development database
- [ ] Verify all tables created
- [ ] Test insert/select on each table

---

### Day 3: EventLogger & Error Handlers

**Create:** `backend/helpers/EventLogger.php`

**Features:**
- PSR-3 compliant structured logging
- Automatic context enrichment (user, tenant, shop, IP)
- Multiple handlers (file, database, stdout)
- Log rotation (30 days)
- Log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)

**Methods:**
- `logActivity($eventType, $userId, $tenantId, $context)`
- `logError($errorLevel, $errorMessage, $context)`
- `logApiRequest($endpoint, $method, $statusCode, $responseTime)`

**Create:** `backend/helpers/error_handlers.php`

**Custom handlers:**
- `set_error_handler()` - All PHP errors
- `set_exception_handler()` - Uncaught exceptions
- `register_shutdown_function()` - Fatal errors

**Update:** `backend/config/config.php` or main entry point
```php
require_once __DIR__ . '/helpers/error_handlers.php';
```

**Checklist:**
- [ ] EventLogger class created
- [ ] Error handlers created
- [ ] Integrated into main config
- [ ] Test error logging works
- [ ] Verify errors appear in database

---

### Day 4: API Request Logging Middleware

**Create:** `backend/middleware/api_logger.php`

**Features:**
- Automatic request/response time tracking
- Module detection (inventory, sales, marketplace, etc.)
- Error flagging (4xx, 5xx)
- User/tenant tracking

**Integration:**
Add to top of ALL API endpoints:
```php
<?php
require_once __DIR__ . '/../../middleware/api_logger.php';
// ... rest of API code
```

**Priority endpoints to instrument (Day 4-5):**
- [ ] `/api/inventory/*` (5 files)
- [ ] `/api/transactions/*` (2 files)
- [ ] `/api/marketplace/*` (20+ files)
- [ ] `/api/admin/*` (12 files)
- [ ] `/api/superadmin/*` (2 files)
- [ ] `/api/auth/*` (3 files)

**Strategy:**
- Start with most critical APIs
- Test each one after adding middleware
- Monitor performance impact

---

### Day 5: Testing & Validation

**Tasks:**
1. End-to-end logging test
2. Generate test errors
3. Make API calls
4. Verify data in database
5. Check log files

**Test Scenarios:**
```php
// Test error logging
trigger_error("Test warning", E_USER_WARNING);
throw new Exception("Test exception");

// Test API logging
// Make requests to instrumented endpoints
// Verify data in api_request_logs table

// Test activity logging
logActivity('test_action', $userId, $tenantId, ['test' => 'data']);
```

**Validation Checklist:**
- [ ] Errors logged to `application_errors` table
- [ ] Errors include shop_id and tenant_id
- [ ] API requests logged to `api_request_logs`
- [ ] Response times are accurate
- [ ] Log files created in `backend/logs/`
- [ ] No performance degradation (<5ms overhead)

**Deliverables:**
✅ EventLogger operational  
✅ All errors tracked with context  
✅ 30+ API endpoints instrumented  
✅ Database tables populated  
✅ Log rotation configured

---

## PHASE 2: Background Workers & Alerting (Week 2)

### Goals
- Build metrics aggregation workers
- Implement alert processing and email notifications
- Set up cron jobs
- Create log cleanup automation

### Day 6: MetricsAggregator Worker

**Create:** `backend/workers/MetricsAggregator.php`

**What it does:**
- Runs every 5 minutes via cron
- Aggregates data from last hour
- Stores results in `metrics_hourly` and `metrics_daily`

**Metrics to aggregate:**

1. **API Metrics:**
   - Request count per endpoint
   - Average response time per endpoint
   - Error count per endpoint
   - p50, p95, p99 latency

2. **Error Metrics:**
   - Total errors
   - Errors by type
   - Errors by module
   - Error rate (errors/requests * 100)

3. **User Metrics:**
   - Active users (last 30 mins)
   - Active users by role
   - New user signups

4. **Business Metrics:**
   - Revenue (hourly, daily)
   - Transaction count
   - Average transaction value
   - Inventory turnover (daily)

**Implementation structure:**
```php
// Loop through each metric type
foreach (['api_requests', 'errors', 'active_users', 'revenue'] as $metricType) {
    $data = calculateMetric($metricType);
    storeInDatabase($metricType, $data);
}
```

**Checklist:**
- [ ] Worker script created
- [ ] All 4 metric types implemented
- [ ] Test run manually
- [ ] Verify metrics_hourly populated
- [ ] Check execution time (<30 seconds)

---

### Day 7: AlertProcessor & EmailNotifier

**Create:** `backend/classes/EmailNotifier.php`

**Features:**
- PHPMailer integration
- HTML email templates
- Email queue (stores in `email_notifications`)
- Retry logic for failed sends
- SMTP configuration per environment

**Email types:**
- Critical alerts
- Retention warnings (at-risk tenants)
- Report summaries
- System notifications

**Create:** `backend/workers/AlertProcessor.php`

**Alert rules to check:**

| Alert Type | Condition | Severity | Frequency |
|------------|-----------|----------|-----------|
| High Error Rate | >5% in 10 mins | Critical | Every check |
| Slow API | p95 >1000ms for 5 mins | Warning | Every check |
| Database Size | >85% full | Critical | Daily |
| Tenant Inactive | No login 30 days | Warning | Daily |
| Failed Logins | >10 attempts in 10 mins | Critical | Every check |
| Revenue Drop | <70% of 7-day avg | Warning | Daily |

**Alert deduplication:**
- Don't create duplicate alerts within 1 hour
- Auto-resolve alerts when condition clears

**Checklist:**
- [ ] EmailNotifier class created
- [ ] Test email sending works
- [ ] AlertProcessor created
- [ ] All 6 alert rules implemented
- [ ] Test email delivery

---

### Day 8-9: Additional Workers

**Create:** `backend/workers/LogCleaner.php` (Day 8)

**Cleanup tasks:**
- Delete `api_request_logs` >90 days old
- Delete `application_errors` >180 days old
- Delete expired `system_metrics` cache
- Archive to separate table (optional)

**Create:** `backend/workers/HealthScoreCalculator.php` (Day 8-9)

**Health score components:**

1. **Engagement Score (0-40 points):**
   - Login frequency (15 pts)
   - Active users % (10 pts)
   - Features used (15 pts)

2. **Value Score (0-30 points):**
   - Transaction volume (10 pts)
   - Revenue growth (10 pts)
   - Inventory turnover (10 pts)

3. **Data Quality Score (0-20 points):**
   - Complete inventory records (10 pts)
   - Customer data completeness (10 pts)

4. **Support Score (0-10 points):**
   - Low error rate (5 pts)
   - Few support tickets (5 pts)

**Categories:**
- 90-100: Power User 🟢
- 70-89: Healthy 🟢
- 50-69: At Risk 🟡
- 0-49: Churn Risk 🔴

**Actions:**
- Create alerts for at-risk tenants
- Send retention emails

** Checklist:**
- [ ] LogCleaner created
- [ ] HealthScoreCalculator created
- [ ] Test health score calculation
- [ ] Verify scores stored correctly

---

### Day 10: Cron Job Setup & Testing

**Crontab configuration:**
```bash
# Edit crontab
crontab -e

# Add these jobs:
*/5 * * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/MetricsAggregator.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/metrics_aggregator.log 2>&1
* * * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/AlertProcessor.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/alert_processor.log 2>&1
0 2 * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/LogCleaner.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/log_cleaner.log 2>&1
0 3 * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/HealthScoreCalculator.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/health_score.log 2>&1
```

**Testing:**
- Run each worker manually
- Check logs for errors
- Monitor for 24 hours
- Verify email alerts work

**Performance monitoring:**
- Metrics Aggregator should run <30s
- Alert Processor should run <10s
- Health Score should run <60s

**Deliverables:**
✅ 4 background workers operational  
✅ Email alerts working  
✅ Cron jobs scheduled  
✅ 24-hour monitoring successful

---

## PHASE 3: SaaS Metrics Backend (Week 3)

### Goals
- Implement tenant management system
- Build SaaS-specific metrics tracking
- Create health score endpoints
- Add feature usage tracking

### Day 11: SaaS Database Tables

**Create:** `backend/sql/migrations/002_saas_metrics_tables.sql`

**Tables:**

1. **subscription_history** - Plan changes, upgrades, downgrades
2. **feature_usage** - Track which features tenants use
3. **storage_metrics** - Database + file storage per tenant
4. **retailer_health_scores** - Calculated scores with history
5. **inventory_update_log** - Track inventory changes
6. **marketplace_dispute_tracking** (Added for support system)

**Updates to tenants table:**
```sql
ALTER TABLE tenants ADD COLUMN subscription_plan ENUM('trial', 'basic', 'pro', 'enterprise') DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN mrr DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP NULL;
ALTER TABLE tenants ADD COLUMN cancelled_at TIMESTAMP NULL;
ALTER TABLE tenants ADD COLUMN cancellation_reason TEXT DEFAULT NULL;
```

**Checklist:**
- [ ] Migration SQL created
- [ ] Run on development database
- [ ] All 6 tables created
- [ ] Tenants table updated
- [ ] Test inserts

---

### Day 12: Tenant Management APIs

**Create:** `backend/api/superadmin/tenants_management.php`

**Endpoints:**
```
GET    /api/superadmin/tenants_management?action=list&status=&plan=&page=1
GET    /api/superadmin/tenants_management?action=detail&id=123
PUT    /api/superadmin/tenants_management?action=update_status&id=123  (suspend/activate)
PUT    /api/superadmin/tenants_management?action=update_plan&id=123    (change subscription)
POST   /api/superadmin/tenants_management?action=impersonate&id=123    (debug login)
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "tenants": [...],
    "pagination": { "page": 1, "total": 150, "per_page": 50 },
    "stats": {
      "total": 150,
      "active": 120,
      "trial": 20,
      "suspended": 10
    }
  }
}
```

**Checklist:**
- [ ] All 5 actions implemented
- [ ] Pagination works
- [ ] Filters work (status, plan)
- [ ] Impersonate creates secure session
- [ ] Test all endpoints

---

### Day 13: Platform Metrics APIs

**Create:** `backend/api/superadmin/platform_metrics.php`

**Endpoints:**
```
GET /api/superadmin/platform_metrics?type=growth&period=30d
GET /api/superadmin/platform_metrics?type=inventory&period=7d
GET /api/superadmin/platform_metrics?type=transactions&period=30d
GET /api/superadmin/platform_metrics?type=usage&period=7d
```

**Metrics by type:**

**Growth:**
- MRR, ARR
- New tenants this period
- Churned tenants
- MRR growth rate
- Tenant growth chart

**Inventory:**
- Total devices tracked
- Devices by brand/model
- Average inventory per tenant
- Inventory turnover rate
- Total inventory value

**Transactions:**
- GMV (Gross Merchandise Value)
- Transaction count
- Average transaction value
- Top selling devices
- Payment method breakdown

**Usage:**
- API calls per tenant
- Storage consumption
- Feature adoption heatmap
- Module usage breakdown

**Checklist:**
- [ ] All 4 metric types implemented
- [ ] Period filtering works
- [ ] Data aggregation accurate
- [ ] Response time <500ms

---

### Day 14: Feature Usage Tracking

**Create:** `backend/helpers/FeatureTracker.php`

**Track usage when:**
- User views a page
- User creates/updates/deletes data
- User exports a report
- User uses a specific feature

**Usage:**
```php
FeatureTracker::track('inventory_management', 'view', $userId, $tenantId, $shopId);
FeatureTracker::track('marketplace', 'create_listing', $userId, $tenantId, $shopId);
FeatureTracker::track('reports', 'export', $userId, $tenantId, $shopId);
```

**Add to existing endpoints:**
- Inventory CRUD
- POS sales
- Marketplace actions
- Report generation
- Expense tracking

**Create:** `backend/api/superadmin/feature_usage.php`

**Endpoints:**
```
GET /api/superadmin/feature_usage?tenant_id=123&period=30d
GET /api/superadmin/feature_usage?action=heatmap&period=30d
```

**Checklist:**
- [ ] FeatureTracker helper created
- [ ] Integrated into 20+ key endpoints
- [ ] API endpoints created
- [ ] Heatmap data generation works

---

### Day 15: Health Scores & Storage Tracking

**Create:** `backend/api/superadmin/health_scores.php`

**Endpoints:**
```
GET /api/superadmin/health_scores?category=at_risk
GET /api/superadmin/health_scores?tenant_id=123
GET /api/superadmin/health_scores?sort=score_asc
```

**Create:** `backend/workers/StorageCalculator.php`

**Calculates:**
- Database size per tenant (sum of all table rows)
- File storage per tenant (uploads folder)
- Total records count
- Growth trends

**Runs:** Daily at 4 AM

**Checklist:**
- [ ] Health scores API created
- [ ] Filtering and sorting works
- [ ] StorageCalculator worker created
- [ ] Test storage calculation

**Deliverables:**
✅ Tenant management system complete  
✅ Platform metrics APIs operational  
✅ Feature usage tracking live  
✅ Health scores calculated daily

---

## PHASE 4: WebSocket & Real-time Updates (Week 4)

### Goals
- Implement WebSocket server (Ratchet PHP)
- Create React WebSocket hooks
- Enable real-time dashboard updates
- Test and optimize performance

### Day 16-17: WebSocket Server Implementation

**Create:** `backend/websocket/server.php`

**Features:**
- Channel-based subscriptions (alerts, metrics, activity)
- Connection management
- Heartbeat/ping-pong
- Graceful disconnection
- Error handling

**Channels:**
- `alerts` - New system alerts
- `metrics` - Updated metrics every 30s
- `activity` - Recent activity feed
- `errors` - New errors in real-time

**Polling mechanism:**
- Check database every 5 seconds for new data
- Broadcast changes to subscribed clients
- Efficient queries with timestamps

**Supervisor config for production:**
```ini
[program:websocket-server]
command=/usr/bin/php /path/to/backend/websocket/server.php
autostart=true
autorestart=true
user=www-data
```

**Checklist:**
- [ ] WebSocket server created
- [ ] 4 channels implemented
- [ ] Polling logic works
- [ ] Test with multiple clients
- [ ] Memory usage stable

---

### Day 18: React WebSocket Integration

**Create:** `frontend/src/hooks/useRealtimeUpdates.jsx`

**Features:**
- Auto-reconnect logic
- Channel subscription
- Message handling
- Connection status indicator

**Create:** `frontend/src/hooks/useRealtimeAlerts.jsx`
**Create:** `frontend/src/hooks/useRealtimeMetrics.jsx`

**Specialized hooks for each channel**

**Integration example:**
```jsx
function Dashboard() {
  const { alerts, isConnected } = useRealtimeAlerts();
  const { metrics } = useRealtimeMetrics();
  
  // UI updates automatically when data changes
}
```

**Connection indicator component:**
```jsx
<div className="fixed top-4 right-4">
  {isConnected ? (
    <span className="text-green-500">🟢 Live</span>
  ) : (
    <span className="text-red-500">🔴 Reconnecting...</span>
  )}
</div>
```

**Checklist:**
- [ ] useRealtimeUpdates hook created
- [ ] Specialized hooks created
- [ ] Connection indicator works
- [ ] Auto-reconnect tested
- [ ] No memory leaks

---

###Day 19: WebSocket Testing & Optimization

**Test scenarios:**
1. Single client connection
2. Multiple clients (5-10)
3. Rapid disconnect/reconnect
4. Server restart (clients should reconnect)
5. Network interruption simulation

**Performance testing:**
- Measure message latency (<100ms ideal)
- Monitor server memory usage
- Check CPU usage
- Test with production-like data volume

**Optimization:**
- Reduce polling frequency if needed
- Implement message batching
- Add client-side caching
- Optimize database queries

**Checklist:**
- [ ] All test scenarios passed
- [ ] Latency <100ms
- [ ] Memory usage stable
- [ ] CPU usage acceptable
- [ ] Production-ready

---

### Day 20: Environment Configuration & CI/CD

**Update config files with WebSocket URLs:**
```bash
# Development
VITE_WS_URL=ws://localhost:8080

# Production
VITE_WS_URL=wss://administration.prhub.shop:8080
```

**Create:** `.github/workflows/deploy.yml`

**CI/CD Pipeline:**

✅ **Note**: You already have GitHub Actions set up. We'll integrate the new components into your existing workflow.

**Updates needed to existing workflow:**
1. **Backend deployment:**
   - Add database migration step for new tables
   - Add WebSocket server restart command
   - Run background workers setup (cron jobs)

2. **Frontend build:**
   - Ensure WebSocket URL env variable is set
   - No other changes needed

**New deployment steps to add:**
```yaml
# In your existing .github/workflows/*.yml

# After backend deployment:
- name: Run monitoring database migrations
  run: mysql -u ${{ secrets.DB_USER }} -p${{ secrets.DB_PASS }} ${{ secrets.DB_NAME }} < backend/sql/migrations/001_monitoring_tables.sql

- name: Restart WebSocket server
  run: sudo supervisorctl restart websocket-server

# After frontend build:
# (existing steps should work, just ensure VITE_WS_URL is in env)
```

**Checklist:**
- [ ] Environment files configured
- [ ] GitHub Actions workflow created
- [ ] Test deployment to staging
- [ ] Rollback procedure documented

**Deliverables:**
✅ WebSocket server operational  
✅ React integration complete  
✅ Real-time updates working  
✅ CI/CD pipeline ready

---

## PHASE 5: Dashboard UI - Core (Week 5)

### Goals
- Build 6 main dashboard pages
- Implement charts and visualizations
- Add filtering and search
- Create reusable components

### Day 21: Reusable Components

**Create core UI components:**

1. **`frontend/src/components/Dashboard/HealthPillarCard.jsx`**
   - Used for 4 health pillars on overview
   - Props: title, value, status (green/yellow/red), trend, icon

2. **`frontend/src/components/Dashboard/MetricCard.jsx`**
   - Displays single metric with trend
   - Props: title, value, change%, period

3. **`frontend/src/components/Charts/LineChart.jsx`**
   - Wrapper around Chart.js
   - Props: data, labels, title, color

4. **`frontend/src/components/Charts/BarChart.jsx`**
5. **`frontend/src/components/Charts/PieChart.jsx`**
6. **`frontend/src/components/Charts/HeatmapChart.jsx`**

7. **`frontend/src/components/Dashboard/AlertBadge.jsx`**
   - Shows alert count with severity color

8. **`frontend/src/components/Tables/DataTable.jsx`**
   - Reusable table with pagination, sorting, filtering

**Checklist:**
- [ ] All 8 components created
- [ ] Storybook/test cases (optional)
- [ ] Responsive design
- [ ] Consistent styling

---

### Day 22: Overview Dashboard

**Create:** `frontend/src/pages/SuperAdmin/Dashboard.jsx`

**Layout:**
```
+--------------------------------------------------+
| 4 Health Pillar Cards (System, User, Error, Biz)|
+--------------------------------------------------+
| Real-time Metrics Section                        |
| - API Request Rate (last 24h chart)             |
| - Error Rate Trend (last 7d chart)              |
+--------------------------------------------------+
| Critical Alerts Panel (latest 5)                 |
+--------------------------------------------------+
| Recent Activity Feed (live WebSocket updates)    |
+--------------------------------------------------+
```

**Data sources:**
- `GET /api/superadmin/health` (overall status)
- `GET /api/superadmin/metrics?type=realtime`
- WebSocket: `alerts` and `activity` channels

**Checklist:**
- [ ] Page layout created
- [ ] 4 health pillar cards working
- [ ] Charts displaying data
- [ ] Real-time updates working
- [ ] Loading states
- [ ] Error states

---

### Day 23: Tenant Management Dashboard

**Create:** `frontend/src/pages/SuperAdmin/TenantManagement.jsx`

**Features:**
- Tenant list table with pagination
- Filters: Status, Plan, Date range
- Search by tenant name/email
- Actions: View, Suspend, Change plan
- Health score indicator per tenant

**Create:** `frontend/src/pages/SuperAdmin/TenantDetail.jsx`

**Tabs:**
1. Overview (account info, subscription)
2. Usage Stats (feature usage, API calls, storage)
3. Activity Timeline (recent actions)
4. Health Score (breakdown of score components)

**Checklist:**
- [ ] Tenant list page created
- [ ] Filtering works
- [ ] Pagination works
- [ ] Tenant detail page created
- [ ] All tabs functional

---

### Day 24: System & Error Health Dashboards

**Create:** `frontend/src/pages/SuperAdmin/SystemHealth.jsx`

**Sections:**
- API Response Times (p50, p95, p99 charts)
- Request Volume by Endpoint (bar chart)
- Server Resources (CPU, memory, disk gauges)
- Database Health (connections, slow queries)

**Create:** `frontend/src/pages/SuperAdmin/ErrorHealth.jsx`

**Sections:**
- Error Rate Chart (last 7 days)
- Error Breakdown (by type pie chart)
- Error Breakdown (by module bar chart)
- Recent Errors Table (filterable, searchable)
  - Columns: Time, Type, Message, Shop, Tenant, User, Actions
  - Click row to see full stack trace in modal

**Checklist:**
- [ ] SystemHealth page created
- [ ] All charts working
- [ ] ErrorHealth page created
- [ ] Error table with filters
- [ ] Stack trace modal

---

### Day 25: Business & User Health Dashboards

**Create:** `frontend/src/pages/SuperAdmin/BusinessHealth.jsx`

**Sections:**
- Revenue Chart (daily, last 30 days)
- Transaction Metrics (count, average value, top devices)
- Inventory Metrics (turnover, stock levels)
- Marketplace Metrics (orders, disputes, completion rate)

**Create:** `frontend/src/pages/SuperAdmin/UserHealth.jsx`

**Sections:**
- DAU/MAU Charts
- User Retention Cohort
- Session Duration Distribution  
- Inactive Users List (>30 days)
- User Segmentation (by role pie chart)

**Checklist:**
- [ ] BusinessHealth page created
- [ ] All business charts working
- [ ] UserHealth page created
- [ ] Cohort analysis working

**Deliverables:**
✅ 6 core dashboard pages  
✅ 15+ charts and visualizations  
✅ Real-time updates integrated  
✅ Filtering and search working

---

## PHASE 6: Support System & Final Polish (Week  6)

### Goals
- Build internal marketplace support/dispute system
- Create ticket tracking for users
- Implement wizard/focus view on profile
- Final testing and deployment

### Day 26: Support System Database & Backend

**Already have:** `marketplace_reports` table (for reporting listings/users)

**Create:** `backend/sql/migrations/003_support_system.sql`

**New tables:**

1. **support_tickets** - User-facing support tickets
   - ticket_number (unique, e.g., TKT-20260102-001)
   - tenant_id, user_id, shop_id
   - type: ENUM('dispute', 'report_buyer', 'report_seller', 'technical', 'billing', 'other')
   - subject, description
   - order_id (if dispute related to order)
   - listing_id (if report related to listing)
   - status: ENUM('open', 'in_progress', 'awaiting_response', 'resolved', ' closed')
   - priority: ENUM('low', 'medium', 'high', 'urgent')
   - created_at, updated_at, resolved_at

2. **support_ticket_responses** - Conversation thread
   - ticket_id
   - user_id (who responded)
   - is_admin_response (true for superadmin/support staff)
   - message
   - attachments (JSON array of file paths)
   - created_at

3. **support_ticket_status_history** - Audit trail
   - ticket_id
   - from_status, to_status
   - changed_by (user_id)
   - notes
   - changed_at

**Create:** `backend/api/marketplace/support/create_ticket.php`

**When user reports from marketplace:**
```php
POST /api/marketplace/support/create_ticket
{
  "type": "dispute",  // or "report_buyer", "report_seller"
  "order_id": 123,
  "subject": "Order not delivered",
  "description": "...",
  "attachments": []
}

Response:
{
  "success": true,
  "ticket": {
    "id": 456,
    "ticket_number": "TKT-20260102-001",
    "status": "open"
  },
  "message": "Support ticket created. You will receive an email confirmation."
}
```

**Email notification:**
- Send confirmation email to user
- Send alert email to superadmin
- Include ticket number and tracking link

**Checklist:**
- [ ] Support tables created
- [ ] create_ticket API works
- [ ] Email notifications sent
- [ ] Ticket numbers generated correctly

---

### Day 27: Ticket Tracking for Users

**Create:** `backend/api/marketplace/support/my_tickets.php`

**Endpoints:**
```
GET  /api/marketplace/support/my_tickets?status=open&page=1
GET  /api/marketplace/support/my_tickets?action=detail&ticket_id=456
POST /api/marketplace/support/my_tickets?action=respond&ticket_id=456
```

**Create:** `frontend/src/pages/Marketplace/MyTickets.jsx`

**Features:**
- List of user's tickets
- Filter by status
- Click to view details
- Add responses
- See status history

**Create:** `frontend/src/pages/Marketplace/TicketDetail.jsx`

**Layout:**
```
+------------------------------------------+
| Ticket #TKT-20260102-001                 |
| Status: [Open] Priority: [High]          |
+------------------------------------------+
| Subject: Order not delivered             |
| Created: 2026-01-02 16:00                |
| Related Order: #ORD-123                  |
+------------------------------------------+
| Conversation Thread                      |
| - User message (Jan 2, 16:00)           |
| - Admin response (Jan 2, 17:30)         |
| - User reply (Jan 2, 18:00)             |
+------------------------------------------+
| [Add Response] textarea                  |
| [Attach File] [Submit]                   |
+------------------------------------------+
```

**Checklist:**
- [ ] my_tickets API created
- [ ] MyTickets page created
- [ ] TicketDetail page created
- [ ] Response submission works
- [ ] File attachments work

---

### Day 28: Marketplace Profile - Report Wizard

**Update:** `frontend/src/pages/Marketplace/Profile.jsx`

**Add "Report/Dispute" button**

**Create:** `frontend/src/components/Marketplace/ReportWizard.jsx`

**Wizard/Focus view (modal or slide-over):**

**Step 1: Select Report Type**
```
What would you like to report?
○ Report a buyer (someone who bought from you)
○ Report a seller (someone you bought from)
○ Dispute an order
○ Report a listing
○ Other issue
```

**Step 2: Provide Details**
```
If order/listing related:
- Select order/listing from dropdown

Subject: [text input]
Description: [textarea]
Attachments: [file upload]
```

**Step 3: Review & Submit**
```
Review your report:
- Type: Dispute
- Order: #ORD-123
- Subject: ...
- Description: ...

[Back] [Submit Report]
```

**After submission:**
```
✅ Report Submitted
Ticket #TKT-20260102-001

We've received your report and will review it within 24 hours.
You'll receive an email confirmation shortly.

[Track My Tickets] [Close]
```

**Checklist:**
- [ ] Report button added to profile
- [ ] ReportWizard component created
- [ ] 3-step wizard works
- [ ] Integration with create_ticket API
- [ ] Success/error handling

---

### Day 29: SuperAdmin Support Dashboard

**Create:** `frontend/src/pages/SuperAdmin/SupportDashboard.jsx`

**Sections:**

1. **Ticket Overview Cards**
   - Total Open Tickets
   - Awaiting Response
   - Resolved Today
   - Average Response Time

2. **Ticket List Table**
   - Columns: Ticket#, Type, Subject, Reporter, Status, Priority, Created, Actions
   - Filters: Status, Type, Priority, Date range
   - Actions: View, Respond, Change Status, Assign

3. **Ticket Detail Modal**
   - Full conversation
   - Status change dropdown
   - Priority change
   - Internal notes
   - Quick responses

4. **Common Issues**
   - Most frequent ticket types
   - Affected orders/listings
   - Trends

**Create:** `backend/api/superadmin/support_tickets.php`

**Actions:**
- list (with filters)
- detail
- respond
- change_status
- assign
- statistics

**Checklist:**
- [ ] Support API created
- [ ] SupportDashboard page created
- [ ] Ticket management works
- [ ] Internal notes work
- [ ] Statistics accurate

---

### Day 30: Final Testing & Deployment

**Testing checklist:**

**Backend:**
- [ ] All API endpoints respond correctly
- [ ] Error handling works
- [ ] Database queries optimized
- [ ] No N+1 queries
- [ ] Background workers stable
- [ ] WebSocket server stable
- [ ] Email notifications work

**Frontend:**
- [ ] All pages load correctly
- [ ] No console errors
- [ ] Responsive on mobile/tablet
- [ ] Charts display correctly
- [ ] Real-time updates work
- [ ] Filters and search work
- [ ] Loading states
- [ ] Error states

**Integration:**
- [ ] Localhost works end-to-end
- [ ] Production env config correct
- [ ] CI/CD pipeline works
- [ ] Database migrations tested
- [ ] SSL certificates (WebSocket wss://)

**Performance:**
- [ ] Dashboard loads <2 seconds
- [ ] API responses <500ms
- [ ] WebSocket latency <100ms
- [ ] No memory leaks
- [ ] Cron jobs don't overlap

**Deploy to production:**
1. Run database migrations
2. Deploy backend code
3. Deploy frontend build
4. Start WebSocket server (Supervisor)
5. Verify cron jobs
6. Test all features
7. Monitor for 48 hours

**Documentation:**
- [ ] Update README.md
- [ ] API documentation
- [ ] Environment setup guide
- [ ] Troubleshooting guide

**Deliverables:**
✅ Support system complete  
✅ Report wizard functional  
✅ All features tested  
✅ Production deployment successful  
✅ System monitored and stable

---

## Post-Implementation

### Week 7+: Monitoring & Iteration

**First week after launch:**
- Monitor system health dashboard daily
- Check for any errors or performance issues
- Gather user feedback
- Fix bugs
- Iterate on UI/UX

**Monthly tasks:**
- Review tenant health scores
- Analyze churn patterns
- Check feature adoption
- Plan improvements

---

## Success Metrics

After 6 weeks, you should have:

✅ **99%+ error capture rate**  
✅ **<2 minute alert response time**  
✅ **Real-time dashboard updates**  
✅ **Comprehensive tenant insights**  
✅ **150+ retailers monitored**  
✅ **30-40 metrics tracked**  
✅ **Internal support system**  
✅ **Automated health scores**  
✅ **CI/CD pipeline operational**  
✅ **Production-grade monitoring**

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Workers fail silently** | Monitor cron logs, health check endpoint, Supervisor |
| **WebSocket disconnections** | Auto-reconnect, fallback to polling |
| **Database performance** | Indexes, query optimization, metrics aggregation |
| **Email delivery failure** | Retry logic, fallback SMTP, status tracking |
| **Disk space full** | Log cleanup, monitoring, alerts at 85% |

---

## Files Created Summary

**Backend (30+ files):**
- config/environment.php
- helpers/EventLogger.php, error_handlers.php, FeatureTracker.php
- middleware/api_logger.php
- classes/EmailNotifier.php
- workers/MetricsAggregator.php, AlertProcessor.php, LogCleaner.php, HealthScoreCalculator.php, StorageCalculator.php
- websocket/server.php
- api/superadmin/tenants_management.php, platform_metrics.php, feature_usage.php, health_scores.php, support_tickets.php
- api/marketplace/support/create_ticket.php, my_tickets.php
- sql/migrations/001_monitoring_tables.sql, 002_saas_metrics_tables.sql, 003_support_system.sql

**Frontend (15+ files):**
- hooks/useRealtimeUpdates.jsx, useRealtimeAlerts.jsx, useRealtimeMetrics.jsx
- components/Dashboard/HealthPillarCard.jsx, MetricCard.jsx, AlertBadge.jsx
- components/Charts/LineChart.jsx, BarChart.jsx, PieChart.jsx, HeatmapChart.jsx
- components/Tables/DataTable.jsx
- components/Marketplace/ReportWizard.jsx
- pages/SuperAdmin/Dashboard.jsx, TenantManagement.jsx, TenantDetail.jsx, SystemHealth.jsx, ErrorHealth.jsx, BusinessHealth.jsx, UserHealth.jsx, SupportDashboard.jsx
- pages/Marketplace/MyTickets.jsx, TicketDetail.jsx

**Infrastructure:**
- .github/workflows/deploy.yml
- Supervisor config
- Crontab entries
- Environment files

---

## Review Checklist

Before starting implementation, review and confirm:

- [ ] All phases understood
- [ ] Timeline realistic (6 weeks)
- [ ] Database schema approved
- [ ] API endpoint structure approved
- [ ] Dashboard designs approved
- [ ] Support system requirements clear
- [ ] CI/CD strategy approved
- [ ] No missing features

**Questions or concerns? Let me know before we proceed!**

---

**Status**: ⏸️ Awaiting your review and approval to proceed  
**Next Step**: You review this plan, then tell me to start with Day 1

