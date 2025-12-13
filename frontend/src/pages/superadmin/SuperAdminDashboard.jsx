import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import ChartCard from '../../components/ChartCard';
import ActivityTable from '../../components/ActivityTable';
import AlertsList from '../../components/AlertsList';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Activity,
    Users,
    Clock,
    Database,
    AlertTriangle
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import '../../styles/dashboard.css';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/superadmin/system_insights.php?tab=overview');
                if (response.data.success) {
                    setDashboardData(response.data.data);
                } else {
                    setError('Failed to load dashboard data');
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={toggleSidebar} user={user} />
                <Sidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                    <div className="content-wrapper flex items-center justify-center h-screen">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                </main>
            </div>
        );
    }

    // Process Data for UI
    const metrics = dashboardData ? [
        {
            title: 'System Health',
            value: dashboardData.system?.health || 'Unknown',
            icon: Activity,
            subtitle: 'Overall Status',
            color: dashboardData.system?.health === 'Healthy' ? 'success' : 'warning'
        },
        {
            title: 'Active Users',
            value: dashboardData.performance?.active_users?.active_count || 0,
            icon: Users,
            trend: 'Live',
            trendDirection: 'up',
            subtitle: 'Currently online',
            color: 'info'
        },
        {
            title: 'System Uptime',
            value: dashboardData.system?.uptime?.days !== undefined
                ? `${dashboardData.system.uptime.days}d ${dashboardData.system.uptime.hours}h`
                : 'N/A',
            icon: Clock,
            subtitle: 'Since last restart',
            color: 'success'
        },
        {
            title: 'Database Size',
            value: dashboardData.database?.size?.size_mb + ' MB',
            icon: Database,
            subtitle: 'Allocated: ' + dashboardData.database?.size?.allocated_mb + ' MB',
            color: 'info'
        }
    ] : [];

    // Map chart data
    const chartData = dashboardData?.activity?.chart_data?.map(item => ({
        day: item.day_name.substring(0, 3), // Mon, Tue...
        activity: item.activity_count
    })) || [];

    // Map pie data
    const roleColors = {
        'superadmin': '#EA4335',
        'admin': '#4285F4',
        'user': '#34A853'
    };

    const pieData = dashboardData?.business?.user_stats?.by_role ?
        Object.entries(dashboardData.business.user_stats.by_role).map(([role, count]) => ({
            name: role.charAt(0).toUpperCase() + role.slice(1),
            value: count,
            color: roleColors[role] || '#888888'
        })) : [];

    // Map recent activity
    const recentActivity = dashboardData?.activity?.recent_logs?.map(log => ({
        username: log.username,
        action: log.action,
        timestamp: new Date(log.created_at).toLocaleString()
    })) || [];

    // Map alerts
    const alerts = dashboardData?.alerts?.recent_critical?.map(alert => ({
        title: alert.type.replace('_', ' ').toUpperCase(),
        description: alert.message,
        timestamp: new Date(alert.created_at).toLocaleTimeString(),
        color: alert.severity === 'critical' ? 'danger' : 'warning',
        action: 'View'
    })) || [];

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">SuperAdmin Dashboard</h1>
                        <p className="text-secondary">Welcome back, {user?.username || 'SuperAdmin'}</p>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">Error!</strong>
                            <span className="block sm:inline"> {error}</span>
                        </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="grid-4">
                        {metrics.map((metric, index) => (
                            <MetricCard key={index} {...metric} />
                        ))}
                    </div>

                    {/* Charts Grid */}
                    <div className="grid-2">
                        <ChartCard title="System Activity" subtitle="Activity volume over the last 7 days">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="activity" stroke="#4285F4" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Activity" />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="User Distribution" subtitle="Breakdown by role">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Tables Grid */}
                    <div className="grid-2">
                        <ActivityTable
                            title="Recent User Activities"
                            subtitle="Latest system activities"
                            data={recentActivity}
                            footer={{ text: 'View all activities', link: '/superadmin/logs' }}
                        />

                        <AlertsList
                            title="System Alerts"
                            subtitle="Issues requiring attention"
                            alerts={alerts}
                            emptyState={{ text: 'No alerts. All systems running smoothly!' }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
