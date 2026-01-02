# SuperAdmin Monitoring System - Architecture Overview

## 🎯 The 4 Health Pillars Framework

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPERADMIN DASHBOARD                              │
│                   (React + Vite Frontend)                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
        ┌───────────▼───┐  ┌────▼─────┐  ┌──▼──────────┐
        │ SYSTEM HEALTH │  │ USER     │  │ ERROR       │  
        │               │  │ HEALTH   │  │ HEALTH      │
        │ • Uptime      │  │ • DAU    │  │ • Error     │
        │ • Latency     │  │ • MAU    │  │   Rate      │
        │ • Throughput  │  │ • Churn  │  │ • Stack     │
        │ • Resources   │  │ • Session│  │   Traces    │
        │               │  │   Time   │  │ • Affected  │
        └───────────────┘  └──────────┘  │   Users     │
                                          └─────────────┘
        ┌────────────────────┐
        │  BUSINESS HEALTH   │
        │                    │
        │  • Revenue         │
        │  • Transactions    │
        │  • Inventory       │
        │  • Profit Margins  │
        └────────────────────┘
```

---

## 📊 Data Flow Architecture

```
┌─────────────────────┐
│ APPLICATION CODE    │
│ (PHP Backend +      │
│  React Frontend)    │
└──────────┬──────────┘
           │
           │ Events, Errors, API Calls
           │
┌──────────▼──────────┐
│  EVENT LOGGER       │
│  (Monolog PSR-3)    │
│                     │
│  • activity_logs    │
│  • application_     │
│    errors           │
│  • api_request_     │
│    logs             │
│  • security_logs    │
└──────────┬──────────┘
           │
           │ Raw event data (JSON)
           │
┌──────────▼──────────────────────┐
│     MySQL DATABASE (store)      │
│                                  │
│  Tables:                         │
│  • activity_logs                 │
│  • application_errors (NEW)      │
│  • api_request_logs (NEW)        │
│  • security_logs                 │
│  • system_alerts                 │
│  • system_metrics                │
│  • metrics_hourly (NEW)          │
│  • metrics_daily (NEW)           │
│  • email_notifications (NEW)     │
└──────────┬──────────────────────┘
           │
           │ Scheduled queries
           │
┌──────────▼──────────────────────┐
│   BACKGROUND WORKERS (Cron)     │
│                                  │
│  1. MetricsAggregator.php       │
│     (Every 5 minutes)           │
│     • Count requests/errors     │
│     • Calculate avg latency     │
│     • Aggregate business KPIs   │
│                                  │
│  2. AlertProcessor.php          │
│     (Every 1 minute)            │
│     • Check thresholds          │
│     • Create alerts             │
│     • Send email notifications  │
│                                  │
│  3. LogCleaner.php              │
│     (Daily at 2 AM)             │
│     • Archive old logs          │
│     • Delete expired cache      │
└──────────┬──────────────────────┘
           │
           │ Aggregated metrics
           │
