# Phase 1: Database Migration Instructions

## ⚠️ IMPORTANT: Read Before Proceeding

This phase adds multi-tenancy support to your database. Follow these steps carefully.

## Prerequisites

- ✅ Development branch created (`multi-tenancy`)
- ✅ XAMPP MySQL running
- ✅ Access to phpMyAdmin or MySQL command line

## Step-by-Step Instructions

### Step 1: Backup Your Database

**Option A: Using phpMyAdmin**
1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Select `store` database
3. Click "Export" tab
4. Click "Go" to download backup
5. Save as `store_backup_YYYYMMDD.sql`

**Option B: Using MySQL Command Line**
```bash
mysqldump -u root -p store > store_backup_$(date +%Y%m%d).sql
```

**Option C: Using Backup Script**
1. Open phpMyAdmin
2. Select `store` database
3. Click "SQL" tab
4. Copy contents of `backend/sql/backup_database.sql`
5. Click "Go"

### Step 2: Create Tenants Table

1. Open phpMyAdmin
2. Select `store` database
3. Click "SQL" tab
4. Copy entire contents of `backend/sql/create_tenants_table.sql`
5. Click "Go"
6. Verify: You should see "1 row inserted" (default tenant created)

### Step 3: Run Migration Script

1. In phpMyAdmin, click "SQL" tab
2. Copy entire contents of `backend/sql/migration_add_tenant_id.sql`
3. Click "Go"
4. Wait for completion (may take a few seconds)
5. You should see "Multi-tenancy migration completed successfully!"

### Step 4: Verify Migration

1. In phpMyAdmin, click "SQL" tab
2. Copy entire contents of `backend/sql/test_migration.sql`
3. Click "Go"
4. Review the results:
   - ✅ Tenants table should have 1 record
   - ✅ All tables should have `tenant_id` column
   - ✅ All existing records should have `tenant_id = 1`
   - ✅ Foreign keys should be created
   - ✅ Indexes should exist on `tenant_id`

### Step 5: Test Your Application

1. Open your application: http://localhost:5173
2. Try to login with existing credentials
3. Navigate through all pages (Dashboard, Inventory, Sales, etc.)
4. Verify everything works normally
5. Check browser console for errors (F12)

## Expected Results

✅ **Database Changes:**
- New `tenants` table created
- All tables have `tenant_id` column
- All existing data assigned to "Main Shop" (tenant_id = 1)
- Foreign keys and indexes created

✅ **Application Behavior:**
- Application works exactly as before
- No errors in console
- All features functional
- No data loss

## Troubleshooting

### Error: "Cannot add foreign key constraint"
- **Cause:** Existing data has inconsistencies
- **Solution:** Check for orphaned records, fix data integrity issues

### Error: "Duplicate column name 'tenant_id'"
- **Cause:** Migration already run
- **Solution:** Script is idempotent, but you may need to drop the column first

### Application shows errors after migration
- **Cause:** Backend not updated yet (this is Phase 2)
- **Solution:** Don't worry, we'll update the backend in Phase 2

## Rollback (If Needed)

If something goes wrong:

1. Drop the new column from all tables:
```sql
ALTER TABLE users DROP COLUMN tenant_id;
ALTER TABLE inventory DROP COLUMN tenant_id;
-- (repeat for all tables)
```

2. Drop tenants table:
```sql
DROP TABLE tenants;
```

3. Restore from backup:
```bash
mysql -u root -p store < store_backup_YYYYMMDD.sql
```

## Next Steps

Once you've verified everything works:
1. Report back with test results
2. I'll proceed to Phase 2: Backend Authentication Updates

---

**Questions or Issues?** Let me know what you see and I'll help troubleshoot!
