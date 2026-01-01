import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import {
    Plus,
    MoreVertical,
    Trash2,
    Lock,
    Shield,
    ShieldOff,
    ArrowUp,
    ArrowDown,
    X,
    Check,
    AlertCircle,
    ArrowLeft,
    Search,
    UserPlus
} from 'lucide-react';
import '../../styles/dashboard.css';
import '../../styles/wizard.css';
import './AdminUserManagement.css';

const AdminUserManagement = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [resetPassword, setResetPassword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('list'); // 'list', 'add'

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError, showSuccess } = useNotification();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user'
    });

    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);

    // Check username availability with debounce
    useEffect(() => {
        const checkAvailability = async () => {
            if (!formData.username || formData.username.length < 3) {
                setUsernameAvailable(null);
                return;
            }

            setIsCheckingUsername(true);
            try {
                const response = await api.get(`/admin-users.php?check_username=${encodeURIComponent(formData.username)}`);
                if (response.data.success) {
                    setUsernameAvailable(response.data.available);
                }
            } catch (error) {
                console.error('Error checking username:', error);
            } finally {
                setIsCheckingUsername(false);
            }
        };

        if (view === 'add') {
            const timeoutId = setTimeout(checkAvailability, 500);
            return () => clearTimeout(timeoutId);
        } else {
            setUsernameAvailable(null);
        }
    }, [formData.username, view]);

    // Fetch users
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin-users.php');
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
            showError('Unable to load the user directory.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin-users.php', formData);
            if (response.data.success) {
                setUsers([...users, response.data.user]);
                setView('list');
                setFormData({ username: '', email: '', password: '', role: 'user' });
                showSuccess('The new user account has been successfully created.');
            }
        } catch (err) {
            console.error('Failed to create user:', err);
            showError(err.response?.data?.error || 'Unable to create the new user account.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await api.delete(`/admin-users.php?id=${id}`);
                if (response.data.success) {
                    showSuccess('The user account has been deleted.');
                    setUsers(users.filter(u => u.id !== id));
                }
            } catch (err) {
                console.error('Failed to delete user:', err);
                showError('Unable to delete the user account.');
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const response = await api.put('/admin-users.php', { id, status: newStatus });
            if (response.data.success) {
                setUsers(users.map(u => {
                    if (u.id === id) {
                        return { ...u, status: newStatus };
                    }
                    return u;
                }));
                showSuccess(`The user account status has been updated to ${newStatus}.`);
            }
        } catch (err) {
            console.error('Failed to update status:', err);
            showError('Unable to update the user account status.');
        }
    };

    const handleRoleChange = async (id, currentRole) => {
        const newRole = currentRole === 'user' ? 'admin' : 'user';
        const action = newRole === 'admin' ? 'upgrade' : 'downgrade';

        if (window.confirm(`Are you sure you want to ${action} this user to ${newRole}?`)) {
            try {
                const response = await api.put('/admin-users.php', { id, role: newRole });
                if (response.data.success) {
                    setUsers(users.map(u => {
                        if (u.id === id) {
                            return { ...u, role: newRole };
                        }
                        return u;
                    }));
                    showSuccess('The user\'s role has been updated.');
                }
            } catch (err) {
                console.error('Failed to update role:', err);
                showError(err.response?.data?.error || 'Unable to update the user role.');
            }
        }
    };

    const openResetModal = (user) => {
        setSelectedUser(user);
        setResetPassword('');
        setShowResetModal(true);
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser || !resetPassword) return;

        try {
            const response = await api.put('/admin-users.php', {
                id: selectedUser.id,
                password: resetPassword
            });

            if (response.data.success) {
                showSuccess('The password has been successfully reset.');
                setShowResetModal(false);
                setSelectedUser(null);
                setResetPassword('');
            }
        } catch (err) {
            console.error('Failed to reset password:', err);
            showError(err.response?.data?.error || 'Unable to reset the password.');
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    {view === 'list' ? (
                        <>
                            {/* Page Header */}
                            <div className="user-management-header">
                                <div>
                                    <h1 className="heading-1">User Management</h1>
                                    <p className="text-secondary">Manage users and their access levels</p>
                                </div>
                                <button className="add-user-btn" onClick={() => setView('add')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={20} />
                                    <span className="btn-text">Add User</span>
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="search-bar-container">
                                <div className="search-input-wrapper">
                                    <Search size={18} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search by username or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Users Table */}
                            <div className="dashboard-card user-table-container">
                                <table className="user-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Last Active</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="user-info">
                                                        <div className="user-avatar">
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="user-details">
                                                            <span className="user-name">{user.username}</span>
                                                            <span className="user-email">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {user.is_owner ? (
                                                        <span className="status-badge" style={{ background: 'rgba(var(--primary-rgb, 66, 133, 244), 0.15)', color: 'var(--primary)' }}>Owner</span>
                                                    ) : user.is_branch_manager ? (
                                                        <span className="status-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>Branch Manager</span>
                                                    ) : (
                                                        <span className="status-badge" style={{ background: 'rgba(var(--text-secondary-rgb, 156, 163, 175), 0.15)', color: 'var(--text-secondary)' }}>Staff</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${user.status}`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td>{user.lastActive}</td>
                                                <td>
                                                    <div className="actions-cell">
                                                        {!user.is_owner && (
                                                            <button
                                                                className="action-btn"
                                                                title={user.role === 'user' ? 'Promote to Branch Manager' : 'Demote to Staff'}
                                                                onClick={() => handleRoleChange(user.id, user.role)}
                                                            >
                                                                {user.role === 'user' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                                                            </button>
                                                        )}
                                                        <button
                                                            className="action-btn"
                                                            title={user.status === 'active' ? 'Restrict Access' : 'Restore Access'}
                                                            onClick={() => handleToggleStatus(user.id, user.status)}
                                                        >
                                                            {user.status === 'active' ? <ShieldOff size={18} /> : <Shield size={18} />}
                                                        </button>
                                                        <button
                                                            className="action-btn"
                                                            title="Reset Password"
                                                            onClick={() => openResetModal(user)}
                                                        >
                                                            <Lock size={18} />
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            title="Delete User"
                                                            onClick={() => handleDelete(user.id)}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="focus-view-container">
                            <div className="focus-view-header">
                                <button className="btn-back" onClick={() => setView('list')}>
                                    <ArrowLeft size={20} />
                                    <span>Back to Users</span>
                                </button>
                                <h2>Create New User</h2>
                            </div>

                            <div className="focus-view-content">
                                <form onSubmit={handleSubmit}>
                                    <div className="focus-view-card glass-card">
                                        <div className="focus-view-body">
                                            <div className="form-grid-focus">
                                                <div className="form-group-focus">
                                                    <label>Username</label>
                                                    <div className="input-with-icon">
                                                        <input
                                                            type="text"
                                                            name="username"
                                                            className={`form-input-focus ${usernameAvailable === false ? 'border-red-500' : ''} ${usernameAvailable === true ? 'border-green-500' : ''}`}
                                                            value={formData.username}
                                                            onChange={handleInputChange}
                                                            required
                                                            placeholder="Enter unique username"
                                                        />
                                                        {isCheckingUsername && <div className="spinner-small"></div>}
                                                    </div>
                                                    {formData.username.length >= 3 && !isCheckingUsername && usernameAvailable !== null && (
                                                        <div className={`availability-msg ${usernameAvailable ? 'success' : 'error'}`}>
                                                            {usernameAvailable ? <><Check size={14} /> Available</> : <><AlertCircle size={14} /> Not Available</>}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="form-group-focus">
                                                    <label>Email Address</label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        className="form-input-focus"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        required
                                                        placeholder="user@example.com"
                                                    />
                                                </div>

                                                <div className="form-group-focus">
                                                    <label>Initial Password</label>
                                                    <input
                                                        type="password"
                                                        name="password"
                                                        className="form-input-focus"
                                                        value={formData.password}
                                                        onChange={handleInputChange}
                                                        required
                                                        placeholder="Min. 6 characters"
                                                        minLength={6}
                                                    />
                                                </div>

                                                <div className="form-group-focus">
                                                    <label>User Role</label>
                                                    <select
                                                        name="role"
                                                        className="form-input-focus"
                                                        value={formData.role}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="user">Staff / User</option>
                                                        <option value="admin">Administrator</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="focus-view-actions">
                                        <button type="button" className="btn-cancel" onClick={() => setView('list')}>Cancel</button>
                                        <button type="submit" className="btn-primary" disabled={usernameAvailable === false || isCheckingUsername}>
                                            <UserPlus size={18} />
                                            Create User Account
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main >


            {/* Reset Password Modal */}
            {
                showResetModal && (
                    <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Reset Password</h2>
                                <button className="close-btn" onClick={() => setShowResetModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleResetPasswordSubmit}>
                                <div className="modal-body">
                                    <p className="mb-4">Resetting password for <strong>{selectedUser?.username}</strong></p>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            required
                                            placeholder="Enter new password"
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setShowResetModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Reset Password</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminUserManagement;
