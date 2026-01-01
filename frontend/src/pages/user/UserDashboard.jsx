import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import ActivityTable from '../../components/ActivityTable';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';
import {
    Package,
    TrendingUp,
    Receipt,
    Activity,
    DollarSign
} from 'lucide-react';
import '../../styles/dashboard.css';
import './UserDashboard.css';

const UserDashboard = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [stats, setStats] = useState({
        inventory_count: 0,
        monthly_sales: 0,
        monthly_expenses: 0,
        weekly_sales_count: 0
    });
    const [loading, setLoading] = useState(true);
    const { showError } = useNotification();

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

    // Fetch Dashboard Stats and Activity Logs
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsResponse, profitResponse, expenseResponse, logsResponse] = await Promise.all([
                    api.get('/user/dashboard_stats.php'),
                    api.get('/user/profit_stats.php'),
                    api.get('/user/expense_stats.php'),
                    api.get('/activity_logs.php?limit=5')
                ]);

                if (statsResponse.data.success) {
                    setStats(statsResponse.data.stats);
                }

                // Store profit data separately
                if (profitResponse.data.success) {
                    setStats(prevStats => ({
                        ...prevStats,
                        daily_profit: profitResponse.data.data.daily_profit,
                        monthly_profit: profitResponse.data.data.monthly_profit
                    }));
                }

                // Store expense data separately
                if (expenseResponse.data.success) {
                    setStats(prevStats => ({
                        ...prevStats,
                        daily_expenses: expenseResponse.data.data.daily_expenses,
                        monthly_expenses: expenseResponse.data.data.monthly_expenses
                    }));
                }

                if (logsResponse.data.success) {
                    // Transform logs to match ActivityTable format
                    const formattedLogs = logsResponse.data.logs.map(log => ({
                        username: 'You', // Since it's user dashboard, it's always 'You'
                        action: log.action, // You might want to format this better based on action type
                        timestamp: new Date(log.created_at).toLocaleString() // Simple formatting
                    }));
                    setRecentActivity(formattedLogs);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                showError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Format currency to Naira
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount);
    };

    // Dashboard Metrics
    const metrics = [
        {
            title: 'Daily Profit',
            value: loading ? '...' : formatCurrency(stats.daily_profit || 0),
            icon: TrendingUp,
            subtitle: 'Profit earned today',
            color: 'success'
        },
        {
            title: 'Monthly Profit',
            value: loading ? '...' : formatCurrency(stats.monthly_profit || 0),
            icon: DollarSign,
            subtitle: 'Profit this month',
            color: 'success'
        },
        {
            title: 'Total Inventory',
            value: loading ? '...' : stats.inventory_count,
            icon: Package,
            subtitle: 'Items in stock',
            color: 'info'
        },
        {
            title: 'Monthly Expenses',
            value: loading ? '...' : formatCurrency(stats.monthly_expenses || 0),
            icon: Receipt,
            subtitle: 'Expenses this month',
            color: 'danger'
        }
    ];

    const [recentActivity, setRecentActivity] = useState([]);

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
                        <h1 className="heading-1">User Dashboard</h1>
                        <p className="text-secondary">Welcome back, {user?.username || 'User'}</p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid-4">
                        {metrics.map((metric, index) => (
                            <MetricCard key={index} {...metric} />
                        ))}
                    </div>

                    {/* Recent Activity */}
                    <div className="grid-1">
                        <ActivityTable
                            title="My Recent Activity"
                            subtitle="Your latest actions and updates"
                            data={recentActivity}
                            footer={{ text: 'View all activity', link: '/user/activity' }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserDashboard;
