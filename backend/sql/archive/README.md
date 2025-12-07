# Archive Folder

This folder contains **legacy SQL scripts** that were used during the development and migration phases of the Phone Retailer Management System.

## ⚠️ Important Notice

**You do NOT need these files for a fresh database installation.**

If you're setting up a new database, use the main **`database_schema.sql`** file in the parent directory instead.

## 📁 Contents

### Migration Scripts
These scripts were used to add multi-tenancy support to existing databases:
- `migration_add_tenant_id.sql` - Adds tenant_id columns to all tables
- `PRODUCTION_MIGRATION.sql` - Production-ready migration script
- `performance_indexes.sql` - Adds composite indexes for performance

### Individual Table Creation Scripts
These scripts create individual tables (now consolidated in database_schema.sql):
- `setup.sql` - Creates users, activity_logs, and sessions tables
- `create_tenants_table.sql` - Creates tenants table
- `inventory_schema.sql` - Creates inventory, transactions, and transaction_items tables
- `create_expenses_table.sql` - Creates expenses table
- `create_reports_table.sql` - Creates reports table
- `create_shop_settings.sql` - Creates shop_settings table (deprecated)

### Enhancement Scripts
These scripts add additional features to existing tables:
- `add_password_reset_fields.sql` - Adds password reset functionality
- `add_profile_fields.sql` - Adds user profile fields (full_name, phone, avatar_color)

### Utility Scripts
- `cleanup_database.sql` - Removes multi-tenancy features (rollback)
- `rollback_security_fixes.sql` - Rollback script for security fixes
- `backup_database.sql` - Database backup utility

## 🔄 When to Use These Files

### Use Case 1: Migrating Existing Database
If you have an **existing database** without multi-tenancy and want to add it:
1. Backup your database first
2. Review `PRODUCTION_MIGRATION_GUIDE.md` (in parent directory)
3. Run migration scripts in the correct order

### Use Case 2: Reference
These files serve as reference for:
- Understanding the evolution of the database schema
- Troubleshooting migration issues
- Creating custom migration scripts

## ✅ Recommended Approach

**For new installations:** Use `database_schema.sql` from the parent directory.

**For existing databases:** Consult with your database administrator before running any migration scripts.

---

**Note:** These files are kept for historical reference and backward compatibility. They may be removed in future versions once all systems have been migrated to the consolidated schema.
