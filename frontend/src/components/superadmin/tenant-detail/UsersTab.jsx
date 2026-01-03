import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, UserCog, Ban, CheckCircle, Filter, Activity, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ImpersonationModal from '../ImpersonationModal';
import api from '../../../utils/api';
import './UsersTab.css';

const UsersTab = ({ tenantId }) => {
    const [users, setUsers] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loginAnalytics, setLoginAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [activeSection, setActiveSection] = useState('users'); // 'users', 'activity', 'analytics'
    const [activityFilter, setActivityFilter] = useState('all');
    const [dateRange, setDateRange] = useState('7'); // days
    const [impersonateModal, setImpersonateModal] = useState({ isOpen: false, user: null });

    useEffect(() => {
        if (tenantId) {
            fetchUsers();
            fetchActivityLogs();
            fetchLoginAnalytics();
        }
    }, [tenantId, dateRange]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/superadmin/tenant_users.php?action=list&tenant_id=${tenantId}`);

            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityLogs = async () => {
        try {
            const response = await api.get(`/superadmin/tenant_users.php?action=activity_logs&tenant_id=${tenantId}&days=${dateRange}`);

            if (response.data.success) {
                setActivityLogs(response.data.activity_logs || []);
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

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const filteredActivityLogs = activityLogs.filter(log => {
        if (activityFilter === 'all') return true;
        return log.action.toLowerCase().includes(activityFilter.toLowerCase());
    });

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
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Shop</th>
                                    <th>Last Activity</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                                                <span>{user.username}</span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`role-badge role-${user.role}`}>{user.role}</span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${user.status}`}>{user.status}</span>
                                        </td>
                                        <td>{user.shop_name || 'N/A'}</td>
                                        <td className="last-activity">
                                            {user.last_activity ? formatTime(user.last_activity) : 'Never'}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn impersonate"
                                                    onClick={() => handleImpersonateClick(user)}
                                                    title="Impersonate User"
                                                >
                                                    <UserCog size={16} />
                                                </button>
                                                {user.status === 'active' ? (
                                                    <button
                                                        className="action-btn suspend"
                                                        onClick={() => handleSuspendUser(user.id)}
                                                        title="Suspend User"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="action-btn activate"
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

                        {filteredUsers.length === 0 && (
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
                            <span>{users.length}</span>
                        </div>
                        <div className="stat-item">
                            <label>Active</label>
                            <span>{users.filter(u => u.status === 'active').length}</span>
                        </div>
                        <div className="stat-item">
                            <label>Admins</label>
                            <span>{users.filter(u => u.role === 'admin').length}</span>
                        </div>
                        <div className="stat-item">
                            <label>Regular Users</label>
                            <span>{users.filter(u => u.role === 'user').length}</span>
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

                    <div className="activity-logs-container">
                        {filteredActivityLogs.length > 0 ? (
                            <div className="activity-timeline">
                                {filteredActivityLogs.map((log, index) => (
                                    <div key={index} className="activity-log-item">
                                        <div className="log-marker"></div>
                                        <div className="log-content">
                                            <div className="log-header">
                                                <span className="log-user">{log.username}</span>
                                                <span className="log-action">{formatAction(log.action)}</span>
                                                <span className="log-time">{formatTime(log.created_at)}</span>
                                            </div>
                                            {log.details && (
                                                <div className="log-details">{log.details}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