┌──────────▼──────────────────────┐
│   SUPERADMIN REST APIs          │
│                                  │
│  GET /superadmin/health         │
│  GET /superadmin/metrics        │
│  GET /superadmin/alerts         │
│  GET /superadmin/logs           │
│  GET /superadmin/dashboards/*   │
└──────────┬──────────────────────┘
           │
           │ JSON responses
           │
┌──────────▼──────────────────────┐
│   REACT DASHBOARD               │
│   (React Query + Chart.js)      │
│                                  │
│  Pages:                          │
│  • Overview Dashboard           │
│  • System Health                │
│  • User Health                  │
│  • Error Health                 │
│  • Business Health              │
│  • Alerts Management            │
│  • Logs Explorer                │
└──────────────────────────────────┘
```

---

## 🔍 What Gets Logged

### 1. Every User Action (activity_logs)
```json
{
  "user_id": 42,
  "action": "user.login",
  "tenant_id": 5,
  "ip_address": "192.168.1.100",
  "timestamp": "2026-01-03T14:35:12Z"
}
```

### 2. Every Error (application_errors)
```json
{
  "error_level": "critical",
  "error_type": "DatabaseException",
  "error_message": "Connection refused",
  "file": "/backend/config/database.php",
  "line": 23,
  "stack_trace": "...",
  "user_id": 42,
  "timestamp": "2026-01-03T14:35:12Z"
}
```

### 3. Every API Request (api_request_logs)
```json
{
  "endpoint": "/api/inventory/read.php",
  "method": "GET",
  "status_code": 200,
  "response_time_ms": 45,
  "user_id": 42,
  "is_error": false,
  "timestamp": "2026-01-03T14:35:12Z"
}
```

### 4. Every Sale (transactions table - already exists)

### 5. Every Security Event (security_logs - already exists)

---

## ⚙️ Background Workers - What They Do

### MetricsAggregator.php (Every 5 minutes)

**Input**: Raw logs from last hour  
**Output**: Aggregated metrics in `metrics_hourly` table

**Calculations:**
```
For each hour:
  • Total API requests
  • Average response time per endpoint
  • Error count by type
  • Active user count
  • Total revenue
  • Total sales
  • Inventory turnover rate
```

**Why?** So dashboards load instantly (query pre-aggregated data, not millions of log rows)

---

### AlertProcessor.php (Every 1 minute)

**Checks:**
```
IF error_rate > 5% in last 10 mins THEN
  CREATE alert (severity: critical)
  SEND email to superadmin

IF api_latency_p95 > 1000ms THEN
  CREATE alert (severity: warning)
  SEND email to superadmin

IF revenue_today < 70% of 7-day average THEN
  CREATE alert (severity: warning)
  SEND email to superadmin

IF disk_usage > 85% THEN
  CREATE alert (severity: critical)
  SEND email to superadmin
```

**Why?** Proactive alerts catch issues before users complain

---

### LogCleaner.php (Daily at 2 AM)

**Tasks:**
```
DELETE FROM api_request_logs WHERE created_at < NOW() - INTERVAL 90 DAY
DELETE FROM application_errors WHERE created_at < NOW() - INTERVAL 180 DAY
DELETE FROM system_metrics WHERE expires_at < NOW()
```

**Why?** Prevent database bloat, maintain performance

---

## 📈 Sample Dashboard Metrics

### System Health Dashboard
```
┌─────────────────────────────────────────┐
│  API Response Time (p95)                │
│  ████████████░░░░░░░░  450ms  ✅        │
│                                          │
│  Requests/Second                         │
│  ████████████████████  25 req/s  ✅     │
│                                          │
│  Error Rate                              │
│  ██░░░░░░░░░░░░░░░░░░  0.8%  ✅        │
│                                          │
│  Database Connections                    │
│  ████████░░░░░░░░░░░░  40/100  ✅       │
└─────────────────────────────────────────┘

Chart: API Response Time (Last 24 Hours)
 ms
1000│                    
 800│              ╱╲    
 600│         ╱╲  ╱  ╲   
 400│        ╱  ╲╱    ╲  
 200│╲      ╱          ╲ 
   0└─────────────────────
    0h  6h  12h  18h  24h
```

### User Health Dashboard
```
┌─────────────────────────────────────────┐
│  Daily Active Users (DAU)               │
│  ████████████████████  452 users  ✅    │
│                                          │
│  Monthly Active Users (MAU)             │
│  ████████████████████  2,341 users ✅   │
│                                          │
│  Average Session Duration               │
│  ████████████████████  18 mins  ✅      │
│                                          │
│  User Retention (7-day)                 │
│  ████████████████░░░░  78%  ✅          │
└─────────────────────────────────────────┘

Chart: Active Users Trend (Last 30 Days)
users
 600│                 ╱╲ 
 500│            ╱╲  ╱  ╲
 400│       ╱╲  ╱  ╲╱    
 300│  ╱╲  ╱  ╲╱         
 200│ ╱  ╲╱              
 100└────────────────────
    D1    D10   D20   D30
```

### Error Health Dashboard
```
┌─────────────────────────────────────────┐
│  Total Errors (Last 24h)                │
│  ██░░░░░░░░░░░░░░░░░░  12 errors  ✅    │
│                                          │
│  Error Rate                              │
│  ██░░░░░░░░░░░░░░░░░░  0.8%  ✅        │
│                                          │
│  Critical Errors                         │
│  ░░░░░░░░░░░░░░░░░░░░  0  ✅            │
│                                          │
│  Most Common Error                       │
│  ValidationException: Invalid IMEI       │
└─────────────────────────────────────────┘

Top Errors:
1. ValidationException (8 occurrences)
2. DatabaseTimeout (3 occurrences)
3. NotFoundError (1 occurrence)
```

### Business Health Dashboard
```
┌─────────────────────────────────────────┐
│  Revenue Today                           │
│  ₦ 1,250,000  ⬆ +15% vs yesterday       │
│                                          │
│  Transactions Today                      │
│  47 sales  ⬆ +8% vs yesterday           │
│                                          │
│  Profit Margin                           │
│  24%  ⬇ -2% vs last week                │
│                                          │
│  Outstanding Debt                        │
│  ₦ 850,000  ⬆ +5% vs last week  ⚠️     │
└─────────────────────────────────────────┘

Chart: Revenue Trend (Last 30 Days)
  ₦M
 2.0│                 ╱╲ 
 1.5│            ╱╲  ╱  ╲
 1.0│       ╱╲  ╱  ╲╱    
 0.5│  ╱╲  ╱  ╲╱         
 0.0└────────────────────
    D1    D10   D20   D30
```

---

## 🚨 Alert Workflow

```
1. Background Worker Detects Issue
   ↓
2. Create Alert in DB (system_alerts table)
   ↓
3. EmailNotifier sends email
   ↓
4. Email logged in email_notifications table
   ↓
5. SuperAdmin receives email
   ↓
6. SuperAdmin views alert in dashboard
   ↓
7. SuperAdmin marks alert as resolved
```

**Sample Alert Email:**
```
Subject: [CRITICAL] High Error Rate Detected

Hello SuperAdmin,

A critical alert has been triggered:

Alert Type: High Error Rate
Severity: CRITICAL
Triggered At: 2026-01-03 14:35:12

Details:
- Error rate: 8.2% (threshold: 5%)
- Total errors in last 10 minutes: 42
- Most common error: Database connection timeout (25 occurrences)
- Affected users: 12

Action Required:
Please investigate the database connection issues immediately.

View full details: https://admin.prhub.shop/alerts/152
```

---

## 🛠️ Technical Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + Vite | Dashboard UI |
| | Chart.js/Recharts | Data visualization |
| | React Query | Data fetching & caching |
| | TailwindCSS | Styling |
| **Backend** | PHP 8.x | Business logic |
| | Monolog (PSR-3) | Structured logging |
| | PHPMailer | Email alerts |
| | Cron Jobs | Background workers |
| **Database** | MySQL (MariaDB) | Data storage |
| **Infrastructure** | XAMPP/Apache | Local development |
| | Production Server | Hosting (prhub.shop) |

---

## 📦 What You Need to Install

```bash
# 1. Monolog via Composer
cd /Applications/XAMPP/xamppfiles/htdocs/store/backend
composer require monolog/monolog

# 2. PHPMailer (if not already installed)
composer require phpmailer/phpmailer

# 3. No other dependencies needed!
```

---

## ⏱️ Implementation Timeline

```
Week 1: Foundation
├── Day 1-2: Install Monolog, Create EventLogger, Add error handlers
├── Day 3-4: Create new database tables, Test logging
└── Day 5: Instrument 10-20 key API endpoints with logging

Week 2: Automation
├── Day 1-2: Build MetricsAggregator worker
├── Day 3: Build AlertProcessor worker
├── Day 4: Build EmailNotifier, Test email alerts
└── Day 5: Set up cron jobs, Monitor for 24 hours

Week 3: APIs
├── Day 1-2: Create new SuperAdmin API endpoints
├── Day 3-4: Enhance existing system_insights.php API
└── Day 5: Test all APIs, Optimize queries

Week 4: Dashboard UI
├── Day 1: Build Overview Dashboard (4 health pillars)
├── Day 2: Build System Health page
├── Day 3: Build User Health page
├── Day 4: Build Error Health page
└── Day 5: Build Business Health page

Week 5: Polish & Deploy
├── Day 1-2: Build Alerts Management page
├── Day 3: Build Logs Explorer page
├── Day 4: Testing, bug fixes, performance optimization
└── Day 5: Production deployment, monitoring
```

**Total Time**: 5 weeks (full-time development)  
**MVP (Minimum Viable Product)**: Weeks 1-3 (logging + workers + basic dashboard)

---

## ✅ Success Criteria

After implementation, you should be able to:

1. ✅ View real-time system health status (green/yellow/red)
2. ✅ Track every API request and response time
3. ✅ Get email alerts within 2 minutes of critical errors
4. ✅ See which users are active vs inactive
5. ✅ Identify which endpoints are slowest
6. ✅ Track revenue, sales, profit trends in real-time
7. ✅ View error logs with full stack traces
8. ✅ Export logs for compliance/audit purposes
9. ✅ Detect anomalies (revenue drop, error spike) automatically
10. ✅ Retain 90 days of historical data for analysis

---

## 🎓 Key Concepts Explained

### What is Structured Logging?
**Before (Unstructured):**
```
User john_doe logged in from 192.168.1.100
```

**After (Structured JSON):**
```json
{
  "event": "user.login",
  "user_id": 42,
  "username": "john_doe",
  "ip": "192.168.1.100",
  "timestamp": "2026-01-03T14:35:12Z"
}
```

**Why?** Easy to query, filter, analyze programmatically

---

### What is Metrics Aggregation?
**Instead of:**
```sql
SELECT AVG(response_time_ms) FROM api_request_logs WHERE created_at > NOW() - INTERVAL 24 HOUR
-- Scans 100,000 rows, takes 5 seconds
```

**Use pre-aggregated:**
```sql
SELECT metric_value FROM metrics_hourly WHERE metric_type = 'avg_response_time' AND hour_timestamp = '2026-01-03 14:00:00'
-- Returns immediately, <10ms
```

**Why?** Dashboards load instantly, even with millions of log entries

---

### What are the Four Golden Signals?
From Google's Site Reliability Engineering (SRE) book:

1. **Latency** - How long do requests take?
2. **Traffic** - How much demand is there?
3. **Errors** - What's failing?
4. **Saturation** - How full are your resources?

**We expanded this to 4 Health Pillars:**
- System Health (Latency + Saturation)
- User Health (Traffic + Engagement)
- Error Health (Errors + Impact)
- Business Health (Revenue + KPIs)

---

## 🔗 Related Files

- **Full Plan**: `.agent/SUPERADMIN_MONITORING_IMPLEMENTATION_PLAN.md`
- **Quick Start**: `.agent/MONITORING_QUICK_START.md`
- **Existing Monitor Classes**: `backend/classes/*Monitor.php`
- **Existing API**: `backend/api/superadmin/system_insights.php`

---

## 🚀 Ready to Start?

**Next Steps:**
1. Review this architecture document
2. Read the Quick Start Guide (`.agent/MONITORING_QUICK_START.md`)
3. Decide which phase to start with
4. Ask me to create the first file (e.g., "Create EventLogger.php")

**Questions to Ask Me:**
- "Create the EventLogger class"
- "Write the database migration SQL"
- "Build the MetricsAggregator worker"
- "Show me how to instrument an API endpoint"
- "Create the React dashboard overview page"

I'm ready to help you build this! 🎯
