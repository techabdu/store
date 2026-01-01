import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { ShoppingCart, Star, Eye, Trash2 } from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceOrders.css';
import './MarketplaceListings.css';

const MarketplaceBuying = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [interests, setInterests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError, showSuccess } = useNotification();
    const [visibleRows, setVisibleRows] = useState(10);

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

    const fetchInterests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/marketplace/interests/list.php');
            if (response.data.success) {
                setInterests(response.data.interests);
            }
        } catch (error) {
            console.error("Error fetching interests:", error);
            showError('Failed to load interests');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        setVisibleRows(prev => prev + 10);
    };

    useEffect(() => {
        if (user) {
            fetchInterests();
        }
    }, [user]);

    const toggleInterest = async (listingId) => {
        try {
            const response = await api.post('/marketplace/interests/toggle.php', { listing_id: listingId });
            if (response.data.success) {
                setInterests(interests.filter(item => item.id !== listingId));
                showSuccess('Item removed from interests');
            }
        } catch (error) {
            console.error("Error removing interest:", error);
            showError('Failed to remove item from interests');
        }
    };

    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG');
    };

    const getImageUrl = (url) => {
        if (!url) return '/placeholder-phone.png';
        if (url.startsWith('http')) return url;
        return `${SERVER_URL}${url}`;
    };

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
                    <div className="page-header" style={{ marginBottom: '30px' }}>
                        <h1 className="heading-1">Buying</h1>
                        <p className="text-secondary">View and manage items you're interested in</p>
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            <p className="text-secondary">Loading your interests...</p>
                        </div>
                    ) : (
                        <div className="buying-content">
                            {interests.length === 0 ? (
                                <div className="glass-card" style={{ textAlign: 'center', padding: '80px 40px', maxWidth: '600px', margin: '40px auto' }}>
                                    <div className="empty-icon-wrapper" style={{ marginBottom: '24px' }}>
                                        <Star size={80} style={{ color: 'var(--primary-color)', opacity: 0.2 }} />
                                    </div>
                                    <h2 className="heading-2" style={{ marginBottom: '16px' }}>Your Wishlist is Empty</h2>
                                    <p className="text-secondary" style={{ marginBottom: '32px', fontSize: '1.1rem' }}>
                                        Save items you're interested in while browsing to keep track of them here.
                                    </p>
                                    <button onClick={() => navigate('/marketplace/listings')} className="btn-primary" style={{ padding: '14px 40px' }}>
                                        Explore Marketplace
                                    </button>
                                </div>
                            ) : (
                                <div className="products-grid">
                                    {interests.slice(0, visibleRows).map(item => (
                                        <div
                                            key={item.id}
                                            className="product-item-wrapper"
                                            onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                                        >
                                            <div className="product-card glass-card">
                                                <div className="product-image-container">
                                                    <img
                                                        src={getImageUrl(item.image_url)}
                                                        alt={item.title}
                                                        className="product-image"
                                                        onError={(e) => {
                                                            const placeholder = '/placeholder-phone.png';
                                                            if (!e.target.src.endsWith(placeholder)) {
                                                                e.target.src = placeholder;
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        className="star-button active"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleInterest(item.id);
                                                        }}
                                                        style={{ color: 'var(--error-color)' }}
                                                        title="Remove from interests"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="product-info">
                                                <p className="product-price">₦{formatPrice(item.price)}</p>
                                                <h3 className="product-title">{item.title}</h3>
                                                <div className="product-location">
                                                    {item.shop_name} • {item.phone_condition}
                                                </div>
                                                <div className="product-date" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                    Added {new Date(item.starred_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!loading && visibleRows < interests.length && (
                                <div className="load-more-container">
                                    <button className="btn-load-more" onClick={loadMore}>
                                        Load More Items
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MarketplaceBuying;
