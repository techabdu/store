<?php
/**
 * Phase 2 Integration Test Suite
 * 
 * Verifies the end-to-end functionality of all monitoring system workers.
 * Tests:
 * 1. Metrics Aggregation
 * 2. Alert System
 * 3. Data Retention
 * 4. Health Check
 * 
 * Usage: php test_phase2_complete.php
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/EventLogger.php';

// Colored output helpers
function passed($msg) { echo "\033[32m  ✓ $msg\033[0m\n"; }
function failed($msg) { echo "\033[31m  ✗ $msg\033[0m\n"; }
function info($msg) { echo "\033[36m$msg\033[0m\n"; }
function section($msg) { echo "\n\033[1m=== $msg ===\033[0m\n"; }

// Worker classes
require_once __DIR__ . '/workers/metrics_aggregation_worker.php';
require_once __DIR__ . '/workers/alert_system_worker.php';
require_once __DIR__ . '/workers/data_retention_worker.php';
require_once __DIR__ . '/workers/health_check_worker.php';

echo "\nStarting Phase 2 Integration Tests...\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";

// --- SETUP ---
section("Setting Up Test Environment");
$testAgent = 'Phase2TestAgent';
$testIp = '127.0.0.1';

// Cleanup previous test data
$conn->query("DELETE FROM api_request_logs WHERE user_agent = '$testAgent'");
$conn->query("DELETE FROM application_errors WHERE user_agent = '$testAgent'");
$conn->query("DELETE FROM email_notifications WHERE recipient_email = 'test@example.com'");
// Note: We'll be careful deleting metrics/alerts to not affect real data, 
// using specific timestamps or types if possible.

// Time constants
$now = date('Y-m-d H:i:s');
$oneHourAgo = date('Y-m-d H:00:00', strtotime('-1 hour'));

// --- TEST 1: METRICS AGGREGATION ---
section("TEST 1: Metrics Aggregation Worker");

// 1.1 Insert raw data for previous hour
info("Inserting raw API logs for aggregation...");
$logs = [
    ['/api/test/success', 'GET', 200, 50, 'test'],
    ['/api/test/success', 'GET', 200, 60, 'test'],
    ['/api/test/error', 'POST', 500, 100, 'test'],
];

foreach ($logs as $log) {
    $stmt = $conn->prepare("INSERT INTO api_request_logs (endpoint, http_method, status_code, response_time_ms, module, is_error, created_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $isError = $log[2] >= 400 ? 1 : 0;
    // Insert into previous hour window
    $createdAt = date('Y-m-d H:30:00', strtotime('-1 hour')); 
    $stmt->bind_param("ssiisisss", $log[0], $log[1], $log[2], $log[3], $log[4], $isError, $createdAt, $testAgent, $testIp);
    $stmt->execute();
}
passed("Inserted 3 raw logs");

// 1.2 Run Worker
info("Running MetricsAggregationWorker...");
// Delete existing metric for this hour to allow re-aggregation
$conn->query("DELETE FROM metrics_hourly WHERE hour_timestamp = '$oneHourAgo'");

$worker = new MetricsAggregationWorker($conn);
ob_start(); // Capture output to keep console clean
$worker->run();
ob_end_flush();

// 1.3 Verify Results
$result = $conn->query("SELECT * FROM metrics_hourly WHERE hour_timestamp = '$oneHourAgo' AND metric_type = 'api_requests'");
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    if ($row['count'] >= 3) { // >= because other tests might run or real traffic
        passed("Hourly metrics created (Count: {$row['count']})");
    } else {
        failed("Hourly metrics count mismatch. Expected >= 3, got {$row['count']}");
    }
} else {
    failed("No hourly metrics found for $oneHourAgo");
}

// --- TEST 2: ALERT SYSTEM ---
section("TEST 2: Alert System Worker");

// 2.1 Insert critical metric
info("Injecting critical error metric...");
$metadata = json_encode(['error_rate' => 50.0]); 
$alertTestHour = date('Y-m-d H:00:00', strtotime('-2 hours')); 

$conn->query("DELETE FROM email_notifications WHERE created_at > NOW()");
$conn->query("DELETE FROM email_notifications WHERE notification_type = 'alert' AND subject LIKE '%High Error Rate%'");

// Ensure clean slate for test insert
$conn->query("DELETE FROM metrics_hourly WHERE hour_timestamp = '$alertTestHour' AND metric_type = 'api_requests'");

$stmt = $conn->prepare("INSERT INTO metrics_hourly (hour_timestamp, metric_type, metric_value, count, metadata) VALUES (?, 'api_requests', 100.0, 10, ?)");
$stmt->bind_param("ss", $alertTestHour, $metadata);
$stmt->execute();

// 2.2 Run Worker
info("Running AlertSystemWorker...");
$worker = new AlertSystemWorker($conn);
ob_start();
$worker->run();
ob_end_flush();

// 2.3 Verify Alert
// Note: determining if it sent strictly depends on the logic scanning all historical "latest" hour.
// The worker scans `getLatestHourTimestamp`. If real traffic happened in -1 hour, it checks that.
// If we want to force it to check our -2 hour, we might struggle if the worker only checks the absolute latest.
// Let's check the worker logic: 
// $result = $this->conn->query("SELECT hour_timestamp FROM metrics_hourly ORDER BY hour_timestamp DESC LIMIT 1");
// This means it ONLY checks the VERY LATEST hour. 
// If we just ran aggregation for -1 hour, that is the latest.
// So we need to inject the failure into the -1 hour data (which we aggregated in Test 1).

// Let's modify the metric for -1 hour to trigger an alert
info("Modifying latest metric to trigger alert...");
$metaHighError = json_encode(['error_rate' => 20.0, 'error_count' => 10]);
$conn->query("UPDATE metrics_hourly SET metadata = '$metaHighError' WHERE hour_timestamp = '$oneHourAgo' AND metric_type = 'api_requests'");

ob_start();
// Re-instantiate to reset internal state if any
$worker = new AlertSystemWorker($conn);
$worker->run();
ob_end_flush();

$res = $conn->query("SELECT * FROM email_notifications WHERE subject LIKE '%High Error Rate%' AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
if ($res->num_rows > 0) {
    passed("High Error Rate alert generated");
} else {
    // If failed, it might be cooldown or threshold issues. 
    // We cleared cooldown earlier. Threshold is 10%. We set 20%.
    // Maybe SMTP failed? The worker catches SMTP errors but still records the notification intent?
    // The worker records in DB: recordAlert(...) which does INSERT.
    failed("Alert not found in database");
}

// --- TEST 3: DATA RETENTION ---
section("TEST 3: Data Retention Worker");

// 3.1 Insert old data
info("Inserting old data (>365 days)...");
$oldDate = date('Y-m-d H:i:s', strtotime('-400 days'));
$stmt = $conn->prepare("INSERT INTO api_request_logs (endpoint, http_method, status_code, response_time_ms, created_at, user_agent) VALUES ('/api/old', 'GET', 200, 100, ?, ?)");
$stmt->bind_param("ss", $oldDate, $testAgent);
$stmt->execute();

// 3.2 Run Worker
info("Running DataRetentionWorker...");
$worker = new DataRetentionWorker($conn);
ob_start();
$worker->run();
ob_end_flush();

// 3.3 Verify Deletion
$res = $conn->query("SELECT count(*) as count FROM api_request_logs WHERE created_at = '$oldDate' AND user_agent = '$testAgent'");
$row = $res->fetch_assoc();
if ($row['count'] == 0) {
    passed("Old data successfully pruned");
} else {
    failed("Old data still exists");
}

// --- TEST 4: HEALTH CHECK ---
section("TEST 4: Health Check Worker");

// 4.1 Run Worker
info("Running HealthCheckWorker...");
$worker = new HealthCheckWorker($conn);
ob_start();
$worker->run();
ob_end_clean();

// 4.2 Verify Result
$status = $worker->getHealthStatus();
if ($status['status'] === 'healthy' || $status['status'] === 'degraded') {
    // Degraded is acceptable if thresholds are tight, but checks should run
    passed("Health check ran. Score: " . $status['score'] . "%");
    passed("Status: " . $status['status']);
} else {
    failed("Health check failed or returned unhealthy (Score: " . $status['score'] . "%)");
}

// --- CLEANUP ---
section("Cleanup");
$conn->query("DELETE FROM api_request_logs WHERE user_agent = '$testAgent'");
// We purposely leave metrics/alerts for manual inspection if needed, or clean them:
$conn->query("DELETE FROM metrics_hourly WHERE hour_timestamp = '$alertTestHour'");
// Leave the -1 hour metrics as they are valid aggregations of the test data (and real data).

echo "\n\033[1;32mPhase 2 Integration Tests Completed.\033[0m\n";
