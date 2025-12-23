-- Fix Marketplace Interests Unique Indexes for Multi-Branch Isolation

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

-- 3. Fix marketplace_interests
-- Remove the legacy user_id unique constraint (which was user_id + listing_id)
CALL DropIndexIfExists('marketplace_interests', 'user_id');

-- Add new composite unique index including shop_id
CALL AddUniqueCompositeIndex('marketplace_interests', 'idx_user_listing_shop', 'user_id, listing_id, shop_id');

-- Cleanup
DROP PROCEDURE IF EXISTS DropIndexIfExists;
DROP PROCEDURE IF EXISTS AddUniqueCompositeIndex;
