import React, { useState, useEffect } from 'react';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart } from '../../components/Charts';
import DataTable from '../../components/Tables/DataTable';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { Users, UserCheck, Clock, TrendingDown } from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import './UserHealth.css';

const UserHealth = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch user health data
    useEffect(() => {
        const fetchUserHealth = async () => {
            try {
                setLoading(true);

                // Mock data for now
                const mockData = {
                    dau: 1234,
                    mau: 3456,
                    dau_mau_ratio: 35.7,
                    avg_session_duration: 24.5,
                    charts: {
                        dau_mau_trend: {
                            data: [32.5, 33.2, 34.1, 33.8, 35.2, 34.9, 35.7],
                            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        },
                        user_segmentation: {
                            data: [450, 380, 320],
                            labels: ['SuperAdmin', 'Admin', 'User']
                        }
                    },
                    retention_cohort: [
                        { month: 'Jan 2026', month_0: 100, month_1: 85, month_2: 72, month_3: 65 },
                        { month: 'Feb 2026', month_0: 100, month_1: 88, month_2: 75, month_3: null },
                        { month: 'Mar 2026', month_0: 100, month_1: 90, month_2: null, month_3: null },
                        { month: 'Apr 2026', month_0: 100, month_1: null, month_2: null, month_3: null }
                    ],
                    inactive_users: [
                        {
                            id: 1,
                            username: 'john.doe@techstore.com',
                            tenant: 'Tech Store Alpha',
                            role: 'admin',
                            last_login: '2025-11-15T10:30:00Z',
                            days_inactive: 49
                        },
                        {
                            id: 2,
                            username: 'jane.smith@phonehub.com',
                            tenant: 'Phone Hub Beta',
                            role: 'user',
                            last_login: '2025-11-20T14:15:00Z',
                            days_inactive: 44
                        },
                        {
                            id: 3,
                            username: 'mike.wilson@mobileworld.com',
                            tenant: 'Mobile World Gamma',
                            role: 'user',
                            last_login: '2025-11-25T09:45:00Z',
                            days_inactive: 39
                        },
                        {
                            id: 4,
                            username: 'sarah.jones@deviceshop.com',
                            tenant: 'Device Shop Delta',
                            role: 'admin',
                            last_login: '2025-12-01T16:20:00Z',
                            days_inactive: 33
                        },
                        {
                            id: 5,
                            username: 'tom.brown@gadgetstore.com',
                            tenant: 'Gadget Store Epsilon',
                            role: 'user',
                            last_login: '2025-12-03T11:00:00Z',
                            days_inactive: 31
                        }
                    ]
                };

                setUserData(mockData);
                setIsConnected(true);
            } catch (error) {
                console.error('Failed to fetch user health:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserHealth();

        // Refresh every 60 seconds
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
        >
            <ConnectionIndicator isConnected={isConnected} />

            {userData && (
                <>
                    {/* Metric Cards Grid */}
                    <div className="metrics-grid">
                        {/* DAU (Daily Active Users) */}
                        <MetricCard
                            title="DAU"
                            value={userData.dau.toLocaleString()}
                            icon={Users}
                            trend="+5%"
                            trendDirection="up"
                            subtitle="daily active users"
                            color="primary"
                        />

                        {/* MAU (Monthly Active Users) */}
                        <MetricCard
                            title="MAU"
                            value={userData.mau.toLocaleString()}
                            icon={UserCheck}
                            trend="+8%"
                            trendDirection="up"
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

