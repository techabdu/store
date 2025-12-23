-- Fix Marketplace Unique Indexes for Multi-Branch Isolation

SET NAMES utf8mb4;

-- 1. Helper Procedure to drop index if exists
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS DropIndexIfExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName 
        AND INDEX_NAME = indexName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' DROP INDEX ', indexName);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- 2. Procedure to add unique composite index
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS AddUniqueCompositeIndex(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnList TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName 
        AND INDEX_NAME = indexName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD UNIQUE INDEX ', indexName, ' (', columnList, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- 3. Fix marketplace_wallets
-- Remove the single user_id unique constraint
CALL DropIndexIfExists('marketplace_wallets', 'user_id');
-- Ensure composite unique index exists
CALL AddUniqueCompositeIndex('marketplace_wallets', 'idx_user_shop_unique', 'user_id, shop_id');

-- 4. Fix marketplace_profiles
-- Remove the global shop_id unique constraint (which was likely a mistake)
CALL DropIndexIfExists('marketplace_profiles', 'idx_shop_unique');
-- Remove any single user_id unique constraint if it exists (check show index showed it as non-unique though)
-- But we want a UNIQUE composite one
CALL AddUniqueCompositeIndex('marketplace_profiles', 'idx_user_shop_unique', 'user_id, shop_id');

-- Cleanup
DROP PROCEDURE IF EXISTS DropIndexIfExists;
DROP PROCEDURE IF EXISTS AddUniqueCompositeIndex;
