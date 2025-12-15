-- ============================================================================
-- MIGRATION: Add Vendor Field to Inventory Table
-- ============================================================================
-- 
-- This migration adds a 'vendor' field to the inventory table to track
-- the supplier/vendor for each phone.
--
-- USAGE:
-- mysql -u username -p database_name < add_vendor_field.sql
--
-- ROLLBACK (if needed):
-- ALTER TABLE inventory DROP COLUMN vendor;
-- DROP INDEX idx_vendor ON inventory;
--
-- ============================================================================

-- Set character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Add vendor column to inventory table (if it doesn't exist)
SET @dbname = DATABASE();
SET @tablename = 'inventory';
SET @columnname = 'vendor';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT ''Column already exists'' AS Status;',
  'ALTER TABLE inventory ADD COLUMN vendor VARCHAR(100) NULL COMMENT ''Supplier/vendor name'' AFTER imei;'
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index on vendor column (if it doesn't exist)
SET @indexname = 'idx_vendor';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT ''Index already exists'' AS Status;',
  'CREATE INDEX idx_vendor ON inventory(vendor);'
));

PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Verify the changes
SELECT '============================================' AS '';
SELECT '✅ MIGRATION COMPLETED SUCCESSFULLY!' AS '';
SELECT '============================================' AS '';
SELECT '' AS '';
SELECT 'Changes Applied:' AS '';
SELECT '- Added vendor column to inventory table' AS '';
SELECT '- Added index on vendor column for performance' AS '';
SELECT '' AS '';
SELECT 'Verification:' AS '';

-- Show the inventory table structure
DESCRIBE inventory;

SELECT '' AS '';
SELECT '============================================' AS '';
