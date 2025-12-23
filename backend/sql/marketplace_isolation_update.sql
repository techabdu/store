-- Marketplace Data Isolation Migration (Refined)
-- This script adds shop_id to all marketplace tables to support multi-branch isolation.
-- Designed to be idempotent and safe.

SET NAMES utf8mb4;

-- 1. Helper Procedure to add column if not exists
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDef TEXT
)
BEGIN
    -- Check if table exists first
    IF EXISTS (
        SELECT * FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName
    ) THEN
        -- Check if column exists
        IF NOT EXISTS (
            SELECT * FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = tableName 
            AND COLUMN_NAME = columnName
        ) THEN
            SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef);
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END //
DELIMITER ;

-- 2. Add shop_id to existing tables
CALL AddColumnIfNotExists('marketplace_wallets', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_wallet_transactions', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_withdrawal_requests', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('order_disputes', 'shop_id', 'INT NULL AFTER id');
CALL AddColumnIfNotExists('marketplace_reviews', 'shop_id', 'INT NULL AFTER reviewer_id');
CALL AddColumnIfNotExists('marketplace_interests', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_auction_bids', 'shop_id', 'INT NULL AFTER bidder_id');
CALL AddColumnIfNotExists('marketplace_identity_verifications', 'shop_id', 'INT NULL AFTER user_id');
CALL AddColumnIfNotExists('marketplace_verification_attempts', 'shop_id', 'INT NULL AFTER user_id');

-- 3. Data Migration: Try to backfill shop_id from related tables
-- For most tables, we can link via user_id to marketplace_profiles which already has shop_id
UPDATE marketplace_wallets w
JOIN marketplace_profiles p ON w.user_id = p.user_id
SET w.shop_id = p.shop_id
WHERE w.shop_id IS NULL;

UPDATE marketplace_wallet_transactions t
JOIN marketplace_profiles p ON t.user_id = p.user_id
SET t.shop_id = p.shop_id
WHERE t.shop_id IS NULL;

UPDATE marketplace_withdrawal_requests r
JOIN marketplace_profiles p ON r.user_id = p.user_id
SET r.shop_id = p.shop_id
WHERE r.shop_id IS NULL;

UPDATE order_disputes d
JOIN marketplace_orders o ON d.order_id = o.id
SET d.shop_id = o.seller_shop_id
WHERE d.shop_id IS NULL;

-- 4. Default remaining NULLs to main shop (usually ID 1)
UPDATE marketplace_wallets SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE marketplace_wallet_transactions SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE marketplace_withdrawal_requests SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE order_disputes SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE marketplace_reviews SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE marketplace_interests SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE marketplace_auction_bids SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE marketplace_identity_verifications SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE marketplace_verification_attempts SET shop_id = 1 WHERE shop_id IS NULL;

-- 5. Make shop_id NOT NULL and add Foreign Keys where critical
ALTER TABLE marketplace_wallets MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE marketplace_wallet_transactions MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE marketplace_withdrawal_requests MODIFY COLUMN shop_id INT NOT NULL;

-- 6. Add Indexes for isolation performance
-- Using a helper for index too just in case
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS AddIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnList TEXT
)
BEGIN
    IF EXISTS (
        SELECT * FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName
    ) THEN
        IF NOT EXISTS (
            SELECT * FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = tableName 
            AND INDEX_NAME = indexName
        ) THEN
            SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, ' (', columnList, ')');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END //
DELIMITER ;

CALL AddIndexIfNotExists('marketplace_wallets', 'idx_wallet_shop', 'shop_id');
CALL AddIndexIfNotExists('marketplace_wallet_transactions', 'idx_trans_shop', 'shop_id');
CALL AddIndexIfNotExists('order_disputes', 'idx_order_dispute_shop', 'shop_id');

-- A user can have one wallet per shop (if we want that level of isolation)
-- We need to check if we can add this unique constraint without violating existing data
-- For now we just add a regular index to avoid failure if they have duplicate wallets (unlikely but possible)
CALL AddIndexIfNotExists('marketplace_wallets', 'idx_user_shop_wallet', 'user_id, shop_id');

-- Cleanup
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
