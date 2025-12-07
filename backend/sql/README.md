# SQL Folder - Database Schema Documentation

## 📋 Overview

This folder contains the database schema and migration scripts for the **Phone Retailer Management System**.

## 🎯 Main Schema File

### **`database_schema.sql`** ⭐ **USE THIS FILE**

This is the **comprehensive, all-in-one database schema file** that contains everything you need to set up a new database instance.

**What's included:**
- ✅ All 11 database tables with detailed comments
- ✅ Multi-tenancy support (tenant isolation)
- ✅ All foreign key relationships
- ✅ Performance-optimized indexes (including composite indexes)
- ✅ Default tenant and superadmin account
- ✅ Complete field documentation

**How to use:**
```bash
# 1. Create a new database
mysql -u root -p -e "CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Import the schema
mysql -u root -p your_database_name < database_schema.sql

# 3. Update your backend/config/database.php with the database credentials
```

**Default credentials created:**
- **SuperAdmin Username:** `it support`
- **SuperAdmin Password:** `superadmin123`
- ⚠️ **IMPORTANT:** Change this password immediately after first login!

---

## 📊 Database Structure

The database includes the following tables:

### Core Tables
1. **`tenants`** - Stores shop/organization information (multi-tenancy)
2. **`users`** - User accounts with role-based access control
3. **`inventory`** - Phone stock with IMEI tracking
4. **`transactions`** - Sales transaction records
5. **`transaction_items`** - Individual items in each transaction
6. **`expenses`** - Business expense tracking
7. **`reports`** - Generated financial reports

### System Tables
8. **`activity_logs`** - User activity audit trail
9. **`sessions`** - Active user session tracking
10. **`system_alerts`** - System notifications and alerts
11. **`security_logs`** - Security event logging

---

## 📁 Other Files (Reference Only)

The following files are **legacy migration scripts** and are kept for reference purposes only. **You do NOT need to run these files** if you're setting up a new database using `database_schema.sql`.

### Migration Scripts (Historical)
- `migration_add_tenant_id.sql` - Adds multi-tenancy to existing database
- `PRODUCTION_MIGRATION.sql` - Production migration script
- `add_password_reset_fields.sql` - Adds password reset functionality
- `add_profile_fields.sql` - Adds user profile fields
- `performance_indexes.sql` - Adds performance optimization indexes

### Table Creation Scripts (Historical)
- `setup.sql` - Original setup script (users, activity_logs, sessions)
- `create_tenants_table.sql` - Creates tenants table
- `inventory_schema.sql` - Creates inventory-related tables
- `create_expenses_table.sql` - Creates expenses table
- `create_reports_table.sql` - Creates reports table
- `create_shop_settings.sql` - Creates shop_settings (deprecated, replaced by tenants table)

### Utility Scripts
- `verify_production_db.sql` - Verifies production database setup
- `cleanup_database.sql` - Removes multi-tenancy (rollback script)
- `rollback_security_fixes.sql` - Rollback script for security fixes
- `backup_database.sql` - Database backup script

### Documentation
- `PRODUCTION_MIGRATION_GUIDE.md` - Guide for migrating existing databases
- `PHASE1_INSTRUCTIONS.md` - Phase 1 migration instructions

---

## 🔄 Migration vs Fresh Install

### Fresh Install (New Database)
✅ **Use:** `database_schema.sql`
- This creates everything from scratch
- Includes all tables, indexes, and default data
- Recommended for new installations

### Existing Database Migration
⚠️ **Use:** Migration scripts in order
- Review `PRODUCTION_MIGRATION_GUIDE.md` first
- Backup your database before running migrations
- Run migration scripts sequentially

---

## 🔐 Security Notes

1. **Change Default Password:** The default superadmin password (`superadmin123`) must be changed immediately
2. **Database Credentials:** Never commit database credentials to version control
3. **Backup Regularly:** Set up automated database backups
4. **Use HTTPS:** Always use HTTPS in production
5. **Prepared Statements:** All queries use prepared statements to prevent SQL injection

---

## 🚀 Quick Start Checklist

- [ ] Create new database with utf8mb4 charset
- [ ] Import `database_schema.sql`
- [ ] Update `backend/config/database.php` with credentials
- [ ] Change default superadmin password
- [ ] Test database connection
- [ ] Set up automated backups

---

## 📞 Support

If you encounter any issues with the database setup:
1. Check that MySQL/MariaDB is running
2. Verify database user has proper permissions
3. Ensure utf8mb4 charset is supported
4. Review error logs in `backend/logs/` (if applicable)

---

## 📝 Version History

- **v2.0** - Consolidated schema with multi-tenancy support
- **v1.5** - Added security monitoring tables
- **v1.0** - Initial schema with basic tables

---

**Last Updated:** December 2025
