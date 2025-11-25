import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import ActivityTable from '../../components/ActivityTable';
import { useAuth } from '../../context/AuthContext';
import {
    CheckSquare,
    FileText,
    Receipt,
    Activity
} from 'lucide-react';
import '../../styles/dashboard.css';
import './UserDashboard.css';

const UserDashboard = () => {
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

    // Mock Data for User Dashboard
    const metrics = [
        {
            title: 'My Tasks',
            value: '8',
            icon: CheckSquare,
            subtitle: '3 pending completion',
            color: 'info'
        },
        {
            title: 'Invoices Created',
            value: '24',
            icon: FileText,
            trend: '+6 this month',
            trendDirection: 'up',
            color: 'success'
        },
        {
            title: 'Expenses Logged',
            value: '$1,245',
            icon: Receipt,
            subtitle: 'This month',
            color: 'warning'
        },
        {
            title: 'Activity This Week',
            value: '42',
            icon: Activity,
            trend: '+12%',
            trendDirection: 'up',
            color: 'info'
        }
    ];

    const recentActivity = [
        { username: 'You', action: 'Created invoice #INV-045', timestamp: '10 mins ago' },
        { username: 'You', action: 'Updated inventory item', timestamp: '1 hour ago' },
        { username: 'You', action: 'Logged expense: Office supplies', timestamp: '3 hours ago' },
        { username: 'You', action: 'Completed task: Stock check', timestamp: '5 hours ago' },
        { username: 'You', action: 'Created invoice #INV-044', timestamp: '1 day ago' }
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
