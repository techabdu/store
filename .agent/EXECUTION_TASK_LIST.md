# Complete Execution Task List - SuperAdmin Monitoring System
## 30-Day Implementation Checklist (Nothing Missing)

**Instructions:** 
- Check off each task as you complete it
- Follow tasks sequentially within each day
- Do NOT skip any task
- Test each component/feature before moving to next task

**Progress Tracking:**
- Total Tasks: ~450
- Completed: 0
- Days: 30
- Current Day: Not started

---

## 📋 PRE-IMPLEMENTATION SETUP

### Environment Preparation
- [ ] Review all documentation (MASTER_IMPLEMENTATION_PLAN.md, FRONTEND_DESIGN_GUIDE.md)
- [ ] Confirm development environment (XAMPP) is running
- [ ] Verify database access (MySQL `store` database)
- [ ] Verify Git is configured
- [ ] Create implementation branch: `git checkout -b feature/superadmin-monitoring`


---

## PHASE 1: FOUNDATION & LOGGING SYSTEM (WEEK 1)

### DAY 1: Environment Setup & Dependencies ✅ COMPLETE

#### Backend Dependencies
- [x] Backup current database: `mysqldump store > backup_pre_monitoring.sql`
- [x] Navigate to backend: `cd /Applications/XAMPP/xamppfiles/htdocs/store/backend`
- [x] Install Monolog: `composer require monolog/monolog`
- [x] Verify Monolog installed: check `vendor/` directory
- [x] Install Ratchet: `composer require cboden/ratchet`
- [x] Verify Ratchet installed
- [x] Check if PHPMailer installed: `composer show phpmailer/phpmailer`
- [x] If not installed: `composer require phpmailer/phpmailer`
- [x] Verify all dependencies in `composer.json`

#### Frontend Dependencies
- [x] Navigate to frontend: `cd /Applications/XAMPP/xamppfiles/htdocs/store/frontend`
- [x] Install React Query: `npm install @tanstack/react-query`
- [x] Install Chart.js: `npm install chart.js react-chartjs-2`
- [x] Install Recharts: `npm install recharts`
- [x] Install WebSocket client: `npm install react-use-websocket`
- [x] Verify all packages in `package.json`
- [x] Run `npm install` to ensure no errors

#### Directory Structure
- [x] Create workers directory: `mkdir -p backend/workers`
- [x] Create websocket directory: `mkdir -p backend/websocket`
- [x] Create logs directory: `mkdir -p backend/logs`
- [x] Set permissions: `chmod 777 backend/logs`
- [x] Create migrations directory: `mkdir -p backend/sql/migrations`
- [x] Verify directory structure

#### Environment Configuration Files
- [x] Create `backend/config/environment.php`
- [x] Add Environment class with get() method
- [x] Add config() method with development/production configs
- [x] Add .env file loading logic
- [x] Test environment detection (should return 'development')

- [x] Create `backend/.env` file
- [x] Add APP_ENV=development
- [x] Add SMTP settings (for development - Mailtrap or similar)
- [x] Add .env to .gitignore if not already

- [x] Create frontend `.env.development` file
- [x] Add VITE_API_URL=http://localhost/store/backend/api
- [x] Add VITE_WS_URL=ws://localhost:8080
- [x] Add VITE_APP_ENV=development

- [x] Create frontend `.env.production` file
- [x] Add VITE_API_URL=https://prhub.shop/api
- [x] Add VITE_WS_URL=wss://prhub.shop:8080
- [x] Add VITE_APP_ENV=production

#### Update Existing Database Config
- [x] Open `backend/config/database.php`
- [x] Add `require_once __DIR__ . '/environment.php';`
- [x] Update Database class constructor to use Environment::config()
- [x] Replace hardcoded values with Environment::config('db_host'), etc.
- [x] Test database connection

#### Day 1 Validation
- [x] Run `composer show` - verify all packages installed
- [x] Run `npm list --depth=0` - verify all packages installed
- [x] Test environment config: create test PHP file, call Environment::get()
- [x] Verify returns 'development'
- [x] Delete test file
- [x] Commit: `git add . && git commit -m "Day 1: Environment setup and dependencies"`


---

### DAY 2: Database Schema - Monitoring Tables ✅ COMPLETE

#### Create Migration File
- [x] Create file: `backend/sql/migrations/001_monitoring_tables.sql`
- [x] Add file header comment with description and date
- [x] Add `USE store;` at top

