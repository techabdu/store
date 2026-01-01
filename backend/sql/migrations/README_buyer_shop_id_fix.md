# Production Database Fix for marketplace_conversations

## Issue Identified
**Error**: `Unknown column 'c.buyer_shop_id' in 'WHERE'`

The production database is missing the `buyer_shop_id` column in the `marketplace_conversations` table. This column exists in the localhost database but was not migrated to production.

## Solution

### Step 1: Access Production Database
Log into your Hostinger control panel and access phpMyAdmin or MySQL command line.

### Step 2: Run the Migration Script
Execute the SQL script located at:
```
backend/sql/migrations/add_buyer_shop_id_to_conversations.sql
```

**SQL to run:**
```sql
ALTER TABLE `marketplace_conversations` 
  ADD COLUMN `buyer_shop_id` int(11) DEFAULT NULL AFTER `buyer_id`,
  ADD INDEX `idx_buyer_shop` (`buyer_shop_id`);
```

### Step 3: Verify the Column Was Added
Run this query to confirm:
```sql
SHOW COLUMNS FROM `marketplace_conversations` LIKE 'buyer_shop_id';
```

You should see output like:
```
+--------------+---------+------+-----+---------+-------+
| Field        | Type    | Null | Key | Default | Extra |
+--------------+---------+------+-----+---------+-------+
| buyer_shop_id| int(11) | YES  | MUL | NULL    |       |
+--------------+---------+------+-----+---------+-------+
```

### Step 4: Test the Endpoint
After running the migration, visit:
```
https://prhub.shop/marketplace/messages
```

The 500 error should be resolved and conversations will load correctly.

## Files Modified
1. `backend/api/marketplace/messaging/get_conversations.php` - Added better error handling (already deployed)
2. `backend/sql/migrations/add_buyer_shop_id_to_conversations.sql` - New migration script

## Technical Details
- **Missing Column**: `buyer_shop_id` 
- **Table**: `marketplace_conversations`
- **Purpose**: Tracks which shop the buyer is making the purchase from in marketplace transactions
- **Introduced**: This column was added to localhost during marketplace development but migration was not run on production

## Notes
- This is a **non-destructive** change (adds a new column, doesn't modify existing data)
- The column is nullable (`DEFAULT NULL`) so existing rows won't be affected
- An index is added for better query performance
