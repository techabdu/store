# Cron Job Setup Guide
## Background Workers for SuperAdmin Monitoring System

This guide explains how to set up cron jobs for the background workers.

---

## Workers Overview

### 1. Metrics Aggregation Worker
**File:** `backend/workers/metrics_aggregation_worker.php`  
**Purpose:** Aggregates API request logs into hourly and daily metrics  
**Schedule:** Every hour  
**Cron:** `0 * * * *`

### 2. Alert System Worker
**File:** `backend/workers/alert_system_worker.php`  
**Purpose:** Monitors metrics and sends email alerts when thresholds are exceeded  
**Schedule:** Every hour (15 minutes after metrics aggregation)  
**Cron:** `15 * * * *`

---

## Setup Instructions

### Method 1: Using crontab (Recommended for Production)

1. **Open crontab editor:**
```bash
crontab -e
```

2. **Add the following lines:**
```bash
# Metrics Aggregation - Runs every hour at minute 0
0 * * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/metrics_aggregation_worker.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/cron.log 2>&1

# Alert System - Runs every hour at minute 15 (after metrics)
15 * * * * /usr/bin/php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/alert_system_worker.php >> /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/cron.log 2>&1
```

3. **Save and exit** (in vi: press `ESC`, type `:wq`, press `ENTER`)

4. **Verify cron job is installed:**
```bash
crontab -l
```

### Method 2: Using XAMPP (Development)

For development on macOS with XAMPP, you can use launchd:

1. **Create a plist file:**
```bash
sudo nano /Library/LaunchDaemons/com.prhub.metrics.plist
```

2. **Add the following content:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.prhub.metrics</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/XAMPP/xamppfiles/bin/php</string>
        <string>/Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/metrics_aggregation_worker.php</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/metrics_worker.log</string>
    <key>StandardErrorPath</key>
    <string>/Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/metrics_worker_error.log</string>
</dict>
</plist>
```

3. **Load the job:**
```bash
sudo launchctl load /Library/LaunchDaemons/com.prhub.metrics.plist
```

4. **Verify it's loaded:**
```bash
sudo launchctl list | grep prhub
```

### Method 3: Manual Testing

For testing purposes, you can run the worker manually:

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/store/backend
php workers/metrics_aggregation_worker.php
```

---

## Monitoring Cron Jobs

### Check if cron job is running:
```bash
ps aux | grep metrics_aggregation_worker
```

### View cron logs:
```bash
tail -f /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/cron.log
```

### Check worker output:
```bash
tail -f /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/metrics_worker.log
```

---

## Troubleshooting

### Cron job not running?

1. **Check cron service is running:**
```bash
# macOS
sudo launchctl list | grep cron

# Linux
sudo service cron status
```

2. **Check file permissions:**
```bash
chmod +x /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/metrics_aggregation_worker.php
```

3. **Test PHP path:**
```bash
which php
# Use the output path in your cron job
```

4. **Check logs for errors:**
```bash
tail -n 50 /Applications/XAMPP/xamppfiles/htdocs/store/backend/logs/cron.log
```

### Worker failing?

1. **Run manually to see errors:**
```bash
php /Applications/XAMPP/xamppfiles/htdocs/store/backend/workers/metrics_aggregation_worker.php
```

2. **Check database connection:**
```bash
mysql -u root -p store -e "SELECT 1"
```

3. **Check application_errors table:**
```sql
SELECT * FROM application_errors 
WHERE error_type = 'WorkerException' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## Production Deployment

For production servers (prhub.shop):

1. **Update paths in cron job:**
```bash
0 * * * * /usr/bin/php /var/www/html/backend/workers/metrics_aggregation_worker.php >> /var/www/html/backend/logs/cron.log 2>&1
```

2. **Set proper permissions:**
```bash
chmod 755 /var/www/html/backend/workers/metrics_aggregation_worker.php
chmod 777 /var/www/html/backend/logs/
```

3. **Test in production environment:**
```bash
sudo -u www-data php /var/www/html/backend/workers/metrics_aggregation_worker.php
```

---

## Verification

After setting up cron jobs, verify they're working:

1. **Wait for the next hour**

2. **Check metrics_hourly table:**
```sql
SELECT * FROM metrics_hourly 
ORDER BY created_at DESC 
LIMIT 10;
```

3. **Verify data is being aggregated:**
```sql
SELECT 
    hour_timestamp,
    metric_type,
    count,
    metric_value
FROM metrics_hourly
WHERE hour_timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY hour_timestamp DESC;
```

---

## Notes

- The worker automatically skips hours that have already been aggregated
- Daily aggregation runs automatically at midnight (00:00)
- All worker activity is logged to the database via EventLogger
- Failed runs are logged to application_errors table
- Worker is idempotent - safe to run multiple times

---

## Next Steps

After setting up the metrics aggregation worker:
1. Set up alert system worker (Day 7)
2. Set up data retention worker (Day 8)
3. Set up health check worker (Day 9)
4. Monitor and optimize (Day 10)
