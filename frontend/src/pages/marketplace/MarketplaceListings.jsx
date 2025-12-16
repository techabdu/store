import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api from '../../utils/api';
import { FaStore, FaPlus } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplaceListings.css';

const MarketplaceListings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        min_price: '',
        max_price: '',
        brand: '',
        condition: ''
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

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

    const fetchListings = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 12,
                ...filters
            };
            const response = await api.get('/marketplace/listings/list.php', { params });
            if (response.data.success) {
                setListings(response.data.listings);
                setHasMore(response.data.listings.length === 12);
            }
        } catch (error) {
            console.error("Error fetching listings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, [page, filters.search]); // Re-fetch on page or search change

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const applyFilters = (e) => {
        e.preventDefault();
        setPage(1);
        fetchListings();
    };

    // Format price for display
    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG');
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onApplyFilters={applyFilters}
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-listings-main">
                <div className="content-wrapper">
                    {/* Header Section */}
                    <div className="listings-header">
                        <div className="page-header">
                            <h1 className="heading-1">Browse Listings</h1>
                            <p className="text-secondary">Explore phones from verified sellers</p>
                        </div>
                        <button
                            onClick={() => navigate('/marketplace/create-listing')}
                            className="btn-sell-item"
                        >
                            <FaPlus size={14} />
                            <span>Sell Item</span>
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="loading-state">
                            <p>Loading listings...</p>
                        </div>
                    )}

                    {/* Products Grid */}
                    {!loading && listings.length > 0 && (
                        <div className="products-grid">
                            {listings.map(item => (
                                <div
                                    key={item.id}
                                    className="product-card"
                                    onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                                >
                                    <div className="product-image-container">
                                        <img
                                            src={item.image_url || '/placeholder-phone.png'}
                                            alt={item.title}
                                            className="product-image"
                                        />
                                        {item.listing_type === 'auction' && (
                                            <span className="listing-badge">
                                                Auction
                                            </span>
                                        )}
                                    </div>
                                    <div className="product-info">
                                        <h3 className="product-title">{item.title}</h3>
                                        <p className="product-price">
                                            ₦{formatPrice(item.price)}
                                        </p>
                                        <div className="product-meta">
                                            <span className="product-condition">{item.condition_state}</span>
                                            <span className="product-shop">
                                                {item.shop_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && listings.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FaStore />
                            </div>
                            <h3 className="empty-state-title">No Listings Found</h3>
                            <p className="empty-state-description">
                                {filters.search || filters.min_price || filters.max_price
                                    ? "Try adjusting your filters to see more results"
                                    : "Be the first to list an item in the marketplace"}
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && listings.length > 0 && (
                        <div className="pagination">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="pagination-btn"
                            >
                                Previous
                            </button>
                            <span className="pagination-info">Page {page}</span>
                            <button
                                disabled={!hasMore}
                                onClick={() => setPage(p => p + 1)}
                                className="pagination-btn"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MarketplaceListings;
