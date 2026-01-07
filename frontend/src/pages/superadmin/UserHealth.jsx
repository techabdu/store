import React, { useState, useEffect } from 'react';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart } from '../../components/Charts';
import DataTable from '../../components/Tables/DataTable';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { Users, UserCheck, Clock, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import api from '../../utils/api';
import './UserHealth.css';

const UserHealth = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    /**
     * Fetch user health data from the backend API
     * Retrieves real-time metrics including:
     * - DAU (Daily Active Users) and MAU (Monthly Active Users)
     * - DAU/MAU ratio (stickiness metric)
     * - Average session duration
     * - User segmentation by role
     * - Retention cohort analysis
     * - Inactive users list (>30 days)
     */
    const fetchUserHealth = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/superadmin/user_health.php');

            if (response.data.success) {
                const data = response.data.data;

                // Transform API response to match component expectations
                const transformedData = {
                    dau: data.dau || 0,
                    mau: data.mau || 0,
                    dau_mau_ratio: data.dau_mau_ratio || 0,
                    avg_session_duration: data.avg_session_duration || 0,
                    dau_trend: data.dau_trend || 0,
                    mau_trend: data.mau_trend || 0,
                    charts: {
                        dau_mau_trend: data.charts?.dau_mau_trend || { data: [], labels: [] },
                        user_segmentation: data.charts?.user_segmentation || { data: [], labels: [] }
                    },
                    retention_cohort: data.retention_cohort || [],
                    inactive_users: data.inactive_users || []
                };

                setUserData(transformedData);
                setIsConnected(true);
                setLastUpdated(data.last_updated || new Date().toISOString());
            } else {
                throw new Error(response.data.error || 'Failed to fetch user health data');
            }
        } catch (err) {
            console.error('Failed to fetch user health:', err);
            setError(err.message || 'Failed to load user health data');
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and auto-refresh every 60 seconds
    useEffect(() => {
        fetchUserHealth();

        // Refresh every 60 seconds for real-time updates
        const interval = setInterval(fetchUserHealth, 60000);
        return () => clearInterval(interval);
    }, []);

    // Get retention color based on percentage
    const getRetentionColor = (value) => {
        if (value === null) return 'transparent';
        if (value >= 80) return 'rgba(52, 168, 83, 0.3)';
        if (value >= 60) return 'rgba(251, 188, 4, 0.3)';
        return 'rgba(234, 67, 53, 0.3)';
    };

    // Table columns for inactive users
    const inactiveUsersColumns = [
        {
            key: 'username',
            label: 'Username',
            sortable: true
        },
        {
            key: 'tenant',
            label: 'Tenant',
            sortable: true
        },
        {
            key: 'role',
            label: 'Role',
            sortable: true,
            render: (val) => (
                <span className={`role-badge role-${val}`}>
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                </span>
            )
        },
        {
            key: 'last_login',
            label: 'Last Login',
            sortable: true,
            render: (val) => new Date(val).toLocaleDateString()
        },
        {
            key: 'days_inactive',
            label: 'Days Inactive',
            sortable: true,
            render: (val) => (
                <span style={{ color: val > 45 ? 'var(--error)' : 'var(--warning)', fontWeight: 600 }}>
                    {val}
                </span>
            )
        }
    ];

    return (
        <SuperAdminLayout
            title="User Health"
            subtitle="Monitor user engagement, retention, and activity"
            loading={loading}
            headerActions={
                <button
                    className="refresh-btn"
                    onClick={fetchUserHealth}
                    disabled={loading}
                    title="Refresh data"
                >
                    <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                </button>
            }
        >
            <ConnectionIndicator isConnected={isConnected} />

            {/* Error State */}
            {error && !userData && (
                <div className="error-state glass-card">
                    <AlertCircle size={48} />
                    <h3>Failed to Load User Health Data</h3>
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchUserHealth}>
                        <RefreshCw size={16} />
                        Retry
                    </button>
                </div>
            )}

            {userData && (
                <>
                    {/* Last Updated Indicator */}
                    {lastUpdated && (
                        <div className="last-updated">
                            Last updated: {new Date(lastUpdated).toLocaleString()}
                        </div>
                    )}

                    {/* Metric Cards Grid */}
                    <div className="metrics-grid">
                        {/* DAU (Daily Active Users) */}
                        <MetricCard
                            title="DAU"
                            value={userData.dau.toLocaleString()}
                            icon={Users}
                            trend={userData.dau_trend !== 0 ? `${userData.dau_trend > 0 ? '+' : ''}${userData.dau_trend}%` : null}
                            trendDirection={userData.dau_trend >= 0 ? 'up' : 'down'}
                            subtitle="daily active users"
                            color="primary"
                        />

                        {/* MAU (Monthly Active Users) */}
                        <MetricCard
                            title="MAU"
                            value={userData.mau.toLocaleString()}
                            icon={UserCheck}
                            trend={userData.mau_trend !== 0 ? `${userData.mau_trend > 0 ? '+' : ''}${userData.mau_trend}%` : null}
                            trendDirection={userData.mau_trend >= 0 ? 'up' : 'down'}
                            subtitle="monthly active users"
                            color="success"
                        />

                        {/* DAU/MAU Ratio */}
                        <MetricCard
                            title="DAU/MAU Ratio"
                            value={`${userData.dau_mau_ratio}%`}
                            icon={TrendingDown}
                            subtitle="engagement metric"
                            color="info"
                        />

                        {/* Average Session Duration */}
                        <MetricCard
                            title="Avg Session"
                            value={`${userData.avg_session_duration} min`}
                            icon={Clock}
                            subtitle="per session"
                            color="warning"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        <div className="charts-grid">
                            {/* DAU/MAU Trend */}
                            <LineChart
                                data={userData.charts.dau_mau_trend.data}
                                labels={userData.charts.dau_mau_trend.labels}
                                title="DAU/MAU Ratio Over Time"
                                height={300}
                            />

                            {/* User Segmentation */}
                            <BarChart
                                data={userData.charts.user_segmentation.data}
                                labels={userData.charts.user_segmentation.labels}
                                title="User Segmentation by Role"
                                height={300}
                            />
                        </div>
                    </div>

                    {/* Retention Cohort Table */}
                    <div className="cohort-section glass-card">
                        <h3>User Retention Cohort Analysis</h3>
                        <p className="cohort-description">
                            Percentage of users who return each month after signup
                        </p>
                        <div className="table-responsive">
                            <table className="cohort-table">
                                <thead>
                                    <tr>
                                        <th>Signup Month</th>
                                        <th>Month 0</th>
                                        <th>Month 1</th>
                                        <th>Month 2</th>
                                        <th>Month 3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userData.retention_cohort.map((cohort, index) => (
                                        <tr key={index}>
                                            <td className="cohort-month">{cohort.month}</td>
                                            <td style={{ background: getRetentionColor(cohort.month_0) }}>
                                                {cohort.month_0 !== null ? `${cohort.month_0}%` : '-'}
                                            </td>
                                            <td style={{ background: getRetentionColor(cohort.month_1) }}>
                                                {cohort.month_1 !== null ? `${cohort.month_1}%` : '-'}
                                            </td>
                                            <td style={{ background: getRetentionColor(cohort.month_2) }}>
                                                {cohort.month_2 !== null ? `${cohort.month_2}%` : '-'}
                                            </td>
                                            <td style={{ background: getRetentionColor(cohort.month_3) }}>
                                                {cohort.month_3 !== null ? `${cohort.month_3}%` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="cohort-legend">
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: 'rgba(52, 168, 83, 0.3)' }}></span>
                                <span>High (≥80%)</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: 'rgba(251, 188, 4, 0.3)' }}></span>
                                <span>Medium (60-79%)</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: 'rgba(234, 67, 53, 0.3)' }}></span>
                                <span>Low (&lt;60%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Inactive Users Table */}
                    <div className="inactive-users-section glass-card">
                        <h3>Inactive Users (&gt;30 Days)</h3>
                        <DataTable
                            columns={inactiveUsersColumns}
                            data={userData.inactive_users}
                            pageSize={10}
                        />
                    </div>
                </>
            )}
        </SuperAdminLayout>
    );
};

export default UserHealth;

