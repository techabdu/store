
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import api from '../../utils/api';
import { FaSearch, FaFilter } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';

const MarketplaceListings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        min_price: '',
        max_price: '',
        brand: ''
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Responsive Sidebar State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

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

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    <div className="flex justify-between items-center mb-6">
                        <div className="page-header mb-0">
                            <h1 className="heading-1">Listing Browser</h1>
                            <p className="text-secondary">Explore available items.</p>
                        </div>
                        <button
                            onClick={() => navigate('/marketplace/create-listing')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            + Sell Item
                        </button>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
                        <form onSubmit={applyFilters} className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaSearch className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="search"
                                        value={filters.search}
                                        onChange={handleFilterChange}
                                        placeholder="Search items..."
                                        className="pl-10 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="w-32">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Price</label>
                                <input
                                    type="number"
                                    name="min_price"
                                    value={filters.min_price}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div className="w-32">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Price</label>
                                <input
                                    type="number"
                                    name="max_price"
                                    value={filters.max_price}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700">
                                <FaFilter className="inline mr-2" /> Filter
                            </button>
                        </form>
                    </div>

                    {/* Listings Grid */}
                    {loading ? (
                        <div className="text-center py-10">Loading...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {listings.map(item => (
                                <div
                                    key={item.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition cursor-pointer"
                                    onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                                >
                                    <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                                        <img
                                            src={item.image_url || '/placeholder-phone.png'}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                        {item.listing_type === 'auction' && (
                                            <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                                                Auction
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-800 dark:text-white truncate">{item.title}</h3>
                                        <p className="text-lg font-bold text-blue-600 mt-1">
                                            ₦{Number(item.price).toLocaleString()}
                                        </p>
                                        <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                                            <span>{item.condition_state}</span>
                                            <span className="flex items-center text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                {item.shop_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {listings.length === 0 && !loading && (
                        <div className="text-center py-20 text-gray-500">
                            No listings found.
                        </div>
                    )}

                    {/* Pagination Controls */}
                    <div className="flex justify-center mt-8 space-x-4">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 text-gray-700 dark:text-gray-300">Page {page}</span>
                        <button
                            disabled={!hasMore}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceListings;