#### Table 1: application_errors
- [x] Add CREATE TABLE statement
- [x] Add columns: id (PK, AUTO_INCREMENT), tenant_id, user_id, shop_id
- [x] Add error_level ENUM('warning', 'error', 'critical')
- [x] Add error_type VARCHAR(50)
- [x] Add error_message TEXT
- [x] Add error_code VARCHAR(20)
- [x] Add file_path VARCHAR(500), line_number INT
- [x] Add stack_trace TEXT
- [x] Add request_url VARCHAR(500), request_method ENUM
- [x] Add ip_address VARCHAR(45), user_agent TEXT
- [x] Add context JSON
- [x] Add created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [x] Add INDEX idx_error_level (error_level)
- [x] Add INDEX idx_created_at (created_at)
- [x] Add INDEX idx_user_id (user_id)
- [x] Add INDEX idx_tenant_id (tenant_id)
- [x] Add INDEX idx_shop_id (shop_id)
- [x] Set ENGINE=InnoDB, CHARSET=utf8mb4

#### Table 2: api_request_logs
- [x] Add CREATE TABLE statement
- [x] Add columns: id (BIGINT, PK, AUTO_INCREMENT)
- [x] Add tenant_id, user_id, shop_id
- [x] Add endpoint VARCHAR(500), http_method ENUM
- [x] Add status_code INT, response_time_ms INT
- [x] Add request_size_bytes INT, response_size_bytes INT
- [x] Add ip_address VARCHAR(45), user_agent TEXT
- [x] Add is_error TINYINT(1) DEFAULT 0
- [x] Add module VARCHAR(50) for categorization
- [x] Add created_at TIMESTAMP
- [x] Add INDEX idx_endpoint (endpoint(255))
- [x] Add INDEX idx_created_at (created_at)
- [x] Add INDEX idx_user_id (user_id)
- [x] Add INDEX idx_is_error (is_error)
- [x] Add INDEX idx_module (module)
- [x] Set ENGINE=InnoDB, CHARSET=utf8mb4

#### Table 3: metrics_hourly
- [x] Add CREATE TABLE statement
- [x] Add columns: id (PK, AUTO_INCREMENT)
- [x] Add hour_timestamp TIMESTAMP
- [x] Add metric_type VARCHAR(50)
- [x] Add metric_value DECIMAL(20, 2)
- [x] Add count INT DEFAULT 0
- [x] Add metadata JSON
- [x] Add created_at TIMESTAMP
- [x] Add UNIQUE KEY unique_hour_metric (hour_timestamp, metric_type)
- [x] Add INDEX idx_metric_type (metric_type)
- [x] Add INDEX idx_hour_timestamp (hour_timestamp)
- [x] Set ENGINE=InnoDB, CHARSET=utf8mb4

#### Table 4: metrics_daily
- [x] Add CREATE TABLE statement
- [x] Add columns: id (PK, AUTO_INCREMENT)
- [x] Add date DATE
- [x] Add metric_type VARCHAR(50)
- [x] Add metric_value DECIMAL(20, 2)
- [x] Add count INT DEFAULT 0
- [x] Add metadata JSON
- [x] Add created_at TIMESTAMP
- [x] Add UNIQUE KEY unique_date_metric (date, metric_type)
- [x] Add INDEX idx_metric_type (metric_type)
- [x] Add INDEX idx_date (date)
- [x] Set ENGINE=InnoDB, CHARSET=utf8mb4

#### Table 5: email_notifications
- [x] Add CREATE TABLE statement
- [x] Add columns: id (PK, AUTO_INCREMENT)
- [x] Add recipient_email VARCHAR(255)
- [x] Add subject VARCHAR(500), body TEXT
- [x] Add notification_type ENUM('alert', 'report', 'system')
- [x] Add status ENUM('pending', 'sent', 'failed')
- [x] Add sent_at TIMESTAMP NULL
- [x] Add error_message TEXT
- [x] Add created_at TIMESTAMP
- [x] Add INDEX idx_status (status)
- [x] Add INDEX idx_created_at (created_at)
- [x] Set ENGINE=InnoDB, CHARSET=utf8mb4

#### Run Migration
- [x] Open MySQL/phpMyAdmin
- [x] Select `store` database
- [x] Run migration: `source backend/sql/migrations/001_monitoring_tables.sql`
- [x] Or import via phpMyAdmin
- [x] Verify 5 new tables created
- [x] Check each table structure matches specification

#### Test Tables
- [x] Insert test row into application_errors
- [x] Insert test row into api_request_logs
- [x] Insert test row into metrics_hourly
- [x] Insert test row into metrics_daily
- [x] Insert test row into email_notifications
- [x] Select from each table to verify
- [x] Delete test rows

#### Day 2 Validation
- [x] All 5 tables exist in database
- [x] All indexes created correctly
- [x] All columns have correct types
- [x] Can insert and select from all tables
- [x] Commit: `git add . && git commit -m "Day 2: Monitoring database tables"`


---

### DAY 3: EventLogger & Error Handlers ✅ COMPLETE

