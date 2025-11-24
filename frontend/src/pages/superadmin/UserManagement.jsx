import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Plus,
    Search,
    MoreVertical,
    Trash2,
    Lock,
    Shield,
    ShieldOff,
    Edit2,
    X
} from 'lucide-react';
import '../../styles/dashboard.css';
import './UserManagement.css';

const UserManagement = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [resetPassword, setResetPassword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Mock Data for Users
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'admin'
    });

    // Fetch users
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users.php');
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Failed to load users');
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
            } else {
                setSidebarOpen(true);
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
            const response = await api.post('/users.php', formData);
            if (response.data.success) {
                setUsers([...users, response.data.user]);
                setShowModal(false);
                setFormData({ username: '', email: '', password: '', role: 'admin' });
                alert('User created successfully');
            }
        } catch (err) {
            console.error('Failed to create user:', err);
            alert(err.response?.data?.error || 'Failed to create user');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await api.delete(`/users.php?id=${id}`);
                if (response.data.success) {
                    setUsers(users.filter(u => u.id !== id));
                }
            } catch (err) {
                console.error('Failed to delete user:', err);
                alert('Failed to delete user');
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const response = await api.put('/users.php', { id, status: newStatus });
            if (response.data.success) {
                setUsers(users.map(u => {
                    if (u.id === id) {
                        return { ...u, status: newStatus };
                    }
                    return u;
                }));
            }
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status');
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
            const response = await api.put('/users.php', {
                id: selectedUser.id,
                password: resetPassword
            });

            if (response.data.success) {
                alert('Password reset successfully');
                setShowResetModal(false);
                setSelectedUser(null);
                setResetPassword('');
            }
        } catch (err) {
            console.error('Failed to reset password:', err);
            alert(err.response?.data?.error || 'Failed to reset password');
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
                    {/* Page Header */}
                    <div className="user-management-header">
                        <div>
                            <h1 className="heading-1">User Management</h1>
                            <p className="text-secondary">Manage system administrators and their access</p>
                        </div>
                        <button className="add-user-btn" onClick={() => setShowModal(true)}>
                            <Plus size={20} />
                            Add New Admin
                        </button>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="dashboard-card search-filter-bar mb-24">
                        <div className="search-container">
                            <Search size={20} style={{ color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
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
                                            <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${user.status}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td>{user.lastActive}</td>
                                        <td>
                                            <div className="actions-cell">
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
                </div>
            </main>

            {/* Add User Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add New Admin</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        className="form-input"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select
                                        name="role"
                                        className="form-select"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">SuperAdmin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && (
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
            )}
        </div>
    );
};

export default UserManagement;
