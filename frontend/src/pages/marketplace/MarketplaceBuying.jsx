import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { ShoppingCart, Star, Eye, Trash2 } from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceOrders.css';

const MarketplaceBuying = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [interests, setInterests] = useState([]);
    const [loading, setLoading] = useState(true);
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
            }
        } catch (error) {
            console.error("Error removing interest:", error);
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
                                <div className="orders-list">
                                    {interests.slice(0, visibleRows).map(item => (
                                        <div key={item.id} className="order-card glass-card">
                                            <div className="order-header">
                                                <div className="order-header-left">
                                                    <h4 className="order-id">{item.title}</h4>
                                                    <span className="order-date">Added {new Date(item.starred_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="order-header-right">
                                                    <button
                                                        onClick={() => toggleInterest(item.id)}
                                                        className="icon-btn"
                                                        style={{ color: 'var(--error-color)' }}
                                                        title="Remove from interests"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="order-items">
                                                <div className="order-item" onClick={() => navigate(`/marketplace/listing/${item.id}`)} style={{ cursor: 'pointer' }}>
                                                    <img src={getImageUrl(item.image_url)} alt={item.title} className="order-item-image" />
                                                    <div className="order-item-info">
                                                        <h5 className="order-item-name">{item.phone_model} • {item.phone_condition}</h5>
                                                        <p className="order-item-details">Shop: {item.shop_name}</p>
                                                        <p className="order-total-amount" style={{ marginTop: '8px', fontSize: '18px', fontWeight: '600' }}>₦{formatPrice(item.price)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="order-footer">
                                                <button onClick={() => navigate(`/marketplace/listing/${item.id}`)} className="btn-view-order" style={{ width: '100%', justifyContent: 'center' }}>
                                                    View Product Details
                                                </button>
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