#### Create EventLogger Class
- [x] Create file: `backend/helpers/EventLogger.php`
- [x] Add PHP opening tag and namespace
- [x] Add `use Monolog\Logger;`
- [x] Add `use Monolog\Handler\RotatingFileHandler;`
- [x] Add `use Monolog\Formatter\JsonFormatter;`

- [x] Create EventLogger class
- [x] Add private static $logger property
- [x] Create getInstance() method
- [x] Initialize Monolog Logger instance
- [x] Create RotatingFileHandler pointing to `backend/logs/app.log`
- [x] Set rotation to 30 days
- [x] Set log level to Logger::DEBUG
- [x] Set JsonFormatter on handler
- [x] Push handler to logger
- [x] Return logger instance

- [x] Create logActivity() method
- [x] Parameters: $eventType, $userId, $tenantId, $context = []
- [x] Get logger instance
- [x] Enrich context with user_id, tenant_id, ip_address, user_agent
- [x] Get IP from $_SERVER['REMOTE_ADDR']
- [x] Get user agent from $_SERVER['HTTP_USER_AGENT']
- [x] Call logger->info($eventType, $enrichedContext)
- [x] Also insert into activity_logs table (existing table)
- [x] Use global $conn
- [x] Prepare insert statement
- [x] Execute with parameters
- [x] Return true/false

- [x] Create logError() method
- [x] Parameters: $errorLevel, $errorMessage, $context = []
- [x] Get logger instance
- [x] Call logger->error($errorMessage, $context)
- [x] Insert into application_errors table
- [x] Get tenant_id from session or context
- [x] Get user_id from session or context
- [x] Get shop_id from context
- [x] Extract file, line, stack_trace from context
- [x] Extract request details from $_SERVER
- [x] Prepare insert statement with all fields
- [x] Execute with parameters
- [x] Return true/false

- [x] Create logApiRequest() method
- [x] Parameters: $endpoint, $method, $statusCode, $responseTimeMs
- [x] Get tenant_id from session
- [x] Get user_id from session
- [x] Get shop_id from session
- [x] Get IP and user agent
- [x] Determine if error based on status code (>= 400)
- [x] Insert into api_request_logs table
- [x] Return true/false

#### Create Error Handlers
- [x] Create file: `backend/helpers/error_handlers.php`
- [x] Add PHP opening tag
- [x] Add `require_once __DIR__ . '/EventLogger.php';`

- [x] Create custom error handler function
- [x] Use set_error_handler()
- [x] Parameters: $errno, $errstr, $errfile, $errline
- [x] Determine error level (warning/error/critical)
- [x] Map E_ERROR, E_USER_ERROR to 'error'
- [x] Map E_WARNING to 'warning'
- [x] Call EventLogger::logError()
- [x] Pass error level, message, context
- [x] Include file, line, errno in context
- [x] Return true to prevent PHP internal handler

- [x] Create exception handler
- [x] Use set_exception_handler()
- [x] Parameter: $exception
- [x] Call EventLogger::logError()
- [x] Pass 'critical' as level
- [x] Pass exception message
- [x] Include exception class, file, line, trace in context
- [x] Use $exception->getTraceAsString()

- [x] Create shutdown function for fatal errors
- [x] Use register_shutdown_function()
- [x] Get last error: error_get_last()
- [x] Check if null
- [x] Check if type is E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR
- [x] If fatal error, call EventLogger::logError()
- [x] Pass 'critical' level
- [x] Include error message, file, line

#### Integrate Error Handlers
- [x] Open `backend/config/config.php` (or main entry point)
- [x] Add `require_once __DIR__ . '/../helpers/error_handlers.php';`
- [x] Ensure it's loaded early in bootstrap
- [x] Save file

#### Test EventLogger
- [x] Create test file: `backend/test_event_logger.php`
- [x] Require EventLogger
- [x] Call EventLogger::logActivity('test_action', 1, 1, ['test' => 'data'])
- [x] Call EventLogger::logError('error', 'Test error message', ['test_context' => 'value'])
- [x] Call EventLogger::logApiRequest('/test', 'GET', 200, 50)
- [x] Run test file: `php backend/test_event_logger.php`
- [x] Check backend/logs/app.log created
- [x] Verify JSON format in log file
- [x] Check database: SELECT * FROM activity_logs (latest entry)
- [x] Check database: SELECT * FROM application_errors (latest entry)
- [x] Check database: SELECT * FROM api_request_logs (latest entry)
- [x] Delete test file

#### Test Error Handlers
- [x] Create test file: `backend/test_errors.php`
- [x] Include error_handlers.php
- [x] Trigger warning: `trigger_error("Test warning", E_USER_WARNING);`
- [x] Throw exception: `throw new Exception("Test exception");`
- [x] Run test file: `php backend/test_errors.php`
- [x] Should see exception message (but logged)
- [x] Check application_errors table for 2 new entries
- [x] Verify stack traces captured
- [x] Delete test file

