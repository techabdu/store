# SaaS Platform Metrics - Phone Retailer Management System

## Overview

As a **multi-tenant SaaS platform** for phone retailers, you need to monitor TWO levels:
1. **Platform Health** (Your system - already covered in main plan)
2. **Customer Health** (Your retailers - THIS DOCUMENT)

This document defines **SaaS-specific metrics** to track the health, usage, and success of your retailer customers.

---

## Table of Contents

1. [Tenant Management Metrics](#tenant-management-metrics)
2. [Inventory & Product Metrics](#inventory--product-metrics)
3. [Transaction & Sales Data](#transaction--sales-data)
4. [Retailer-Specific Health](#retailer-specific-health)
5. [Growth Metrics](#growth-metrics)
6. [Usage Patterns](#usage-patterns)
7. [Performance by Module](#performance-by-module)
8. [Retailer Health Scores](#retailer-health-scores)
9. [Support & Issues](#support--issues)
10. [Additional Suggested Metrics](#additional-suggested-metrics)
11. [Database Schema Updates](#database-schema-updates)
12. [API Endpoints](#api-endpoints)
13. [Dashboard Pages](#dashboard-pages)

---

## 1. Tenant Management Metrics

**Goal**: Monitor and manage all retailers (tenants) using your platform

### Key Metrics

| Metric | Description | Data Source | Calculation |
|--------|-------------|-------------|-------------|
| **Total Tenants** | All registered retailer accounts | `tenants` table | `COUNT(*)` |
| **Active Tenants** | Tenants with status='active' | `tenants` table | `COUNT(*) WHERE status='active'` |
| **Trial Tenants** | Tenants in trial period | `tenants` table | `COUNT(*) WHERE status='trial'` |
| **Suspended Tenants** | Suspended accounts | `tenants` table | `COUNT(*) WHERE status='suspended'` |
| **Churned Tenants** | Accounts that cancelled/left | `tenants` table | `COUNT(*) WHERE status='cancelled'` |
| **Tenant Growth Rate** | New tenants this month vs last month | `tenants` table | `(new_this_month - new_last_month) / new_last_month * 100` |
| **Tenant Churn Rate** | % of tenants that left this month | `tenants` table | `churned_this_month / total_active_start_of_month * 100` |
| **Average Tenant Age** | How long tenants stay on platform | `tenants` table | `AVG(DATEDIFF(NOW(), created_at))` |
| **Tenants by Plan** | Distribution across pricing tiers | `tenants` table | `COUNT(*) GROUP BY subscription_plan` |

### Actions Needed

**Database Updates:**
```sql
-- Add new columns to tenants table
ALTER TABLE tenants ADD COLUMN subscription_plan ENUM('trial', 'basic', 'pro', 'enterprise') DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN mrr DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Monthly Recurring Revenue';
ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN cancelled_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN cancellation_reason TEXT DEFAULT NULL;
```

### Dashboard Features
- **Tenant List** with filters (status, plan, creation date)
- **Tenant Details Page** showing:
  - Account info (name, email, plan, status)
  - Usage statistics (users, shops, inventory count)
  - Activity timeline
  - Billing information (MRR, payment history)
  - Health score
- **Tenant Actions**:
  - Suspend/Activate account
  - Change subscription plan
  - View impersonation (login as tenant to debug)
  - Send notification

---

## 2. Inventory & Product Metrics

**Goal**: Track inventory management across all retailers

### Key Metrics

| Metric | Description | Data Source | Aggregation |
|--------|-------------|-------------|-------------|
| **Total Devices Tracked** | All phones in inventory across all tenants | `inventory` table | `COUNT(*)` |
| **Devices by Brand** | iPhone, Samsung, etc. | `inventory` | `COUNT(*) GROUP BY brand` |
| **Devices by Model** | Most popular models | `inventory` | `COUNT(*) GROUP BY model` |
| **Devices by Condition** | New, Used, Refurbished | `inventory` | `COUNT(*) GROUP BY condition_status` |
| **Average Inventory per Tenant** | How much inventory retailers have | `inventory` | `AVG(devices_per_tenant)` |
| **Inventory Turnover Rate** | How fast devices are sold | `inventory` + `transactions` | `COGS / avg_inventory_value` |
| **Low Stock Alerts** | Tenants with low inventory | `inventory` | Count tenants with <10 devices |
| **IMEI Tracking Accuracy** | % devices with valid IMEI | `inventory` | `COUNT(valid_imei) / COUNT(*) * 100` |
| **Devices Listed on Marketplace** | % of inventory listed | `inventory` + `marketplace_listings` | `listed / total * 100` |
| **Average Device Price** | Across all tenants | `inventory` | `AVG(price)` |
| **Total Inventory Value** | Platform-wide | `inventory` | `SUM(price * quantity)` |

### Repair/Refurbishment Tracking (SUGGESTED - NEW FEATURE)

**Do you currently track repairs?** If yes, add these metrics:

| Metric | Suggested |
|--------|-----------|
| **Repair Jobs Completed** | Total repair jobs across all tenants |
| **Average Repair Time** | Days from intake to completion |
| **Repair Revenue** | Revenue from repair services |
| **Common Repair Types** | Screen replacement, battery, etc. |
| **Refurbishment Volume** | Devices refurbished per month |

**If you don't have repair tracking yet, should we add it?** It's common for phone retailers.

### Inventory Update Frequency

Track how often retailers update their inventory:

```sql
-- New table to track inventory updates
CREATE TABLE inventory_update_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  shop_id INT NOT NULL,
  inventory_id INT NOT NULL,
  action ENUM('create', 'update', 'delete', 'status_change') NOT NULL,
  changed_fields JSON DEFAULT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_date (tenant_id, created_at)
) ENGINE=InnoDB;
```

**Metric**: Average days since last inventory update per tenant

---

## 3. Transaction & Sales Data

**Goal**: Monitor transaction volume and sales patterns across platform

### Key Metrics

| Metric | Description | Data Source | Calculation |
|--------|-------------|-------------|-------------|
| **Total Transactions** | All sales across all tenants | `transactions` | `COUNT(*)` |
| **Total GMV** (Gross Merchandise Value) | Total sales value | `transactions` | `SUM(total_amount)` |
| **Average Transaction Value** | Platform-wide ATV | `transactions` | `AVG(total_amount)` |
| **Sales Velocity by Device** | Which phones sell fastest | `transactions` + `inventory` | Sales per device type per day |
| **Top Selling Brands** | iPhone, Samsung, etc. | `transactions` | `COUNT(*) GROUP BY brand` |
| **Top Selling Models** | Most sold phone models | `transactions` | `COUNT(*) GROUP BY model` |
| **Trade-In Volume** | Number of trade-in transactions | `transactions` | `COUNT(*) WHERE type='trade_in'` |
| **Payment Processing Success Rate** | % successful payments | `transactions` | `success / total * 100` |
| **Payment Methods Breakdown** | Cash, card, transfer, mixed | `transactions` | `COUNT(*) GROUP BY payment_method` |
| **Commission Revenue** | Your revenue from transactions | `transactions` | `SUM(commission_amount)` (if applicable) |
| **Refund Rate** | % of transactions refunded | `transactions` | `refunds / total * 100` |
| **Average Profit Margin** | Across all tenants | `transactions` | `AVG((selling_price - cost_price) / selling_price * 100)` |

### Sales Patterns

- **Peak Sales Hours**: When do most sales happen?
- **Sales by Day of Week**: Monday vs Sunday
- **Seasonal Trends**: Holiday spikes, slow seasons
- **Sales by Region**: If you track shop locations

### Database Updates Needed

```sql
-- Add commission tracking if you take a commission
ALTER TABLE transactions ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Platform commission %';
ALTER TABLE transactions ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Platform revenue from this transaction';

-- Add trade-in tracking
ALTER TABLE transactions ADD COLUMN is_trade_in TINYINT(1) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN trade_in_device_id INT DEFAULT NULL COMMENT 'Reference to device traded in';
```

---

## 4. Retailer-Specific Health

**Goal**: Understand how each retailer is using the platform

### Key Metrics

| Metric | Description | Data Source | Per Tenant |
|--------|-------------|-------------|------------|
| **Store Locations** | Number of shops per tenant | `shops` | `COUNT(*) WHERE tenant_id = ?` |
| **Employee Accounts** | Users per tenant | `users` | `COUNT(*) WHERE tenant_id = ? AND role IN ('admin', 'user')` |
| **Active Employees** | Users active in last 7 days | `users` + `activity_logs` | Users with recent activity |
| **POS Integration Usage** | % using POS features | Feature flags | Track if tenant uses POS module |
| **Mobile vs Desktop Usage** | Device type breakdown | `activity_logs` | Parse user_agent |
| **Feature Adoption** | Which modules are used | Feature tracking | See below |
| **Data Entry Quality** | Complete vs incomplete records | `inventory`, `customers` | % records with all fields filled |
| **Login Frequency** | How often do they log in | `activity_logs` | Logins per week |
| **Session Duration** | Average time spent in app | `sessions` | `AVG(last_activity - created_at)` |

### Feature Adoption Tracking

Track which features each tenant uses:

```sql
CREATE TABLE feature_usage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  shop_id INT DEFAULT NULL,
  user_id INT NOT NULL,
  feature_name VARCHAR(50) NOT NULL COMMENT 'e.g., inventory_management, marketplace, reports, pos, expenses',
  action VARCHAR(50) NOT NULL COMMENT 'e.g., view, create, update, export',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_feature (tenant_id, feature_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;
```

**Features to Track:**
- Inventory Management
- Marketplace (buying/selling)
- POS Sales
- Customer Management
- Expense Tracking
- Debt Management
- Reports & Analytics
- Multi-Shop Management
- Vendor Management
- Budget Planning

### Metric: Feature Adoption Rate
```
For each feature:
  % of tenants who used it in last 30 days
```

---

## 5. Growth Metrics

**Goal**: Track platform growth over time

### Key Metrics

| Metric | Description | Calculation | Period |
|--------|-------------|-------------|--------|
| **New Retailers This Month** | New tenant signups | `COUNT(*) WHERE created_at > start_of_month` | Monthly |
| **MRR** (Monthly Recurring Revenue) | Sum of all subscriptions | `SUM(mrr) WHERE status='active'` | Monthly |
| **MRR Growth Rate** | Month-over-month MRR change | `(this_month_mrr - last_month_mrr) / last_month_mrr * 100` | Monthly |
| **ARR** (Annual Recurring Revenue) | MRR * 12 | `MRR * 12` | Yearly |
| **ARPU** (Average Revenue Per User) | Revenue per tenant | `MRR / active_tenants` | Monthly |
| **User Growth Trends** | Total users across platform | `COUNT(*) FROM users` | Monthly |
| **Expansion Revenue** | Revenue from upgrades | Track plan changes | Monthly |
| **Contraction Revenue** | Revenue lost from downgrades | Track plan downgrades | Monthly |
| **Net Revenue Retention** | Revenue retained + expansion | `(start_mrr + expansion - contraction - churn) / start_mrr * 100` | Monthly |

### Growth Charts Needed

1. **MRR Chart** (last 12 months)
2. **New Tenants Chart** (last 12 months)
3. **Churn Rate Chart** (last 12 months)
4. **User Growth Chart** (cumulative)
5. **Plan Distribution** (pie chart)

### Database Updates

```sql
-- Track subscription changes
CREATE TABLE subscription_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  from_plan VARCHAR(50) DEFAULT NULL,
  to_plan VARCHAR(50) NOT NULL,
  from_mrr DECIMAL(10,2) DEFAULT NULL,
  to_mrr DECIMAL(10,2) NOT NULL,
  change_type ENUM('signup', 'upgrade', 'downgrade', 'cancellation', 'reactivation') NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB;
```

---

## 6. Usage Patterns

**Goal**: Understand how tenants use the platform

### Key Metrics

| Metric | Description | Visualization |
|--------|-------------|---------------|
| **Feature Adoption Heatmap** | Which features are used most | Heatmap by tenant x feature |
| **API Usage by Tenant** | API calls per tenant | Bar chart |
| **Storage Consumption** | Database size per tenant | GB per tenant |
| **Image Storage** | Upload storage per tenant | GB per tenant (uploads folder) |
| **Peak Usage Times** | When is the platform busiest | Hourly activity heatmap |
| **Module Usage Breakdown** | Time spent per module | Pie chart |
| **Search Query Patterns** | What do users search for | Word cloud |
| **Export Frequency** | How often do they export reports | Count per tenant |

### API Usage Tracking

```sql
-- Already have api_request_logs, but add tenant tracking
-- Ensure tenant_id is captured in api_request_logs

-- Aggregate API usage per tenant
SELECT 
  tenant_id,
  COUNT(*) as api_calls,
  AVG(response_time_ms) as avg_latency,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
FROM api_request_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY tenant_id
ORDER BY api_calls DESC;
```

### Storage Tracking

```sql
-- New table for storage metrics
CREATE TABLE storage_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  database_size_mb DECIMAL(10,2) NOT NULL,
  file_storage_mb DECIMAL(10,2) NOT NULL COMMENT 'Images, documents',
  total_records INT NOT NULL,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_date (tenant_id, measured_at)
) ENGINE=InnoDB;
```

**Calculate daily:**
```php
// MetricsAggregator job
foreach ($tenants as $tenant) {
    // Database size
    $dbSize = calculateDatabaseSizeForTenant($tenant['id']);
    
    // File storage
    $fileSize = calculateFileStorageForTenant($tenant['id']);
    
    // Insert into storage_metrics
}
```

---

## 7. Performance by Module

**Goal**: Track performance of each feature/module

### Modules to Track

1. **Inventory Management**
2. **POS Sales**
3. **Marketplace**
4. **Reports & Analytics**
5. **Expense Tracking**
6. **Customer Management**
7. **Debt Management**
8. **Multi-Shop Management**

### Metrics per Module

| Metric | Description |
|--------|-------------|
| **Average Response Time** | p50, p95, p99 latency |
| **Error Rate** | % of requests that fail |
| **Usage Volume** | Requests per day |
| **User Satisfaction** | Based on errors, slow responses |

### Implementation

```sql
-- Use existing api_request_logs but add module tagging
ALTER TABLE api_request_logs ADD COLUMN module VARCHAR(50) DEFAULT NULL COMMENT 'inventory, sales, marketplace, reports, etc.';

-- Tag endpoints by module
UPDATE api_request_logs SET module = 'inventory' WHERE endpoint LIKE '%/inventory/%';
UPDATE api_request_logs SET module = 'sales' WHERE endpoint LIKE '%/transactions/%';
UPDATE api_request_logs SET module = 'marketplace' WHERE endpoint LIKE '%/marketplace/%';
-- etc.
```

### Dashboard

**Module Performance Dashboard** showing:
- **Response time chart** per module
- **Error rate chart** per module
- **Usage volume chart** per module
- **Slowest endpoints** per module

---

## 8. Retailer Health Scores

**Goal**: Identify healthy vs at-risk retailers

### Health Score Calculation

**Components (0-100 score):**

1. **Engagement (40 points)**
   - Login frequency (15 pts)
   - Active users (10 pts)
   - Feature usage breadth (15 pts)

2. **Value Realization (30 points)**
   - Transaction volume (10 pts)
   - Inventory turnover (10 pts)
   - Revenue growth (10 pts)

3. **Data Quality (20 points)**
   - Complete inventory records (10 pts)
   - Customer data completeness (10 pts)

4. **Support Interaction (10 points)**
   - Low error rate (5 pts)
   - Few support tickets (5 pts)

### Health Score Categories

| Score | Category | Action |
|-------|----------|--------|
| 90-100 | **Power User** 🟢 | Upsell, case study, referral program |
| 70-89 | **Healthy** 🟢 | Monitor, encourage feature adoption |
| 50-69 | **At Risk** 🟡 | Re-engagement campaign, check-in call |
| 0-49 | **Churn Risk** 🔴 | Urgent intervention, retention offer |

### Database

```sql
CREATE TABLE retailer_health_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  health_score INT NOT NULL COMMENT '0-100',
  engagement_score INT NOT NULL,
  value_score INT NOT NULL,
  data_quality_score INT NOT NULL,
  support_score INT NOT NULL,
  category ENUM('power_user', 'healthy', 'at_risk', 'churn_risk') NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_category (category)
) ENGINE=InnoDB;
```

### Background Worker

```php
// HealthScoreCalculator.php (runs daily)
foreach ($tenants as $tenant) {
    $score = calculateHealthScore($tenant['id']);
    insertHealthScore($tenant['id'], $score);
    
    // Trigger alerts for at-risk tenants
    if ($score['category'] === 'at_risk' || $score['category'] === 'churn_risk') {
        createAlert('retention', 'warning', "Tenant {$tenant['name']} is at risk (score: {$score['health_score']})");
        sendRetentionEmail($tenant['email'], $score);
    }
}
```

---

## 9. Support & Issues

**Goal**: Track support requests and common issues

### Key Metrics

| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Open Tickets by Severity** | Critical, high, medium, low | Support system |
| **Average Response Time** | Time to first response | Support system |
| **Average Resolution Time** | Time to close ticket | Support system |
| **Ticket Volume Trend** | Increasing or decreasing | Support system |
| **Common Error Patterns** | Most frequent errors | `application_errors` |
| **Feature Requests** | Most requested features | Support system |
| **Error Rate by Tenant** | Which tenants have most errors | `application_errors` |
| **Self-Service Usage** | FAQ/docs visits | Analytics |

### Implementation

**Option 1**: If you have a support ticketing system (Zendesk, Freshdesk, etc.), integrate via API

**Option 2**: Build simple support tracking in your app

```sql
CREATE TABLE support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('bug', 'feature_request', 'question', 'technical_issue', 'billing', 'other') NOT NULL,
  severity ENUM('critical', 'high', 'medium', 'low') NOT NULL,
  status ENUM('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed') DEFAULT 'open',
  assigned_to INT DEFAULT NULL COMMENT 'Support agent user_id',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_response_at TIMESTAMP NULL DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status),
  INDEX idx_severity (severity)
) ENGINE=InnoDB;

CREATE TABLE support_ticket_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_internal_note TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket (ticket_id)
) ENGINE=InnoDB;
```

### Common Error Pattern Detection

```sql
-- Find most common errors across all tenants
SELECT 
  error_type,
  error_message,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT tenant_id) as affected_tenants,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM application_errors
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY error_type, error_message
ORDER BY occurrence_count DESC
LIMIT 20;
```

**Alert**: If the same error affects >10% of tenants, it's a platform-wide issue

---

## 10. Additional Suggested Metrics

Based on phone retailer industry best practices:

### 📱 Device-Specific Metrics (SUGGESTED)

| Metric | Why Track It |
|--------|-------------|
| **Device Lifecycle** | Track device from acquisition → sale → warranty → potential return |
| **Warranty Tracking** | Devices still under warranty, warranty claims |
| **Return Rate** | % of sold devices returned |
| **Dead Stock** | Devices unsold for >90 days |
| **Pricing Accuracy** | Compare your tenant prices to market rates (if you have data) |
| **Device Age** | How long devices sit in inventory before sale |

### 👥 Customer Insights (SUGGESTED)

| Metric | Why Track It |
|--------|-------------|
| **Customer Retention Rate** | % of customers who buy again (across all tenants) |
| **Customer Lifetime Value** | Average CLV across platform |
| **Debt Collection Efficiency** | % of debt collected (platform-wide) |
| **Customer Segmentation Distribution** | VIP, Loyal, Regular, Occasional, At-Risk, Lost |

### 💰 Financial Health (SUGGESTED)

| Metric | Why Track It |
|--------|-------------|
| **Platform Revenue** | Your total revenue (MRR + commissions) |
| **Gross Margin by Tenant** | Which tenants are most profitable |
| **Outstanding Debt** | Total debt across all tenants |
| **Payment Success Rate** | For marketplace escrow payments |

### 🔐 Security & Compliance (SUGGESTED)

| Metric | Why Track It |
|--------|-------------|
| **Failed Login Rate by Tenant** | Detect compromised accounts |
| **Data Breach Attempts** | Track suspicious activity |
| **GDPR Compliance** | Track data deletion requests, exports |
| **Session Security** | Track unusual login locations |

### 📊 Reporting Usage (SUGGESTED)

| Metric | Why Track It |
|--------|-------------|
| **Most Generated Reports** | Which reports do tenants use most |
| **Report Export Frequency** | How often do they export data |
| **Dashboard Views** | Which dashboards are most popular |

**Should I add any of these to the main plan?** Let me know which ones you want to track.

---

## 11. Database Schema Updates

### New Tables Needed

```sql
-- Subscription tracking
CREATE TABLE IF NOT EXISTS subscription_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  from_plan VARCHAR(50) DEFAULT NULL,
  to_plan VARCHAR(50) NOT NULL,
  from_mrr DECIMAL(10,2) DEFAULT NULL,
  to_mrr DECIMAL(10,2) NOT NULL,
  change_type ENUM('signup', 'upgrade', 'downgrade', 'cancellation', 'reactivation') NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  shop_id INT DEFAULT NULL,
  user_id INT NOT NULL,
  feature_name VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_tenant_feature (tenant_id, feature_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Storage metrics
CREATE TABLE IF NOT EXISTS storage_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  database_size_mb DECIMAL(10,2) NOT NULL,
  file_storage_mb DECIMAL(10,2) NOT NULL,
  total_records INT NOT NULL,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_tenant_date (tenant_id, measured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Retailer health scores
CREATE TABLE IF NOT EXISTS retailer_health_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  health_score INT NOT NULL COMMENT '0-100',
  engagement_score INT NOT NULL,
  value_score INT NOT NULL,
  data_quality_score INT NOT NULL,
  support_score INT NOT NULL,
  category ENUM('power_user', 'healthy', 'at_risk', 'churn_risk') NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_category (category),
  INDEX idx_calculated_at (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Support tickets (optional)
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('bug', 'feature_request', 'question', 'technical_issue', 'billing', 'other') NOT NULL,
  severity ENUM('critical', 'high', 'medium', 'low') NOT NULL,
  status ENUM('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed') DEFAULT 'open',
  assigned_to INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_response_at TIMESTAMP NULL DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status),
  INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory update log
CREATE TABLE IF NOT EXISTS inventory_update_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  shop_id INT NOT NULL,
  inventory_id INT NOT NULL,
  action ENUM('create', 'update', 'delete', 'status_change') NOT NULL,
  changed_fields JSON DEFAULT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (shop_id) REFERENCES shops(id),
  FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  INDEX idx_tenant_date (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Updates to Existing Tables

```sql
-- tenants table
ALTER TABLE tenants ADD COLUMN subscription_plan ENUM('trial', 'basic', 'pro', 'enterprise') DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN mrr DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Monthly Recurring Revenue';
ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN cancelled_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN cancellation_reason TEXT DEFAULT NULL;

-- transactions table (if commission tracking not already present)
ALTER TABLE transactions ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Platform commission %';
ALTER TABLE transactions ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Platform revenue';
ALTER TABLE transactions ADD COLUMN is_trade_in TINYINT(1) DEFAULT 0;

-- api_request_logs (ensure these exist)
-- tenant_id should already exist, but double-check
ALTER TABLE api_request_logs ADD COLUMN module VARCHAR(50) DEFAULT NULL COMMENT 'inventory, sales, marketplace, etc.';

-- application_errors (ensure shop_id and tenant_id exist - already updated in main plan)
-- Already done: shop_id and tenant_id tracking
```

---

## 12. API Endpoints

### New SaaS-Specific Endpoints

```
# Tenant Management
GET    /api/superadmin/tenants                     # List all tenants with filters
GET    /api/superadmin/tenants/:id                 # Get tenant details
PUT    /api/superadmin/tenants/:id/status          # Suspend/activate tenant
PUT    /api/superadmin/tenants/:id/plan            # Change subscription plan
POST   /api/superadmin/tenants/:id/impersonate     # Login as tenant (debugging)
GET    /api/superadmin/tenants/:id/health-score    # Get health score

# Platform-Wide Metrics
GET    /api/superadmin/metrics/platform
  ?type=growth|inventory|transactions|users
  &period=7d|30d|90d|1y

# Feature Usage
GET    /api/superadmin/metrics/feature-usage
  ?tenant_id=123
  &period=30d

# Retailer Health Scores
GET    /api/superadmin/health-scores
  ?category=at_risk|power_user|healthy
  &sort=score_asc|score_desc

# Storage Metrics
GET    /api/superadmin/metrics/storage
  ?sort=usage_desc
  &limit=50

# Support Tickets
GET    /api/superadmin/support/tickets
  ?status=open|in_progress|resolved
  &severity=critical|high
POST   /api/superadmin/support/tickets
PUT    /api/superadmin/support/tickets/:id
```

---

## 13. Dashboard Pages

### New Dashboard Pages Needed

#### 1. **Tenant Management Dashboard** (`/superadmin/tenants`)

**Sections:**
- **Overview Cards**:
  - Total Tenants
  - Active Tenants
  - Trial Tenants
  - Churned This Month
  - MRR
  - Churn Rate

- **Tenant List Table** (paginated, filterable):
  - Columns: Name, Plan, Status, Users, Shops, MRR, Health Score, Last Active, Actions
  - Filters: Status, Plan, Health Category, Date Range
  - Actions: View Details, Suspend, Change Plan, Impersonate

- **Growth Chart**: New tenants per month (last 12 months)

#### 2. **Tenant Detail Page** (`/superadmin/tenants/:id`)

**Tabs:**
- **Overview**:
  - Account info
  - Subscription details
  - Contact info
  - Health score breakdown

- **Usage Statistics**:
  - Feature usage heatmap
  - API calls chart
  - Storage consumption
  - Active users

- **Activity Timeline**:
  - Recent actions
  - Login history
  - Subscription changes

- **Financials**:
  - MRR history
  - Transaction volume
  - Commission revenue
  - Payment history

- **Support**:
  - Open tickets
  - Error history
  - Recent issues

#### 3. **Platform Analytics Dashboard** (`/superadmin/platform-analytics`)

**Sections:**
- **Growth Metrics**:
  - MRR chart
  - ARR
  - New vs churned tenants
  - Net revenue retention

- **Inventory Metrics**:
  - Total devices tracked
  - Top brands/models
  - Inventory turnover
  - Total inventory value

- **Transaction Metrics**:
  - GMV chart
  - Transaction volume
  - Top selling devices
  - Payment method breakdown

- **Module Performance**:
  - Response time by module
  - Error rate by module
  - Usage volume by module

#### 4. **Retailer Health Dashboard** (`/superadmin/retailer-health`)

**Sections:**
- **Health Score Distribution** (pie chart)
  - Power Users (90-100)
  - Healthy (70-89)
  - At Risk (50-69)
  - Churn Risk (0-49)

- **At-Risk Tenants List**:
  - Tenants with score <70
  - Days since last login
  - Recommended actions

- **Power Users List**:
  - Top 10 most engaged tenants
  - Upsell opportunities
  - Referral candidates

- **Feature Adoption Heatmap**:
  - Rows: Tenants
  - Columns: Features
  - Color: Usage intensity

#### 5. **Support Dashboard** (`/superadmin/support`)

**Sections:**
- **Ticket Overview**:
  - Open tickets by severity
  - Average response time
  - Average resolution time

- **Common Issues**:
  - Top error patterns
  - Affected tenant count
  - Trend chart

- **Feature Requests**:
  - Most requested features
  - Vote count
  - Status (planned, in progress, completed)

---

## 14. Background Workers

### New Workers Needed

#### 1. **HealthScoreCalculator.php** (Daily)

```php
<?php
// backend/workers/HealthScoreCalculator.php

require_once __DIR__ . '/../config/database.php';

$database = new Database();
$conn = $database->connect();

// Get all active tenants
$stmt = $conn->query("SELECT id FROM tenants WHERE status = 'active'");
$tenants = $stmt->fetch_all(MYSQLI_ASSOC);

foreach ($tenants as $tenant) {
    $tenantId = $tenant['id'];
    
    // Calculate engagement score (0-40 points)
    $engagementScore = calculateEngagementScore($tenantId);
    
    // Calculate value score (0-30 points)
    $valueScore = calculateValueScore($tenantId);
    
    // Calculate data quality score (0-20 points)
    $dataQualityScore = calculateDataQualityScore($tenantId);
    
    // Calculate support score (0-10 points)
    $supportScore = calculateSupportScore($tenantId);
    
    // Total health score
    $healthScore = $engagementScore + $valueScore + $dataQualityScore + $supportScore;
    
    // Categorize
    $category = categorizeHealthScore($healthScore);
    
    // Insert into database
    $stmt = $conn->prepare("
        INSERT INTO retailer_health_scores 
        (tenant_id, health_score, engagement_score, value_score, data_quality_score, support_score, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iiiiiss", $tenantId, $healthScore, $engagementScore, $valueScore, $dataQualityScore, $supportScore, $category);
    $stmt->execute();
    
    // Alert on at-risk tenants
    if ($category === 'at_risk' || $category === 'churn_risk') {
        createRetentionAlert($tenantId, $healthScore, $category);
    }
}

echo "Health scores calculated for " . count($tenants) . " tenants\n";
```

#### 2. **StorageCalculator.php** (Daily)

Calculates database and file storage per tenant

#### 3. **FeatureUsageAggregator.php** (Hourly)

Aggregates feature usage data for faster queries

#### 4. **GrowthMetricsCalculator.php** (Daily)

Calculates MRR, ARR, churn, retention metrics

---

## 15. Cron Schedule

```bash
# Existing workers
*/5 * * * * /usr/bin/php /path/to/backend/workers/MetricsAggregator.php >> /var/log/metrics_aggregator.log 2>&1
* * * * * /usr/bin/php /path/to/backend/workers/AlertProcessor.php >> /var/log/alert_processor.log 2>&1
0 2 * * * /usr/bin/php /path/to/backend/workers/LogCleaner.php >> /var/log/log_cleaner.log 2>&1

# New SaaS workers
0 3 * * * /usr/bin/php /path/to/backend/workers/HealthScoreCalculator.php >> /var/log/health_score.log 2>&1
0 4 * * * /usr/bin/php /path/to/backend/workers/StorageCalculator.php >> /var/log/storage.log 2>&1
0 * * * * /usr/bin/php /path/to/backend/workers/FeatureUsageAggregator.php >> /var/log/feature_usage.log 2>&1
0 5 * * * /usr/bin/php /path/to/backend/workers/GrowthMetricsCalculator.php >> /var/log/growth_metrics.log 2>&1
```

---

## 16. Implementation Priority

### Phase 1: Foundation (Week 1-2)
- ✅ Update database schema (tenants, new tables)
- ✅ Create feature usage tracking helper
- ✅ Add module tagging to API logger

### Phase 2: Tenant Management (Week 2-3)
- ✅ Tenant list API + dashboard
- ✅ Tenant detail page
- ✅ Health score calculation
- ✅ Suspend/activate functionality

### Phase 3: Platform Metrics (Week 3-4)
- ✅ Growth metrics dashboard
- ✅ Inventory metrics dashboard
- ✅ Transaction metrics dashboard

### Phase 4: Retailer Health (Week 4-5)
- ✅ Health score dashboard
- ✅ At-risk tenant alerts
- ✅ Feature adoption heatmap

### Phase 5: Support (Week 5-6)
- ✅ Support ticket system (or integration)
- ✅ Common error patterns dashboard

---

## Summary

You now have a **complete SaaS metrics framework** covering:

1. ✅ **Tenant Management** - Full visibility into all retailers
2. ✅ **Inventory & Product Metrics** - Platform-wide device tracking
3. ✅ **Transaction & Sales Data** - GMV, commissions, sales patterns
4. ✅ **Retailer-Specific Health** - Feature adoption, usage patterns
5. ✅ **Growth Metrics** - MRR, churn, expansion revenue
6. ✅ **Usage Patterns** - Feature heatmap, API usage, storage
7. ✅ **Performance by Module** - Inventory, sales, marketplace performance
8. ✅ **Retailer Health Scores** - Engagement, value, data quality
9. ✅ **Support & Issues** - Tickets, error patterns, feature requests

**Next Steps:**
1. Review and approve additional suggested metrics (Device Lifecycle, Customer Insights, etc.)
2. Decide implementation priority
3. Start with database schema updates
4. Build tenant management dashboard first

**Questions for you:**
1. Do you currently track repairs/refurbishment? Should we add that?
2. Do you charge commissions on marketplace transactions?
3. Do you want built-in support ticketing or integrate with external system?
4. Which metrics are MOST important to you right now?

Let me know what to build first! 🚀
