import React, { useState, useEffect } from 'react';
import HealthPillarCard from '../../components/Dashboard/HealthPillarCard';
import { LineChart } from '../../components/Charts';
import AlertBadge from '../../components/Dashboard/AlertBadge';
import ConnectionIndicator from '../../components/ConnectionIndicator';
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
                // Simulate API call - replace with actual API endpoint
                // const response = await axios.get('/api/superadmin/health');
                // setHealthData(response.data);

                // Mock data for now
                const mockData = {
                    system: {
                        status: 'healthy',
                        uptime: '99.9%',
                        trend: '+0.1%',
                        direction: 'up'
                    },
                    user: {
                        status: 'healthy',
                        dau: '1,234',
                        trend: '+12%',
                        direction: 'up'
                    },
                    error: {
                        status: 'warning',
                        rate: '0.8%',
                        trend: '-15%',
                        direction: 'down'
                    },
                    business: {
                        status: 'healthy',
                        revenue: '$12,345',
                        trend: '+8%',
                        direction: 'up'
                    },
                    charts: {
                        apiLatency: [30, 45, 50, 48, 52, 47, 43],
                        errorRate: [2, 1.5, 1, 0.8, 0.5, 0.4, 0.3]
                    }
                };

                setHealthData(mockData);

                // Mock alerts
                setAlerts([
                    {
                        id: 1,
                        severity: 'critical',
                        message: 'High error rate detected in payment module',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        severity: 'warning',
                        message: 'Database connection pool nearing capacity',
                        created_at: new Date(Date.now() - 3600000).toISOString()
                    }
                ]);

                // Mock activity
                setActivity([
                    {
                        id: 1,
                        action: 'New tenant registered',
                        user: 'System',
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 2,
                        action: 'Admin user logged in',
                        user: 'john@example.com',
                        timestamp: new Date(Date.now() - 1800000).toISOString()
                    },
                    {
                        id: 3,
                        action: 'Inventory updated',
                        user: 'jane@example.com',
                        timestamp: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        id: 4,
                        action: 'New marketplace listing created',
                        user: 'seller@example.com',
                        timestamp: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        id: 5,
                        action: 'Report generated',
                        user: 'admin@example.com',
                        timestamp: new Date(Date.now() - 10800000).toISOString()
                    }
                ]);

                setIsConnected(true);
            } catch (error) {
                console.error('Failed to fetch health data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHealthData();
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="main-content">
                <div className="container">
                    <div className="loading-state">
                        <div>Loading dashboard...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <ConnectionIndicator isConnected={isConnected} />

            <div className="container">
                {/* Page Header */}
                <div className="page-header">
                    <h1>SuperAdmin Dashboard</h1>
                    <div className="header-actions">
                        <AlertBadge count={alerts.length} severity="critical" isNew={true} />
                    </div>
                </div>

                {/* Section 1: Health Pillar Cards */}
                <div className="metrics-grid">
                    <HealthPillarCard
                        title="System Health"
                        status={healthData?.system?.status || 'healthy'}
                        value={healthData?.system?.uptime || '99.9%'}
                        trend={healthData?.system?.trend || '+0.1%'}
                        trendDirection={healthData?.system?.direction || 'up'}
                        subtitle="uptime"
                    />

                    <HealthPillarCard
                        title="User Health"
                        status={healthData?.user?.status || 'healthy'}
                        value={healthData?.user?.dau || '1,234'}
                        trend={healthData?.user?.trend || '+12%'}
                        trendDirection={healthData?.user?.direction || 'up'}
                        subtitle="daily active users"
                    />

                    <HealthPillarCard
                        title="Error Health"
                        status={healthData?.error?.status || 'warning'}
                        value={healthData?.error?.rate || '0.8%'}
                        trend={healthData?.error?.trend || '-15%'}
                        trendDirection="up"
                        subtitle="error rate"
                    />

                    <HealthPillarCard
                        title="Business Health"
                        status={healthData?.business?.status || 'healthy'}
                        value={healthData?.business?.revenue || '$12,345'}
                        trend={healthData?.business?.trend || '+8%'}
                        trendDirection={healthData?.business?.direction || 'up'}
                        subtitle="daily revenue"
                    />
                </div>

                {/* Section 2: Real-Time Metrics Charts */}
                <div className="charts-section">
                    <div className="charts-grid">
                        <LineChart
                            data={healthData?.charts?.apiLatency || [30, 45, 50, 48, 52, 47, 43]}
                            labels={['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now']}
                            title="API Response Time (Last 6 Hours)"
                            height={300}
                        />

                        <LineChart
                            data={healthData?.charts?.errorRate || [2, 1.5, 1, 0.8, 0.5, 0.4, 0.3]}
                            labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                            title="Error Rate Trend (Last 7 Days)"
                            height={300}
                        />
                    </div>
                </div>

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
                        {activity?.slice(0, 10).map(item => (
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
        </div>
    );
};

export default OverviewDashboard;
