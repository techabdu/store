import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, Lock, User, Mail, Phone, Calendar, Shield } from 'lucide-react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './UserProfile.css';

const UserProfile = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Profile data state
    const [profileData, setProfileData] = useState({
        full_name: '',
        email: '',
        phone: '',
        avatar_color: '#3b82f6'
    });

    // Original data for cancel functionality
    const [originalData, setOriginalData] = useState({});

    // Account info (read-only)
    const [accountInfo, setAccountInfo] = useState({
        username: '',
        role: '',
        status: '',
        created_at: '',
        updated_at: ''
    });

    // Password change state
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    // Color picker colors
    const avatarColors = [
        '#3b82f6', // Blue
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#f59e0b', // Amber
        '#10b981', // Green
        '#06b6d4', // Cyan
        '#ef4444', // Red
        '#6366f1', // Indigo
    ];

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

    // Fetch profile data on mount
    useEffect(() => {
        fetchProfile();
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const fetchProfile = async () => {
        try {
            const response = await api.get('/user/get-profile.php');
            if (response.data.success) {
                const user = response.data.user;

                const profile = {
                    full_name: user.full_name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    avatar_color: user.avatar_color || '#3b82f6'
                };

                setProfileData(profile);
                setOriginalData(profile);

                setAccountInfo({
                    username: user.username,
                    role: user.role,
                    status: user.status,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load profile data' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleColorSelect = (color) => {
        setProfileData(prev => ({ ...prev, avatar_color: color }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.post('/user/update-profile.php', profileData);

            if (response.data.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setOriginalData(profileData);

                // Update account info with new data
                if (response.data.user) {
                    setAccountInfo(prev => ({
                        ...prev,
                        updated_at: response.data.user.updated_at
                    }));

                    // Update global auth context
                    updateUser({
                        ...profileData,
                        updated_at: response.data.user.updated_at
                    });
                }
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to update profile'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        // Validation
        if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
            setMessage({ type: 'error', text: 'All password fields are required' });
            return;
        }

        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.post('/user/change-password.php', passwordData);

            if (response.data.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordData({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to change password'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setProfileData(originalData);
        setPasswordData({
            current_password: '',
            new_password: '',
            confirm_password: ''
        });
        setMessage({ type: '', text: '' });
    };

    const getUserInitials = () => {
        if (!accountInfo.username) return 'U';
        const names = accountInfo.username.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return accountInfo.username.substring(0, 2).toUpperCase();
    };

    const getRoleBadgeClass = () => {
        switch (accountInfo.role) {
            case 'superadmin': return 'role-badge-superadmin';
            case 'admin': return 'role-badge-admin';
            case 'user': return 'role-badge-user';
            default: return '';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={toggleSidebar} user={user} />
                <Sidebar
                    isOpen={sidebarOpen}
                    isMobile={isMobile}
                    closeSidebar={() => setSidebarOpen(false)}
                />
                <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                    <div className="profile-page">
                        <div className="loading-state">Loading profile...</div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />
            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="profile-page">
                    <div className="profile-header">
                        <h1>Profile Settings</h1>
                        <p>Manage your personal information and account settings</p>
                    </div>

                    {message.text && (
                        <div className={`message-banner ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="profile-grid">
                        {/* Left Column */}
                        <div className="profile-column">
                            {/* Personal Information */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <User size={20} />
                                    <h2>Personal Information</h2>
                                </div>
                                <form onSubmit={handleSaveProfile}>
                                    <div className="form-group">
                                        <label htmlFor="full_name">Full Name</label>
                                        <input
                                            type="text"
                                            id="full_name"
                                            name="full_name"
                                            value={profileData.full_name}
                                            onChange={handleInputChange}
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">Email Address</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={profileData.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="phone">Phone Number</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={profileData.phone}
                                            onChange={handleInputChange}
                                            placeholder="Enter your phone number (optional)"
                                        />
                                    </div>
                                </form>
                            </div>

                            {/* Security Section */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <Lock size={20} />
                                    <h2>Security</h2>
                                </div>
                                <form onSubmit={handleChangePassword}>
                                    <div className="form-group">
                                        <label htmlFor="current_password">Current Password</label>
                                        <input
                                            type="password"
                                            id="current_password"
                                            name="current_password"
                                            value={passwordData.current_password}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter current password"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="new_password">New Password</label>
                                        <input
                                            type="password"
                                            id="new_password"
                                            name="new_password"
                                            value={passwordData.new_password}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter new password"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="confirm_password">Confirm New Password</label>
                                        <input
                                            type="password"
                                            id="confirm_password"
                                            name="confirm_password"
                                            value={passwordData.confirm_password}
                                            onChange={handlePasswordChange}
                                            placeholder="Confirm new password"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-secondary"
                                        disabled={saving}
                                    >
                                        <Lock size={18} />
                                        Change Password
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="profile-column">
                            {/* Avatar Customization */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <User size={20} />
                                    <h2>Avatar Customization</h2>
                                </div>
                                <div className="avatar-section">
                                    <div className="avatar-preview" style={{ backgroundColor: profileData.avatar_color }}>
                                        <span className="avatar-initials">{getUserInitials()}</span>
                                    </div>
                                    <p className="avatar-label">Choose your avatar color</p>
                                    <div className="color-picker">
                                        {avatarColors.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={`color-option ${profileData.avatar_color === color ? 'selected' : ''}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => handleColorSelect(color)}
                                                aria-label={`Select ${color}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <Shield size={20} />
                                    <h2>Account Information</h2>
                                </div>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Username</label>
                                        <div className="info-value">{accountInfo.username}</div>
                                    </div>

                                    <div className="info-item">
                                        <label>Role</label>
                                        <div className="info-value">
                                            <span className={`role-badge ${getRoleBadgeClass()}`}>
                                                {accountInfo.role?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <label>Account Status</label>
                                        <div className="info-value">
                                            <span className={`status-badge ${accountInfo.status === 'active' ? 'active' : 'inactive'}`}>
                                                {accountInfo.status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <label>Account Created</label>
                                        <div className="info-value">{formatDate(accountInfo.created_at)}</div>
                                    </div>

                                    <div className="info-item">
                                        <label>Last Updated</label>
                                        <div className="info-value">{formatDate(accountInfo.updated_at)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="profile-actions">
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleSaveProfile}
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserProfile;
