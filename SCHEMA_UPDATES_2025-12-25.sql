-- ============================================
-- SCHEMA UPDATES - December 25, 2025
-- Debt Management System Fixes
-- ============================================

-- These updates should be applied to the main database_schema.sql file
-- They fix issues with manual debt creation and ensure schema consistency

-- ============================================
-- UPDATE 1: transaction_items table
-- ============================================

-- Add description column for manual transaction items
-- This column stores descriptions for manual debt entries
ALTER TABLE `transaction_items` 
ADD COLUMN IF NOT EXISTS `description` VARCHAR(500) NULL DEFAULT NULL 
COMMENT 'Description for manual items' 
AFTER `type`;

-- Make inventory_id nullable to support manual items
-- Manual items (debts) don't have an associated inventory item
ALTER TABLE `transaction_items` 
MODIFY COLUMN `inventory_id` INT(11) NULL DEFAULT NULL;

-- ============================================
-- UPDATE 2: debts table
-- ============================================

-- Ensure tenant_id exists in debts table for multi-tenant isolation
ALTER TABLE `debts` 
ADD COLUMN IF NOT EXISTS `tenant_id` INT(11) NOT NULL 
AFTER `id`;

-- Add index for tenant_id if not exists
ALTER TABLE `debts` 
ADD KEY IF NOT EXISTS `tenant_id` (`tenant_id`);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify the updates were successful:

-- Check transaction_items structure
-- DESCRIBE transaction_items;

-- Check debts structure
-- DESCRIBE debts;

-- Expected transaction_items schema:
-- - inventory_id: NULL allowed (YES)
-- - description: EXISTS, VARCHAR(500), NULL allowed

-- Expected debts schema:
-- - tenant_id: EXISTS, INT(11), NOT NULL

-- ============================================
-- Notes:
-- ============================================
-- 1. Use IF NOT EXISTS / IF EXISTS to avoid errors on re-run
-- 2. All changes are backward compatible
-- 3. No data loss will occur
-- 4. These updates enable manual debt creation to work properly
