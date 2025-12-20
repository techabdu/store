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

            <main className="main-content marketplace-page-main">
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
                                <div className="dashboard-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                                    <Star size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 20px' }} />
                                    <h2 className="heading-2" style={{ marginBottom: '12px' }}>No Starred Items</h2>
                                    <p className="text-secondary" style={{ marginBottom: '24px' }}>
                                        Star items you're interested in while browsing to see them here.
                                    </p>
                                    <button onClick={() => navigate('/marketplace/listings')} className="btn-primary">Browse Marketplace</button>
                                </div>
                            ) : (
                                <div className="orders-list">
                                    {interests.map(item => (
                                        <div key={item.id} className="order-card">
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
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MarketplaceBuying;
