-- --------------------------------------------------------
-- Migration: Add buyer_shop_id to marketplace_conversations
-- Description: Adds buyer_shop_id column to track which shop the buyer is purchasing from
-- Date: 2026-01-01
-- --------------------------------------------------------

-- Add buyer_shop_id column to marketplace_conversations table
ALTER TABLE `marketplace_conversations` 
  ADD COLUMN `buyer_shop_id` int(11) DEFAULT NULL AFTER `buyer_id`,
  ADD INDEX `idx_buyer_shop` (`buyer_shop_id`);

-- Optional: Add foreign key constraint (uncomment if needed)
-- ALTER TABLE `marketplace_conversations`
--   ADD CONSTRAINT `fk_conversations_buyer_shop` 
--   FOREIGN KEY (`buyer_shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL;

-- Verify the change
-- SHOW COLUMNS FROM `marketplace_conversations` LIKE 'buyer_shop_id';
