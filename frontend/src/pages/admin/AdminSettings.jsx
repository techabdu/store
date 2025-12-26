import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Lock, User, Shield, Store, DollarSign, Settings, CreditCard, Bell } from 'lucide-react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import '../user/UserProfile.css';
import './AdminSettings.css'; // New CSS file for tabs if needed

const AdminSettings = () => {
    const navigate = useNavigate();
    const { user, updateUser, updateShopSettings } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState('personal');

    // Profile data state
    const [profileData, setProfileData] = useState({
        full_name: '',
        email: '',
        phone: '',
        avatar_color: '#3b82f6'
    });

    // Shop Settings state
    const [shopSettings, setShopSettings] = useState({
        shop_name: '',
        shop_address: '',
        shop_phone: '',
        shop_email: '',
        business_capital: '',
        low_stock_threshold: '',
        // New Rules
        vip_min_spend: 5000000,
        vip_min_transactions: 10,
        loyal_min_spend: 2000000,
        loyal_min_transactions: 5,
        at_risk_days: 60,
        lost_days: 180
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
            if (mobile) setSidebarOpen(false);
        };
        handleResize();
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
                setProfileData({
                    full_name: userData.full_name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    avatar_color: userData.avatar_color || '#3b82f6'
                });
            }

            // Fetch Shop Settings
            const settingsResponse = await api.get('/admin/get_shop_settings.php');
            if (settingsResponse.data.success) {
                setShopSettings(settingsResponse.data.settings);
            }

        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load settings data' });
            console.error(error);
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
            // Update Profile if on Personal tab
            if (activeTab === 'personal') {
                const profileRes = await api.post('/user/update-profile.php', profileData);
                if (profileRes.data.success) {
                    updateUser(profileRes.data.user);
                    setMessage({ type: 'success', text: 'Profile updated successfully!' });
                }
            }
            // Update Shop Data (Common for other tabs)
            else {
                const settingsRes = await api.post('/admin/update_shop_settings.php', shopSettings);
                if (settingsRes.data.success) {
                    updateShopSettings(shopSettings);
                    setMessage({ type: 'success', text: 'Settings updated successfully!' });
                }
            }
        } catch (error) {
            console.error("Update failed", error);
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
        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setSaving(true);
        try {
            const response = await api.post('/user/change-password.php', passwordData);
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' });
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (val) => {
        if (!val) return '0';
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val);
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={toggleSidebar} user={user} />
                <Sidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                    <div className="loading-state">Loading settings...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />
            <Sidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="profile-page">
                    <div className="profile-header">
                        <h1>Settings - {user?.shop_name || 'Admin'}</h1>
                        <p>Manage your account and shop configuration</p>
                    </div>

                    {message.text && (
                        <div className={`message-banner ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Tabs Navigation */}
                    <div className="settings-tabs glass-card" style={{ padding: '8px', marginBottom: '25px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                        <button
                            className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            <User size={18} /> <span className="tab-label">Personal</span>
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'shop_info' ? 'active' : ''}`}
                            onClick={() => setActiveTab('shop_info')}
                        >
                            <Store size={18} /> <span className="tab-label">Shop Info</span>
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'shop_settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('shop_settings')}
                        >
                            <Settings size={18} /> <span className="tab-label">Rules</span>
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('finance')}
                        >
                            <DollarSign size={18} /> <span className="tab-label">Finance</span>
                        </button>
                    </div>

                    <div className="settings-content profile-grid">

                        {/* PERSONAL INFORMATION TAB */}
                        {activeTab === 'personal' && (
                            <>
                                <div className="profile-column">
                                    <div className="profile-card glass-card">
                                        <div className="card-header">
                                            <User size={20} />
                                            <h2>Your Profile</h2>
                                        </div>
                                        <div className="form-group">
                                            <label>Full Name</label>
                                            <input type="text" name="full_name" value={profileData.full_name} onChange={handleInputChange} className="glass-input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <input type="email" name="email" value={profileData.email} onChange={handleInputChange} className="glass-input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Phone Number</label>
                                            <input type="tel" name="phone" value={profileData.phone} onChange={handleInputChange} className="glass-input" />
                                        </div>
                                        <div className="profile-actions" style={{ marginTop: '20px' }}>
                                            <button className="btn-primary" onClick={handleSaveAll} disabled={saving}>
                                                <Save size={18} /> Save Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="profile-column">
                                    <div className="profile-card glass-card">
                                        <div className="card-header">
                                            <Lock size={20} />
                                            <h2>Password</h2>
                                        </div>
                                        <form onSubmit={handleChangePassword}>
                                            <div className="form-group">
                                                <label>Current Password</label>
                                                <input type="password" name="current_password" value={passwordData.current_password} onChange={handlePasswordChange} className="glass-input" />
                                            </div>
                                            <div className="form-group">
                                                <label>New Password</label>
                                                <input type="password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange} className="glass-input" />
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm Password</label>
                                                <input type="password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange} className="glass-input" />
                                            </div>
                                            <button type="submit" className="btn-secondary" disabled={saving} style={{ marginTop: '10px' }}>
                                                Change Password
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* SHOP INFORMATION TAB */}
                        {activeTab === 'shop_info' && (
                            <div className="profile-column" style={{ gridColumn: '1 / -1' }}>
                                <div className="profile-card glass-card">
                                    <div className="card-header">
                                        <Store size={20} />
                                        <h2>Shop Details</h2>
                                    </div>
                                    <div className="form-group">
                                        <label>Shop Name</label>
                                        <input type="text" name="shop_name" value={shopSettings.shop_name} onChange={handleShopSettingChange} maxLength={23} className="glass-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>Shop Address</label>
                                        <input type="text" name="shop_address" value={shopSettings.shop_address || ''} onChange={handleShopSettingChange} className="glass-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>Shop Phone</label>
                                        <input type="tel" name="shop_phone" value={shopSettings.shop_phone || ''} onChange={handleShopSettingChange} className="glass-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>Shop Email</label>
                                        <input type="email" name="shop_email" value={shopSettings.shop_email || ''} onChange={handleShopSettingChange} className="glass-input" />
                                    </div>
                                    <div className="profile-actions" style={{ marginTop: '20px' }}>
                                        <button className="btn-primary" onClick={handleSaveAll} disabled={saving}>
                                            <Save size={18} /> Save Shop Info
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SHOP SETTINGS TAB (Rules) */}
                        {activeTab === 'shop_settings' && (
                            <div className="profile-column" style={{ gridColumn: '1 / -1' }}>
                                <div className="profile-card glass-card">
                                    <div className="card-header">
                                        <Settings size={20} />
                                        <h2>Segmentation Rules</h2>
                                    </div>
                                    <p className="description-text" style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Automated customer tagging thresholds.</p>

                                    <div className="settings-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div className="form-group">
                                            <label>VIP Min Spend (₦)</label>
                                            <input type="number" name="vip_min_spend" value={shopSettings.vip_min_spend} onChange={handleShopSettingChange} className="glass-input" />
                                        </div>
                                        <div className="form-group">
                                            <label>VIP Min Transactions</label>
                                            <input type="number" name="vip_min_transactions" value={shopSettings.vip_min_transactions} onChange={handleShopSettingChange} className="glass-input" />
                                        </div>

                                        <div className="form-group">
                                            <label>Loyal Min Spend (₦)</label>
                                            <input type="number" name="loyal_min_spend" value={shopSettings.loyal_min_spend} onChange={handleShopSettingChange} className="glass-input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Loyal Min Transactions</label>
                                            <input type="number" name="loyal_min_transactions" value={shopSettings.loyal_min_transactions} onChange={handleShopSettingChange} className="glass-input" />
                                        </div>

                                        <div className="form-group">
                                            <label>At-Risk Threshold (Days)</label>
                                            <input type="number" name="at_risk_days" value={shopSettings.at_risk_days} onChange={handleShopSettingChange} className="glass-input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Lost Threshold (Days)</label>
                                            <input type="number" name="lost_days" value={shopSettings.lost_days} onChange={handleShopSettingChange} className="glass-input" />
                                        </div>
                                    </div>

                                    <div className="profile-actions" style={{ marginTop: '30px' }}>
                                        <button className="btn-primary" onClick={handleSaveAll} disabled={saving}>
                                            <Save size={18} /> Update Rules
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* FINANCE SETTINGS TAB */}
                        {activeTab === 'finance' && (
                            <div className="profile-column" style={{ gridColumn: '1 / -1' }}>
                                <div className="profile-card glass-card">
                                    <div className="card-header">
                                        <CreditCard size={20} />
                                        <h2>Financial Rules</h2>
                                    </div>
                                    <div className="form-group">
                                        <label>Business Capital (₦)</label>
                                        <input type="number" name="business_capital" value={shopSettings.business_capital} onChange={handleShopSettingChange} className="glass-input" />
                                        <small className="help-text">Used for tracking ROI and capital growth.</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Low Stock Threshold</label>
                                        <input type="number" name="low_stock_threshold" value={shopSettings.low_stock_threshold} onChange={handleShopSettingChange} className="glass-input" />
                                        <small className="help-text">Quantity level that triggers alerts.</small>
                                    </div>

                                    <div className="profile-actions" style={{ marginTop: '20px' }}>
                                        <button className="btn-primary" onClick={handleSaveAll} disabled={saving}>
                                            <Save size={18} /> Save Finance Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div >
            </main >
        </div >
    );
};

export default AdminSettings;