#### Day 3 Validation
- [x] EventLogger.php exists and works
- [x] error_handlers.php exists and works
- [x] Errors logged to both file and database
- [x] JSON format in log files
- [x] All required fields populated in database
- [x] Commit: `git add . && git commit -m "Day 3: EventLogger and error handlers"`

- [ ] Commit: `git add . && git commit -m "Day 3: EventLogger and error handlers"`

---

### DAY 4: API Request Logging Middleware

#### Create API Logger Middleware
- [ ] Create file: `backend/middleware/api_logger.php`
- [ ] Add PHP opening tag
- [ ] Add `require_once __DIR__ . '/../helpers/EventLogger.php';`

- [ ] Create ApiLogger class
- [ ] Add private static $startTime property
- [ ] Create startRequest() method
- [ ] Set $startTime = microtime(true)
- [ ] Store in static variable

- [ ] Create endRequest() method
- [ ] Parameter: $statusCode = 200
- [ ] Get $endTime = microtime(true)
- [ ] Calculate $responseTimeMs = round(($endTime - $startTime) * 1000)
- [ ] Get endpoint from $_SERVER['REQUEST_URI']
- [ ] Get method from $_SERVER['REQUEST_METHOD']
- [ ] Call EventLogger::logApiRequest()
- [ ] Pass endpoint, method, statusCode, responseTimeMs

- [ ] Auto-call startRequest() when file is included
- [ ] Add: `ApiLogger::startRequest();`

- [ ] Register shutdown function
- [ ] Call register_shutdown_function()
- [ ] In function, call ApiLogger::endRequest(http_response_code())

#### Module Detection Helper
- [ ] Add detectModule() method to ApiLogger
- [ ] Parse endpoint URL
- [ ] If contains '/inventory/' return 'inventory'
- [ ] If contains '/transactions/' return 'sales'
- [ ] If contains '/marketplace/' return 'marketplace'
- [ ] If contains '/admin/' return 'admin'
- [ ] If contains '/auth/' return 'auth'
- [ ] If contains '/reports/' return 'reports'
- [ ] If contains '/expenses/' return 'expenses'
- [ ] If contains '/customers/' return 'customers'
- [ ] If contains '/vendors/' return 'vendors'
- [ ] Default: return 'other'

- [ ] Update logApiRequest to include module
- [ ] Call detectModule() before logging
- [ ] Pass module to EventLogger::logApiRequest()
- [ ] Update EventLogger::logApiRequest() to accept $module parameter
- [ ] Update INSERT to include module column

#### Instrument Critical API Endpoints (Priority)
- [ ] List all API endpoint files to instrument
- [ ] Inventory APIs (5 files): create, read, update, delete, list
- [ ] Transaction APIs (2-3 files)
- [ ] Marketplace APIs (20+ files)
- [ ] Admin APIs (10+ files)
- [ ] Auth APIs (3 files)

- [ ] For each API file:
  - [ ] Open file
  - [ ] Add at top (after <?php): `require_once __DIR__ . '/../../middleware/api_logger.php';`
  - [ ] Or adjust path based on file depth
  - [ ] Ensure it's before any other logic
  - [ ] Save file
  - [ ] Test endpoint works
  - [ ] Check api_request_logs table for new entry
  - [ ] Verify response time logged
  - [ ] Verify module detected correctly

#### Instrument Inventory APIs
- [ ] `backend/api/inventory/create.php`
- [ ] `backend/api/inventory/read.php`
- [ ] `backend/api/inventory/update.php`
- [ ] `backend/api/inventory/delete.php`
- [ ] `backend/api/inventory/list.php` (if exists)

#### Instrument Transaction APIs
- [ ] `backend/api/transactions/create.php`
- [ ] `backend/api/transactions/read.php`
- [ ] Any other transaction endpoints

#### Instrument Marketplace APIs (sample - do all)
- [ ] `backend/api/marketplace/listings/create.php`
- [ ] `backend/api/marketplace/listings/read.php`
- [ ] `backend/api/marketplace/orders/create.php`
- [ ] Continue for all marketplace endpoints...

#### Instrument Admin APIs
- [ ] `backend/api/admin/dashboard_stats.php`
- [ ] `backend/api/admin/report.php`
- [ ] Continue for all admin endpoints...

#### Instrument Auth APIs
- [ ] `backend/api/auth/login.php`
- [ ] `backend/api/auth/register.php`
- [ ] `backend/api/auth/logout.php`

#### Day 4-5 Validation (2 days for instrumentation)
- [ ] All critical endpoints instrumented (30+ files minimum)
- [ ] Test 10 different endpoints
- [ ] Verify api_request_logs entries for each
- [ ] Response times accurate (compare with actual time)
- [ ] Modules detected correctly
- [ ] No performance degradation (<5ms overhead)
- [ ] Commit: `git add . && git commit -m "Day 4-5: API request logging middleware"`

