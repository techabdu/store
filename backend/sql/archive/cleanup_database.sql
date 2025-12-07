-- Complete Database Cleanup Script
-- This removes all multi-tenancy changes and resets to original state
-- Run this FIRST before attempting migration again

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all foreign key constraints related to tenants
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_tenant;
ALTER TABLE inventory DROP FOREIGN KEY IF EXISTS fk_inventory_tenant;
ALTER TABLE transactions DROP FOREIGN KEY IF EXISTS fk_transactions_tenant;
ALTER TABLE transaction_items DROP FOREIGN KEY IF EXISTS fk_transaction_items_tenant;
ALTER TABLE expenses DROP FOREIGN KEY IF EXISTS fk_expenses_tenant;
ALTER TABLE activity_logs DROP FOREIGN KEY IF EXISTS fk_activity_logs_tenant;
ALTER TABLE sessions DROP FOREIGN KEY IF EXISTS fk_sessions_tenant;
ALTER TABLE system_alerts DROP FOREIGN KEY IF EXISTS fk_system_alerts_tenant;
ALTER TABLE security_logs DROP FOREIGN KEY IF EXISTS fk_security_logs_tenant;
ALTER TABLE reports DROP FOREIGN KEY IF EXISTS fk_reports_tenant;

-- Drop all tenant_id columns
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE inventory DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE transaction_items DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE activity_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE system_alerts DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE security_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE reports DROP COLUMN IF EXISTS tenant_id;

-- Drop tenants table
DROP TABLE IF EXISTS tenants;

-- Recreate shop_settings if it doesn't exist
CREATE TABLE IF NOT EXISTS shop_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default values
INSERT IGNORE INTO shop_settings (setting_key, setting_value) VALUES 
('shop_name', 'My Phone Store'),
('shop_address', '123 Tech Street, Digital City'),
('shop_phone', ''),
('shop_email', ''),
('business_capital', '0.00'),
('low_stock_threshold', '5');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Database cleaned successfully! Ready for fresh migration.' AS Status;
