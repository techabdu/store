import React, { useState, useEffect } from 'react';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart } from '../../components/Charts';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { Activity, Zap, Database, Cpu } from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import './SystemHealth.css';

const SystemHealth = () => {
    const [systemData, setSystemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch system health data
    useEffect(() => {
        const fetchSystemHealth = async () => {
            try {
                setLoading(true);

                // Mock data for now
                const mockData = {
                    api_latency: {
                        p50: 45,
                        p95: 120,
                        p99: 250
                    },
                    request_volume: {
                        current: 1250,
                        peak: 2100,
                        average: 980
                    },
                    cpu_usage: 42,
                    memory_usage: 68,
                    disk_usage: 55,
                    db_health: {
                        status: 'healthy',
                        connections: 45,
                        max_connections: 100,
                        query_time_avg: 12
                    },
                    charts: {
                        api_response_times: {
                            data: [45, 52, 48, 55, 50, 47, 49, 53, 51, 48, 46, 50, 52, 49, 47, 51, 48, 50, 49, 52, 48, 51, 50, 45],
                            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`)
                        },
                        request_volume_by_endpoint: {
                            data: [450, 320, 280, 150, 120, 80, 50],
                            labels: ['/api/auth', '/api/inventory', '/api/sales', '/api/reports', '/api/marketplace', '/api/users', '/api/other']
                        }
                    }
                };

                setSystemData(mockData);
                setIsConnected(true);
            } catch (error) {
                console.error('Failed to fetch system health:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSystemHealth();

        // Refresh every 30 seconds
        const interval = setInterval(fetchSystemHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    // Get status color based on percentage
    const getStatusColor = (value, thresholds = { warning: 70, critical: 90 }) => {
        if (value >= thresholds.critical) return 'var(--error)';
        if (value >= thresholds.warning) return 'var(--warning)';
        return 'var(--success)';
    };

    return (
        <SuperAdminLayout
            title="System Health"
            subtitle="Monitor system performance and resource usage"
            loading={loading}
        >
            <ConnectionIndicator isConnected={isConnected} />

            {systemData && (
                <>
                    {/* Metric Cards Grid */}
                    <div className="metrics-grid">
                        {/* API Latency */}
                        <MetricCard
                            title="API Latency"
                            value={`${systemData.api_latency.p50}ms`}
                            icon={Zap}
                            subtitle={`p95: ${systemData.api_latency.p95}ms | p99: ${systemData.api_latency.p99}ms`}
                            color="info"
                        />

                        {/* Request Volume */}
                        <MetricCard
                            title="Request Volume"
                            value={systemData.request_volume.current.toLocaleString()}
                            icon={Activity}
                            trend={`Peak: ${systemData.request_volume.peak.toLocaleString()}`}
                            trendDirection="up"
                            subtitle="requests/min"
                            color="primary"
                        />

                        {/* CPU Usage */}
                        <MetricCard
                            title="CPU Usage"
                            value={`${systemData.cpu_usage}%`}
                            icon={Cpu}
                            subtitle="of available capacity"
                            color={systemData.cpu_usage >= 80 ? 'warning' : 'success'}
                        />

                        {/* Database Health */}
                        <MetricCard
                            title="Database Health"
                            value={systemData.db_health.status}
                            icon={Database}
                            subtitle={`${systemData.db_health.connections}/${systemData.db_health.max_connections} connections`}
                            color={systemData.db_health.status === 'healthy' ? 'success' : 'error'}
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
                                            ${getStatusColor(systemData.cpu_usage)} ${systemData.cpu_usage * 3.6}deg,
                                            var(--border-color) ${systemData.cpu_usage * 3.6}deg
                                        )`
                                    }}>
                                        <div className="gauge-inner">
                                            <span className="gauge-value">{systemData.cpu_usage}%</span>
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
                                            ${getStatusColor(systemData.memory_usage)} ${systemData.memory_usage * 3.6}deg,
                                            var(--border-color) ${systemData.memory_usage * 3.6}deg
                                        )`
                                    }}>
                                        <div className="gauge-inner">
                                            <span className="gauge-value">{systemData.memory_usage}%</span>
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
                                            ${getStatusColor(systemData.disk_usage)} ${systemData.disk_usage * 3.6}deg,
                                            var(--border-color) ${systemData.disk_usage * 3.6}deg
                                        )`
                                    }}>
                                        <div className="gauge-inner">
                                            <span className="gauge-value">{systemData.disk_usage}%</span>
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
                            <LineChart
                                data={systemData.charts.api_response_times.data}
                                labels={systemData.charts.api_response_times.labels}
                                title="API Response Times (Last 24 Hours)"
                                height={300}
                            />

                            {/* Request Volume by Endpoint */}
                            <BarChart
                                data={systemData.charts.request_volume_by_endpoint.data}
                                labels={systemData.charts.request_volume_by_endpoint.labels}
                                title="Request Volume by Endpoint"
                                height={300}
                            />
                        </div>
                    </div>

                    {/* Database Details */}
                    <div className="database-section glass-card">
                        <h3>Database Health Details</h3>
                        <div className="database-grid">
                            <div className="database-stat">
                                <span className="database-label">Status</span>
                                <span className="database-value" style={{
                                    color: systemData.db_health.status === 'healthy' ? 'var(--success)' : 'var(--error)'
                                }}>
                                    {systemData.db_health.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="database-stat">
                                <span className="database-label">Active Connections</span>
                                <span className="database-value">
                                    {systemData.db_health.connections} / {systemData.db_health.max_connections}
                                </span>
                            </div>
                            <div className="database-stat">
                                <span className="database-label">Avg Query Time</span>
                                <span className="database-value">{systemData.db_health.query_time_avg}ms</span>
                            </div>
                            <div className="database-stat">
                                <span className="database-label">Connection Usage</span>
                                <span className="database-value">
                                    {((systemData.db_health.connections / systemData.db_health.max_connections) * 100).toFixed(1)}%
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

