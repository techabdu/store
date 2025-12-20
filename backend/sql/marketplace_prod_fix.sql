-- Marketplace Production Readiness Fixes
-- This script ensures all necessary ENUM values are present in production.

-- 1. Ensure Marketplace Orders have consistent statuses
ALTER TABLE marketplace_orders 
MODIFY COLUMN order_status ENUM('pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed', 'refunded') DEFAULT 'pending';

-- 2. Ensure Marketplace Wallet Transactions have all required types
ALTER TABLE marketplace_wallet_transactions 
MODIFY COLUMN transaction_type ENUM(
    'deposit', 
    'withdrawal', 
    'purchase_hold', 
    'purchase_release', 
    'purchase_refund', 
    'sale_pending', 
    'sale_complete', 
    'sale_cancelled', 
    'adjustment'
) NOT NULL;

-- 3. Add mission-critical indexes if they don't exist
-- Note: MySQL 8.0.30+ supports IF NOT EXISTS for indexes, but for older versions we just run and ignore duplicates if needed.
CREATE INDEX idx_listing_status ON marketplace_listings(status);
CREATE INDEX idx_order_status ON marketplace_orders(order_status);
CREATE INDEX idx_wallet_user ON marketplace_wallets(user_id);
CREATE INDEX idx_trans_wallet ON marketplace_wallet_transactions(wallet_id);
CREATE INDEX idx_msg_conv ON marketplace_messages(conversation_id);
