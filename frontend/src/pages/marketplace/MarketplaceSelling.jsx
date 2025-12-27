import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api from '../../utils/api';
import { Tag, Plus, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';

const MarketplaceSelling = () => {
    const { user, currentShop } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleRows, setVisibleRows] = useState(15);

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
        const fetchMyListings = async () => {
            if (!currentShop) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Fetch listings created by current user for current shop
                const response = await api.get('/marketplace/listings/list.php', {
                    params: {
                        user_id: 'me',
                        shop_id: currentShop.id,
                        limit: 50
                    }
                });
                if (response.data.success) {
                    setListings(response.data.listings);
                }
            } catch (error) {
                console.error("Error fetching my listings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyListings();
    }, [currentShop]);

    const loadMore = () => {
        setVisibleRows(prev => prev + 15);
    };


    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG', {
            style: 'currency',
            currency: 'NGN'
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await api.post('/marketplace/listings/delete.php', { id });
            if (response.data.success) {
                // Remove item from state
                setListings(prev => prev.filter(item => item.id !== id));
                alert("Listing deleted successfully.");
            }
        } catch (error) {
            console.error("Error deleting listing:", error);
            alert(error.response?.data?.error || "Failed to delete listing.");
        }
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
                    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="heading-1">Selling</h1>
                            <p className="text-secondary">Manage your active listings</p>
                        </div>
                        <button
                            onClick={() => navigate('/marketplace/create-listing')}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={20} />
                            <span className="btn-text">Create Listing</span>
                        </button>
                    </div>

                    {loading ? (
                        <p>Loading your listings...</p>
                    ) : listings.length === 0 ? (
                        <div className="dashboard-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                            <Tag size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 20px' }} />
                            <h2 className="heading-2" style={{ marginBottom: '12px' }}>No Active Listings</h2>
                            <p className="text-secondary" style={{ marginBottom: '24px' }}>
                                You don't have any items for sale yet.
                            </p>
                            <button
                                onClick={() => navigate('/marketplace/create-listing')}
                                className="btn-primary"
                            >
                                Start Selling
                            </button>
                        </div>
                    ) : (
                        <div className="table-container glass-card mb-24">
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Price</th>
                                            <th>Type</th>
                                            <th>Date Listed</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listings.slice(0, visibleRows).map(item => (
                                            <tr key={item.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#f3f4f6',
                                                            backgroundImage: `url(${item.thumbnail || '/placeholder-phone.png'})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center'
                                                        }}></div>
                                                        <div>
                                                            <div style={{ fontWeight: '500' }}>{item.title}</div>
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.phone_model}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{formatPrice(item.price)}</td>
                                                <td>
                                                    <span className={`status-badge status-${item.listing_type === 'auction' ? 'warning' : 'info'}`}>
                                                        {item.listing_type === 'auction' ? 'Auction' : 'Fixed Price'}
                                                    </span>
                                                </td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <span className="status-badge status-success">Active</span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => navigate(`/marketplace/edit-listing/${item.id}`)}
                                                        title="Edit"
                                                        style={{ marginRight: '8px' }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Delete"
                                                        style={{ color: '#dc2626' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {visibleRows < listings.length && (
                                <div className="load-more-container">
                                    <button className="btn-load-more" onClick={loadMore}>
                                        Load More Listings
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

export default MarketplaceSelling;
