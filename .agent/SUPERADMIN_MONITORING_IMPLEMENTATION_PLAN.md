# SuperAdmin Monitoring & Logging System - Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation strategy for enhancing the SuperAdmin role with a production-grade monitoring, logging, alerting, and visualization system for the Phone Retailer Management System. The system will track **4 Core Health Pillars**: System Health, User Health, Error Health, and Business Health.

**Current State Assessment:**
- ✅ **Foundation Exists**: Basic monitoring classes, activity logging, security logs, system alerts
- ✅ **Database Schema**: Tables for activity_logs, security_logs, system_alerts, system_metrics
- ✅ **Monitor Classes**: PerformanceMonitor, SecurityMonitor, BusinessMetrics, DatabaseHealth, AlertManager, AuditCompliance, VulnerabilityScanner, SystemResources
- ⚠️ **Gaps**: No real-time metrics aggregation, limited error tracking, no automated alerting via email, no background workers, visualization layer needs enhancement

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [The 4 Core Health Pillars](#the-4-core-health-pillars)
3. [Technology Stack](#technology-stack)
4. [Implementation Phases](#implementation-phases)
5. [Database Schema Enhancements](#database-schema-enhancements)
6. [Logging System](#logging-system)
7. [Metrics Aggregation](#metrics-aggregation)
8. [Alerting System](#alerting-system)
9. [Visualization Layer](#visualization-layer)
10. [Background Workers](#background-workers)
11. [API Endpoints](#api-endpoints)
12. [Frontend Components](#frontend-components)
13. [Performance Considerations](#performance-considerations)
14. [Security Considerations](#security-considerations)
15. [Deployment Strategy](#deployment-strategy)

---

## System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     SuperAdmin Dashboard                      │
│  (React + Vite - Real-time Monitoring Visualization)        │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ WebSocket (Real-time) + REST APIs (Historical)
             │
┌────────────▼─────────────────────────────────────────────────┐
│                     PHP Backend Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Endpoints (REST)                                 │   │
│  │  - /superadmin/health                                │   │
│  │  - /superadmin/metrics                               │   │
│  │  - /superadmin/alerts                                │   │
│  │  - /superadmin/logs                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Monitor Classes (Already Exist - Enhance)          │   │
│  │  - PerformanceMonitor, SecurityMonitor               │   │
│  │  - BusinessMetrics, DatabaseHealth                   │   │
│  │  - SystemResources, AlertManager                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Event Logger (New - PSR-3 Compliant)               │   │
│  │  - Structured JSON logging                          │   │
│  │  - Context enrichment                               │   │
│  │  - Log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)│   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ Writes metrics, events, logs
             │
┌────────────▼─────────────────────────────────────────────────┐
│                  MySQL Database (store)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Core Tables (Existing)                              │   │
│  │  - activity_logs, security_logs                      │   │
│  │  - system_alerts, system_metrics                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  New Tables (To Add)                                 │   │
│  │  - application_errors                                │   │
│  │  - api_request_logs                                  │   │
│  │  - metrics_aggregations (hourly, daily, weekly)     │   │
│  │  - email_notifications                               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────▲─────────────────────────────────────────────────┘
             │
             │ Reads data, aggregates metrics
             │
┌────────────┴─────────────────────────────────────────────────┐
│              Background Workers (Cron Jobs)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MetricsAggregator.php (Every 5 mins)               │   │
│  │  - Aggregate activity counts                        │   │
│  │  - Calculate API response time averages             │   │
│  │  - Compute error rates                               │   │
│  │  - Update business KPIs                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AlertProcessor.php (Every 1 min)                   │   │
│  │  - Check thresholds (error rate, latency, etc.)     │   │
│  │  - Trigger email alerts                              │   │
│  │  - Auto-resolve stale alerts                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LogCleaner.php (Daily at 2 AM)                     │   │
│  │  - Archive old logs (>90 days)                      │   │
│  │  - Clean up expired metrics cache                    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Application Code → Event Logger → MySQL
                                     ↓
                             (Structured JSON)
                                     ↓
                         ┌───────────┴────────────┐
                         │                        │
                    Background Workers      SuperAdmin API
                         │                        │
                  Aggregate Metrics         Query & Serve
                         │                        │
                    MySQL (metrics_*)      React Dashboard
                         │                        │
                    Alert Checker          Real-time Charts
                         │
                    Email Alerts
```

---

## The 4 Core Health Pillars

### 1. **System Health** - Is the app alive and fast?

**Key Metrics:**
- **Uptime**: Server uptime, application availability
- **Response Time**: API endpoint latency (p50, p95, p99)
- **Throughput**: Requests per second (RPS)
- **Resource Usage**: CPU, memory, disk I/O
- **Database Performance**: Query time, connection pool usage
- **Error Rate**: 5xx/4xx errors from server

**Data Sources:**
- `api_request_logs` (new table - log every API call)
- `system_resources` class (enhance to track over time)
- `database_statistics` (enhance DatabaseHealth class)

**Alerts:**
- API latency > 1000ms for 5 consecutive minutes
- Error rate > 5% in last 10 minutes
- Disk usage > 85%
- CPU usage > 90% for 5+ minutes

---

### 2. **User Health** - Are users active, stuck, or leaving?

**Key Metrics:**
- **Active Users**: DAU (Daily Active Users), MAU (Monthly Active Users)
- **Session Duration**: Average session length
- **Stale Users**: Users inactive for >30 days
- **User Retention**: % of users returning after 7 days
- **Feature Adoption**: Which features are used most
- **Login Frequency**: Logins per user per day/week
- **User Journey**: Where do users drop off?

**Data Sources:**
- `activity_logs` (existing - enhance with session tracking)
- `sessions` (existing)
- `users` table (enhance with last_active_at)

**Alerts:**
- DAU drops by >20% compared to 7-day average
- >30% of users inactive for 30+ days
- Average session duration drops by >50%

---

### 3. **Error Health** - What's breaking, where, and for who?

**Key Metrics:**
- **Error Count**: Total errors per hour/day
- **Error Rate**: Errors per 1000 requests
- **Error Types**: 
  - PHP Fatal Errors
  - Uncaught Exceptions
  - Database Errors
  - API Client Errors (400s)
  - API Server Errors (500s)
- **Error Locations**: Which endpoints/files are failing
- **Affected Users**: Who is experiencing errors (user_id, role, **shop_id, tenant_id**)
- **Error Trends**: Are errors increasing or decreasing?

**Data Sources:**
- `application_errors` (NEW table - structured error logging)
- `security_logs` (existing - for failed logins)
- `api_request_logs` (NEW - for API errors)

**Alerts:**
- Critical error (PHP fatal, DB connection failure)
- Error rate > 2% in last 5 minutes
- Same error repeated >10 times in 1 minute
- Any user experiencing >5 errors in succession

**Implementation:**
- Custom error handler: `set_error_handler()`, `set_exception_handler()`
- Log all errors with context: user_id, request_path, stack trace
- Frontend: Error boundary in React to capture client-side errors

---

### 4. **Business Health** - Is the product actually succeeding?

**Key Metrics:**
- **Revenue**: Daily/weekly/monthly revenue
- **Transactions**: Total sales, average transaction value
- **Inventory Turnover**: How fast is inventory selling
- **Profit Margins**: Gross profit, net profit
- **Customer Metrics**:
  - New customers vs returning
  - Customer lifetime value (CLV)
  - Customer acquisition cost (CAC)
- **Marketplace Metrics** (specific to your app):
  - Active listings
  - Order completion rate
  - Average order value
  - Seller/buyer ratio
  - **Dispute resolution**: Reports filed, resolution time, dispute outcomes (buyer/seller wins)
  - **Cancellation tracking**: Order cancellations by reason, cancellation rate trends
- **Debt Recovery**: Outstanding debt, payment collection rate

**Data Sources:**
- `transactions` (existing)
- `inventory` (existing)
- `marketplace_orders` (existing)
- `debts`, `debt_payments` (existing)
- `customer_analytics` (existing)

**Alerts:**
- Daily revenue drops >30% compared to 7-day average
- Inventory value drops below critical threshold
- Debt collection rate < 70% for the month
- Marketplace order cancellation rate > 15%

---

## Technology Stack

### Backend
- **PHP 8.x**: Core backend logic
- **MySQL (MariaDB)**: Database (existing: `store`)
- **Monolog** (PSR-3): Structured logging library (NEW - install via Composer)
- **PHPMailer**: Email notifications for alerts (may already exist)
- **Cron Jobs**: Background workers via crontab

### Frontend (SuperAdmin Dashboard)
- **React + Vite**: Already in use
- **Chart.js** or **Recharts**: For data visualization
- **React Query**: Data fetching and caching
- **WebSockets** (**Required**): For real-time updates (using Ratchet PHP WebSocket library or Node.js bridge)
- **TailwindCSS**: Existing styling

### Infrastructure
- **Crontab**: Schedule background workers
- **Supervisor** (optional): Manage long-running PHP workers
- **Multi-Environment Support**: 
  - Development: XAMPP (localhost)
  - Production: prhub.shop, administration.prhub.shop
  - **Environment-aware configuration** (database, SMTP, API URLs)
  - **CI/CD Pipeline Ready** (GitHub Actions deployment)

---

## Implementation Phases

### **Phase 1: Enhanced Logging System** (Week 1)
**Goal**: Capture ALL application events in a structured, queryable format

**Tasks:**
1. Install Monolog via Composer
2. Create `EventLogger` class that wraps Monolog
3. Log ALL critical events:
   - User logins, logouts, role changes
   - Every API request (endpoint, method, status code, response time, user_id)
   - Every sale transaction
   - Every marketplace order
   - All errors (exceptions, PHP errors, validation errors)
4. Enhance existing `logActivity()` helper to include more context
5. Add custom error handlers (`set_error_handler`, `set_exception_handler`)
6. Frontend: Add error boundary in React to log client-side errors to backend

**Deliverables:**
- `backend/helpers/EventLogger.php`
- `backend/helpers/error_handlers.php`
- Updated logging across all API endpoints
- Frontend error boundary component

---

### **Phase 2: Database Schema Enhancements** (Week 1)
**Goal**: Add tables to store structured logs, API metrics, error details

**New Tables:**

```sql
-- Detailed application error logs
CREATE TABLE `application_errors` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` INT(11) DEFAULT NULL,
  `user_id` INT(11) DEFAULT NULL,
  `error_level` ENUM('warning', 'error', 'critical') NOT NULL,
  `error_type` VARCHAR(50) NOT NULL COMMENT 'Exception type or error category',
  `error_message` TEXT NOT NULL,
  `error_code` VARCHAR(20) DEFAULT NULL,
  `file_path` VARCHAR(500) DEFAULT NULL,
  `line_number` INT(11) DEFAULT NULL,
  `stack_trace` TEXT DEFAULT NULL,
  `request_url` VARCHAR(500) DEFAULT NULL,
  `request_method` ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `context` JSON DEFAULT NULL COMMENT 'Additional context data',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_error_level` (`error_level`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API request logs for performance tracking
CREATE TABLE `api_request_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` INT(11) DEFAULT NULL,
  `user_id` INT(11) DEFAULT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `http_method` ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
  `status_code` INT(11) NOT NULL,
  `response_time_ms` INT(11) NOT NULL COMMENT 'Response time in milliseconds',
  `request_size_bytes` INT(11) DEFAULT NULL,
  `response_size_bytes` INT(11) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `is_error` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_endpoint` (`endpoint`(255)),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_error` (`is_error`),
  INDEX `idx_status_code` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pre-aggregated metrics for fast dashboard queries
CREATE TABLE `metrics_hourly` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `hour_timestamp` TIMESTAMP NOT NULL,
  `metric_type` VARCHAR(50) NOT NULL COMMENT 'e.g., api_requests, errors, logins, sales',
  `metric_value` DECIMAL(20, 2) NOT NULL,
  `count` INT(11) DEFAULT 0,
  `metadata` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_hour_metric` (`hour_timestamp`, `metric_type`),
  INDEX `idx_metric_type` (`metric_type`),
  INDEX `idx_hour_timestamp` (`hour_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `metrics_daily` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `metric_type` VARCHAR(50) NOT NULL,
  `metric_value` DECIMAL(20, 2) NOT NULL,
  `count` INT(11) DEFAULT 0,
  `metadata` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date_metric` (`date`, `metric_type`),
  INDEX `idx_metric_type` (`metric_type`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email notification logs
CREATE TABLE `email_notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `recipient_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `body` TEXT NOT NULL,
  `notification_type` ENUM('alert', 'report', 'system') DEFAULT 'alert',
  `status` ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  `sent_at` TIMESTAMP NULL DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Deliverables:**
- `backend/sql/migrations/monitoring_schema.sql`
- Run migration on development database

---

### **Phase 3: Metrics Aggregation Workers** (Week 2)
**Goal**: Background jobs that calculate metrics from raw logs

**Background Workers (PHP Cron Jobs):**

**3.1 - `MetricsAggregator.php` (Runs every 5 minutes)**

Aggregates:
- API request counts per endpoint
- Average response times
- Error counts and rates
- Active user counts
- Business metrics (sales, revenue, transactions)

Stores results in `metrics_hourly` and `metrics_daily`

**3.2 - `AlertProcessor.php` (Runs every 1 minute)**

Checks thresholds:
- Error rate > 5%
- API latency > 1000ms
- Disk usage > 85%
- Revenue drop > 30%
- Failed login attempts > 10 in 10 mins

Creates alerts in `system_alerts` table
Sends email notifications via `EmailNotifier` class

**3.3 - `LogCleaner.php` (Runs daily at 2 AM)**

- Archives `api_request_logs` older than 90 days
- Deletes `application_errors` older than 180 days
- Cleans expired `system_metrics` cache

**Crontab Configuration:**
```bash
# Metrics Aggregation every 5 minutes
*/5 * * * * /usr/bin/php /path/to/backend/workers/MetricsAggregator.php >> /var/log/metrics_aggregator.log 2>&1

# Alert Processing every 1 minute
* * * * * /usr/bin/php /path/to/backend/workers/AlertProcessor.php >> /var/log/alert_processor.log 2>&1

# Log Cleanup daily at 2 AM
0 2 * * * /usr/bin/php /path/to/backend/workers/LogCleaner.php >> /var/log/log_cleaner.log 2>&1
```

**Deliverables:**
- `backend/workers/MetricsAggregator.php`
- `backend/workers/AlertProcessor.php`
- `backend/workers/LogCleaner.php`
- `backend/classes/EmailNotifier.php`
- Crontab entries documented

---

### **Phase 4: Alerting System** (Week 2)
**Goal**: Automated email alerts when critical thresholds are breached

**Components:**

**4.1 - EmailNotifier Class**
- Uses PHPMailer
- Sends HTML email alerts to SuperAdmin
- Includes alert details, severity, affected users/tenants
- Tracks email status in `email_notifications` table

**4.2 - Alert Rules Configuration**
- JSON config file: `backend/config/alert_rules.json`
- Defines thresholds for each metric
- Allows enabling/disabling specific alerts
- Configurable email recipients per alert type

**4.3 - Alert Dashboard Page (Frontend)**
- View all active alerts
- Filter by severity (critical, warning, info)
- Mark alerts as resolved
- View alert history

**Example Alert Email:**
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

**Deliverables:**
- `backend/classes/EmailNotifier.php`
- `backend/config/alert_rules.json`
- `backend/api/superadmin/alerts.php` (API endpoint)
- Frontend alert management page

---

### **Phase 5: API Endpoints** (Week 3)
**Goal**: Create RESTful APIs to serve monitoring data to dashboard

**New API Endpoints:**

```
GET /api/superadmin/health
- Returns: Overall system health summary (4 pillars)

GET /api/superadmin/metrics?type=system&period=24h
- Returns: Metrics for specified type and time period
- Types: system, user, error, business
- Periods: 1h, 24h, 7d, 30d

GET /api/superadmin/alerts?status=active&severity=critical
- Returns: Alerts filtered by status and severity

POST /api/superadmin/alerts/:id/resolve
- Marks alert as resolved

GET /api/superadmin/logs?type=errors&limit=100&offset=0
- Returns: Paginated logs (errors, api_requests, activity)

GET /api/superadmin/dashboards/realtime
- Returns: Real-time metrics (refreshed every 30s)

GET /api/superadmin/reports/generate
- Generates downloadable PDF/CSV reports
```

**Enhance Existing:**
- `/api/superadmin/system_insights.php` - Add more tabs (errors, realtime)

**Deliverables:**
- All API endpoints in `backend/api/superadmin/`
- API documentation in `backend/api/SUPERADMIN_API_DOCS.md`

---

### **Phase 6: Visualization Layer (React Dashboard)** (Week 3-4)
**Goal**: Build a comprehensive, real-time SuperAdmin monitoring dashboard

**Dashboard Pages:**

**6.1 - Overview Dashboard** (`/superadmin/dashboard`)
- **4 Health Pillar Cards**:
  - System Health (green/yellow/red indicator)
  - User Health (DAU, MAU, retention rate)
  - Error Health (error rate, recent critical errors)
  - Business Health (revenue, sales, profit)
- **Real-time Graphs**:
  - API Request Rate (last 24 hours)
  - Error Rate Trend (last 7 days)
  - Active Users (last 30 days)
  - Revenue Trend (last 30 days)
- **Critical Alerts Panel** (latest 5 critical alerts)
- **System Status Indicators** (Database, API, Cron Jobs)

**6.2 - System Health Page** (`/superadmin/system`)
- API Response Times (p50, p95, p99 percentiles)
- Request Volume by Endpoint
- Error Rate by Endpoint
- Server Resources (CPU, Memory, Disk)
- Database Health (connections, slow queries, table sizes)

**6.3 - User Health Page** (`/superadmin/users`)
- Active Users Chart (DAU/MAU)
- User Retention Cohort Analysis
- User Segmentation (by role, by activity level)
- Session Duration Distribution
- Inactive Users List (>30 days)

**6.4 - Error Health Page** (`/superadmin/errors`)
- Error Rate Chart (last 7 days)
- Error Breakdown by Type
- Error Breakdown by Endpoint
- Recent Errors Table (paginated, filterable)
- Error Details Modal (stack trace, affected users)

**6.5 - Business Health Page** (`/superadmin/business`)
- Revenue Dashboard
  - Daily/Weekly/Monthly revenue charts
  - Revenue by shop/tenant
  - Profit margins
- Transaction Metrics
  - Transaction volume
  - Average transaction value
  - Payment methods breakdown
- Inventory Metrics
  - Inventory turnover rate
  - Stock levels by category
  - Dead stock alerts
- Marketplace Metrics
  - Active listings
  - Order completion rate
  - Top sellers/buyers
- Debt Management
  - Outstanding debt
  - Collection rate
  - Overdue debts

**6.6 - Alerts Page** (`/superadmin/alerts`)
- Active Alerts (filterable by severity, type)
- Alert History
- Alert Configuration (if time permits)

**6.7 - Logs Explorer** (`/superadmin/logs`)
- Unified log viewer
- Filter by type (activity, security, errors, API)
- Search by user, date range, keywords
- Export logs (CSV/JSON)

**UI Components:**
- Health Status Card (reusable)
- Metric Chart Components (Line, Bar, Pie)
- Alert Badge
- Data Table with Pagination
- Real-time Clock/Timestamp
- Loading Skeletons
- Error States

**Deliverables:**
- All React components in `frontend/src/pages/SuperAdmin/`
- Shared chart components in `frontend/src/components/Charts/`
- API integration with React Query
- Responsive design for all pages

---

### **Phase 7: Real-time Updates (Optional - Advanced)** (Week 5)
**Goal**: Add WebSocket support for real-time dashboard updates

**Approach:**
- Use PHP WebSocket library (Ratchet) or Node.js for WebSocket server
- Broadcast metrics updates every 30-60 seconds
- React dashboard subscribes to WebSocket channel
- Update charts/cards without full page refresh

**Alternative (Simpler):**
- Use React Query with `refetchInterval: 30000` (30 seconds)
- Auto-refresh data every 30 seconds
- Less complex, easier to maintain

**Recommendation:** Start with React Query auto-refresh, add WebSockets only if real needs arise.

---

## Logging System (Detailed)

### What to Log

**1. User Actions (Activity Logging)**
- Login/Logout (already exists)
- Role changes
- User creation/deletion
- Password resets
- Permission changes

**2. Business Operations**
- Every sale transaction (already partially exists)
- Inventory additions/removals
- Expense creation
- Debt payments
- Marketplace orders
- Wallet transactions

**3. API Requests**
- Endpoint URL
- HTTP method
- Status code
- Response time
- Request size, response size
- User ID (if authenticated)
- IP address
- User agent

**4. Errors**
- PHP errors (warnings, notices, fatal errors)
- Uncaught exceptions
- Validation errors
- Database errors
- External API errors (Kora payment failures)

**5. Security Events (already exists)**
- Failed login attempts
- Brute force attempts
- Suspicious activity
- Session hijacking attempts

### Structured Logging Format (JSON)

**Example Activity Log:**
```json
{
  "timestamp": "2026-01-03T14:35:12Z",
  "level": "INFO",
  "event_type": "user.login",
  "user_id": 42,
  "tenant_id": 5,
  "context": {
    "username": "john_doe",
    "role": "admin",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "login_method": "password"
  }
}
```

**Example Error Log:**
```json
{
  "timestamp": "2026-01-03T14:35:12Z",
  "level": "ERROR",
  "event_type": "database.connection_failed",
  "error_message": "SQLSTATE[HY000] [2002] Connection refused",
  "error_code": "HY000",
  "context": {
    "file": "/backend/config/database.php",
    "line": 23,
    "user_id": 42,
    "tenant_id": 5,
    "request_url": "/api/inventory/read.php",
    "stack_trace": "..."
  }
}
```

**Example API Request Log:**
```json
{
  "timestamp": "2026-01-03T14:35:12Z",
  "level": "INFO",
  "event_type": "api.request",
  "endpoint": "/api/inventory/read.php",
  "http_method": "GET",
  "status_code": 200,
  "response_time_ms": 45,
  "user_id": 42,
  "tenant_id": 5,
  "ip_address": "192.168.1.100"
}
```

### Logging Implementation

**EventLogger Class** (PSR-3 compliant with Monolog):

```php
<?php
// backend/helpers/EventLogger.php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\JsonFormatter;

class EventLogger {
    private static $logger;
    
    public static function getInstance() {
        if (self::$logger === null) {
            self::$logger = new Logger('app');
            
            // Write to daily rotating log files
            $handler = new RotatingFileHandler(
                __DIR__ . '/../logs/app.log',
                30, // Keep 30 days
                Logger::DEBUG
            );
            $handler->setFormatter(new JsonFormatter());
            
            self::$logger->pushHandler($handler);
        }
        return self::$logger;
    }
    
    public static function logActivity($eventType, $userId, $tenantId, $context = []) {
        $logger = self::getInstance();
        $logger->info($eventType, array_merge($context, [
            'user_id' => $userId,
            'tenant_id' => $tenantId,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]));
        
        // Also insert into activity_logs table
        global $conn;
        $stmt = $conn->prepare("INSERT INTO activity_logs (tenant_id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)");
        $detailsJson = json_encode($context);
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $stmt->bind_param("iisss", $tenantId, $userId, $eventType, $detailsJson, $ipAddress);
        $stmt->execute();
    }
    
    public static function logError($errorLevel, $errorMessage, $context = []) {
        $logger = self::getInstance();
        $logger->error($errorMessage, $context);
        
        // Insert into application_errors table
        global $conn;
        $stmt = $conn->prepare("
            INSERT INTO application_errors 
            (tenant_id, user_id, error_level, error_type, error_message, file_path, line_number, stack_trace, request_url, request_method, ip_address, context)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $tenantId = $_SESSION['tenant_id'] ?? null;
        $userId = $_SESSION['user_id'] ?? null;
        $errorType = $context['error_type'] ?? 'UnknownError';
        $filePath = $context['file'] ?? null;
        $lineNumber = $context['line'] ?? null;
        $stackTrace = $context['stack_trace'] ?? null;
        $requestUrl = $_SERVER['REQUEST_URI'] ?? null;
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? null;
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $contextJson = json_encode($context);
        
        $stmt->bind_param(
            "iissssississs",
            $tenantId, $userId, $errorLevel, $errorType, $errorMessage,
            $filePath, $lineNumber, $stackTrace, $requestUrl, $requestMethod,
            $ipAddress, $contextJson
        );
        $stmt->execute();
    }
    
    public static function logApiRequest($endpoint, $method, $statusCode, $responseTimeMs) {
        global $conn;
        $stmt = $conn->prepare("
            INSERT INTO api_request_logs 
            (tenant_id, user_id, endpoint, http_method, status_code, response_time_ms, ip_address, user_agent, is_error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $tenantId = $_SESSION['tenant_id'] ?? null;
        $userId = $_SESSION['user_id'] ?? null;
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $isError = ($statusCode >= 400) ? 1 : 0;
        
        $stmt->bind_param(
            "iissiiisi",
            $tenantId, $userId, $endpoint, $method, $statusCode,
            $responseTimeMs, $ipAddress, $userAgent, $isError
        );
        $stmt->execute();
    }
}
```

**Instrument ALL API Endpoints:**

```php
// backend/api/inventory/read.php
$startTime = microtime(true);

// ... existing code ...

$endTime = microtime(true);
$responseTimeMs = round(($endTime - $startTime) * 1000);
EventLogger::logApiRequest($_SERVER['REQUEST_URI'], $_SERVER['REQUEST_METHOD'], http_response_code(), $responseTimeMs);
```

---

## Metrics Aggregation (Detailed)

### MetricsAggregator.php

**Purpose**: Runs every 5 minutes to aggregate raw logs into queryable metrics

**Tasks:**
1. Count API requests per endpoint (last hour)
2. Calculate average response time per endpoint
3. Count errors by type
4. Calculate error rate
5. Count active users (last 30 mins)
6. Aggregate business metrics (sales, revenue)

**Sample Implementation:**

```php
<?php
// backend/workers/MetricsAggregator.php

require_once __DIR__ . '/../config/database.php';

$database = new Database();
$conn = $database->connect();

// Get current hour timestamp (rounded down)
$currentHour = date('Y-m-d H:00:00');

// 1. Aggregate API requests
$stmt = $conn->prepare("
    SELECT 
        endpoint,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time,
        SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as error_count
    FROM api_request_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    GROUP BY endpoint
");
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    // Insert into metrics_hourly
    $insertStmt = $conn->prepare("
        INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count, metadata)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE metric_value = ?, count = ?, metadata = ?
    ");
    
    $metricType = 'api_requests_' . $row['endpoint'];
    $metricValue = $row['avg_response_time'];
    $count = $row['request_count'];
    $metadata = json_encode([
        'endpoint' => $row['endpoint'],
        'error_count' => $row['error_count']
    ]);
    
    $insertStmt->bind_param(
        "ssdissdi",
        $currentHour, $metricType, $metricValue, $count, $metadata,
        $metricValue, $count, $metadata
    );
    $insertStmt->execute();
}

// 2. Aggregate errors
$stmt = $conn->prepare("
    SELECT 
        error_type,
        COUNT(*) as error_count
    FROM application_errors
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    GROUP BY error_type
");
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $insertStmt = $conn->prepare("
        INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE metric_value = metric_value + ?, count = count + ?
    ");
    
    $metricType = 'errors_' . $row['error_type'];
    $count = $row['error_count'];
    
    $insertStmt->bind_param("ssdidi", $currentHour, $metricType, 0, $count, 0, $count);
    $insertStmt->execute();
}

// 3. Calculate error rate
$totalRequests = $conn->query("
    SELECT COUNT(*) as total FROM api_request_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
")->fetch_assoc()['total'];

$totalErrors = $conn->query("
    SELECT COUNT(*) as total FROM application_errors WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
")->fetch_assoc()['total'];

$errorRate = $totalRequests > 0 ? ($totalErrors / $totalRequests) * 100 : 0;

$insertStmt = $conn->prepare("
    INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count)
    VALUES (?, 'error_rate', ?, ?)
    ON DUPLICATE KEY UPDATE metric_value = ?, count = ?
");
$insertStmt->bind_param("sdidi", $currentHour, $errorRate, $totalErrors, $errorRate, $totalErrors);
$insertStmt->execute();

// 4. Active users
$activeUsers = $conn->query("
    SELECT COUNT(DISTINCT user_id) as count FROM activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
")->fetch_assoc()['count'];

$insertStmt = $conn->prepare("
    INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count)
    VALUES (?, 'active_users', ?, ?)
    ON DUPLICATE KEY UPDATE metric_value = ?, count = ?
");
$insertStmt->bind_param("sdidi", $currentHour, $activeUsers, $activeUsers, $activeUsers, $activeUsers);
$insertStmt->execute();

echo "Metrics aggregated successfully at " . date('Y-m-d H:i:s') . "\n";
```

---

## Performance Considerations

1. **Use Indexes**: All new tables have appropriate indexes on frequently queried columns
2. **Log Rotation**: `RotatingFileHandler` keeps only 30 days of logs
3. **Database Sharding**: For `api_request_logs`, consider partitioning by date (if traffic is very high)
4. **Caching**: Use `system_metrics` table to cache expensive queries for 5 minutes
5. **Async Logging**: Consider queuing log writes for non-critical logs (e.g., API requests)
6. **Pagination**: All log viewers must use pagination (limit 100 per page)
7. **Chart Data**: Pre-aggregate data in `metrics_hourly` and `metrics_daily` tables - NEVER query raw logs for charts

---

## Security Considerations

1. **SuperAdmin Only**: All monitoring endpoints protected by `checkRole(['superadmin'])`
2. **Rate Limiting**: Monitor endpoints themselves should be rate-limited
3. **Sensitive Data**: Never log passwords, API keys, credit card numbers
4. **Log Access Control**: SuperAdmin logging should have its own database user with read-only access to logs
5. **SQL Injection**: All queries use prepared statements
6. **CORS**: Only allow frontend domain to access monitoring APIs

---

## Deployment Strategy

### Development (XAMPP - Localhost)
1. Create new database tables (run SQL migrations)
2. Install Composer dependencies (Monolog)
3. Configure cron jobs on local machine
4. Test all workers manually before scheduling
5. Build React dashboard locally

### Production (prhub.shop)
1. **Database Migration**: Run SQL migrations on production DB
2. **Composer Install**: `composer install --no-dev` on server
3. **Crontab Setup**: Add cron jobs via cPanel or SSH
4. **Email Configuration**: Configure SMTP for alert emails
5. **Frontend Build**: Build and deploy React dashboard
6. **Monitoring Test**: Trigger test alerts to verify email delivery
7. **Performance Baseline**: Monitor system performance for 24 hours after deployment

---

## Success Metrics

After full implementation, measure:
1. **Logging Coverage**: 100% of API endpoints instrument request logging
2. **Alert Response Time**: Critical alerts trigger email within 2 minutes
3. **Dashboard Load Time**: All dashboard pages load in <2 seconds
4. **Data Freshness**: Metrics updated every 5 minutes
5. **Historical Data**: 90 days of logs retained
6. **Error Detection Rate**: 95% of errors captured and logged
7. **SuperAdmin Adoption**: SuperAdmin uses dashboard daily

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Enhanced Logging | Week 1 | EventLogger, error handlers, activity logging |
| 2. Database Schema | Week 1 | New tables, migrations |
| 3. Background Workers | Week 2 | MetricsAggregator, AlertProcessor, LogCleaner |
| 4. Alerting System | Week 2 | EmailNotifier, alert rules, alert API |
| 5. API Endpoints | Week 3 | All SuperAdmin monitoring APIs |
| 6. Visualization Layer | Week 3-4 | Full React dashboard (7 pages) |
| 7. Real-time Updates (Optional) | Week 5 | WebSocket or React Query auto-refresh |

**Total Estimated Time**: 4-5 weeks (full-time development)

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on immediate needs (e.g., Error Tracking might be Phase 1)
3. **Set up development environment** (install Composer, Monolog)
4. **Create task breakdown** in project management tool
5. **Begin Phase 1** with EventLogger implementation

---

## References

- [PHP Monolog Documentation](https://github.com/Seldaek/monolog)
- [Google SRE - The Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)
- [PSR-3 Logger Interface](https://www.php-fig.org/psr/psr-3/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Chart.js Documentation](https://www.chartjs.org/)

---

**Document Version**: 1.0  
**Last updated**: 2026-01-02  
**Author**: Antigravity AI Assistant  
**Status**: Draft - Awaiting Review
