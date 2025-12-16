import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { User, MapPin, Phone, Mail, Calendar, Shield, ShieldCheck, ShieldAlert, Camera, Edit2, Save, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplaceProfile.css';

const MarketplaceProfile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        business_name: '',
        phone: '',
        location: '',
        bio: '',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const [profileRes, statsRes] = await Promise.all([
                api.get('/marketplace/profile/get_profile.php'),
                api.get('/marketplace/profile/get_stats.php')
            ]);

            if (profileRes.data.success) {
                const profileData = profileRes.data.profile;
                setProfile(profileData);
                setFormData({
                    business_name: profileData.business_name || '',
                    phone: profileData.phone || '',
                    location: profileData.location || '',
                    bio: profileData.bio || '',
                });
            }

            if (statsRes.data.success) {
                setStats(statsRes.data.stats);
            }
        } catch (error) {
            console.error("Error fetching profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSaveProfile = async () => {
        try {
            const res = await api.post('/marketplace/profile/update_profile.php', formData);
            if (res.data.success) {
                setProfile({ ...profile, ...formData });
                setEditing(false);
                alert('Profile updated successfully');
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update profile');
        }
    };

    const getVerificationStatus = () => {
        if (!profile) return { icon: Shield, color: 'default', label: 'Not Verified', description: 'Verify your identity to build trust' };

        const status = profile.verification_status;
        const statuses = {
            verified: { icon: ShieldCheck, color: 'success', label: 'Verified', description: 'Your identity has been verified' },
            pending: { icon: Shield, color: 'warning', label: 'Pending Review', description: 'Your verification is being reviewed' },
            rejected: { icon: ShieldAlert, color: 'error', label: 'Verification Failed', description: 'Please resubmit your verification' },
            none: { icon: Shield, color: 'default', label: 'Not Verified', description: 'Verify your identity to build trust' },
        };

        return statuses[status] || statuses.none;
    };

    const verificationStatus = getVerificationStatus();
    const VerificationIcon = verificationStatus.icon;

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-profile-main">
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">My Profile</h1>
                        <p className="text-secondary">Manage your marketplace profile and settings</p>
                    </div>

                    {loading ? (
                        <div className="profile-loading">
                            <p className="text-secondary">Loading profile...</p>
                        </div>
                    ) : (
                        <>
                            {/* Profile Header */}
                            <div className="profile-header-card">
                                <div className="profile-avatar-section">
                                    <div className="profile-avatar">
                                        <User size={48} />
                                        <button className="avatar-upload-btn">
                                            <Camera size={16} />
                                        </button>
                                    </div>
                                    <div className="profile-header-info">
                                        <h2 className="profile-name">{user?.username || 'User'}</h2>
                                        <p className="profile-email">{user?.email}</p>
                                        <div className={`verification-badge verification-${verificationStatus.color}`}>
                                            <VerificationIcon size={16} />
                                            {verificationStatus.label}
                                        </div>
                                    </div>
                                </div>
                                <div className="profile-header-actions">
                                    {!editing ? (
                                        <button onClick={() => setEditing(true)} className="btn-edit-profile">
                                            <Edit2 size={18} />
                                            Edit Profile
                                        </button>
                                    ) : (
                                        <div className="edit-actions">
                                            <button onClick={() => setEditing(false)} className="btn-cancel-edit">
                                                <X size={18} />
                                                Cancel
                                            </button>
                                            <button onClick={handleSaveProfile} className="btn-save-profile">
                                                <Save size={18} />
                                                Save Changes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="profile-stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: 'rgba(66, 133, 244, 0.1)' }}>
                                        <User size={24} style={{ color: 'var(--primary)' }} />
                                    </div>
                                    <div>
                                        <h3 className="stat-value">{stats?.total_sales || 0}</h3>
                                        <p className="stat-label">Total Sales</p>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: 'rgba(52, 168, 83, 0.1)' }}>
                                        <ShieldCheck size={24} style={{ color: 'var(--success)' }} />
                                    </div>
                                    <div>
                                        <h3 className="stat-value">{stats?.active_listings || 0}</h3>
                                        <p className="stat-label">Active Listings</p>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: 'rgba(251, 188, 4, 0.1)' }}>
                                        <Calendar size={24} style={{ color: 'var(--warning)' }} />
                                    </div>
                                    <div>
                                        <h3 className="stat-value">{stats?.total_purchases || 0}</h3>
                                        <p className="stat-label">Total Purchases</p>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Information */}
                            <div className="profile-content-grid">
                                {/* Verification Section */}
                                <div className="profile-section">
                                    <div className="section-header">
                                        <h3 className="section-title">Verification Status</h3>
                                    </div>
                                    <div className="verification-card">
                                        <div className={`verification-icon verification-icon-${verificationStatus.color}`}>
                                            <VerificationIcon size={32} />
                                        </div>
                                        <div className="verification-info">
                                            <h4 className="verification-title">{verificationStatus.label}</h4>
                                            <p className="verification-description">{verificationStatus.description}</p>
                                        </div>
                                        {profile?.verification_status !== 'verified' && (
                                            <button
                                                onClick={() => navigate('/marketplace/verify')}
                                                className="btn-verify"
                                            >
                                                Get Verified
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Profile Information Form */}
                                <div className="profile-section">
                                    <div className="section-header">
                                        <h3 className="section-title">Profile Information</h3>
                                    </div>
                                    <div className="profile-form">
                                        <div className="form-group">
                                            <label className="form-label">
                                                <User size={16} />
                                                Business Name
                                            </label>
                                            <input
                                                type="text"
                                                name="business_name"
                                                value={formData.business_name}
                                                onChange={handleInputChange}
                                                disabled={!editing}
                                                className="form-input"
                                                placeholder="Enter your business name"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                <Phone size={16} />
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                disabled={!editing}
                                                className="form-input"
                                                placeholder="Enter your phone number"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                <MapPin size={16} />
                                                Location
                                            </label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                disabled={!editing}
                                                className="form-input"
                                                placeholder="Enter your location"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                <Mail size={16} />
                                                Bio
                                            </label>
                                            <textarea
                                                name="bio"
                                                value={formData.bio}
                                                onChange={handleInputChange}
                                                disabled={!editing}
                                                className="form-textarea"
                                                placeholder="Tell buyers about yourself"
                                                rows="4"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MarketplaceProfile;
