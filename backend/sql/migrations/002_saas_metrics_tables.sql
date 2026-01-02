-- Migration: 002_saas_metrics_tables.sql
-- Description: Create tables for SaaS metrics, health scores, and tenant management
-- Date: 2026-01-02

USE store;

-- 1. Subscription History
CREATE TABLE IF NOT EXISTS subscription_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    from_plan VARCHAR(50) NULL,
    to_plan VARCHAR(50) NOT NULL,
    from_mrr DECIMAL(10,2) NULL,
    to_mrr DECIMAL(10,2) NOT NULL,
    change_type ENUM('signup', 'upgrade', 'downgrade', 'cancellation', 'reactivation') NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- 2. Feature Usage Tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    shop_id INT,
    user_id INT NOT NULL,
    feature_name VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_feature (tenant_id, feature_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- 3. Storage Metrics
CREATE TABLE IF NOT EXISTS storage_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    database_size_mb DECIMAL(10,2) NOT NULL,
    file_storage_mb DECIMAL(10,2) NOT NULL,
    total_records INT NOT NULL,
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_date (tenant_id, measured_at)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- 4. Retailer Health Scores
CREATE TABLE IF NOT EXISTS retailer_health_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    health_score INT NOT NULL, -- 0-100
    engagement_score INT NOT NULL, -- 0-40
    value_score INT NOT NULL, -- 0-30
    data_quality_score INT NOT NULL, -- 0-20
    support_score INT NOT NULL, -- 0-10
    category ENUM('power_user', 'healthy', 'at_risk', 'churn_risk') NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_category (category),
    INDEX idx_calculated_at (calculated_at)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- 5. Inventory Update Log
CREATE TABLE IF NOT EXISTS inventory_update_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    shop_id INT NOT NULL,
    inventory_id INT NOT NULL,
    action ENUM('create', 'update', 'delete', 'status_change') NOT NULL,
    changed_fields JSON,
    updated_by INT NOT NULL, -- user_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_date (tenant_id, created_at)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- 6. Marketplace Dispute Tracking
CREATE TABLE IF NOT EXISTS marketplace_dispute_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    transaction_id INT NULL,
    reported_entity_type ENUM('shop', 'listing', 'transaction', 'other') NOT NULL,
    reported_entity_id INT NULL,
    dispute_type ENUM('fraud', 'not_received', 'damaged', 'misrepresentation', 'other') NOT NULL,
    description TEXT,
    status ENUM('open', 'investigating', 'resolved', 'dismissed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- Updates to existing tables

-- Update tenants table
-- Check if columns exist before adding (using a stored procedure approach is cleaner but simple ALTER IGNORE or individual statements work well enough for this environment if we assume they don't exist yet, or we accept errors. However, to be safe, I'll specificy the ALTERs)
-- Note: 'trial_ends_at' already exists in tenants table based on previous DESCRIBE, but plan wants to add it. I will skip adding it if it exists or use MODIFY.
-- Actually, the DESCRIBE showed `trial_ends_at` exists.
-- `plan_type` exists. `subscription_plan` is requested.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan ENUM('trial', 'basic', 'pro', 'enterprise') DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mrr DECIMAL(10,2) DEFAULT 0.00;
-- trial_ends_at already exists, but ensuring it matches
ALTER TABLE tenants MODIFY COLUMN trial_ends_at TIMESTAMP NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

-- Update transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Platform commission percentage';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_trade_in TINYINT(1) DEFAULT 0;
