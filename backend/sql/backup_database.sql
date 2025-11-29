-- Database Backup Script
-- Run this BEFORE executing migration scripts
-- This creates a backup of critical tables

-- Instructions:
-- 1. Export your database using phpMyAdmin or command line:
--    mysqldump -u root -p store > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
--
-- 2. Or use this script to create a quick backup of critical tables:

-- Create backup tables
CREATE TABLE IF NOT EXISTS users_backup_pre_migration AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS inventory_backup_pre_migration AS SELECT * FROM inventory;
CREATE TABLE IF NOT EXISTS transactions_backup_pre_migration AS SELECT * FROM transactions;
CREATE TABLE IF NOT EXISTS expenses_backup_pre_migration AS SELECT * FROM expenses;
CREATE TABLE IF NOT EXISTS activity_logs_backup_pre_migration AS SELECT * FROM activity_logs;
CREATE TABLE IF NOT EXISTS sessions_backup_pre_migration AS SELECT * FROM sessions;

SELECT 'Backup completed successfully!' AS Status;
SELECT 'Backup tables created with suffix: _backup_pre_migration' AS Info;

-- To restore from backup (if needed):
-- DROP TABLE users;
-- CREATE TABLE users AS SELECT * FROM users_backup_pre_migration;
-- (Repeat for other tables)
