-- Migration: Add message_type and metadata columns to marketplace_messages
-- Date: 2025-12-29
-- Purpose: Support embedded product/order cards in chat messages

ALTER TABLE `marketplace_messages` 
ADD COLUMN `message_type` ENUM('text', 'product_card', 'order_card', 'system') DEFAULT 'text' AFTER `message`,
ADD COLUMN `metadata` JSON DEFAULT NULL AFTER `message_type`;

-- Add index on message_type for filtered queries
ALTER TABLE `marketplace_messages` 
ADD INDEX `idx_message_type` (`message_type`);
