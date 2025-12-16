
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api from '../../utils/api';
import { ShoppingCart, MessageSquare, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplaceProductDetails.css';

const MarketplaceProductDetails = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);

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
                const response = await api.get(`/marketplace/listings/get_details.php?id=${id}`);
                if (response.data.success) {
                    setListing(response.data.listing);
                }
            } catch (error) {
                console.error("Error fetching listing details:", error);
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
        navigate(`/marketplace/messages?new=${listing.id}`);
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => { }} user={user} />
                <MarketplaceSidebar />
                <main className="main-content marketplace-product-main">
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
                <main className="main-content marketplace-product-main">
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

            <main className="main-content marketplace-product-main">
                <div className="content-wrapper">
                    <button onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={18} />
                        Back to Listings
                    </button>

                    <div className="product-layout">
                        {/* Images Section */}
                        <div className="product-image-section">
                            <div className="product-image-container">
                                <img
                                    src={listing.images?.[0]?.image_url || '/placeholder-phone.png'}
                                    alt={listing.title}
                                    className="product-image"
                                />
                            </div>
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
                                        <button
                                            onClick={handleBuyNow}
                                            disabled={buying || listing.status !== 'active'}
                                            className="product-btn product-btn-primary"
                                        >
                                            <ShoppingCart size={18} />
                                            {buying ? 'Processing...' : 'Buy Now'}
                                        </button>
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
                                        className="product-btn product-btn-secondary"
                                    >
                                        <MessageSquare size={18} />
                                        Chat with Seller
                                    </button>
                                </div>

                                <div className="product-info-section">
                                    <h3 className="product-info-title">Details</h3>
                                    <ul className="product-info-list">
                                        <li className="product-info-item">
                                            <span className="product-info-label">Condition:</span>
                                            {listing.condition_state}
                                        </li>
                                        <li className="product-info-item">
                                            <span className="product-info-label">Model:</span>
                                            {listing.phone_model}
                                        </li>
                                        <li className="product-info-item">
                                            <span className="product-info-label">Location:</span>
                                            {listing.shop_name} ({listing.branch_name})
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
                            <div className="seller-card">
                                <div className="seller-avatar">
                                    <img
                                        src={listing.seller_profile_image || '/user-avatar.png'}
                                        alt={listing.seller_name}
                                    />
                                </div>
                                <div className="seller-info">
                                    <h3 className="seller-name">{listing.seller_name}</h3>
                                    <div className="seller-rating">
                                        ★ {listing.seller_rating || 'New Seller'}
                                    </div>
                                    <p className="seller-badge">Verified Seller</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceProductDetails;
