-- Rollback Script for Multi-Tenancy Migration
-- Use this ONLY if you need to undo the migration
-- IMPORTANT: This will remove all tenant_id columns and restore shop_settings

-- Step 1: Recreate shop_settings table
CREATE TABLE IF NOT EXISTS shop_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Step 2: Restore business_capital from tenants to shop_settings
INSERT INTO shop_settings (setting_key, setting_value)
SELECT 'business_capital', business_capital FROM tenants WHERE id = 1
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Insert other default settings
INSERT IGNORE INTO shop_settings (setting_key, setting_value) VALUES 
('shop_name', 'My Phone Store'),
('shop_address', '123 Tech Street, Digital City'),
('shop_phone', ''),
('shop_email', ''),
('low_stock_threshold', '5');

-- Step 3: Drop foreign key constraints first (IMPORTANT!)
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_tenant;
ALTER TABLE inventory DROP FOREIGN KEY IF EXISTS fk_inventory_tenant;
ALTER TABLE transactions DROP FOREIGN KEY IF EXISTS fk_transactions_tenant;
ALTER TABLE transaction_items DROP FOREIGN KEY IF EXISTS fk_transaction_items_tenant;
ALTER TABLE expenses DROP FOREIGN KEY IF EXISTS fk_expenses_tenant;
ALTER TABLE activity_logs DROP FOREIGN KEY IF EXISTS fk_activity_logs_tenant;
ALTER TABLE sessions DROP FOREIGN KEY IF EXISTS fk_sessions_tenant;
ALTER TABLE system_alerts DROP FOREIGN KEY IF EXISTS fk_system_alerts_tenant;
ALTER TABLE security_logs DROP FOREIGN KEY IF EXISTS fk_security_logs_tenant;

-- Check if reports table exists and drop its foreign key
SET @reports_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'reports'
);

SET @sql = IF(@reports_exists > 0,
    'ALTER TABLE reports DROP FOREIGN KEY IF EXISTS fk_reports_tenant',
    'SELECT "Reports table does not exist, skipping..."'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Drop tenant_id columns from all tables
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE inventory DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE transaction_items DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE activity_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE system_alerts DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE security_logs DROP COLUMN IF EXISTS tenant_id;

-- Drop tenant_id from reports if it exists
SET @sql = IF(@reports_exists > 0,
    'ALTER TABLE reports DROP COLUMN IF EXISTS tenant_id',
    'SELECT "Reports table does not exist, skipping..."'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Now we can safely drop tenants table
DROP TABLE IF EXISTS tenants;

SELECT 'Rollback completed successfully!' AS Status;
SELECT 'Database restored to pre-migration state' AS Note;
SELECT 'You can now re-run the migration with the fixed scripts' AS NextStep;
