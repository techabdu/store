import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import HealthPillarCard from '../../components/Dashboard/HealthPillarCard';
import { LineChart } from '../../components/Charts';
import AlertBadge from '../../components/Dashboard/AlertBadge';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import './OverviewDashboard.css';

const OverviewDashboard = () => {
    const [healthData, setHealthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);
    const [activity, setActivity] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch initial dashboard data
    useEffect(() => {
        const fetchHealthData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/superadmin/system_insights.php?tab=overview');

                if (response.data.success) {
                    const data = response.data.data;

                    // helper to get trend direction and text
                    const getTrend = (current, previous) => {
                        // For now we don't have historical comparison for all, so we default
                        return { text: 'N/A', direction: 'neutral' };
                    };

                    // Transform charts data
                    const latencyLabels = data.charts?.apiLatency?.map(item => item.label) || [];
                    const latencyValues = data.charts?.apiLatency?.map(item => item.value) || [];

                    const errorLabels = data.charts?.errorRate?.map(item => item.label) || [];
                    const errorValues = data.charts?.errorRate?.map(item => item.value) || [];

                    const mappedData = {
                        system: {
                            status: data.system.health.toLowerCase(),
                            uptime: data.system.uptime.uptime_percentage || '99.9%', // fallback
                            trend: '+0.0%',
                            direction: 'up'
                        },
                        user: {
                            status: 'healthy', // Logic to determine health
                            dau: data.performance.active_users.active_count.toString(),
                            trend: 'Live',
                            direction: 'neutral'
                        },
                        error: {
                            status: data.performance.error_rate > 5 ? 'critical' : (data.performance.error_rate > 1 ? 'warning' : 'healthy'),
                            rate: data.performance.error_rate + '%',
                            trend: 'N/A',
                            direction: 'neutral'
                        },
                        business: {
                            status: 'healthy',
                            revenue: '₦' + (data.business.revenue_today?.total_revenue || '0.00'),
                            trend: 'N/A',
                            direction: 'up'
                        },
                        charts: {
                            apiLatency: latencyValues,
                            apiLatencyLabels: latencyLabels,
                            errorRate: errorValues,
                            errorRateLabels: errorLabels
                        }
                    };

                    setHealthData(mappedData);

                    // Set Alerts
                    if (data.alerts?.recent_critical) {
                        setAlerts(data.alerts.recent_critical.map(alert => ({
                            id: alert.id,
                            severity: alert.severity,
                            message: alert.message,
                            created_at: alert.created_at
                        })));
                    }

                    // Set Activity
                    if (data.activity?.recent_logs) {
                        setActivity(data.activity.recent_logs.map(log => ({
                            id: log.id,
                            action: log.action,
                            user: log.username || 'System',
                            timestamp: log.created_at
                        })));
                    }

                    setIsConnected(true);
                }
            } catch (error) {
                console.error('Failed to fetch health data:', error);
                setIsConnected(false);
            } finally {
                setLoading(false);
            }
        };

        fetchHealthData();

        // Auto refresh every 60s
        const interval = setInterval(fetchHealthData, 60000);
        return () => clearInterval(interval);
    }, []);

    const headerActions = (
        <AlertBadge count={alerts.length} severity="critical" isNew={true} />
    );

    return (
        <SuperAdminLayout
            title="SuperAdmin Dashboard"
            subtitle="Overview of system-wide health and activity"
            loading={loading}
            headerActions={headerActions}
        >
            <ConnectionIndicator isConnected={isConnected} />

            {healthData && (
                <>
                    {/* Section 1: Health Pillar Cards */}
                    <div className="metrics-grid">
                        <HealthPillarCard
                            title="System Health"
                            status={healthData.system.status}
                            value={healthData.system.uptime}
                            trend={healthData.system.trend}
                            trendDirection={healthData.system.direction}
                            subtitle="uptime"
                        />

                        <HealthPillarCard
                            title="User Health"
                            status={healthData.user.status}
                            value={healthData.user.dau}
                            trend={healthData.user.trend}
                            trendDirection={healthData.user.direction}
                            subtitle="daily active users"
                        />

                        <HealthPillarCard
                            title="Error Health"
                            status={healthData.error.status}
                            value={healthData.error.rate}
                            trend={healthData.error.trend}
                            trendDirection="up"
                            subtitle="error rate"
                        />

                        <HealthPillarCard
                            title="Business Health"
                            status={healthData.business.status}
                            value={healthData.business.revenue}
                            trend={healthData.business.trend}
                            trendDirection={healthData.business.direction}
                            subtitle="daily revenue"
                        />
                    </div>

                    {/* Section 2: Real-Time Metrics Charts */}
                    <div className="charts-section">
                        <div className="charts-grid">
                            <LineChart
                                data={healthData.charts.apiLatency}
                                labels={healthData.charts.apiLatencyLabels}
                                title="API Response Time (Last 6 Hours)"
                                height={300}
                            />

                            <LineChart
                                data={healthData.charts.errorRate}
                                labels={healthData.charts.errorRateLabels}
                                title="Error Rate Trend (Last 7 Days)"
                                height={300}
                            />
                        </div>
                    </div>

                    <div className="activity-alerts-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                        {/* Section 3: Critical Alerts Panel */}
                        <div className="alerts-panel glass-card">
                            <h3>Critical Alerts</h3>
                            {alerts.length === 0 ? (
                                <p className="empty-message">No critical alerts</p>
                            ) : (
                                <div className="alerts-list">
                                    {alerts.slice(0, 5).map(alert => (
                                        <div key={alert.id} className="alert-item">
                                            <span className="alert-severity">
                                                {alert.severity === 'critical' ? '🔴' : '🟡'}
                                            </span>
                                            <div className="alert-content">
                                                <strong>{alert.message}</strong>
                                                <small>
                                                    {new Date(alert.created_at).toLocaleString()}
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 4: Recent Activity Feed */}
                        <div className="activity-feed glass-card">
                            <h3>Recent Activity</h3>
                            <div className="activity-list">
                                {activity.slice(0, 10).map(item => (
                                    <div key={item.id} className="activity-item">
                                        <span className="activity-icon">👤</span>
                                        <div className="activity-content">
                                            <span>{item.action}</span>
                                            <small>
                                                {item.user} • {new Date(item.timestamp).toLocaleTimeString()}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </SuperAdminLayout>
    );
};

export default OverviewDashboard;

