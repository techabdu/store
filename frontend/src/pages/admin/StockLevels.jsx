import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { FaSearch } from 'react-icons/fa';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import '../user/Inventory.css'; // Reusing inventory styles for consistent table look

const StockLevels = () => {
    const { user } = useAuth();
    const [stockLevels, setStockLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('brand'); // 'brand', 'model', 'quantity'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
    const [brandFilter, setBrandFilter] = useState('all');

    // Responsive Sidebar Logic
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

    // Fetch stock levels
    useEffect(() => {
        const fetchStockLevels = async () => {
            try {
                setLoading(true);
                const response = await api.get('/inventory/stock_levels.php');
                if (response.data.success) {
                    setStockLevels(response.data.stock_levels);
                } else {
                    setError(response.data.error || 'Failed to load stock levels');
                }
            } catch (err) {
                setError('Failed to load stock levels');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStockLevels();
    }, []);

    // Get unique brands for filter dropdown
    const uniqueBrands = useMemo(() => {
        const brands = [...new Set(stockLevels.map(item => item.brand))];
        return brands.sort();
    }, [stockLevels]);

    // Filtered and sorted stock levels
    const filteredStockLevels = useMemo(() => {
        let filtered = [...stockLevels];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.model.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply brand filter
        if (brandFilter !== 'all') {
            filtered = filtered.filter(item => item.brand === brandFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            if (sortBy === 'brand') {
                comparison = a.brand.localeCompare(b.brand);
            } else if (sortBy === 'model') {
                comparison = a.model.localeCompare(b.model);
            } else if (sortBy === 'quantity') {
                comparison = parseInt(a.quantity) - parseInt(b.quantity);
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [stockLevels, searchTerm, brandFilter, sortBy, sortOrder]);

    // Handle sort change
    const handleSortChange = (e) => {
        const value = e.target.value;
        const [newSortBy, newSortOrder] = value.split('-');
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
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
                    <div className="inventory-container">
                        <div className="inventory-header">
                            <div className="header-content">
                                <h1>Stock Levels</h1>
                                <p className="text-secondary">
                                    Overview of available stock by model
                                    {filteredStockLevels.length !== stockLevels.length &&
                                        ` (${filteredStockLevels.length} of ${stockLevels.length})`
                                    }
                                </p>
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        {/* Search and Filter Controls */}
                        <div className="search-bar-container">
                            <div className="search-input-wrapper">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by brand or model..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="status-filter"
                            >
                                <option value="all">All Brands</option>
                                {uniqueBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>

                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={handleSortChange}
                                className="status-filter"
                            >
                                <option value="brand-asc">Brand (A-Z)</option>
                                <option value="brand-desc">Brand (Z-A)</option>
                                <option value="model-asc">Model (A-Z)</option>
                                <option value="model-desc">Model (Z-A)</option>
                                <option value="quantity-desc">Quantity (High to Low)</option>
                                <option value="quantity-asc">Quantity (Low to High)</option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="loading">Loading stock levels...</div>
                        ) : (
                            <div className="inventory-table-container">
                                <table className="inventory-table">
                                    <thead>
                                        <tr>
                                            <th>Brand</th>
                                            <th>Model</th>
                                            <th>Available Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStockLevels.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="no-data">
                                                    {searchTerm || brandFilter !== 'all'
                                                        ? 'No stock matches your filters'
                                                        : 'No stock data available'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStockLevels.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.brand}</td>
                                                    <td>{item.model}</td>
                                                    <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                                                        {item.quantity} available
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StockLevels;
