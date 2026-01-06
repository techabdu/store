import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard, Users, CreditCard, TrendingUp, Activity, MessageSquare, Settings, ArrowLeft,
    RefreshCw, AlertCircle, Bell
} from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import OverviewTab from '../../components/superadmin/tenant-detail/OverviewTab';
import UsersTab from '../../components/superadmin/tenant-detail/UsersTab';
import SubscriptionTab from '../../components/superadmin/tenant-detail/SubscriptionTab';
import AnalyticsTab from '../../components/superadmin/tenant-detail/AnalyticsTab';
import HealthTab from '../../components/superadmin/tenant-detail/HealthTab';
import SupportTab from '../../components/superadmin/tenant-detail/SupportTab';
import SettingsTab from '../../components/superadmin/tenant-detail/SettingsTab';
import SkeletonLoader from '../../components/superadmin/tenant-detail/SkeletonLoader';
import TenantNotifications from '../../components/superadmin/tenant-detail/TenantNotifications';
import api from '../../utils/api';
import './TenantDetailPage.css';

// Polling interval for notifications (30 seconds)
const NOTIFICATION_POLL_INTERVAL = 30000;

const TenantDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Ref to track previous notification count for detecting new notifications
    const prevNotificationCountRef = useRef(0);
    const pollingIntervalRef = useRef(null);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'users', label: 'Users & Activity', icon: Users },
        { id: 'subscription', label: 'Subscription', icon: CreditCard },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'health', label: 'System Health', icon: Activity },
        { id: 'support', label: 'Support', icon: MessageSquare },
        { id: 'settings', label: 'Settings', icon: Settings }
    ];

    // Fetch notifications only (for polling - lighter than full data refresh)
    const fetchNotifications = useCallback(async () => {
        try {
            const response = await api.get(`/superadmin/tenant_notifications.php?action=list&tenant_id=${id}`);
            if (response.data.success) {
                const newCount = response.data.notifications.length;

                // Check if we have new notifications
                if (newCount > prevNotificationCountRef.current && prevNotificationCountRef.current > 0) {
                    // Show browser notification if permission granted
                    if (window.Notification && Notification.permission === 'granted' && tenant) {
                        new Notification(`Tenant Alert: ${tenant.shop_name}`, {
                            body: `You have ${newCount - prevNotificationCountRef.current} new notification(s)`
                        });
                    }
                }

                prevNotificationCountRef.current = newCount;
                setNotificationCount(newCount);
            }
        } catch (err) {
            // Silently fail for polling - don't disrupt the user experience
            console.warn('Failed to poll notifications:', err.message);
        }
    }, [id, tenant]);

    // Initial data fetch
    useEffect(() => {
        fetchTenantData();
    }, [id]);

    // Polling for notifications every 30 seconds
    useEffect(() => {
        // Start polling after initial load
        if (!loading && tenant) {
            pollingIntervalRef.current = setInterval(() => {
                fetchNotifications();
            }, NOTIFICATION_POLL_INTERVAL);
        }

        // Cleanup: stop polling when component unmounts or dependencies change
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [loading, tenant, fetchNotifications]);

    const fetchTenantData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [tenantRes, notifRes] = await Promise.all([
                api.get(`/superadmin/tenant_details.php?action=overview&tenant_id=${id}`),
                api.get(`/superadmin/tenant_notifications.php?action=list&tenant_id=${id}`)
            ]);

            if (tenantRes.data.success) {
                setTenant(tenantRes.data.tenant);
            } else {
                setError(tenantRes.data.error || 'Failed to load tenant data');
            }

            if (notifRes.data.success) {
                setNotificationCount(notifRes.data.notifications.length);
            }
        } catch (err) {
            console.error('Error fetching tenant data:', err);
            setError(err.response?.data?.error || 'Failed to load tenant details');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationUpdate = () => {
        // Just refresh the count
        fetchTenantData();
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'status-active',
            trial: 'status-trial',
            suspended: 'status-suspended',
            inactive: 'status-inactive'
        };
        return colors[status] || 'status-inactive';
    };

    const renderTabContent = () => {
        if (activeTab === 'overview') {
            return <OverviewTab tenantId={id} />;
        }
        if (activeTab === 'users') {
            return <UsersTab tenantId={id} />;
        }
        if (activeTab === 'subscription') {
            return <SubscriptionTab tenantId={id} onUpdate={fetchTenantData} />;
        }
        if (activeTab === 'analytics') {
            return <AnalyticsTab tenantId={id} />;
        }
        if (activeTab === 'health') {
            return <HealthTab tenantId={id} />;
        }
        if (activeTab === 'support') {
            return <SupportTab tenantId={id} />;
        }
        if (activeTab === 'settings') {
            return <SettingsTab tenantId={id} onUpdate={fetchTenantData} />;
        }

        // Placeholder for other tabs
        return (
            <div className="tab-content-placeholder">
                <div className="placeholder-icon">
                    <Activity size={48} />
                </div>
                <h3>{tabs.find(t => t.id === activeTab)?.label}</h3>
                <p>This tab will be implemented soon</p>
            </div>
        );
    };

    if (loading) {
        return (
            <SuperAdminLayout title="Loading...">
                <div className="tenant-detail-page skeleton-mode">
                    <SkeletonLoader type="card" />
                    <div style={{ marginTop: '2rem' }}>
                        <div className="tab-navigation skeleton">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="skeleton-line" style={{ width: '100px', height: '40px', margin: 0 }}></div>)}
                        </div>
                    </div>
                    <div className="tab-content" style={{ marginTop: '2rem' }}>
                        <SkeletonLoader type="stats" />
                        <div style={{ marginTop: '2rem' }}>
                            <SkeletonLoader type="table" count={5} />
                        </div>
                    </div>
                </div>
            </SuperAdminLayout>
        );
    }

    if (error) {
        return (
            <SuperAdminLayout title="Error">
                <div className="error-container">
                    <AlertCircle size={48} />
                    <h3>Error Loading Tenant</h3>
                    <p>{error}</p>
                    <button onClick={() => navigate('/superadmin/tenants')} className="btn-primary">
                        Back to Tenants
                    </button>
                </div>
            </SuperAdminLayout>
        );
    }

    return (
        <SuperAdminLayout
            title={tenant?.shop_name || 'Tenant Details'}
            headerActions={
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={() => setIsNotificationsOpen(true)}
                        className={`btn-icon relative ${notificationCount > 0 ? 'text-red' : ''}`}
                        title="Notifications"
                    >
                        <Bell size={18} />
                        {notificationCount > 0 && (
                            <span className="notification-badge">{notificationCount}</span>
                        )}
                    </button>
                    <button onClick={fetchTenantData} className="btn-icon" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </div>
            }
        >
            <div className="tenant-detail-page">
                {/* Breadcrumb */}
                <div className="breadcrumb">
                    <Link to="/superadmin/tenants" className="breadcrumb-link">
                        <ArrowLeft size={16} />
                        <span>Back to Tenants</span>
                    </Link>
                </div>

                {/* Tenant Header */}
                <div className="tenant-header">
                    <div className="tenant-header-info">
                        {/* The shop name and status badge are now in the SuperAdminLayout title prop */}
                        <div className="tenant-header-meta">
                            <span className={`status-badge ${getStatusColor(tenant?.status)}`}>
                                {tenant?.status}
                            </span>
                            <span className="plan-badge">
                                {tenant?.plan_type || tenant?.subscription_plan || 'Free Trial'}
                            </span>
                            <span className="tenant-id">ID: {tenant?.id}</span>
                        </div>
                    </div>
                    <div className="tenant-header-contact">
                        <div className="contact-item">
                            <strong>Email:</strong>
                            <span>{tenant?.shop_email}</span>
                        </div>
                        <div className="contact-item">
                            <strong>Phone:</strong>
                            <span>{tenant?.shop_phone || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="tab-navigation-wrapper">
                    <div className="mobile-tab-select">
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="tab-select"
                        >
                            {tabs.map(tab => (
                                <option key={tab.id} value={tab.id}>
                                    {tab.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="tab-navigation">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <Icon size={20} />
                                    <span className="tab-label">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {renderTabContent()}
                </div>
            </div>

            {/* Notifications Panel */}
            <TenantNotifications
                tenantId={id}
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                onNotificationCleared={handleNotificationUpdate}
            />
        </SuperAdminLayout>
    );
};

export default TenantDetailPage;