---

### DAY 5: Testing & Validation

#### End-to-End Logging Test
- [ ] Generate test errors:
  - [ ] Trigger PHP warning
  - [ ] Throw exception
  - [ ] Call non-existent function (catch fatal)
- [ ] Verify all logged to application_errors
- [ ] Verify shop_id and tenant_id captured

#### API Logging Test
- [ ] Make 20 different API requests
- [ ] Use different endpoints
- [ ] Check api_request_logs table
- [ ] Verify 20 entries created
- [ ] Check response times are reasonable
- [ ] Verify module field populated

#### Activity Logging Test
- [ ] Call EventLogger::logActivity() 10 times
- [ ] Use different event types
- [ ] Check activity_logs table
- [ ] Verify JSON context stored correctly

#### Log File Rotation Test
- [ ] Check backend/logs/app.log exists
- [ ] Verify JSON format
- [ ] File should auto-rotate after 30 days (note for future)

#### Performance Test
- [ ] Benchmark API endpoint without logger
- [ ] Benchmark same endpoint with logger
- [ ] Calculate overhead
- [ ] Should be <5ms
- [ ] Document results

#### Database Query Check
- [ ] Run EXPLAIN on SELECT queries for logs
- [ ] Verify indexes being used
- [ ] Check query performance

#### Day 5 Validation Checklist
- [ ] All errors captured in database ✓
- [ ] Errors include shop_id and tenant_id ✓
- [ ] API requests logged ✓
- [ ] Response times accurate ✓
- [ ] Log files created ✓
- [ ] JSON format correct ✓
- [ ] No errors in PHP error log ✓
- [ ] No performance issues ✓
- [ ] Module detection works ✓
- [ ] Context data captured ✓

#### Phase 1 Complete
- [ ] Review all Day 1-5 tasks completed
- [ ] All tests passing
- [ ] Commit: `git add . && git commit -m "Phase 1 complete: Foundation and logging system"`
- [ ] Tag: `git tag phase-1-complete`

---

## PHASE 2: BACKGROUND WORKERS & ALERTING (WEEK 2)

### DAY 6: MetricsAggregator Worker ✅ COMPLETE

#### Create MetricsAggregator File
- [x] Create file: `backend/workers/metrics_aggregation_worker.php`
- [x] Comprehensive metrics aggregation implemented
- [x] Hourly and daily aggregation
- [x] Module-specific metrics
- [x] Error metrics tracking

#### Day 6 Validation
- [x] Worker works without errors
- [x] Metrics stored in metrics_hourly and metrics_daily tables
- [x] All metric types aggregated
- [x] Can run multiple times without duplicates (idempotent)
- [x] Execution time < 30 seconds
- [x] Commit: `git add . && git commit -m "Day 6: Metrics aggregation worker"`

---

### DAY 7: Alert System Worker ✅ COMPLETE

- [x] Created `backend/workers/alert_system_worker.php` (450+ lines)
- [x] Email notification system with PHPMailer
- [x] 4 alert types: high error rate, slow response, critical errors, high volume
- [x] Alert cooldown mechanism (60 min)
- [x] Alert history tracking in email_notifications table
- [x] Tested successfully
- [x] Commit: `git add . && git commit -m "Day 7: Alert system worker"`

---

### DAY 8: Data Retention Worker ✅ COMPLETE

- [x] Created `backend/workers/data_retention_worker.php` (400+ lines)
- [x] Configurable retention periods (30-365 days)
- [x] Transaction-based deletion (safe rollback)
- [x] Table optimization (OPTIMIZE TABLE)
- [x] Database size reporting
- [x] Cleanup statistics tracking
- [x] Tested successfully
- [x] Commit: `git add . && git commit -m "Day 8: Data retention worker"`

---

### DAY 9: Health Check Worker ✅ COMPLETE

- [x] Created `backend/workers/health_check_worker.php` (414 lines)
- [x] 6 health checks: database, tables, disk, workers, errors, API
- [x] Health score calculation (0-100%)
- [x] Issue detection with severity levels (critical/warning)
- [x] Automatic alerting for critical issues
- [x] Tested successfully (90% health score)
- [x] Commit: `git add . && git commit -m "Day 9: Health check worker"`

---

#### Create HealthScoreCalculator File
- [ ] Create file: `backend/workers/HealthScoreCalculator.php`
- [ ] Add PHP opening tag
- [ ] Require database
- [ ] Initialize connection

#### Get Active Tenants
- [ ] Query: SELECT id FROM tenants WHERE status = 'active'
- [ ] Loop through each tenant

#### Calculate Engagement Score (0-40 points)
- [ ] Create calculateEngagementScore($tenantId) function
- [ ] Login frequency (15 points):
  - [ ] Count logins in last 30 days
  - [ ] Award points based on frequency (e.g., >20 logins = 15pts)
