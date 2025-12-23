-- Fix Marketplace Interests Unique Indexes (Handling FKs)

SET NAMES utf8mb4;

-- 1. Helper Procedure to drop Foreign Key if exists
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS DropFKIfExists(
    IN tableName VARCHAR(64),
    IN constraintName VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName 
        AND CONSTRAINT_NAME = constraintName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' DROP FOREIGN KEY ', constraintName);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- 2. Helper Procedure to drop Index if exists
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

-- 3. Procedure to add unique composite index
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

-- 4. Execution Logic
-- Drop FK first
CALL DropFKIfExists('marketplace_interests', 'marketplace_interests_ibfk_1');

-- Drop the legacy unique index
CALL DropIndexIfExists('marketplace_interests', 'user_id');

-- Add new composite unique index including shop_id
CALL AddUniqueCompositeIndex('marketplace_interests', 'idx_user_listing_shop', 'user_id, listing_id, shop_id');

-- Restore FK (using user_id, which is part of the new index or just add a simple index for it)
-- To be safe, we add a simple index for user_id so FK recreation is fast and guaranteed
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS AddIndexIfNotExists(IN tableName VARCHAR(64), IN indexName VARCHAR(64), IN colName VARCHAR(64))
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND INDEX_NAME = indexName) THEN
        SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, '(', colName, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL AddIndexIfNotExists('marketplace_interests', 'idx_user_fk_restore', 'user_id');

-- Re-add the Foreign Key
ALTER TABLE marketplace_interests 
ADD CONSTRAINT marketplace_interests_ibfk_1 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Cleanup
DROP PROCEDURE IF EXISTS DropFKIfExists;
DROP PROCEDURE IF EXISTS DropIndexIfExists;
DROP PROCEDURE IF EXISTS AddUniqueCompositeIndex;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
