-- Phone Retailer Management System - Debt Module Migration (MariaDB/MySQL Idempotent)
-- Target Database: MariaDB / MySQL
-- Date: December 24, 2024

-- 1. Safely Update Transactions table to support debt payments
-- Using ADD COLUMN IF NOT EXISTS (Supported in MariaDB 10.2.2+ and MySQL 8.0.19+)
ALTER TABLE `transactions` ADD COLUMN IF NOT EXISTS `transaction_type` ENUM('sale', 'debt_payment') DEFAULT 'sale' AFTER `payment_method`;
ALTER TABLE `transactions` ADD COLUMN IF NOT EXISTS `debt_payment_id` INT DEFAULT NULL AFTER `transaction_type`;
ALTER TABLE `transactions` ADD INDEX IF NOT EXISTS `idx_transaction_type` (`transaction_type`);
ALTER TABLE `transactions` ADD INDEX IF NOT EXISTS `idx_debt_payment_id` (`debt_payment_id`);

-- 2. Create Debts table
CREATE TABLE IF NOT EXISTS `debts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `shop_id` INT NOT NULL,
  `transaction_id` INT DEFAULT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `customer_address` TEXT,
  `total_amount` DECIMAL(20,2) NOT NULL,
  `paid_amount` DECIMAL(20,2) NOT NULL DEFAULT '0.00',
  `remaining_balance` DECIMAL(20,2) NOT NULL,
  `status` ENUM('unpaid', 'partially_paid', 'fully_paid', 'written_off') DEFAULT 'unpaid',
  `recorded_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shop_id` (`shop_id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_debts_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_debts_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create Debt Payments table (for installments)
CREATE TABLE IF NOT EXISTS `debt_payments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `debt_id` INT NOT NULL,
  `amount_paid` DECIMAL(20,2) NOT NULL,
  `recorded_by` INT NOT NULL,
  `notes` TEXT,
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_debt_id` (`debt_id`),
  CONSTRAINT `fk_payments_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
