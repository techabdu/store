import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api, { SERVER_URL, isProduction } from '../../utils/api';
import { FaStore, FaPlus } from 'react-icons/fa';
import { Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceListings.css';

const MarketplaceListings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [interests, setInterests] = useState([]);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError, showSuccess } = useNotification();
    const [filters, setFilters] = useState({
        search: '',
        min_price: '',
        max_price: '',
        brand: '',
        condition: ''
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [randomSeed, setRandomSeed] = useState(Date.now());
    const [loadingMore, setLoadingMore] = useState(false);
    const observerTarget = React.useRef(null);

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

    const fetchListings = async (pageNum = 1, append = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            // Filter out empty strings
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '')
            );

            const params = {
                page: pageNum,
                limit: 12,
                random: 'true',
                seed: randomSeed,
                ...activeFilters
            };

            const response = await api.get('/marketplace/listings/list.php', { params });
            if (response.data.success) {
                if (append) {
                    // Append new listings to existing ones
                    setListings(prev => [...prev, ...response.data.listings]);
                } else {
                    // Replace listings (initial load or refresh)
                    setListings(response.data.listings);
                }
                setHasMore(response.data.listings.length === 12);
            }
        } catch (error) {
            console.error("Error fetching listings:", error);
            showError('Failed to load listings');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchInterests = async () => {
        try {
            const response = await api.get('/marketplace/interests/list.php');
            if (response.data.success) {
                setInterests(response.data.interests.map(i => i.id));
            }
        } catch (error) {
            console.error("Error fetching interests:", error);
            showError('Failed to load interests');
        }
    };

    // Initial load and filter changes
    useEffect(() => {
        // Generate new random seed on filter change or initial load
        setRandomSeed(Date.now());
        setPage(1);
        fetchListings(1, false);
        if (user) {
            fetchInterests();
        }
    }, [filters.search, user]);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchListings(nextPage, true);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, loading, loadingMore, page]);


    const toggleInterest = async (e, listingId) => {
        e.stopPropagation();
        if (!user) {
            showError("Please log in to save items to your interests.");
            navigate('/auth/login');
            return;
        }
        try {
            const response = await api.post('/marketplace/interests/toggle.php', { listing_id: listingId });
            if (response.data.success) {
                if (response.data.action === 'added') {
                    setInterests([...interests, listingId]);
                    showSuccess('Item added to interests');
                } else {
                    setInterests(interests.filter(id => id !== listingId));
                    showSuccess('Item removed from interests');
                }
            }
        } catch (error) {
            console.error("Error toggling interest:", error);
            showError('Failed to update interests');
        }
    };

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

    const getImageUrl = (url) => {
        if (!url) return '/placeholder-phone.png';
        if (url.startsWith('http')) return url;

        // Ensure we don't double-slash or miss a slash
        // url usually comes as '/store/backend/uploads/...' or '/backend/uploads/...'

        // If in production (prhub.shop), the backend returns relative path which might be '/store/backend/...' 
        // but the SERVER_URL is 'https://prhub.shop'. 
        // If the path already has /store and we are on prod, we might need to strip it if SERVER_URL + /store is wrong.
        // However, standardizing: SERVER_URL should be base domain.

        // Simple heuristic: 
        // If url starts with '/', prepend SERVER_URL unless SERVER_URL is in the path?
        // Actually, let's just use the URL as returned if it starts with /store and we are on localhost context

        // Clean implementation:
        return `${SERVER_URL}${url}`;
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

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    {/* Header Section */}
                    <div className="listings-header">
                        <div className="page-header">
                            <h1 className="heading-1">Today's picks</h1>
                            <div className="location-indicator">
                                <span className="location-pin-icon">📍</span>
                                <span>Abuja • 65 km</span>
                            </div>
                        </div>

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
                                    className="product-item-wrapper"
                                    onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                                >
                                    <div className="product-card">
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
                                            {item.listing_type === 'auction' && (
                                                <span className="listing-badge">
                                                    Auction
                                                </span>
                                            )}
                                            <button
                                                className={`star-button ${interests.includes(item.id) ? 'active' : ''}`}
                                                onClick={(e) => toggleInterest(e, item.id)}
                                                aria-label="Star item"
                                            >
                                                <Star
                                                    size={22}
                                                    strokeWidth={2.5}
                                                    fill={interests.includes(item.id) ? "#1877F2" : "none"}
                                                    color={interests.includes(item.id) ? "#1877F2" : "#444444"}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="product-info">
                                        <p className="product-price">
                                            ₦{formatPrice(item.price)}
                                        </p>
                                        <h3 className="product-title">{item.title}</h3>
                                        <div className="product-location">
                                            {item.shop_address}
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


                    {/* Infinite Scroll Loading Indicator */}
                    {!loading && listings.length > 0 && (
                        <div
                            ref={observerTarget}
                            className="infinite-scroll-trigger"
                            style={{
                                height: '60px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '32px'
                            }}
                        >
                            {loadingMore && (
                                <div className="loading-more">
                                    <div className="spinner"></div>
                                    <p>Loading more...</p>
                                </div>
                            )}
                            {!hasMore && !loadingMore && (
                                <p style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '14px'
                                }}>
                                    No more listings to show
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MarketplaceListings;
