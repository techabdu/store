-- --------------------------------------------------------
-- Marketplace Security & Isolation Patch
-- Description: Adds tenant_id columns and indexes to marketplace tables 
-- to fix data leakage between branches and companies.
-- --------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;

-- 1. marketplace_listings
ALTER TABLE `marketplace_listings` 
  ADD COLUMN `tenant_id` int(11) NOT NULL AFTER `id`,
  ADD INDEX `idx_tenant` (`tenant_id`);

-- 2. marketplace_orders
ALTER TABLE `marketplace_orders` 
  ADD COLUMN `tenant_id` int(11) NOT NULL AFTER `id`,
  ADD INDEX `idx_tenant` (`tenant_id`);

-- 3. marketplace_profiles
ALTER TABLE `marketplace_profiles` 
  ADD COLUMN `tenant_id` int(11) NOT NULL AFTER `id`,
  ADD INDEX `idx_tenant` (`tenant_id`);

-- 4. marketplace_conversations
ALTER TABLE `marketplace_conversations` 
  ADD COLUMN `tenant_id` int(11) NOT NULL AFTER `id`,
  ADD INDEX `idx_tenant` (`tenant_id`);

-- 5. marketplace_wallets
ALTER TABLE `marketplace_wallets` 
  ADD COLUMN `tenant_id` int(11) NOT NULL AFTER `id`,
  ADD INDEX `idx_tenant` (`tenant_id`);

-- 6. marketplace_wallet_transactions
ALTER TABLE `marketplace_wallet_transactions` 
  ADD COLUMN `tenant_id` int(11) NOT NULL AFTER `id`,
  ADD INDEX `idx_tenant` (`tenant_id`);

-- --------------------------------------------------------
-- Note: After running this script, you may need to populate 
-- the tenant_id for existing records based on the user's 
-- tenant association.
-- Example: UPDATE marketplace_listings l JOIN users u ON l.user_id = u.id SET l.tenant_id = u.tenant_id;
-- --------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 1;
