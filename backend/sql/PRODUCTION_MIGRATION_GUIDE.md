# Production Migration Guide

## ⚠️ CRITICAL: Read Before Running

This guide will help you migrate your production database to multi-tenancy.

## Prerequisites

1. ✅ Database backup completed
2. ✅ Maintenance window scheduled
3. ✅ Users notified of downtime

## Migration Steps

### Step 1: Backup Production Database

**Using cPanel/phpMyAdmin:**
1. Login to your hosting control panel
2. Open phpMyAdmin
3. Select your `store` database
4. Click "Export" tab
5. Click "Go" to download backup
6. Save as `store_production_backup_YYYYMMDD.sql`

**Using Command Line:**
```bash
mysqldump -u your_db_user -p your_db_name > store_production_backup_$(date +%Y%m%d).sql
```

### Step 2: Run Production Migration

**Using phpMyAdmin:**
1. Open phpMyAdmin
2. Select your `store` database
3. Click "SQL" tab
4. Copy entire contents of `PRODUCTION_MIGRATION.sql`
5. Paste into SQL box
6. Click "Go"
7. Wait for completion (may take 10-30 seconds)

**Using Command Line:**
```bash
mysql -u your_db_user -p your_db_name < PRODUCTION_MIGRATION.sql
```

### Step 3: Verify Migration

Run this query in phpMyAdmin SQL tab:

```sql
-- Check tenants table
SELECT * FROM tenants;

-- Check tenant_id columns exist
SELECT TABLE_NAME, COLUMN_NAME 
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLUMN_NAME = 'tenant_id'
ORDER BY TABLE_NAME;

-- Check data migration
SELECT 'users' AS table_name, COUNT(*) AS total, SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) AS assigned_to_tenant_1 FROM users
UNION ALL
SELECT 'inventory', COUNT(*), SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) FROM inventory
UNION ALL
SELECT 'transactions', COUNT(*), SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) FROM transactions;
```

**Expected Results:**
- ✅ tenants table has 1 row (your shop)
- ✅ All tables have tenant_id column
- ✅ All existing data has tenant_id = 1

### Step 4: Test Application

1. Open your production site
2. Try to login
3. Navigate through all pages
4. Check for errors in browser console (F12)

**Expected Behavior:**
- ✅ Application works exactly as before
- ✅ No errors in console
- ✅ All features functional

## What Changed

### Database Changes
- ✅ New `tenants` table created
- ✅ `tenant_id` column added to all tables
- ✅ All existing data assigned to default tenant (id=1)
- ✅ Foreign key constraints created
- ✅ `shop_settings` table dropped (data moved to `tenants`)

### Application Impact
- ⚠️ **shop_settings table no longer exists**
- ⚠️ Backend code needs update to use `tenants` table (Phase 2)

## Rollback Plan

If something goes wrong:

```sql
-- Restore from backup
mysql -u your_db_user -p your_db_name < store_production_backup_YYYYMMDD.sql
```

## Post-Migration

After successful migration:

1. ✅ Keep backup file safe
2. ✅ Monitor application for 24 hours
3. ✅ Proceed to Phase 2 (Backend updates)

## Troubleshooting

### Error: "Duplicate column name 'tenant_id'"
**Cause:** Migration already run
**Solution:** Migration is already complete, skip to verification

### Error: "Cannot add foreign key constraint"
**Cause:** Data integrity issue
**Solution:** Contact support with error details

### Error: "Table 'shop_settings' doesn't exist"
**Cause:** Expected - table was migrated to `tenants`
**Solution:** This is normal, proceed to Phase 2

## Support

If you encounter any issues:
1. Don't panic
2. Restore from backup
3. Document the error message
4. Contact for support

---

**Migration File:** `PRODUCTION_MIGRATION.sql`
**Estimated Time:** 10-30 seconds
**Downtime Required:** Yes (5-10 minutes recommended)
