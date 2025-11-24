import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import ChartCard from '../../components/ChartCard';
import ActivityTable from '../../components/ActivityTable';
import AlertsList from '../../components/AlertsList';
import { useAuth } from '../../context/AuthContext';
import {
    Activity,
    Users,
    Clock,
    Database
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
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Mock Data
    const metrics = [
        {
            title: 'System Health',
            value: 'Healthy',
            icon: Activity,
            subtitle: 'All systems operational',
            color: 'success'
        },
        {
            title: 'Active Users',
            value: '12',
            icon: Users,
            trend: '+2 this week',
            trendDirection: 'up',
            subtitle: '5 Admins, 7 Users',
            color: 'info'
        },
        {
            title: 'System Uptime',
            value: '99.8%',
            icon: Clock,
            trend: '+0.2%',
            trendDirection: 'up',
            subtitle: 'Last 30 days',
            color: 'success'
        },
        {
            title: 'Last Backup',
            value: '2h ago',
            icon: Database,
            subtitle: 'Auto backup enabled',
            color: 'info'
        }
    ];

    const chartData = [
        { day: 'Mon', admins: 8, users: 15 },
        { day: 'Tue', admins: 12, users: 18 },
        { day: 'Wed', admins: 10, users: 20 },
        { day: 'Thu', admins: 15, users: 22 },
        { day: 'Fri', admins: 11, users: 19 },
        { day: 'Sat', admins: 5, users: 8 },
        { day: 'Sun', admins: 6, users: 10 }
    ];

    const pieData = [
        { name: 'SuperAdmin', value: 1, color: '#EA4335' },
        { name: 'Admins', value: 5, color: '#4285F4' },
        { name: 'Users', value: 6, color: '#34A853' }
    ];

    const recentActivity = [
        { username: 'it support', action: 'Changed shop name', timestamp: '2 hours ago' },
        { username: 'it support', action: 'Reset admin password', timestamp: '5 hours ago' },
        { username: 'it support', action: 'Updated system settings', timestamp: '1 day ago' },
        { username: 'it support', action: 'Logged in', timestamp: '2 days ago' },
        { username: 'admin1', action: 'Created new user', timestamp: '3 days ago' }
    ];

    const alerts = [
        {
            title: 'Disk Space Low',
            description: 'Database backup storage at 85%',
            timestamp: '1 hour ago',
            color: 'warning',
            action: 'View Details'
        },
        {
            title: 'Update Available',
            description: 'System version 1.1.0 is ready',
            timestamp: '3 hours ago',
            color: 'info',
            action: 'Update Now'
        }
    ];

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

                    {/* Metrics Grid */}
                    <div className="grid-4">
                        {metrics.map((metric, index) => (
                            <MetricCard key={index} {...metric} />
                        ))}
                    </div>

                    {/* Charts Grid */}
                    <div className="grid-2">
                        <ChartCard title="User Activity" subtitle="Login activity over the last 7 days">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="admins" stroke="#4285F4" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="users" stroke="#34A853" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
