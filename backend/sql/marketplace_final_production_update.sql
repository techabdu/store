-- =================================================================
-- MARKETPLACE DATA ISOLATION - FINAL PRODUCTION UPDATE SCRIPT
-- =================================================================
-- Date: 2025-12-23
-- Purpose: 
-- 1. Add `shop_id` column to all marketplace tables.
-- 2. Backfill existing data with correct shop IDs.
-- 3. Fix unique constraints to allow one wallet/profile *per branch*.
-- 4. Fix favorites/interests uniqueness to be per-branch.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0; -- Disable FK checks temporarily for smoother alterations

-- =================================================================
-- 1. HELPER PROCEDURES (Safe DDL Execution)
-- =================================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDef TEXT
)
BEGIN
    IF EXISTS (SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName) THEN
        IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND COLUMN_NAME = columnName) THEN
            SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef);
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END //

CREATE PROCEDURE IF NOT EXISTS DropIndexIfExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64)
)
BEGIN
    IF EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND INDEX_NAME = indexName) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' DROP INDEX ', indexName);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

CREATE PROCEDURE IF NOT EXISTS AddUniqueCompositeIndex(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnList TEXT
)
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND INDEX_NAME = indexName) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD UNIQUE INDEX ', indexName, ' (', columnList, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

CREATE PROCEDURE IF NOT EXISTS DropFKIfExists(
    IN tableName VARCHAR(64),
    IN constraintName VARCHAR(64)
)
BEGIN
    IF EXISTS (SELECT * FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND CONSTRAINT_NAME = constraintName) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' DROP FOREIGN KEY ', constraintName);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

CREATE PROCEDURE IF NOT EXISTS AddIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnList TEXT
)
BEGIN
    IF EXISTS (SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName) THEN
        IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND INDEX_NAME = indexName) THEN
            SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, ' (', columnList, ')');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END //

DELIMITER ;

-- =================================================================
-- 2. ADD shop_id COLUMNS
-- =================================================================
CALL AddColumnIfNotExists('marketplace_wallets', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_wallet_transactions', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_withdrawal_requests', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('order_disputes', 'shop_id', 'INT NULL AFTER id');
CALL AddColumnIfNotExists('marketplace_reviews', 'shop_id', 'INT NULL AFTER reviewer_id');
CALL AddColumnIfNotExists('marketplace_interests', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_auction_bids', 'shop_id', 'INT NULL AFTER bidder_id');
CALL AddColumnIfNotExists('marketplace_identity_verifications', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_verification_attempts', 'shop_id', 'INT NULL AFTER user_id');

-- =================================================================
-- 3. DATA MIGRATION (Backfill shop_id)
-- =================================================================
-- Backfill from Profiles
UPDATE marketplace_wallets w
JOIN marketplace_profiles p ON w.user_id = p.user_id
SET w.shop_id = p.shop_id
WHERE w.shop_id IS NULL OR w.shop_id = 0;

UPDATE marketplace_wallet_transactions t
JOIN marketplace_profiles p ON t.user_id = p.user_id
SET t.shop_id = p.shop_id
WHERE t.shop_id IS NULL OR t.shop_id = 0;

-- Backfill from Orders
UPDATE order_disputes d
JOIN marketplace_orders o ON d.order_id = o.id
SET d.shop_id = o.seller_shop_id
WHERE d.shop_id IS NULL OR d.shop_id = 0;

-- Default remaining NULLs to Shop ID 1
UPDATE marketplace_wallets SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE marketplace_wallet_transactions SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE marketplace_withdrawal_requests SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE order_disputes SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE marketplace_reviews SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE marketplace_interests SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE marketplace_auction_bids SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE marketplace_identity_verifications SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;
UPDATE marketplace_verification_attempts SET shop_id = 1 WHERE shop_id IS NULL OR shop_id = 0;

-- Make mandatory columns NOT NULL
ALTER TABLE marketplace_wallets MODIFY COLUMN shop_id INT NOT NULL DEFAULT 1;
ALTER TABLE marketplace_wallet_transactions MODIFY COLUMN shop_id INT NOT NULL DEFAULT 1;

-- =================================================================
-- 4. FIX WALLET & PROFILE ISOLATION (Unique Indexes)
-- =================================================================
-- Fix Wallets (One wallet per user PER SHOP)
CALL DropIndexIfExists('marketplace_wallets', 'user_id');
CALL AddUniqueCompositeIndex('marketplace_wallets', 'idx_user_shop_unique', 'user_id, shop_id');
CALL AddIndexIfNotExists('marketplace_wallets', 'idx_user_lookup', 'user_id'); -- Keep casual lookup fast

-- Fix Profiles (One profile per user PER SHOP)
CALL DropIndexIfExists('marketplace_profiles', 'idx_shop_unique');
CALL DropIndexIfExists('marketplace_profiles', 'user_id'); -- Drop if exists as unique
CALL AddUniqueCompositeIndex('marketplace_profiles', 'idx_user_shop_unique', 'user_id, shop_id');
CALL AddIndexIfNotExists('marketplace_profiles', 'idx_user_lookup', 'user_id');

-- =================================================================
-- 5. FIX INTERESTS ISOLATION (Foreign Keys & Unique Indexes)
-- =================================================================
-- Drop conflicting FK
CALL DropFKIfExists('marketplace_interests', 'marketplace_interests_ibfk_1');

-- Drop legacy unique index (user_id + listing_id)
CALL DropIndexIfExists('marketplace_interests', 'user_id');

-- Add new per-shop unique index
CALL AddUniqueCompositeIndex('marketplace_interests', 'idx_user_listing_shop', 'user_id, listing_id, shop_id');

-- Restore FK integrity (ensure index exists first for FK performance)
CALL AddIndexIfNotExists('marketplace_interests', 'idx_user_fk_restore', 'user_id');

ALTER TABLE marketplace_interests 
ADD CONSTRAINT marketplace_interests_ibfk_1 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =================================================================
-- 6. CLEANUP
-- =================================================================
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS DropIndexIfExists;
DROP PROCEDURE IF EXISTS AddUniqueCompositeIndex;
DROP PROCEDURE IF EXISTS DropFKIfExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

SET FOREIGN_KEY_CHECKS = 1;

-- Final Confirmation
SELECT "Marketplace Isolation Update Completed Successfully" AS Status;
