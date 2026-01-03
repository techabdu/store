import { useState, useEffect } from 'react';
import { Users, Package, DollarSign, MessageSquare, Calendar, TrendingUp } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import api from '../../../utils/api';
import './OverviewTab.css';

const OverviewTab = ({ tenantId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (tenantId) {
            fetchOverviewData();
        }
    }, [tenantId]);

    const fetchOverviewData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/superadmin/tenant_details.php?action=overview&tenant_id=${tenantId}`);

            if (response.data.success) {
                setData(response.data);
            } else {
                setError(response.data.error);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load overview data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="overview-tab skeleton-mode">
                <SkeletonLoader type="card" />
                <div style={{ marginTop: '2rem' }}>
                    <SkeletonLoader type="stats" />
                </div>
                <div style={{ marginTop: '2rem' }}>
                    <SkeletonLoader type="list" count={5} />
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="error-state">{error}</div>;
    }

    const { tenant, stats, timeline } = data || {};

    return (
        <div className="overview-tab">
            {/* Tenant Summary Card */}
            <div className="summary-card">
                <h3>Tenant Information</h3>
                <div className="summary-grid">
                    <div className="summary-item">
                        <label>Shop Name</label>
                        <span>{tenant?.shop_name}</span>
                    </div>
                    <div className="summary-item">
                        <label>Email</label>
                        <span>{tenant?.shop_email}</span>
                    </div>
                    <div className="summary-item">
                        <label>Phone</label>
                        <span>{tenant?.shop_phone || 'N/A'}</span>
                    </div>
                    <div className="summary-item">
                        <label>Address</label>
                        <span>{tenant?.shop_address || 'N/A'}</span>
                    </div>
                    <div className="summary-item">
                        <label>Created</label>
                        <span>{new Date(tenant?.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="summary-item">
                        <label>Email Verified</label>
                        <span className={tenant?.email_verified ? 'verified' : 'not-verified'}>
                            {tenant?.email_verified ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>

                {/* Trial Info */}
                {tenant?.trial_ends_at && tenant?.days_remaining > 0 && (
                    <div className="trial-info">
                        <Calendar size={20} />
                        <span>Trial ends in <strong>{tenant.days_remaining} days</strong></span>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon users">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <h4>Total Users</h4>
                        <p className="stat-number">{stats?.users?.total || 0}</p>
                        <span className="stat-detail">
                            {stats?.users?.admins || 0} admins, {stats?.users?.users || 0} users
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon inventory">
                        <Package size={24} />
                    </div>
                    <div className="stat-content">
                        <h4>Inventory</h4>
                        <p className="stat-number">{stats?.inventory?.total_items || 0}</p>
                        <span className="stat-detail">
                            {stats?.inventory?.total_quantity || 0} units in stock
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon sales">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <h4>Monthly Sales</h4>
                        <p className="stat-number">
                            ${parseFloat(stats?.sales?.total_sales || 0).toLocaleString()}
                        </p>
                        <span className="stat-detail">
                            {stats?.sales?.transaction_count || 0} transactions
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon support">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-content">
                        <h4>Support Tickets</h4>
                        <p className="stat-number">{stats?.tickets?.active_tickets || 0}</p>
                        <span className="stat-detail">
                            {stats?.tickets?.urgent_tickets || 0} urgent
                        </span>
                    </div>
                </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="activity-section">
                <h3>Recent Activity</h3>
                {timeline && timeline.length > 0 ? (
                    <div className="timeline">
                        {timeline.map((item, index) => (
                            <div key={item.id || index} className="timeline-item">
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <span className="timeline-action">{formatAction(item.action)}</span>
                                        <span className="timeline-time">
                                            {formatTime(item.created_at)}
                                        </span>
                                    </div>
                                    <div className="timeline-details">
                                        <span className="timeline-user">{item.username}</span>
                                        {item.details && <span className="timeline-detail-text"> - {item.details}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Activity}
                        title="No Recent Activity"
                        description="This tenant hasn't performed any trackable actions in the system yet."
                    />
                )}
            </div>
        </div>
    );
};

// Helper functions
const formatAction = (action) => {
    return action
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

export default OverviewTab;
