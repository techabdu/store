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
    ShoppingBag,
    Users,
    DollarSign,
    TrendingUp
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
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

    // State for dashboard data
    const [metrics, setMetrics] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [activityData, setActivityData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch Dashboard Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch dashboard stats and activity logs in parallel
                const [statsResponse, logsResponse] = await Promise.all([
                    api.get('/admin/dashboard_stats.php'),
                    api.get('/activity_logs.php?limit=10')
                ]);

                if (statsResponse.data.success) {
                    const data = statsResponse.data.data;

                    // Format metrics cards
                    const formattedMetrics = [
                        {
                            title: 'Total Sales',
                            value: `₦${data.monthly_sales.total.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                            icon: DollarSign,
                            trend: `${data.monthly_sales.percentage_change >= 0 ? '+' : ''}${data.monthly_sales.percentage_change}% vs last month`,
                            trendDirection: data.monthly_sales.percentage_change >= 0 ? 'up' : 'down',
                            color: 'success'
                        },
                        {
                            title: 'Active Orders',
                            value: data.total_inventory.toString(),
                            icon: ShoppingBag,
                            subtitle: `${data.total_inventory} items in stock`,
                            color: 'info'
                        },
                        {
                            title: 'New Customers',
                            value: data.monthly_customers.total.toString(),
                            icon: Users,
                            trend: `${data.monthly_customers.percentage_change >= 0 ? '+' : ''}${data.monthly_customers.percentage_change}% this month`,
                            trendDirection: data.monthly_customers.percentage_change >= 0 ? 'up' : 'down',
                            color: 'warning'
                        },
                        {
                            title: 'Growth Rate',
                            value: `${data.monthly_sales.percentage_change >= 0 ? '+' : ''}${data.monthly_sales.percentage_change}%`,
                            icon: TrendingUp,
                            subtitle: 'Monthly performance',
                            color: data.monthly_sales.percentage_change >= 0 ? 'success' : 'danger'
                        }
                    ];

                    setMetrics(formattedMetrics);
                    setSalesData(data.sales_overview);
                    setAlerts(data.low_stock_alerts.length > 0 ? data.low_stock_alerts : []);
                }

                if (logsResponse.data.success) {
                    const formattedLogs = logsResponse.data.logs.map(log => ({
                        username: log.username || 'Unknown',
                        action: log.action,
                        timestamp: new Date(log.created_at).toLocaleString(),
                        role: log.user_role
                    }));
                    setActivityData(formattedLogs);
                }

                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch admin dashboard data:', error);
                setError('Failed to load dashboard data');
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);


    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
                alertCount={alerts.length}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">Admin Dashboard</h1>
                        <p className="text-secondary">Overview of store performance and orders</p>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p className="text-secondary">Loading dashboard data...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--danger)' }}>{error}</p>
                        </div>
                    )}

                    {/* Dashboard Content */}
                    {!loading && !error && (
                        <>
                            {/* Metrics Grid */}
                            <div className="grid-4">
                                {metrics.map((metric, index) => (
                                    <MetricCard key={index} {...metric} />
                                ))}
                            </div>

                            {/* Charts Section */}
                            <div className="grid-2">
                                <ChartCard title="Sales Overview" subtitle="Monthly sales performance">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={salesData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                                            <Tooltip
                                                cursor={{ fill: 'var(--bg-background)' }}
                                                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                            />
                                            <Legend />
                                            <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartCard>

                                <AlertsList
                                    title="Store Alerts"
                                    subtitle="Inventory and order notifications"
                                    alerts={alerts}
                                    emptyState={{ text: 'No active alerts.' }}
                                />
                            </div>

                            {/* Recent Activity Table */}
                            <div className="grid-1">
                                <ActivityTable
                                    title="Recent Activity"
                                    subtitle="Latest system actions"
                                    data={activityData}
                                    footer={{ text: 'View all activity', link: '/admin/activity' }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
