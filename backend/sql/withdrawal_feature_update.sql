-- =================================================================
-- MARKETPLACE WITHDRAWAL FEATURE - PRODUCTION UPDATE
-- =================================================================
-- Date: 2025-12-23
-- Purpose:
-- 1. Create/Verify `kora_payment_references` table (if missing).
-- 2. Create/Verify `marketplace_withdrawal_requests` table (if missing).
-- 3. Add `status` column to `marketplace_wallet_transactions`.
-- 4. Add `kora_reference` to `marketplace_withdrawal_requests`.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =================================================================
-- 1. Helper Procedures
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

CREATE PROCEDURE IF NOT EXISTS ModifyColumnIfExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDef TEXT
)
BEGIN
    IF EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND COLUMN_NAME = columnName) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' MODIFY COLUMN ', columnName, ' ', columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DELIMITER ;

-- =================================================================
-- 2. Create `kora_payment_references` (if not exists)
-- =================================================================
CREATE TABLE IF NOT EXISTS `kora_payment_references` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `wallet_transaction_id` int(11) DEFAULT NULL,
  `order_id` int(11) DEFAULT NULL,
  `transaction_type` enum('pay_in','pay_out') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'NGN',
  `kora_reference` varchar(100) NOT NULL,
  `kora_transaction_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','success','failed') DEFAULT 'pending',
  `webhook_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `kora_reference` (`kora_reference`),
  UNIQUE KEY `kora_transaction_id` (`kora_transaction_id`),
  KEY `wallet_transaction_id` (`wallet_transaction_id`),
  KEY `idx_kora_reference` (`kora_reference`),
  KEY `idx_status` (`status`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `kora_payment_references_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =================================================================
-- 3. Create `marketplace_withdrawal_requests` (if not exists)
-- =================================================================
-- Note: Includes shop_id as created in recent isolation updates
CREATE TABLE IF NOT EXISTS `marketplace_withdrawal_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL DEFAULT 1,
  `wallet_id` int(11) NOT NULL,
  `kora_payment_id` int(11) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `bank_code` varchar(10) NOT NULL,
  `account_number` varchar(20) NOT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
  `requires_approval` tinyint(1) DEFAULT 0,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `retry_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `wallet_id` (`wallet_id`),
  KEY `kora_payment_id` (`kora_payment_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `marketplace_withdrawal_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `marketplace_withdrawal_requests_ibfk_2` FOREIGN KEY (`wallet_id`) REFERENCES `marketplace_wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =================================================================
-- 4. Apply Schema Changes
-- =================================================================

-- Add `status` to marketplace_wallet_transactions
CALL AddColumnIfNotExists('marketplace_wallet_transactions', 'status', "ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'completed' AFTER transaction_type");

-- Add `kora_reference` to marketplace_withdrawal_requests
CALL AddColumnIfNotExists('marketplace_withdrawal_requests', 'kora_reference', "VARCHAR(100) DEFAULT NULL AFTER wallet_id");

-- Relax NOT NULL constraints on bank_name and account_name (since Kora might resolve them later)
CALL ModifyColumnIfExists('marketplace_withdrawal_requests', 'bank_name', "VARCHAR(100) NULL");
CALL ModifyColumnIfExists('marketplace_withdrawal_requests', 'account_name', "VARCHAR(255) NULL");

-- =================================================================
-- 5. Cleanup
-- =================================================================
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS ModifyColumnIfExists;

SET FOREIGN_KEY_CHECKS = 1;

SELECT "Marketplace Withdrawal Feature Update Completed" AS Status;
