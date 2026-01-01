import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Lock, User, Shield, Store, DollarSign, Settings, CreditCard, Bell, Truck, Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import '../user/UserProfile.css';
import './AdminSettings.css';
import '../../styles/wizard.css';

const AdminSettings = () => {
    const navigate = useNavigate();
    const { user, updateUser, updateShopSettings } = useAuth();
    const { showError, showSuccess } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState('personal');

    // View Mode for Vendors: 'list' | 'focus'
    const [vendorViewMode, setVendorViewMode] = useState('list');

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

    // Vendor Management State
    const [vendors, setVendors] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [vendorForm, setVendorForm] = useState({
        name: '',
        address: '',
        contact_info: ''
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

    // Fetch vendors when tab is active
    useEffect(() => {
        if (activeTab === 'vendors') {
            fetchVendors();
        }
    }, [activeTab]);

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
            showError('Unable to load settings data.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        setLoadingVendors(true);
        try {
            const response = await api.get('/admin/vendors.php');
            if (response.data.success) {
                setVendors(response.data.vendors);
            }
        } catch (error) {
            console.error("Failed to fetch vendors:", error);
            showError("Unable to load the vendor list.");
        } finally {
            setLoadingVendors(false);
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

        try {
            // Update Profile if on Personal tab
            if (activeTab === 'personal') {
                const profileRes = await api.post('/user/update-profile.php', profileData);
                if (profileRes.data.success) {
                    updateUser(profileRes.data.user);
                    showSuccess('Your profile has been successfully updated.');
                }
            }
            // Update Shop Data (Common for other tabs)
            else {
                const settingsRes = await api.post('/admin/update_shop_settings.php', shopSettings);
                if (settingsRes.data.success) {
                    updateShopSettings(shopSettings);
                    showSuccess('The settings have been successfully updated.');
                }
            }
        } catch (error) {
            console.error("Update failed", error);
            showError(error.response?.data?.error || 'Unable to update the settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            showError('The new passwords do not match.');
            return;
        }

        setSaving(true);
        try {
            const response = await api.post('/user/change-password.php', passwordData);
            if (response.data.success) {
                showSuccess('Your password has been successfully changed.');
                setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            }
        } catch (error) {
            showError(error.response?.data?.error || 'Unable to change the password.');
        } finally {
            setSaving(false);
        }
    };

    /** VENDOR MANAGEMENT HANDLERS **/
    const openVendorFocusView = (vendor = null) => {
        if (vendor) {
            setEditingVendor(vendor);
            setVendorForm({
                name: vendor.name,
                address: vendor.address || '',
                contact_info: vendor.contact_info || ''
            });
        } else {
            setEditingVendor(null);
            setVendorForm({ name: '', address: '', contact_info: '' });
        }
        setVendorViewMode('focus');
    };

    const closeVendorFocusView = () => {
        setVendorViewMode('list');
        setEditingVendor(null);
    };

    const handleVendorFormChange = (e) => {
        const { name, value } = e.target;
        setVendorForm(prev => ({ ...prev, [name]: value }));
    };

    const saveVendor = async (e) => {
        e.preventDefault();
        if (!vendorForm.name) return;

        setSaving(true);
        try {
            if (editingVendor) {
                // Update
                const res = await api.put('/admin/vendors.php', { ...vendorForm, id: editingVendor.id, status: editingVendor.status });
                if (res.data.success) {
                    fetchVendors();
                    closeVendorFocusView();
                    showSuccess('The vendor details have been updated.');
                }
            } else {
                // Create
                const res = await api.post('/admin/vendors.php', vendorForm);
                if (res.data.success) {
                    fetchVendors();
                    closeVendorFocusView();
                    showSuccess('The new vendor has been added.');
                }
            }
        } catch (error) {
            showError(error.response?.data?.error || 'Unable to save the vendor details.');
        } finally {
            setSaving(false);
        }
    };

    const toggleVendorStatus = async (vendor) => {
        const newStatus = vendor.status === 'active' ? 'restricted' : 'active';
        if (!window.confirm(`Are you sure you want to make this vendor ${newStatus}?`)) return;

        try {
            const res = await api.put('/admin/vendors.php', { ...vendor, status: newStatus });
            if (res.data.success) {
                fetchVendors();
                showSuccess(`The vendor status has been updated to ${newStatus}.`);
            }
        } catch (error) {
            showError('Unable to update the vendor status.');
        }
    };

    const deleteVendor = async (id) => {
        if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) return;
        try {
            const res = await api.delete(`/admin/vendors.php?id=${id}`);
            if (res.data.success) {
                fetchVendors();
                showSuccess('The vendor has been deleted.');
            }
        } catch (error) {
            showError('Unable to delete the vendor.');
        }
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
                {vendorViewMode === 'focus' ? (
                    /* FOCUS VIEW FOR ADD/EDIT VENDOR */
                    <div className="profile-page">
                        <div className="focus-view-container">
                            <div className="focus-view-header">
                                <button className="btn-back" onClick={closeVendorFocusView}>
                                    <ArrowLeft size={18} />
                                    <span>Back to Vendors</span>
                                </button>
                                <h2>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                            </div>

                            <div className="focus-view-content">
                                <form onSubmit={saveVendor}>
                                    <div className="focus-view-card glass-card">
                                        <div className="focus-view-body">
                                            <div className="form-grid-focus">
                                                <div className="form-group-focus full-width">
                                                    <label>Vendor Name *</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={vendorForm.name}
                                                        onChange={handleVendorFormChange}
                                                        className="form-input-focus"
                                                        placeholder="e.g. Samsung Official Store"
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group-focus">
                                                    <label>Contact Info</label>
                                                    <input
                                                        type="text"
                                                        name="contact_info"
                                                        value={vendorForm.contact_info}
                                                        onChange={handleVendorFormChange}
                                                        className="form-input-focus"
                                                        placeholder="Phone or Email"
                                                    />
                                                </div>
                                                <div className="form-group-focus full-width">
                                                    <label>Address</label>
                                                    <textarea
                                                        name="address"
                                                        value={vendorForm.address}
                                                        onChange={handleVendorFormChange}
                                                        className="form-input-focus"
                                                        placeholder="Vendor physical address..."
                                                        rows="3"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="focus-view-actions">
                                        <button type="button" className="btn-cancel" onClick={closeVendorFocusView}>Cancel</button>
                                        <button type="submit" className="btn-primary" disabled={saving}>
                                            {saving ? 'Saving...' : (editingVendor ? 'Update Vendor' : 'Add Vendor')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* NORMAL SETTINGS VIEW */
                    <div className="profile-page">
                        <div className="profile-header">
                            <h1>Settings - {user?.shop_name || 'Admin'}</h1>
                            <p>Manage your account and shop configuration</p>
                        </div>

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
                            <button
                                className={`tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
                                onClick={() => setActiveTab('vendors')}
                            >
                                <Truck size={18} /> <span className="tab-label">Vendors</span>
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

                            {/* VENDOR MANAGEMENT TAB */}
                            {activeTab === 'vendors' && (
                                <div className="profile-column" style={{ gridColumn: '1 / -1' }}>
                                    <div className="profile-card glass-card">
                                        <div className="card-header" style={{ justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Truck size={20} />
                                                <h2>Vendor Management</h2>
                                            </div>
                                            <button className="btn-sm btn-primary mobile-icon-btn" onClick={() => openVendorFocusView()}>
                                                <Plus size={20} /> <span className="btn-text">Add Vendor</span>
                                            </button>
                                        </div>
                                        <p className="description-text" style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Manage your suppliers to streamline inventory restocking.</p>

                                        {loadingVendors ? (
                                            <div style={{ textAlign: 'center', padding: '20px' }}>Loading vendors...</div>
                                        ) : vendors.length === 0 ? (
                                            <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                                                <Truck size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                                <p>No vendors added yet.</p>
                                            </div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="glass-table w-full">
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Details</th>
                                                            <th>Status</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {vendors.map(vendor => (
                                                            <tr key={vendor.id} style={{ opacity: vendor.status === 'restricted' ? 0.6 : 1 }}>
                                                                <td>
                                                                    <div style={{ fontWeight: '500' }}>{vendor.name}</div>
                                                                    <small style={{ color: 'var(--text-secondary)' }}>Added: {new Date(vendor.created_at).toLocaleDateString()}</small>
                                                                </td>
                                                                <td>
                                                                    <div>{vendor.contact_info || '-'}</div>
                                                                    <small style={{ color: 'var(--text-secondary)' }}>{vendor.address || '-'}</small>
                                                                </td>
                                                                <td>
                                                                    <span className={`status-badge ${vendor.status}`}>
                                                                        {vendor.status}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div className="action-buttons">
                                                                        <button className="icon-btn" onClick={() => openVendorFocusView(vendor)} title="Edit">
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button className="icon-btn" onClick={() => toggleVendorStatus(vendor)} title={vendor.status === 'active' ? "Restrict" : "Activate"}>
                                                                            {vendor.status === 'active' ? <Lock size={16} /> : <Shield size={16} />}
                                                                        </button>
                                                                        <button className="icon-btn danger" onClick={() => deleteVendor(vendor.id)} title="Delete">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div >
                )}
            </main >
        </div >
    );
};

export default AdminSettings;
