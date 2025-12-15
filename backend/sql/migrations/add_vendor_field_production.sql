-- ============================================================================
-- PRODUCTION MIGRATION: Add Vendor Field to Inventory Table
-- ============================================================================
-- 
-- INSTRUCTIONS FOR PRODUCTION DEPLOYMENT:
-- 
-- 1. BACKUP YOUR DATABASE FIRST!
--    mysqldump -u username -p database_name > backup_before_vendor_field.sql
--
-- 2. Run this migration:
--    mysql -u username -p database_name < add_vendor_field_production.sql
--
-- 3. Verify the changes were applied successfully
--
-- This migration is SAFE to run multiple times (idempotent)
-- ============================================================================

-- Add vendor column to inventory table
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS vendor VARCHAR(100) NULL COMMENT 'Supplier/vendor name' 
AFTER imei;

-- Add index on vendor column for performance
CREATE INDEX IF NOT EXISTS idx_vendor ON inventory(vendor);

-- Verify the changes
SELECT '✅ Migration completed successfully!' AS Status;
SELECT 'Vendor column added to inventory table' AS Change1;
SELECT 'Index created on vendor column' AS Change2;

-- Show updated table structure
DESCRIBE inventory;
