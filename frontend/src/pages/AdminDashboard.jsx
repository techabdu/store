import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import ActivityTable from '../components/ActivityTable';
import AlertsList from '../components/AlertsList';
import { useAuth } from '../context/AuthContext';
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

    // Mock Data for Admin
    const metrics = [
        {
            title: 'Total Sales',
            value: '$12,450',
            icon: DollarSign,
            trend: '+15% vs last month',
            trendDirection: 'up',
            color: 'success'
        },
        {
            title: 'Active Orders',
            value: '45',
            icon: ShoppingBag,
            subtitle: '12 pending processing',
            color: 'info'
        },
        {
            title: 'New Customers',
            value: '128',
            icon: Users,
            trend: '+8% this week',
            trendDirection: 'up',
            color: 'warning'
        },
        {
            title: 'Growth Rate',
            value: '24%',
            icon: TrendingUp,
            subtitle: 'Quarterly performance',
            color: 'success'
        }
    ];

    const salesData = [
        { month: 'Jan', sales: 4000 },
        { month: 'Feb', sales: 3000 },
        { month: 'Mar', sales: 2000 },
        { month: 'Apr', sales: 2780 },
        { month: 'May', sales: 1890 },
        { month: 'Jun', sales: 2390 },
        { month: 'Jul', sales: 3490 }
    ];

    const recentOrders = [
        { id: '#ORD-001', customer: 'John Doe', status: 'Completed', total: '$120.00', date: '2 mins ago' },
        { id: '#ORD-002', customer: 'Jane Smith', status: 'Processing', total: '$85.50', date: '15 mins ago' },
        { id: '#ORD-003', customer: 'Bob Johnson', status: 'Pending', total: '$245.00', date: '1 hour ago' },
        { id: '#ORD-004', customer: 'Alice Brown', status: 'Completed', total: '$65.00', date: '3 hours ago' },
        { id: '#ORD-005', customer: 'Charlie Wilson', status: 'Cancelled', total: '$15.00', date: '5 hours ago' }
    ];

    // Transform orders for ActivityTable
    const activityData = recentOrders.map(order => ({
        username: order.id,
        action: `Order by ${order.customer} (${order.status})`,
        timestamp: order.date
    }));

    const alerts = [
        {
            title: 'Low Stock Warning',
            description: 'iPhone 15 Pro Max is running low (3 units left)',
            timestamp: '30 mins ago',
            color: 'warning',
            action: 'Restock'
        },
        {
            title: 'New Review',
            description: '5-star review received for Samsung S24',
            timestamp: '2 hours ago',
            color: 'success',
            action: 'View'
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
                        <h1 className="heading-1">Admin Dashboard</h1>
                        <p className="text-secondary">Overview of store performance and orders</p>
                    </div>

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

                    {/* Recent Orders Table */}
                    <div className="grid-1">
                        <ActivityTable
                            title="Recent Orders"
                            subtitle="Latest transactions"
                            data={activityData}
                            footer={{ text: 'View all orders', link: '/admin/orders' }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