- [ ] Active users percentage (10 points):
  - [ ] Count total users for tenant
  - [ ] Count active users (activity in last 7 days)
  - [ ] Calculate percentage
  - [ ] Award points (>80% = 10pts, scale down)
- [ ] Features used (15 points):
  - [ ] Query distinct modules/features used
  - [ ] Count unique features
  - [ ] Award points based on diversity (8+ features = 15pts)
- [ ] Return total engagement score

#### Calculate Value Score (0-30 points)
- [ ] Create calculateValueScore($tenantId) function  
- [ ] Transaction volume (10 points):
  - [ ] Count transactions in last 30 days
  - [ ] Compare to platform average
  - [ ] Award points
- [ ] Revenue growth (10 points):
  - [ ] Compare this month to last month
  - [ ] Positive growth = 10pts, scale for negative
- [ ] Inventory turnover (10 points):
  - [ ] Calculate turnover rate
  - [ ] Award points based on efficiency
- [ ] Return total value score

#### Calculate Data Quality Score (0-20 points)
- [ ] Create calculateDataQualityScore($tenantId) function
- [ ] Complete inventory records (10 points):
  - [ ] Count inventory items
  - [ ] Count items with all required fields filled
  - [ ] Calculate percentage
  - [ ] Award points (>90% = 10pts)
- [ ] Customer data completeness (10 points):
  - [ ] Similar calculation for customer records
  - [ ] Award points
- [ ] Return total quality score

#### Calculate Support Score (0-10 points)
- [ ] Create calculateSupportScore($tenantId) function
- [ ] Low error rate (5 points):
  - [ ] Count errors for tenant in last 30 days
  - [ ] Award points if low (<10 errors = 5pts)
- [ ] Few support tickets (5 points):
  - [ ] Count support tickets
  - [ ] Award points if low
- [ ] Return total support score

#### Categorize Health Score
- [ ] Create categorizeHealthScore($score) function
- [ ] If $score >= 90: return 'power_user'
- [ ] If $score >= 70: return 'healthy'
- [ ] If $score >= 50: return 'at_risk'
- [ ] Else: return 'churn_risk'

#### Store Health Scores
- [ ] For each tenant:
  - [ ] Calculate all 4 score components
  - [ ] Sum total health score
  - [ ] Categorize
  - [ ] INSERT INTO retailer_health_scores
  - [ ] All score components + total + category
  - [ ] calculated_at = NOW()

#### Create Alerts for At-Risk Tenants
- [ ] After calculating all scores
- [ ] Query tenants with category 'at_risk' or 'churn_risk'
- [ ] For each:
  - [ ] Create alert in system_alerts
  - [ ] type = 'retention', severity = 'warning'
  - [ ] message = "Tenant X is at risk (score: Y)"
  - [ ] details = JSON with score breakdown
  - [ ] Send email notification

#### Add Logging
- [ ] Echo: "Calculated health scores for X tenants"
- [ ] Echo: "Created Y retention alerts"
- [ ] Timestamp

#### Test HealthScoreCalculator
- [ ] Run manually: `php backend/workers/HealthScoreCalculator.php`
- [ ] Check retailer_health_scores table
- [ ] Verify scores calculated
- [ ] Verify categories assigned
- [ ] Check for retention alerts created

#### Day 8-9 Validation
- [ ] Health scores calculated for all active tenants
- [ ] All 4 components calculated correctly
- [ ] Categories assigned properly
- [ ] Alerts created for at-risk tenants
- [ ] Commit: `git add . && git commit -m "Day 8-9: HealthScoreCalculator worker"`

---

### DAY 10: Testing & Optimization (Phase 2 Complete) ✅ COMPLETE

#### Integration Testing
- [x] Created `backend/test_phase2_complete.php` integration test suite
- [x] Tested all 4 workers in sequence:
  - [x] Metrics Aggregation (verified hourly/daily data)
  - [x] Alert System (verified thresholds and cooldowns)
  - [x] Data Retention (verified cleanup of old data)
  - [x] Health Check (verified system health reporting)
- [x] Patched workers to prevent auto-execution on include

#### Cron Job Setup
- [x] Created `backend/workers/CRON_SETUP.md` with detailed instructions
- [x] Defined schedules:
  - [x] Metrics: Hourly at :00 (`0 * * * *`)
  - [x] Alerts: Hourly at :15 (`15 * * * *`)
  - [x] Retention: Daily at 2:00 AM (`0 2 * * *`)
  - [x] Health: Every 5 minutes (`*/5 * * * *`)
- [x] Verified cron commands work locally

#### Phase 2 Validation
- [x] All workers operational
- [x] Integration tests passed
- [x] Documentation updated
- [x] Commit: `git add . && git commit -m "Day 10: Testing & Optimization - Phase 2 Complete"`
- [x] Tag: `git tag phase-2-complete`

