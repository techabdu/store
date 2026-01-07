import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, UserCog, Ban, CheckCircle, Filter, Activity, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ImpersonationModal from '../ImpersonationModal';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';
import Pagination from './Pagination';
import api from '../../../utils/api';
import './UsersTab.css';

const UsersTab = ({ tenantId }) => {
    const [users, setUsers] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loginAnalytics, setLoginAnalytics] = useState(null);
    const [userBreakdown, setUserBreakdown] = useState({ total: 0, admin: 0, user: 0, active: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [activeSection, setActiveSection] = useState('users'); // 'users', 'activity', 'analytics'
    const [activityFilter, setActivityFilter] = useState('all');
    const [dateRange, setDateRange] = useState('7'); // days
    const [impersonateModal, setImpersonateModal] = useState({ isOpen: false, user: null });

    // Pagination states
    const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
    const [activityPagination, setActivityPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

    useEffect(() => {
        if (tenantId) {
            const delayDebounceFn = setTimeout(() => {
                fetchUsers(1);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [tenantId, searchTerm, roleFilter]);

    useEffect(() => {
        if (tenantId) {
            fetchActivityLogs(1);
        }
    }, [tenantId, dateRange, activityFilter]);

    useEffect(() => {
        if (tenantId) {
            fetchLoginAnalytics();
        }
    }, [tenantId]);

    const fetchUsers = async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get('/superadmin/tenant_users.php', {
                params: {
                    action: 'list',
                    tenant_id: tenantId,
                    page: page,
                    limit: usersPagination.limit,
                    search: searchTerm,
                    role: roleFilter
                }
            });

            if (response.data.success) {
                setUsers(response.data.users);
                setUsersPagination(response.data.pagination);
                setUserBreakdown(response.data.breakdown);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityLogs = async (page = 1) => {
        try {
            const response = await api.get('/superadmin/tenant_users.php', {
                params: {
                    action: 'activity_logs',
                    tenant_id: tenantId,
                    page: page,
                    limit: activityPagination.limit,
                    action_filter: activityFilter === 'all' ? '' : activityFilter
                }
            });

            if (response.data.success) {
                setActivityLogs(response.data.activity_logs || []);
                setActivityPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Error fetching activity logs:', err);
        }
    };

    const fetchLoginAnalytics = async () => {
        try {
            const response = await api.get(`/superadmin/tenant_users.php?action=login_analytics&tenant_id=${tenantId}`);

            if (response.data.success) {
                setLoginAnalytics(response.data);
            }
        } catch (err) {
            console.error('Error fetching login analytics:', err);
        }
    };

    const handleImpersonateClick = (user) => {
        setImpersonateModal({ isOpen: true, user });
    };

    const handleImpersonateConfirm = async (user, reason) => {
        try {
            const response = await api.post('/superadmin/impersonate.php?action=start', {
                user_id: user.id,
                reason
            });

            if (response.data.success) {
                alert('Impersonation started. Redirecting to dashboard...');
                window.location.href = '/dashboard';
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to start impersonation');
        } finally {
            setImpersonateModal({ isOpen: false, user: null });
        }
    };

    const handleSuspendUser = async (userId) => {
        const reason = window.prompt('Reason for suspension:');
        if (!reason) return;

        try {
            await api.post('/superadmin/tenant_users.php?action=suspend_user', {
                user_id: userId,
                reason
            });
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to suspend user');
        }
    };

    const handleActivateUser = async (userId) => {
        try {
            await api.post('/superadmin/tenant_users.php?action=activate_user', {
                user_id: userId
            });
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to activate user');
        }
    };

    // Helper functions for badges
    const getRoleBadge = (role) => {
        const badges = {
            'superadmin': 'role-superadmin',
            'admin': 'role-admin',
            'user': 'role-user'
        };
        return badges[role] || 'role-user';
    };

    const getStatusBadge = (status) => {
        const badges = {
            'active': 'status-active',
            'inactive': 'status-inactive',
            'suspended': 'status-suspended'
        };
        return badges[status] || 'status-inactive';
    };

    if (loading) {
        return (
            <div className="users-tab skeleton-mode">
                <div className="section-switcher">
                    <div className="skeleton-line" style={{ width: '150px' }}></div>
                    <div className="skeleton-line" style={{ width: '150px' }}></div>
                    <div className="skeleton-line" style={{ width: '150px' }}></div>
                </div>
                <div style={{ marginTop: '2rem' }}>
                    <SkeletonLoader type="table" count={8} />
                </div>
            </div>
        );
    }

    return (
        <div className="users-tab">
            {/* Section Switcher */}
            <div className="section-switcher">
                <button
                    className={`section-btn ${activeSection === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveSection('users')}
                >
                    <UsersIcon size={18} />
                    User Management
                </button>
                <button
                    className={`section-btn ${activeSection === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveSection('activity')}
                >
                    <Activity size={18} />
                    Activity Logs
                </button>
                <button
                    className={`section-btn ${activeSection === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveSection('analytics')}
                >
                    <BarChart size={18} />
                    Login Analytics
                </button>
            </div>

            {/* User Management Section */}
            {activeSection === 'users' && (
                <>
                    <div className="users-filters">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <Filter size={18} />
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                        </div>
                    </div>

                    <div className="users-table-container">
                        {users.length > 0 ? (
                            <>
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Shop</th>
                                            <th>Last Activity</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="user-info">
                                                        <div className="user-avatar">
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="user-details">
                                                            <span className="username">{user.username}</span>
                                                            <span className="email">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`role-badge ${getRoleBadge(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${getStatusBadge(user.status)}`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td>{user.shop_name || 'System'}</td>
                                                <td>{user.last_activity ? new Date(user.last_activity).toLocaleString() : 'Never'}</td>
                                                <td>
                                                    <div className="user-actions">
                                                        <button
                                                            className="user-action-btn impersonate"
                                                            onClick={() => handleImpersonateClick(user)}
                                                            title="Impersonate User"
                                                        >
                                                            <UserCog size={16} />
                                                        </button>
                                                        {user.status === 'active' ? (
                                                            <button
                                                                className="user-action-btn suspend"
                                                                onClick={() => handleSuspendUser(user.id)}
                                                                title="Suspend User"
                                                            >
                                                                <Ban size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="user-action-btn activate"
                                                                onClick={() => handleActivateUser(user.id)}
                                                                title="Activate User"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={usersPagination.page}
                                    totalPages={usersPagination.pages}
                                    onPageChange={(p) => fetchUsers(p)}
                                />
                            </>
                        ) : (
                            <EmptyState
                                icon={UsersIcon}
                                title="No Users Found"
                                description="We couldn't find any users matching your current search or filter criteria."
                            />
                        )}
                    </div>

                    <div className="user-stats">
                        <div className="stat-item">
                            <label>Total Users</label>
                            <span>{userBreakdown.total}</span>
                        </div>
                        <div className="stat-item">
                            <label>Active</label>
                            <span>{userBreakdown.active}</span>
                        </div>
                        <div className="stat-item">
                            <label>Admins</label>
                            <span>{userBreakdown.admin}</span>
                        </div>
                        <div className="stat-item">
                            <label>Regular Users</label>
                            <span>{userBreakdown.user}</span>
                        </div>
                    </div>
                </>
            )}

            {/* Activity Logs Section */}
            {activeSection === 'activity' && (
                <>
                    <div className="activity-filters">
                        <div className="filter-group">
                            <Calendar size={18} />
                            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                                <option value="1">Last 24 hours</option>
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <Filter size={18} />
                            <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}>
                                <option value="all">All Actions</option>
                                <option value="login">Logins</option>
                                <option value="create">Creates</option>
                                <option value="update">Updates</option>
                                <option value="delete">Deletes</option>
                            </select>
                        </div>
                    </div>

                    <div className="activity-list">
                        {activityLogs.length > 0 ? (
                            <>
                                {activityLogs.map((log) => (
                                    <div key={log.id} className="activity-item glass-card">
                                        <div className="activity-icon">
                                            <Activity size={16} />
                                        </div>
                                        <div className="activity-details">
                                            <div className="activity-main">
                                                <span className="activity-user">{log.username}</span>
                                                <span className="activity-action">{log.action.replace(/_/g, ' ')}</span>
                                                {log.details && <span className="activity-info">({log.details})</span>}
                                            </div>
                                            <div className="activity-meta">
                                                <span>{new Date(log.created_at).toLocaleString()}</span>
                                                <span>IP: {log.ip_address}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Pagination
                                    currentPage={activityPagination.page}
                                    totalPages={activityPagination.pages}
                                    onPageChange={(p) => fetchActivityLogs(p)}
                                />
                            </>
                        ) : (
                            <EmptyState
                                icon={Activity}
                                title="No Activity Logs"
                                description="There are no activity logs recorded for the selected time period."
                            />
                        )}
                    </div>
                </>
            )}

            {/* Login Analytics Section */}
            {activeSection === 'analytics' && loginAnalytics && (
                <div className="analytics-section">
                    <div className="analytics-stats">
                        <div className="analytics-card">
                            <label>Total Logins (30d)</label>
                            <span className="big-number">{loginAnalytics.total_logins || 0}</span>
                        </div>
                        <div className="analytics-card">
                            <label>Failed Attempts</label>
                            <span className="big-number error">{loginAnalytics.failed_attempts || 0}</span>
                        </div>
                        <div className="analytics-card">
                            <label>Unique Users</label>
                            <span className="big-number">{loginAnalytics.unique_users || 0}</span>
                        </div>
                        <div className="analytics-card">
                            <label>Avg Daily Logins</label>
                            <span className="big-number">{loginAnalytics.avg_daily_logins || 0}</span>
                        </div>
                    </div>

                    {loginAnalytics.most_active_users && loginAnalytics.most_active_users.length > 0 && (
                        <div className="chart-container">
                            <h4>Most Active Users (Top 10)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={loginAnalytics.most_active_users}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="username" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(0,0,0,0.8)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="login_count" fill="#a78bfa" name="Login Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
            {/* Impersonation Modal */}
            <ImpersonationModal
                isOpen={impersonateModal.isOpen}
                onClose={() => setImpersonateModal({ isOpen: false, user: null })}
                user={impersonateModal.user}
                onConfirm={handleImpersonateConfirm}
            />
        </div>
    );
};

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

export default UsersTab;
