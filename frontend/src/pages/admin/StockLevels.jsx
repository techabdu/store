import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';
import { FaSearch } from 'react-icons/fa';
import { Filter, Package } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import '../user/Inventory.css';

const StockLevels = () => {
    const { user } = useAuth();
    const [stockLevels, setStockLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError } = useNotification();

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('brand');
    const [sortOrder, setSortOrder] = useState('asc');
    const [brandFilter, setBrandFilter] = useState('all');

    // Lazy Loading State
    const [visibleCount, setVisibleCount] = useState(20);
    const observerTarget = useRef(null);

    // Fetch stock levels
    useEffect(() => {
        const fetchStockLevels = async () => {
            try {
                setLoading(true);
                const response = await api.get('/inventory/stock_levels.php');
                if (response.data.success) {
                    setStockLevels(response.data.stock_levels);
                } else {
                    showError(response.data.error || 'Failed to load stock levels');
                }
            } catch (err) {
                showError('Failed to load stock levels');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStockLevels();
    }, []);

    // Intersection Observer for Lazy Loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && stockLevels.length > visibleCount) {
                    setVisibleCount(prev => prev + 20);
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [stockLevels.length, visibleCount]);

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(20);
    }, [searchTerm, brandFilter, sortBy, sortOrder]);

    // Get unique brands
    const uniqueBrands = useMemo(() => {
        const brands = [...new Set(stockLevels.map(item => item.brand))];
        return brands.sort();
    }, [stockLevels]);

    // Filtered and sorted stock levels
    const filteredStockLevels = useMemo(() => {
        let filtered = [...stockLevels];

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.brand.toLowerCase().includes(lower) ||
                item.model.toLowerCase().includes(lower)
            );
        }

        if (brandFilter !== 'all') {
            filtered = filtered.filter(item => item.brand === brandFilter);
        }

        filtered.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'brand') comparison = a.brand.localeCompare(b.brand);
            else if (sortBy === 'model') comparison = a.model.localeCompare(b.model);
            else if (sortBy === 'quantity') comparison = parseInt(a.quantity) - parseInt(b.quantity);

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [stockLevels, searchTerm, brandFilter, sortBy, sortOrder]);

    // Slice for lazy loading
    const displayedStock = useMemo(() => {
        return filteredStockLevels.slice(0, visibleCount);
    }, [filteredStockLevels, visibleCount]);

    const handleSortChange = (e) => {
        const [newSortBy, newSortOrder] = e.target.value.split('-');
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
    };

    return (
        <AdminLayout
            title="Stock Levels"
            subtitle="Real-time overview of available inventory across all models"
            loading={loading}
            error={null}
        >
            <div className="inventory-page-container">
                {/* Search & Filter Bar */}
                <div className="search-filter-section mb-24">
                    <div className="search-input-wrapper">
                        <FaSearch size={18} className="search-icon-new" />
                        <input
                            type="text"
                            placeholder="Search by brand or model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input-new"
                        />
                    </div>

                    <div className="filter-group-new">
                        <select
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            className="filter-select-new"
                        >
                            <option value="all">All Brands</option>
                            {uniqueBrands.map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>

                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={handleSortChange}
                            className="filter-select-new"
                        >
                            <option value="brand-asc">Sort: Brand (A-Z)</option>
                            <option value="brand-desc">Sort: Brand (Z-A)</option>
                            <option value="model-asc">Sort: Model (A-Z)</option>
                            <option value="model-desc">Sort: Model (Z-A)</option>
                            <option value="quantity-desc">Sort: Qty (High to Low)</option>
                            <option value="quantity-asc">Sort: Qty (Low to High)</option>
                        </select>
                    </div>
                </div>

                {/* Table Section */}
                <div className="table-container glass-card">
                    <div className="table-responsive">
                        <table className="inventory-table glass-table">
                            <thead>
                                <tr>
                                    <th>Brand</th>
                                    <th>Model Name</th>
                                    <th>Stock Availability</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedStock.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="empty-row">
                                            <div className="empty-state">
                                                <Package size={48} />
                                                <p>No stock data matching your criteria</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedStock.map((item, index) => (
                                        <tr key={index}>
                                            <td><span className="brand-text">{item.brand}</span></td>
                                            <td><span className="model-text">{item.model}</span></td>
                                            <td>
                                                <div className="quantity-badge">
                                                    <span className="qty-number">{item.quantity}</span>
                                                    <span className="qty-label">units available</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Lazy Load Trigger */}
                        {filteredStockLevels.length > visibleCount && (
                            <div ref={observerTarget} className="lazy-load-trigger">
                                <span className="loading-dots">Loading more stock</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default StockLevels;
