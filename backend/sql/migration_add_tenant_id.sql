-- Multi-Tenancy Migration Script (FIXED VERSION)
-- Adds tenant_id to all relevant tables and migrates existing data to default tenant
-- IMPORTANT: Backup your database before running this script!
-- FIXED: Resolves foreign key constraint errors by using DEFAULT values

-- Step 1: Add tenant_id column to users table with DEFAULT
ALTER TABLE users 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

-- Step 2: Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 3: Add tenant_id to inventory table
ALTER TABLE inventory 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE inventory 
ADD CONSTRAINT fk_inventory_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Add tenant_id to transactions table
ALTER TABLE transactions 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Add tenant_id to transaction_items table
ALTER TABLE transaction_items 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE transaction_items 
ADD CONSTRAINT fk_transaction_items_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Add tenant_id to expenses table
ALTER TABLE expenses 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE expenses 
ADD CONSTRAINT fk_expenses_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Add tenant_id to activity_logs table
ALTER TABLE activity_logs 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE activity_logs 
ADD CONSTRAINT fk_activity_logs_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Add tenant_id to sessions table
ALTER TABLE sessions 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE sessions 
ADD CONSTRAINT fk_sessions_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Add tenant_id to system_alerts table (NULL allowed for global alerts)
ALTER TABLE system_alerts 
ADD COLUMN tenant_id INT NULL AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

-- Don't set default for system_alerts - they can be global (NULL) or tenant-specific

ALTER TABLE system_alerts 
ADD CONSTRAINT fk_system_alerts_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Add tenant_id to security_logs table
ALTER TABLE security_logs 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE security_logs 
ADD CONSTRAINT fk_security_logs_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Migrate shop_settings to tenants table and drop shop_settings
-- Save existing business_capital value first
SET @business_capital = (SELECT setting_value FROM shop_settings WHERE setting_key = 'business_capital' LIMIT 1);

-- Update default tenant with business capital from shop_settings
UPDATE tenants 
SET business_capital = COALESCE(@business_capital, 0.00)
WHERE id = 1;

-- Now we can drop shop_settings table as tenants table replaces it
DROP TABLE IF EXISTS shop_settings;

-- Step 12: Add tenant_id to reports table (if exists)
-- Check if reports table exists first
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'reports'
);

-- Only run if reports table exists
SET @sql = IF(@table_exists > 0,
    'ALTER TABLE reports 
     ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
     ADD INDEX idx_tenant_id (tenant_id)',
    'SELECT "Reports table does not exist, skipping..."'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@table_exists > 0,
    'ALTER TABLE reports 
     ADD CONSTRAINT fk_reports_tenant 
         FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
         ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Reports table does not exist, skipping..."'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration complete!
SELECT 'Multi-tenancy migration completed successfully!' AS Status;
SELECT 'All tables now have tenant_id column with proper foreign keys' AS Info;
