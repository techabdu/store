import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { User, MapPin, Phone, Mail, Calendar, Shield, ShieldCheck, ShieldAlert, Camera, Edit2, Save, X, MessageSquare, Edit } from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceProfile.css';

const MarketplaceProfile = () => {
    const { user, currentShop } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

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

    // Cropping State
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [currentShop]);

    const fetchProfile = async () => {
        try {
            const [profileRes, statsRes] = await Promise.all([
                api.get('/marketplace/profile/get.php', { params: { shop_id: currentShop?.id } }),
                api.get('/marketplace/profile/get_stats.php', { params: { shop_id: currentShop?.id } })
            ]);

            if (profileRes.data.success) {
                const profileData = profileRes.data.profile;
                setProfile(profileData);
                setFormData({
                    business_name: profileData.shop_name || '',
                    phone: profileData.shop_phone || '',
                    location: profileData.shop_address || '',
                    bio: profileData.bio || '',
                    shop_id: currentShop?.id // Store shop_id in formData or use from context
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
            const res = await api.post('/marketplace/profile/update_profile.php', {
                ...formData,
                shop_id: currentShop?.id
            });
            if (res.data.success) {
                setProfile({ ...profile, ...formData });
                setEditing(false);
                alert('Profile updated successfully');
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update profile');
        }
    };

    const handleFileSelect = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            // Basic validation
            if (file.size > 5 * 1024 * 1024) {
                alert("File is too large. Max size is 5MB.");
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
            // Reset input so same file selection triggers change again if needed
            e.target.value = '';
        }
    };

    const handleUploadCroppedImage = async () => {
        try {
            setUploading(true);
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

            const formData = new FormData();
            formData.append('avatar', croppedImageBlob, 'profile.jpg');

            const response = await api.post('/marketplace/profile/update_avatar.php', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setProfile(prev => ({ ...prev, profile_image: response.data.image_url }));
                setIsCropping(false);
                setImageSrc(null);
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            const msg = error.response?.data?.error || "Failed to upload image.";
            alert(msg);
        } finally {
            setUploading(false);
        }
    };

    const handleCancelCrop = () => {
        setIsCropping(false);
        setImageSrc(null);
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

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${SERVER_URL}${path}`;
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

            <main className="main-content marketplace-main">
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
                                    <div className="profile-avatar" style={{ position: 'relative' }}>
                                        {profile?.profile_image ? (
                                            <img src={getImageUrl(profile.profile_image)} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '50%' }}>
                                                <User size={48} color="#9ca3af" />
                                            </div>
                                        )}

                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            hidden
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor="avatar-upload"
                                            style={{
                                                position: 'absolute',
                                                bottom: '0',
                                                left: '-10px',
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                padding: '6px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: uploading ? 'wait' : 'pointer',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#374151',
                                                zIndex: 10,
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Change Profile Picture"
                                        >
                                            <Edit size={14} />
                                            <span>{uploading ? '...' : 'Edit'}</span>
                                        </label>
                                    </div>
                                    <div className="profile-header-info">
                                        <h2 className="profile-name">{profile?.full_name || user?.username || 'User'}</h2>
                                        <p className="profile-email">{user?.email}</p>
                                        <div className={`verification-badge verification-${verificationStatus.color}`}>
                                            <VerificationIcon size={16} />
                                            {verificationStatus.label}
                                        </div>
                                    </div>
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
                                        <div className="profile-header-actions">
                                            {!editing ? (
                                                <button onClick={() => setEditing(true)} className="btn-edit-profile btn-sm">
                                                    <Edit2 size={16} />
                                                    <span className="btn-text">Edit Profile</span>
                                                </button>
                                            ) : (
                                                <div className="edit-actions">
                                                    <button onClick={() => setEditing(false)} className="btn-cancel-edit btn-sm">
                                                        <X size={16} />
                                                        <span className="btn-text">Cancel</span>
                                                    </button>
                                                    <button onClick={handleSaveProfile} className="btn-save-profile btn-sm">
                                                        <Save size={16} />
                                                        <span className="btn-text">Save Changes</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="profile-form">
                                        <div className="form-group">
                                            <label className="form-label">
                                                <User size={18} />
                                                <span>Business Name</span>
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
                                                <Phone size={18} />
                                                <span>Phone Number</span>
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
                                                <MapPin size={18} />
                                                <span>Location</span>
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
                                                <MessageSquare size={18} />
                                                <span>Bio</span>
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

            {/* Cropping Modal */}
            {isCropping && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '500px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '90vh'
                    }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #efefef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Crop Profile Picture</h3>
                            <button onClick={handleCancelCrop} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ position: 'relative', height: '300px', width: '100%', background: '#333' }}>
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Square aspect for profile
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                showGrid={true}
                                cropShape="round" // Round for profile picture
                            />
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#666' }}>Zoom</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(e.target.value)}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={handleCancelCrop}
                                    disabled={uploading}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        background: 'white',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadCroppedImage}
                                    disabled={uploading}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {uploading ? 'Uploading...' : 'Save Picture'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketplaceProfile;
