-- Application-Wide Financial Precision Update (DECIMAL 20,2)
-- This script ensures all money-related columns can handle large NGN amounts (up to 18 digits).

-- 1. Core / Admin / Shop Tables
ALTER TABLE inventory 
    MODIFY COLUMN price DECIMAL(20,2) NOT NULL,
    MODIFY COLUMN cost_price DECIMAL(20,2) NOT NULL;

ALTER TABLE expenses 
    MODIFY COLUMN amount DECIMAL(20,2) NOT NULL;

ALTER TABLE expense_records 
    MODIFY COLUMN daily_expenses DECIMAL(20,2) NOT NULL DEFAULT 0.00;

ALTER TABLE profit_records 
    MODIFY COLUMN daily_profit DECIMAL(20,2) NOT NULL DEFAULT 0.00;

ALTER TABLE reports 
    MODIFY COLUMN inventory_value DECIMAL(20,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN total_expenses DECIMAL(20,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN business_capital DECIMAL(20,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN cash_in_hand DECIMAL(20,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN total_debt DECIMAL(20,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN net_profit DECIMAL(20,2) NOT NULL DEFAULT 0.00;

ALTER TABLE shops 
    MODIFY COLUMN business_capital DECIMAL(20,2) DEFAULT 0.00;

ALTER TABLE tenants 
    MODIFY COLUMN business_capital DECIMAL(20,2) DEFAULT 0.00;

ALTER TABLE transactions 
    MODIFY COLUMN total_amount DECIMAL(20,2) NOT NULL;

ALTER TABLE transaction_items 
    MODIFY COLUMN price DECIMAL(20,2) NOT NULL;

-- 2. Marketplace Tables
ALTER TABLE marketplace_listings 
    MODIFY COLUMN price DECIMAL(20,2) NOT NULL,
    MODIFY COLUMN original_price DECIMAL(20,2) DEFAULT NULL,
    MODIFY COLUMN min_offer_price DECIMAL(20,2) DEFAULT NULL,
    MODIFY COLUMN auction_start_price DECIMAL(20,2) DEFAULT NULL,
    MODIFY COLUMN auction_reserve_price DECIMAL(20,2) DEFAULT NULL,
    MODIFY COLUMN current_bid DECIMAL(20,2) DEFAULT NULL;

ALTER TABLE marketplace_auction_bids 
    MODIFY COLUMN bid_amount DECIMAL(20,2) NOT NULL;

ALTER TABLE marketplace_messages 
    MODIFY COLUMN offer_amount DECIMAL(20,2) DEFAULT NULL;

ALTER TABLE marketplace_orders 
    MODIFY COLUMN agreed_price DECIMAL(20,2) NOT NULL;

ALTER TABLE marketplace_wallets 
    MODIFY COLUMN available_balance DECIMAL(20,2) DEFAULT 0.00,
    MODIFY COLUMN pending_balance DECIMAL(20,2) DEFAULT 0.00,
    MODIFY COLUMN held_balance DECIMAL(20,2) DEFAULT 0.00,
    MODIFY COLUMN total_funded DECIMAL(20,2) DEFAULT 0.00,
    MODIFY COLUMN total_withdrawn DECIMAL(20,2) DEFAULT 0.00,
    MODIFY COLUMN total_sales DECIMAL(20,2) DEFAULT 0.00,
    MODIFY COLUMN total_purchases DECIMAL(20,2) DEFAULT 0.00;

ALTER TABLE marketplace_wallet_transactions 
    MODIFY COLUMN amount DECIMAL(20,2) NOT NULL,
    MODIFY COLUMN available_balance_after DECIMAL(20,2) NOT NULL,
    MODIFY COLUMN pending_balance_after DECIMAL(20,2) NOT NULL,
    MODIFY COLUMN held_balance_after DECIMAL(20,2) NOT NULL;

ALTER TABLE marketplace_withdrawal_requests 
    MODIFY COLUMN amount DECIMAL(20,2) NOT NULL;

ALTER TABLE marketplace_verification_attempts 
    MODIFY COLUMN verification_cost DECIMAL(20,2) DEFAULT NULL;

ALTER TABLE fraud_alerts 
    MODIFY COLUMN amount DECIMAL(20,2) DEFAULT NULL;

ALTER TABLE kora_payment_references 
    MODIFY COLUMN amount DECIMAL(20,2) NOT NULL;
