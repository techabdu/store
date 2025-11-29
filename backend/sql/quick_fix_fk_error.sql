-- Quick Fix for Foreign Key Error
-- This ensures tenant_id columns match the tenants.id column type exactly

-- First, check the tenants table structure
SELECT 'Checking tenants.id column type...' AS Info;
SHOW CREATE TABLE tenants;

-- The issue is likely that tenant_id needs to match tenants.id exactly
-- Let's fix the users table first as an example

-- Drop the tenant_id column if it exists
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;

-- Add it back with the correct type matching tenants.id
ALTER TABLE users 
ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id),
ADD CONSTRAINT fk_users_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

SELECT 'Users table fixed! If this works, we can apply to other tables.' AS Status;
