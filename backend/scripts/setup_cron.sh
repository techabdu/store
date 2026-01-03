#!/bin/bash
# backend/scripts/setup_cron.sh

# Add cron jobs for monitoring workers if they don't exist
# We use crontab -l to list existing jobs, echo new ones, and pipe to sort -u to avoid duplicates

echo "Setting up cron jobs..."

(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/bin/php /home/u123456789/domains/prhub.shop/public_html/backend/workers/MetricsAggregator.php >> /home/u123456789/domains/prhub.shop/public_html/backend/logs/metrics_aggregator.log 2>&1") | sort -u | crontab -
(crontab -l 2>/dev/null; echo "* * * * * /usr/bin/php /home/u123456789/domains/prhub.shop/public_html/backend/workers/AlertProcessor.php >> /home/u123456789/domains/prhub.shop/public_html/backend/logs/alert_processor.log 2>&1") | sort -u | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/php /home/u123456789/domains/prhub.shop/public_html/backend/workers/LogCleaner.php >> /home/u123456789/domains/prhub.shop/public_html/backend/logs/log_cleaner.log 2>&1") | sort -u | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/php /home/u123456789/domains/prhub.shop/public_html/backend/workers/HealthScoreCalculator.php >> /home/u123456789/domains/prhub.shop/public_html/backend/logs/health_score.log 2>&1") | sort -u | crontab -
(crontab -l 2>/dev/null; echo "0 4 * * * /usr/bin/php /home/u123456789/domains/prhub.shop/public_html/backend/workers/StorageCalculator.php >> /home/u123456789/domains/prhub.shop/public_html/backend/logs/storage_calculator.log 2>&1") | sort -u | crontab -

echo "Cron jobs configured successfully."
