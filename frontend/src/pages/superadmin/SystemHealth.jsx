import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart } from '../../components/Charts';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { Activity, Zap, Database, Cpu, RefreshCw, AlertTriangle } from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import './SystemHealth.css';

/**
 * SystemHealth Component
 * 
 * Displays real-time system performance metrics for SuperAdmin
 * Data sources:
 * - API latency from api_request_logs
 * - Request volume from api_request_logs
 * - CPU/Memory/Disk from system resources
 * - Database health from MySQL status
 */
const SystemHealth = () => {
    const [systemData, setSystemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    /**
     * Fetch system health data from backend API
     */
    const fetchSystemHealth = async () => {
        try {
            setError(null);

            const response = await api.get('/superadmin/system_health.php');

            if (response.data.success) {
                setSystemData(response.data.data);
                setIsConnected(true);
                setLastUpdated(new Date());
            } else {
                setError(response.data.error || 'Failed to fetch system health data');
                setIsConnected(false);
            }
        } catch (err) {
            console.error('Failed to fetch system health:', err);
            setError(err.response?.data?.error || 'Unable to connect to the server');
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and auto-refresh every 30 seconds
    useEffect(() => {
        fetchSystemHealth();

        const interval = setInterval(fetchSystemHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    /**
     * Get status color based on percentage value
     * @param {number} value - The percentage value
     * @param {object} thresholds - Custom thresholds for warning/critical
     * @returns {string} CSS color variable
     */
    const getStatusColor = (value, thresholds = { warning: 70, critical: 90 }) => {
        if (value >= thresholds.critical) return 'var(--error)';
        if (value >= thresholds.warning) return 'var(--warning)';
        return 'var(--success)';
    };

    /**
     * Header actions for refresh and status
     */
    const headerActions = (
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {lastUpdated && (
                <div className="last-updated text-sm text-secondary">
                    Updated: {lastUpdated.toLocaleTimeString()}
                </div>
            )}
            <button
                onClick={fetchSystemHealth}
                className="btn-secondary btn-sm"
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
            </button>
        </div>
    );

    /**
     * Error state UI
     */
    if (error && !systemData) {
        return (
            <SuperAdminLayout
                title="System Health"
                subtitle="Monitor system performance and resource usage"
                headerActions={headerActions}
            >
                <div className="error-container glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <AlertTriangle size={48} color="var(--error)" />
                    <h3 style={{ marginTop: '1rem' }}>Unable to Load System Health Data</h3>
                    <p className="text-secondary">{error}</p>
                    <button onClick={fetchSystemHealth} className="btn-primary" style={{ marginTop: '1rem' }}>
                        Try Again
                    </button>
                </div>
            </SuperAdminLayout>
        );
    }

    return (
        <SuperAdminLayout
            title="System Health"
            subtitle="Monitor system performance and resource usage"
            loading={loading && !systemData}
            headerActions={headerActions}
        >
            <ConnectionIndicator isConnected={isConnected} />

            {systemData && (
                <>
                    {/* Metric Cards Grid */}
                    <div className="metrics-grid">
                        {/* API Latency */}
                        <MetricCard
                            title="API Latency"
                            value={`${systemData.api_latency?.p50 || 0}ms`}
                            icon={Zap}
                            subtitle={`p95: ${systemData.api_latency?.p95 || 0}ms | p99: ${systemData.api_latency?.p99 || 0}ms`}
                            color="info"
                        />

                        {/* Request Volume */}
                        <MetricCard
                            title="Request Volume"
                            value={(systemData.request_volume?.current || 0).toLocaleString()}
                            icon={Activity}
                            trend={`Peak: ${(systemData.request_volume?.peak || 0).toLocaleString()}`}
                            trendDirection="up"
                            subtitle="requests/hour"
                            color="primary"
                        />

                        {/* CPU Usage */}
                        <MetricCard
                            title="CPU Usage"
                            value={`${systemData.cpu_usage || 0}%`}
                            icon={Cpu}
                            subtitle="of available capacity"
                            color={(systemData.cpu_usage || 0) >= 80 ? 'warning' : 'success'}
                        />

                        {/* Database Health */}
                        <MetricCard
                            title="Database Health"
                            value={systemData.db_health?.status || 'Unknown'}
                            icon={Database}
                            subtitle={`${systemData.db_health?.connections || 0}/${systemData.db_health?.max_connections || 100} connections`}
                            color={systemData.db_health?.status === 'healthy' ? 'success' : 'error'}
                        />
                    </div>

                    {/* Resource Usage Gauges */}
                    <div className="gauges-section">
                        <h3>Resource Usage</h3>
                        <div className="gauges-grid">
                            {/* CPU Gauge */}
                            <div className="gauge-card glass-card">
                                <h4>CPU</h4>
                                <div className="gauge-container">
                                    <div className="gauge-circle" style={{
                                        background: `conic-gradient(
                                            ${getStatusColor(systemData.cpu_usage || 0)} ${(systemData.cpu_usage || 0) * 3.6}deg,
                                            var(--border-color) ${(systemData.cpu_usage || 0) * 3.6}deg
                                        )`
                                    }}>
                                        <div className="gauge-inner">
                                            <span className="gauge-value">{systemData.cpu_usage || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="gauge-label">CPU Usage</p>
                            </div>

                            {/* Memory Gauge */}
                            <div className="gauge-card glass-card">
                                <h4>Memory</h4>
                                <div className="gauge-container">
                                    <div className="gauge-circle" style={{
                                        background: `conic-gradient(
                                            ${getStatusColor(systemData.memory_usage || 0)} ${(systemData.memory_usage || 0) * 3.6}deg,
                                            var(--border-color) ${(systemData.memory_usage || 0) * 3.6}deg
                                        )`
                                    }}>
                                        <div className="gauge-inner">
                                            <span className="gauge-value">{systemData.memory_usage || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="gauge-label">Memory Usage</p>
                            </div>

                            {/* Disk Gauge */}
                            <div className="gauge-card glass-card">
                                <h4>Disk</h4>
                                <div className="gauge-container">
                                    <div className="gauge-circle" style={{
                                        background: `conic-gradient(
                                            ${getStatusColor(systemData.disk_usage || 0)} ${(systemData.disk_usage || 0) * 3.6}deg,
                                            var(--border-color) ${(systemData.disk_usage || 0) * 3.6}deg
                                        )`
                                    }}>
                                        <div className="gauge-inner">
                                            <span className="gauge-value">{systemData.disk_usage || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="gauge-label">Disk Usage</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        <div className="charts-grid">
                            {/* API Response Times Chart */}
                            {systemData.charts?.api_response_times && (
                                <LineChart
                                    data={systemData.charts.api_response_times.data}
                                    labels={systemData.charts.api_response_times.labels}
                                    title="API Response Times (Last 24 Hours)"
                                    height={300}
                                />
                            )}

                            {/* Request Volume by Endpoint */}
                            {systemData.charts?.request_volume_by_endpoint && (
                                <BarChart
                                    data={systemData.charts.request_volume_by_endpoint.data}
                                    labels={systemData.charts.request_volume_by_endpoint.labels}
                                    title="Request Volume by Endpoint"
                                    height={300}
                                />
                            )}
                        </div>
                    </div>

                    {/* Database Details */}
                    <div className="database-section glass-card">
                        <h3>Database Health Details</h3>
                        <div className="database-grid">
                            <div className="database-stat">
                                <span className="database-label">Status</span>
                                <span className="database-value" style={{
                                    color: systemData.db_health?.status === 'healthy' ? 'var(--success)' : 'var(--error)'
                                }}>
                                    {(systemData.db_health?.status || 'unknown').toUpperCase()}
                                </span>
                            </div>
                            <div className="database-stat">
                                <span className="database-label">Active Connections</span>
                                <span className="database-value">
                                    {systemData.db_health?.connections || 0} / {systemData.db_health?.max_connections || 100}
                                </span>
                            </div>
                            <div className="database-stat">
                                <span className="database-label">Avg Query Time</span>
                                <span className="database-value">{systemData.db_health?.query_time_avg || 0}ms</span>
                            </div>
                            <div className="database-stat">
                                <span className="database-label">Connection Usage</span>
                                <span className="database-value">
                                    {(((systemData.db_health?.connections || 0) / (systemData.db_health?.max_connections || 100)) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </SuperAdminLayout>
    );
};

export default SystemHealth;