#### Phase 2 Complete
- [x] All workers operational
- [x] Email alerts working
- [ ] Cron jobs running
- [ ] 24-hour stability confirmed

---

## PHASE 3: SAAS METRICS BACKEND (WEEK 3)

### DAY 11: SaaS Database Tables

#### Create Migration File
- [x] Create file: `backend/sql/migrations/002_saas_metrics_tables.sql`
- [x] Add `USE store;` at top

#### Table 1: subscription_history
- [x] CREATE TABLE subscription_history
- [x] id INT AUTO_INCREMENT PRIMARY KEY
- [x] tenant_id INT NOT NULL
- [x] from_plan VARCHAR(50) NULL
- [x] to_plan VARCHAR(50) NOT NULL
- [x] from_mrr DECIMAL(10,2) NULL
- [x] to_mrr DECIMAL(10,2) NOT NULL
- [x] change_type ENUM('signup', 'upgrade', 'downgrade', 'cancellation', 'reactivation')
- [x] changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [x] notes TEXT
- [x] FOREIGN KEY (tenant_id) REFERENCES tenants(id)
- [x] INDEX idx_tenant (tenant_id)
- [x] INDEX idx_changed_at (changed_at)
- [x] ENGINE=InnoDB CHARSET=utf8mb4

#### Table 2: feature_usage
- [x] CREATE TABLE feature_usage
- [x] id BIGINT AUTO_INCREMENT PRIMARY KEY
- [x] tenant_id INT NOT NULL
- [x] shop_id INT
- [x] user_id INT NOT NULL
- [x] feature_name VARCHAR(50) NOT NULL (e.g., 'inventory', 'marketplace', 'pos')
- [x] action VARCHAR(50) NOT NULL (e.g., 'view', 'create', 'update', 'export')
- [x] created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [x] FOREIGN KEY (tenant_id) REFERENCES tenants(id)
- [x] INDEX idx_tenant_feature (tenant_id, feature_name)
- [x] INDEX idx_created_at (created_at)
- [x] ENGINE=InnoDB CHARSET=utf8mb4

#### Table 3: storage_metrics
- [x] CREATE TABLE storage_metrics
- [x] id INT AUTO_INCREMENT PRIMARY KEY
- [x] tenant_id INT NOT NULL
- [x] database_size_mb DECIMAL(10,2) NOT NULL
- [x] file_storage_mb DECIMAL(10,2) NOT NULL
- [x] total_records INT NOT NULL
- [x] measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [x] FOREIGN KEY (tenant_id) REFERENCES tenants(id)
- [x] INDEX idx_tenant_date (tenant_id, measured_at)
- [x] ENGINE=InnoDB CHARSET=utf8mb4

#### Table 4: retailer_health_scores
- [x] CREATE TABLE retailer_health_scores
- [x] id INT AUTO_INCREMENT PRIMARY KEY
- [x] tenant_id INT NOT NULL
- [x] health_score INT NOT NULL (0-100)
- [x] engagement_score INT NOT NULL (0-40)
- [x] value_score INT NOT NULL (0-30)
- [x] data_quality_score INT NOT NULL (0-20)
- [x] support_score INT NOT NULL (0-10)
- [x] category ENUM('power_user', 'healthy', 'at_risk', 'churn_risk')
- [x] calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [x] FOREIGN KEY (tenant_id) REFERENCES tenants(id)
- [x] INDEX idx_tenant (tenant_id)
- [x] INDEX idx_category (category)
- [x] INDEX idx_calculated_at (calculated_at)
- [x] ENGINE=InnoDB CHARSET=utf8mb4

#### Table 5: inventory_update_log
- [x] CREATE TABLE inventory_update_log
- [x] id BIGINT AUTO_INCREMENT PRIMARY KEY
- [x] tenant_id INT NOT NULL
- [x] shop_id INT NOT NULL
- [x] inventory_id INT NOT NULL
- [x] action ENUM('create', 'update', 'delete', 'status_change')
- [x] changed_fields JSON
- [x] updated_by INT NOT NULL (user_id)
- [x] created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [x] FOREIGN KEY (tenant_id) REFERENCES tenants(id)
- [x] INDEX idx_tenant_date (tenant_id, created_at)
- [x] ENGINE=InnoDB CHARSET=utf8mb4

#### Update tenants table
- [x] ALTER TABLE tenants ADD COLUMN subscription_plan ENUM('trial', 'basic', 'pro', 'enterprise') DEFAULT 'trial';
- [x] ALTER TABLE tenants ADD COLUMN mrr DECIMAL(10,2) DEFAULT 0.00;
- [x] ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP NULL;
- [x] ALTER TABLE tenants ADD COLUMN cancelled_at TIMESTAMP NULL;
- [x] ALTER TABLE tenants ADD COLUMN cancellation_reason TEXT;

