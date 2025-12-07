-- ============================================================================
-- PRODUCTION MIGRATION SCRIPT - Multi-Tenancy Phase 1
-- ============================================================================
-- This script migrates your single-shop system to multi-tenancy
-- IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT!
-- 
-- What this script does:
-- 1. Creates tenants table
-- 2. Migrates shop_settings data to tenants table
-- 3. Adds tenant_id to all tables
-- 4. Assigns all existing data to default tenant
-- 5. Creates foreign key constraints
-- 6. Drops shop_settings table (data preserved in tenants)
-- ============================================================================

-- Step 1: Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(100) NOT NULL,
    shop_address TEXT NULL,
    shop_phone VARCHAR(20) NOT NULL,
    shop_email VARCHAR(100) NOT NULL UNIQUE,
    business_capital DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM('active', 'suspended', 'pending', 'trial') DEFAULT 'trial',
    plan_type ENUM('free_trial', 'basic', 'premium', 'enterprise') DEFAULT 'free_trial',
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    email_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_plan_type (plan_type),
    INDEX idx_trial_ends_at (trial_ends_at),
    INDEX idx_email_verified (email_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Migrate shop_settings data to tenants table
INSERT INTO tenants (
    shop_name, 
    shop_address, 
    shop_phone, 
    shop_email, 
    business_capital,
    status, 
    plan_type,
    email_verified,
    created_at
) 
SELECT 
    COALESCE((SELECT setting_value FROM shop_settings WHERE setting_key = 'shop_name'), 'Main Shop'),
    COALESCE((SELECT setting_value FROM shop_settings WHERE setting_key = 'shop_address'), '123 Tech Street, Digital City'),
    COALESCE((SELECT setting_value FROM shop_settings WHERE setting_key = 'shop_phone'), '+1234567890'),
    COALESCE((SELECT setting_value FROM shop_settings WHERE setting_key = 'shop_email'), 'admin@mainshop.com'),
    COALESCE((SELECT setting_value FROM shop_settings WHERE setting_key = 'business_capital'), 0.00),
    'active',
    'enterprise',
    1,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = 1);

-- Step 3: Add tenant_id to users table
ALTER TABLE users 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE users 
ADD CONSTRAINT fk_users_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Add tenant_id to inventory table
ALTER TABLE inventory 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE inventory 
ADD CONSTRAINT fk_inventory_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Add tenant_id to transactions table
ALTER TABLE transactions 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Add tenant_id to transaction_items table
ALTER TABLE transaction_items 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE transaction_items 
ADD CONSTRAINT fk_transaction_items_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Add tenant_id to expenses table
ALTER TABLE expenses 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE expenses 
ADD CONSTRAINT fk_expenses_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Add tenant_id to activity_logs table
ALTER TABLE activity_logs 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE activity_logs 
ADD CONSTRAINT fk_activity_logs_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Add tenant_id to sessions table
ALTER TABLE sessions 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE sessions 
ADD CONSTRAINT fk_sessions_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Add tenant_id to system_alerts table (NULL allowed for global alerts)
ALTER TABLE system_alerts 
ADD COLUMN tenant_id INT NULL AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE system_alerts 
ADD CONSTRAINT fk_system_alerts_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Add tenant_id to security_logs table
ALTER TABLE security_logs 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE security_logs 
ADD CONSTRAINT fk_security_logs_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 12: Add tenant_id to reports table (if exists)
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'reports'
);

SET @sql = IF(@table_exists > 0,
    'ALTER TABLE reports 
     ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
     ADD INDEX idx_tenant_id (tenant_id)',
    'SELECT "Reports table does not exist, skipping..." AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0,
    'ALTER TABLE reports 
     ADD CONSTRAINT fk_reports_tenant 
         FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
         ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Reports table does not exist, skipping..." AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 13: Drop shop_settings table (data already migrated to tenants)
DROP TABLE IF EXISTS shop_settings;

-- Migration complete!
SELECT '✅ Multi-tenancy migration completed successfully!' AS Status;
SELECT 'All tables now have tenant_id column' AS Info;
SELECT 'shop_settings data migrated to tenants table' AS Info;
SELECT 'All existing data assigned to tenant_id = 1' AS Info;
