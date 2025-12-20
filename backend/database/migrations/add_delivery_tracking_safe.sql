-- Migration: Add Delivery Tracking and Dispute Resolution System
-- Date: 2025-12-20
-- Safe migration with conditional column additions

-- Step 1: Add delivery_status column to marketplace_orders table (if not exists)
SET @dbname = DATABASE();
SET @tablename = "marketplace_orders";
SET @columnname = "delivery_status";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE marketplace_orders ADD COLUMN delivery_status ENUM('pending', 'shipped', 'received') DEFAULT 'pending' AFTER order_status"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 2: Add order_id foreign key to marketplace_conversations table (if not exists)
SET @tablename = "marketplace_conversations";
SET @columnname = "order_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE marketplace_conversations ADD COLUMN order_id INT NULL AFTER listing_id"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 3: Create order_disputes table
CREATE TABLE IF NOT EXISTS order_disputes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reported_id INT NOT NULL,
    issue_type ENUM('not_shipped', 'wrong_item', 'damaged', 'not_as_described', 'payment_issue', 'other') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'under_review', 'resolved', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Add foreign keys if they don't exist
SET @dbname = DATABASE();
SET @fkname = 'order_id';
SET @tablename = 'marketplace_conversations';

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @fkname
    AND REFERENCED_TABLE_NAME IS NOT NULL
  ) > 0,
  "SELECT 1",
  "ALTER TABLE marketplace_conversations ADD FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign keys for order_disputes
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'order_disputes'
    AND COLUMN_NAME = 'order_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  ) > 0,
  "SELECT 1",
  "ALTER TABLE order_disputes ADD FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'order_disputes'
    AND COLUMN_NAME = 'reporter_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  ) > 0,
  "SELECT 1",
  "ALTER TABLE order_disputes ADD FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'order_disputes'
    AND COLUMN_NAME = 'reported_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  ) > 0,
  "SELECT 1",
  "ALTER TABLE order_disputes ADD FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