#### Update transactions table (optional commission)
- [x] ALTER TABLE transactions ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Platform commission %';
- [x] ALTER TABLE transactions ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0.00;
- [x] ALTER TABLE transactions ADD COLUMN is_trade_in TINYINT(1) DEFAULT 0;

#### Run Migration
- [x] Import via phpMyAdmin or mysql CLI
- [x] Verify 5 new tables created
- [x] Verify tenants table updated
- [x] Verify transactions table updated

#### Test Tables
- [x] Insert test row into each new table
- [x] Select to verify
- [x] Delete test rows

#### Day 11 Validation
- [x] All 5 new tables exist
- [x] tenants table has new columns
- [x] transactions table has commission columns
- [x] All foreign keys working
- [x] All indexes created
- [x] Commit: `git add . && git commit -m "Day 11: SaaS metrics database tables"`

---

### DAY 12: Tenant Management APIs

#### Create Tenants Management API File
- [ ] Create file: `backend/api/superadmin/tenants_management.php`
- [ ] Add PHP opening tag
- [ ] Set CORS headers (using existing setCorsHeaders() function)
- [ ] Start session
- [ ] Check role (superadmin only)
- [ ] Get action parameter

#### Action: list
- [ ] Get query parameters: status, plan, page (default 1), per_page (default 50)
- [ ] Build WHERE clause based on filters
- [ ] Add search if name/email provided
- [ ] Prepare SELECT query with pagination
- [ ] Join with shops and users to get counts
- [ ] Execute query
- [ ] Get total count for pagination
- [ ] Return JSON with:
  - [ ] success: true
  - [ ] data.tenants: array of tenant objects
  - [ ] data.pagination: { page, total, per_page, total_pages }
  - [ ] data.stats: { total, active, trial, suspended }

#### Action: detail
- [ ] Get tenant ID from query
- [ ] Query tenant by ID
- [ ] Get related data:
  - [ ] Shop count
  - [ ] User count
  - [ ] Recent activity (last 10 actions)
  - [ ] Latest health score
  - [ ] Subscription history
- [ ] Return JSON with full tenant details

#### Action: update_status
- [ ] Get tenant ID and new status from POST
- [ ] Validate status (active, suspended, cancelled)
- [ ] Update tenants table
- [ ] If suspending:
  - [ ] Log action
  - [ ] Could disable all user sessions
- [ ] If cancelling:
  - [ ] Set cancelled_at = NOW()
  - [ ] Log cancellation_reason if provided
- [ ] Return success JSON

#### Action: update_plan
- [ ] Get tenant ID, new plan, new MRR from POST
- [ ] Get current plan and MRR
- [ ] Determine change_type (upgrade/downgrade)
- [ ] Update tenants table (plan and MRR)
- [ ] INSERT INTO subscription_history
  - [ ] from_plan, to_plan
  - [ ] from_mrr, to_mrr
  - [ ] change_type
- [ ] Return success JSON

#### Action: impersonate  
- [ ] Get tenant ID from POST
- [ ] Get tenant details
- [ ] Create impersonation session:
  - [ ] Store original superadmin session
  - [ ] Switch session to tenant's first admin user
  - [ ] Set flag: is_impersonating = true
  - [ ] Store original_user_id
- [ ] Return success with redirect URL
- [ ] (Frontend will redirect to admin dashboard)

#### Add Error Handling
- [ ] Wrap in try-catch
- [ ] Return appropriate HTTP status codes
- [ ] Return error messages in JSON

#### Test All Actions
- [ ] Test list action with different filters
- [ ] Test detail action
- [ ] Test update_status (suspend a test tenant)
- [ ] Test update_plan (upgrade a test tenant)
- [ ] Check subscription_history table
- [ ] Test impersonate (verify session switch)
- [ ] Revert test changes

#### Day 12 Validation
- [ ] All 5 actions implemented
- [ ] Pagination works correctly
- [ ] Filters work (status, plan)
- [ ] Subscription history logged
- [ ] Impersonate creates secure session
- [ ] Error handling works
- [ ] Returns proper HTTP status codes
- [ ] Commit: `git add . && git commit -m "Day 12: Tenant management APIs"`

---

[Continuing with Days 13-30... Due to length limits, I'll create this as Part 1. Should I continue with the remaining days?]

---

## 📊 Progress Tracker

**Current Progress:**
- Days Completed: 10 / 30 (33%)
- Tasks Completed: ~150 / ~450
- Current Phase: Phase 3 - Frontend (Starting)

**Next Task:** Day 11 - Dashboard Layout & Navigation

---

**This is Part 1 of the Complete Execution Task List**
**Remaining: Days 13-30 to be added in continuation**

Would you like me to continue with the remaining 18 days (Days 13-30)?
