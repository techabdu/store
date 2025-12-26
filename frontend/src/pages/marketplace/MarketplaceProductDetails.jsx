
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api, { SERVER_URL } from '../../utils/api';
import { ShoppingCart, MessageSquare, ArrowLeft, X, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceProductDetails.css';

const MarketplaceProductDetails = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [isVerified, setIsVerified] = useState(true); // Default to true to avoid flash
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [starred, setStarred] = useState(false);

    const getImageUrl = (url) => {
        if (!url) return '/placeholder-phone.png';
        if (url.startsWith('http')) return url;
        return `${SERVER_URL}${url}`;
    };

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

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const [listingRes, verifyRes] = await Promise.all([
                    api.get(`/marketplace/listings/get_details.php?id=${id}`),
                    api.get('/marketplace/identity/check_status.php')
                ]);

                if (listingRes.data.success) {
                    setListing(listingRes.data.listing);
                }

                if (verifyRes.data.success) {
                    setIsVerified(verifyRes.data.is_verified);
                }

                // Check if item is starred
                if (user) {
                    const starsRes = await api.get('/marketplace/interests/list.php');
                    if (starsRes.data.success) {
                        const isStarred = starsRes.data.interests.some(i => i.id === parseInt(id));
                        setStarred(isStarred);
                    }
                }
            } catch (error) {
                console.error("Error fetching details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleBuyNow = async () => {
        if (!window.confirm("Are you sure you want to purchase this item? Funds will be held in escrow.")) return;
        setBuying(true);
        try {
            const response = await api.post('/marketplace/orders/create.php', { listing_id: listing.id });
            if (response.data.success) {
                alert("Order placed successfully! Funds are held in escrow.");
                navigate('/marketplace/orders');
            }
        } catch (error) {
            alert(error.response?.data?.error || "Purchase failed");
        } finally {
            setBuying(false);
        }
    };

    const handleMessage = () => {
        if (user && listing.user_id == user.id) {
            // User is the seller, just go to messages
            navigate('/marketplace/messages');
            return;
        }
        const brand = listing.phone_brand || '';
        const model = listing.phone_model || '';
        navigate(`/marketplace/messages?listing_id=${listing.id}&brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`);
    };

    const toggleInterest = async () => {
        if (!user) {
            alert("Please log in to save items to your interests.");
            navigate('/auth/login');
            return;
        }
        try {
            const response = await api.post('/marketplace/interests/toggle.php', { listing_id: listing.id });
            if (response.data.success) {
                setStarred(response.data.action === 'added');
            }
        } catch (error) {
            console.error("Error toggling interest:", error);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => { }} user={user} />
                <MarketplaceSidebar />
                <main className="main-content marketplace-main">
                    <div className="content-wrapper">
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <p className="text-secondary">Loading...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => { }} user={user} />
                <MarketplaceSidebar />
                <main className="main-content marketplace-main">
                    <div className="content-wrapper">
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <p className="text-secondary">Listing not found</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const formatPrice = (price) => Number(price).toLocaleString('en-NG');

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
                    <button onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={18} />
                        Back to Listings
                    </button>

                    <div className="product-layout">
                        {/* Images Section */}
                        <div className="product-image-section">
                            <div className="product-image-container" onClick={() => setIsLightboxOpen(true)}>
                                <img
                                    src={getImageUrl(listing.images?.[activeImageIndex] || listing.image_url)}
                                    alt={listing.title}
                                    className="product-image"
                                />
                            </div>

                            {/* Thumbnails */}
                            {listing.images && listing.images.length > 1 && (
                                <div className="product-thumbnails">
                                    {listing.images.map((img, index) => (
                                        <div
                                            key={index}
                                            className={`thumbnail-item ${index === activeImageIndex ? 'active' : ''}`}
                                            onClick={() => setActiveImageIndex(index)}
                                        >
                                            <img src={getImageUrl(img)} alt={`Thumbnail ${index + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="product-details-section">
                            <div className="product-details-card">
                                <h1 className="product-title">{listing.title}</h1>
                                <p className="product-price">
                                    ₦{formatPrice(listing.price)}
                                </p>

                                <div className="product-actions">
                                    {listing.listing_type === 'fixed_price' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <button
                                                onClick={() => {
                                                    if (!isVerified) {
                                                        alert("Please verify your account to make purchases.");
                                                        navigate('/marketplace/verify');
                                                        return;
                                                    }
                                                    handleBuyNow();
                                                }}
                                                disabled={buying || listing.status !== 'active'}
                                                className="product-btn product-btn-primary product-btn-icon"
                                                style={{
                                                    opacity: isVerified && listing.status === 'active' ? 1 : 0.6,
                                                    cursor: isVerified && listing.status === 'active' ? 'pointer' : 'not-allowed'
                                                }}
                                                title={buying ? 'Processing...' : 'Buy Now'}
                                                aria-label={buying ? 'Processing...' : 'Buy Now'}
                                            >
                                                <ShoppingCart size={20} />
                                            </button>
                                            {!isVerified && (
                                                <p style={{ color: '#d97706', fontSize: '12px', fontWeight: '500' }}>
                                                    Identity verification required to purchase
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            className="product-btn product-btn-primary"
                                            onClick={() => alert("Auction UI coming soon!")}
                                        >
                                            Place Bid
                                        </button>
                                    )}

                                    <button
                                        onClick={handleMessage}
                                        className="product-btn product-btn-secondary product-btn-icon"
                                        title="Chat with Seller"
                                        aria-label="Chat with Seller"
                                    >
                                        <MessageSquare size={20} />
                                    </button>

                                    <button
                                        onClick={toggleInterest}
                                        className={`product-btn star-details-btn product-btn-icon ${starred ? 'active' : ''}`}
                                        title={starred ? "Remove from interests" : "Add to interests"}
                                        aria-label={starred ? "Remove from interests" : "Add to interests"}
                                    >
                                        <Star size={20} fill={starred ? "var(--primary-color)" : "none"} stroke={starred ? "var(--primary-color)" : "currentColor"} />
                                    </button>
                                </div>

                                <div className="product-info-section">
                                    <h3 className="product-info-title">Details</h3>
                                    <ul className="product-info-list">
                                        <li className="product-info-item">
                                            <span className="product-info-label">Condition:</span>
                                            {listing.phone_condition || listing.condition_state || 'N/A'}
                                        </li>
                                        <li className="product-info-item">
                                            <span className="product-info-label">Brand:</span>
                                            {listing.phone_brand || 'N/A'}
                                        </li>
                                        <li className="product-info-item">
                                            <span className="product-info-label">Model:</span>
                                            {listing.phone_model || 'N/A'}
                                        </li>
                                        <li className="product-info-item">
                                            <span className="product-info-label">Location:</span>
                                            {listing.shop_address || 'N/A'}
                                        </li>
                                        <li className="product-info-item">
                                            <span className="product-info-label">Posted:</span>
                                            {new Date(listing.created_at).toLocaleDateString()}
                                        </li>
                                    </ul>
                                </div>

                                <div className="product-description-section">
                                    <h3 className="product-info-title">Description</h3>
                                    <p className="product-description-text">
                                        {listing.description}
                                    </p>
                                </div>
                            </div>

                            {/* Seller Info Card */}
                            <div
                                className="seller-card"
                                onClick={() => navigate(`/marketplace/seller/${listing.user_id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="seller-avatar">
                                    <img
                                        src={getImageUrl(listing.seller_profile_image) || '/user-avatar.png'}
                                        alt={listing.seller_name}
                                    />
                                </div>
                                <div className="seller-info">
                                    <h3 className="seller-name">{listing.seller_name}</h3>
                                    <div className="seller-rating">
                                        ★ {listing.seller_rating || 'New Seller'}
                                    </div>
                                    <p className="seller-badge">Verified Seller</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Click to view profile</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Lightbox Modal */}
            {isLightboxOpen && (
                <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
                    <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}>
                        <X size={32} />
                    </button>

                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        {listing.images && listing.images.length > 1 && (
                            <button
                                className="lightbox-nav lightbox-prev"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImageIndex(prev => prev === 0 ? listing.images.length - 1 : prev - 1);
                                }}
                            >
                                <ChevronLeft size={32} />
                            </button>
                        )}

                        <img
                            src={getImageUrl(listing.images?.[activeImageIndex] || listing.image_url)}
                            alt={listing.title}
                            className="lightbox-image"
                        />

                        {listing.images && listing.images.length > 1 && (
                            <>
                                <button
                                    className="lightbox-nav lightbox-next"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => prev === listing.images.length - 1 ? 0 : prev + 1);
                                    }}
                                >
                                    <ChevronRight size={32} />
                                </button>
                                <div className="lightbox-counter">
                                    {activeImageIndex + 1} / {listing.images.length}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketplaceProductDetails;
