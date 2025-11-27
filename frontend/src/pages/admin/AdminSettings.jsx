import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Lock, User, Shield, Store, DollarSign, Bell } from 'lucide-react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import '../user/UserProfile.css'; // Reusing UserProfile styles

const AdminSettings = () => {
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
        avatar_color: '#3b82f6' // Default color
    });

    // Shop Settings state
    const [shopSettings, setShopSettings] = useState({
        shop_name: '',
        shop_address: '',
        shop_phone: '',
        shop_email: '',
        business_capital: '',
        low_stock_threshold: ''
    });

    // Original data for cancel functionality
    const [originalData, setOriginalData] = useState({});
    const [originalShopSettings, setOriginalShopSettings] = useState({});

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

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const fetchData = async () => {
        try {
            // Fetch Profile
            const profileResponse = await api.get('/user/get-profile.php');
            if (profileResponse.data.success) {
                const userData = profileResponse.data.user;
                const profile = {
                    full_name: userData.full_name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    avatar_color: userData.avatar_color || '#3b82f6'
                };
                setProfileData(profile);
                setOriginalData(profile);
                setAccountInfo({
                    username: userData.username,
                    role: userData.role,
                    status: userData.status,
                    created_at: userData.created_at,
                    updated_at: userData.updated_at
                });
            }

            // Fetch Shop Settings
            const settingsResponse = await api.get('/admin/get_shop_settings.php');
            if (settingsResponse.data.success) {
                setShopSettings(settingsResponse.data.settings);
                setOriginalShopSettings(settingsResponse.data.settings);
            }

        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load settings data' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleShopSettingChange = (e) => {
        const { name, value } = e.target;
        setShopSettings(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAll = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Update Profile
            const profilePromise = api.post('/user/update-profile.php', profileData);

            // Update Shop Settings
            const settingsPromise = api.post('/admin/update_shop_settings.php', shopSettings);

            const [profileRes, settingsRes] = await Promise.all([profilePromise, settingsPromise]);

            if (profileRes.data.success && settingsRes.data.success) {
                setMessage({ type: 'success', text: 'Settings updated successfully!' });
                setOriginalData(profileData);
                setOriginalShopSettings(shopSettings);

                // Update global auth context if needed
                if (profileRes.data.user) {
                    updateUser({
                        ...profileData,
                        updated_at: profileRes.data.user.updated_at
                    });
                }
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to update settings'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

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
                        <div className="loading-state">Loading settings...</div>
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
                        <h1>Admin Settings</h1>
                        <p>Manage your account and shop configuration</p>
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
                                <div className="form-group">
                                    <label htmlFor="full_name">Full Name</label>
                                    <input
                                        type="text"
                                        id="full_name"
                                        name="full_name"
                                        value={profileData.full_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
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
                                        placeholder="Enter your phone number"
                                    />
                                </div>
                            </div>

                            {/* Shop Information */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <Store size={20} />
                                    <h2>Shop Information</h2>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="shop_name">Shop Name</label>
                                    <input
                                        type="text"
                                        id="shop_name"
                                        name="shop_name"
                                        value={shopSettings.shop_name || ''}
                                        onChange={handleShopSettingChange}
                                        placeholder="Enter shop name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="shop_address">Shop Address</label>
                                    <textarea
                                        id="shop_address"
                                        name="shop_address"
                                        value={shopSettings.shop_address || ''}
                                        onChange={handleShopSettingChange}
                                        placeholder="Enter shop address"
                                        rows="3"
                                        className="form-textarea"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="shop_phone">Shop Phone</label>
                                    <input
                                        type="tel"
                                        id="shop_phone"
                                        name="shop_phone"
                                        value={shopSettings.shop_phone || ''}
                                        onChange={handleShopSettingChange}
                                        placeholder="Enter shop contact number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="shop_email">Shop Email</label>
                                    <input
                                        type="email"
                                        id="shop_email"
                                        name="shop_email"
                                        value={shopSettings.shop_email || ''}
                                        onChange={handleShopSettingChange}
                                        placeholder="Enter shop email address"
                                    />
                                </div>
                            </div>

                            {/* Business Capital & Finance */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <DollarSign size={20} />
                                    <h2>Business Capital & Finance</h2>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="business_capital">Business Capital (₦)</label>
                                    <input
                                        type="number"
                                        id="business_capital"
                                        name="business_capital"
                                        value={shopSettings.business_capital || ''}
                                        onChange={handleShopSettingChange}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                    <small className="text-secondary">Used for financial calculations and ROI tracking</small>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="profile-column">

                            {/* Notification Settings */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <Bell size={20} />
                                    <h2>Notification Settings</h2>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="low_stock_threshold">Low Stock Threshold</label>
                                    <input
                                        type="number"
                                        id="low_stock_threshold"
                                        name="low_stock_threshold"
                                        value={shopSettings.low_stock_threshold || ''}
                                        onChange={handleShopSettingChange}
                                        placeholder="5"
                                    />
                                    <small className="text-secondary">Alert when product stock falls below this number</small>
                                </div>
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
                                            <span className="role-badge role-badge-admin">
                                                {accountInfo.role?.toUpperCase()}
                                            </span>
                                        </div>
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
                            onClick={handleSaveAll}
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

export default AdminSettings;
