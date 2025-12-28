import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { User, MapPin, Phone, MessageSquare, Shield, ShieldCheck, Star, ArrowLeft, Package, Edit } from 'lucide-react';
import api, { SERVER_URL, isProduction } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceProfile.css';

const MarketplaceSellerProfile = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Listings state
    const [listings, setListings] = useState([]);
    const [listingsLoading, setListingsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const LISTINGS_PER_PAGE = 4;

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

    const fetchListings = useCallback(async (pageNum) => {
        if (!id) return;
        setListingsLoading(true);
        try {
            const response = await api.get(`/marketplace/listings/list.php`, {
                params: {
                    user_id: id,
                    page: pageNum,
                    limit: LISTINGS_PER_PAGE
                }
            });
            if (response.data.success) {
                const newListings = response.data.listings;
                if (pageNum === 1) {
                    setListings(newListings);
                } else {
                    setListings(prev => [...prev, ...newListings]);
                }

                // Check if we have more
                const totalPages = response.data.pagination.total_pages;
                setHasMore(pageNum < totalPages);
            }
        } catch (error) {
            console.error("Error fetching listings:", error);
        } finally {
            setListingsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Fetch basic profile info
                const response = await api.get(`/marketplace/profile/get_public_profile.php?user_id=${id}`);
                if (response.data.success) {
                    setProfile(response.data.profile);
                    // If profile has recent listings, we can use them IF they match our pagination (optional), 
                    // but for consistency with "Load More", let's fetch fresh.
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProfile();
            // Reset listings state when ID changes
            setListings([]);
            setPage(1);
            setHasMore(true);
            fetchListings(1);
        }
    }, [id, fetchListings]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchListings(nextPage);
    };

    const formatPrice = (price) => Number(price).toLocaleString('en-NG');

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;

        // Handle local XAMPP structure only if NOT in production and path doesn't already have /store
        if (!isProduction && !path.startsWith('/store')) {
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `${SERVER_URL}/store${cleanPath}`;
        }

        return `${SERVER_URL}${path}`;
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => { }} user={user} />
                <MarketplaceSidebar />
                <main className="main-content marketplace-main">
                    <div className="content-wrapper">
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <p className="text-secondary">Loading Profile...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => { }} user={user} />
                <MarketplaceSidebar />
                <main className="main-content marketplace-main">
                    <div className="content-wrapper">
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <p className="text-secondary">Seller not found</p>
                            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginTop: '20px' }}>
                                Go Back
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

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
                    <button onClick={() => navigate(-1)} className="back-button" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    {/* Profile Header */}
                    <div className="profile-header-card">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar" style={{ position: 'relative' }}>
                                {profile.profile_image ? (
                                    <img src={getImageUrl(profile.profile_image)} alt={profile.display_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={48} />
                                )}
                            </div>
                            <div className="profile-header-info">
                                <h2 className="profile-name">
                                    {(profile.first_name && profile.last_name) ? `${profile.first_name} ${profile.last_name}` : profile.display_name}
                                </h2>
                                <p className="profile-email">Member since {new Date(profile.joined_at).toLocaleDateString()}</p>
                                {profile.is_verified === 1 || profile.is_verified === true ? (
                                    <div className="verification-badge verification-success">
                                        <ShieldCheck size={16} />
                                        Verified Seller
                                    </div>
                                ) : (
                                    <div className="verification-badge verification-default">
                                        <Shield size={16} />
                                        Unverified
                                    </div>
                                )}
                            </div>
                        </div>
                        {user && String(user.id) !== String(id) && (
                            <div className="profile-header-actions">
                                <button className="btn-edit-profile" onClick={() => navigate(`/marketplace/messages?recipient_id=${id}`)}>
                                    <MessageSquare size={18} />
                                    Message Seller
                                </button>
                            </div>
                        )}
                        {/* If it's the owner, maybe show an Edit Profile button instead of Message */}
                        {user && String(user.id) === String(id) && (
                            <div className="profile-header-actions">
                                {/* Optional: Edit Profile Details button can go here if requested later */}
                            </div>
                        )}
                    </div>

                    {/* Stats Cards */}
                    <div className="profile-stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'rgba(251, 188, 4, 0.1)' }}>
                                <Star size={24} style={{ color: 'var(--warning)' }} />
                            </div>
                            <div>
                                <h3 className="stat-value">{Number(profile.average_rating || 0).toFixed(1)}</h3>
                                <p className="stat-label">Rating ({profile.total_reviews || 0} reviews)</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'rgba(66, 133, 244, 0.1)' }}>
                                <Package size={24} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                                <h3 className="stat-value">{profile.total_listings || 0}</h3>
                                <p className="stat-label">Total Listings</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'rgba(52, 168, 83, 0.1)' }}>
                                <ShieldCheck size={24} style={{ color: 'var(--success)' }} />
                            </div>
                            <div>
                                <h3 className="stat-value">{profile.total_sales || 0}</h3>
                                <p className="stat-label">Items Sold</p>
                            </div>
                        </div>
                    </div>

                    <div className="profile-content-grid">
                        {/* Profile Info Side */}
                        <div className="profile-section">
                            <div className="section-header" style={{ marginBottom: 0 }}>
                                <h3 className="section-title">Seller Details</h3>
                            </div>
                            <div className="profile-form" style={{ padding: '12px 24px 24px' }}>
                                <div className="form-group" style={{ marginTop: 0 }}>
                                    <div className="form-label" style={{ marginBottom: '4px' }}>
                                        <User size={18} />
                                        <span>Shop Name</span>
                                    </div>
                                    <p className="text-secondary">{profile.shop_name || 'N/A'}</p>
                                </div>

                                <div className="form-group">
                                    <div className="form-label" style={{ marginBottom: '4px' }}>
                                        <MapPin size={18} />
                                        <span>Location</span>
                                    </div>
                                    <p className="text-secondary">{profile.shop_address || 'N/A'}</p>
                                </div>

                                <div className="form-group">
                                    <div className="form-label" style={{ marginBottom: '4px' }}>
                                        <MessageSquare size={18} />
                                        <span>Bio</span>
                                    </div>
                                    <p className="text-secondary">{profile.bio || 'No bio available.'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Listings Side */}
                        <div className="profile-section">
                            <div className="section-header" style={{ marginBottom: 0 }}>
                                <h3 className="section-title">Active Listings</h3>
                            </div>
                            <div style={{ padding: '12px 24px 24px' }}>
                                {listings && listings.length > 0 ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', marginTop: 0 }}>
                                            {listings.map(listing => (
                                                <Link to={`/marketplace/listing/${listing.id}`} key={listing.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    <div style={{
                                                        background: 'var(--bg-background)',
                                                        borderRadius: '8px',
                                                        padding: '16px',
                                                        border: '1px solid var(--border-color)',
                                                        transition: 'transform 0.2s',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                        className="listing-card-hover"
                                                    >
                                                        <div>
                                                            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>{listing.title}</h4>
                                                            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                                <span>{listing.phone_condition || 'New'}</span>
                                                                <span>•</span>
                                                                <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '16px' }}>₦{formatPrice(listing.price)}</p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>

                                        {hasMore && (
                                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                                <button
                                                    onClick={handleLoadMore}
                                                    disabled={listingsLoading}
                                                    className="btn-secondary"
                                                    style={{ width: '100%' }}
                                                >
                                                    {listingsLoading ? 'Loading...' : 'Load More Listings'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-secondary">{listingsLoading && page === 1 ? 'Loading listings...' : 'No active listings.'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceSellerProfile;
