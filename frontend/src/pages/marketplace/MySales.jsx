/**
 * MySales Component
 * Displays a dedicated history view of all phones sold by the user
 * Includes detailed transaction info and quick access to receipts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import {
    DollarSign, Clock, CheckCircle, XCircle, Truck, Eye,
    Receipt, Package, Filter, Search, Calendar, TrendingUp
} from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceHistory.css';

const MySales = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [visibleRows, setVisibleRows] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        totalEarned: 0
    });

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(false);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const response = await api.get('/marketplace/orders/list.php?role=seller');
            if (response.data.success) {
                const orders = response.data.orders;
                setSales(orders);

                // Calculate stats
                const completed = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
                const pending = orders.filter(o => ['pending', 'paid', 'shipped'].includes(o.status)).length;
                const totalEarned = orders
                    .filter(o => ['completed', 'delivered'].includes(o.status))
                    .reduce((sum, o) => sum + Number(o.total_amount), 0);

                setStats({
                    total: orders.length,
                    completed,
                    pending,
                    totalEarned
                });
            }
        } catch (error) {
            console.error("Error fetching sales:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const loadMore = () => {
        setVisibleRows(prev => prev + 10);
    };

    const filterTabs = [
        { id: 'all', label: 'All', icon: Package },
        { id: 'completed', label: 'Completed', icon: CheckCircle },
        { id: 'active', label: 'Active', icon: Truck },
        { id: 'cancelled', label: 'Cancelled', icon: XCircle },
    ];

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { color: 'warning', icon: Clock, label: 'Pending' },
            paid: { color: 'info', icon: Package, label: 'Paid' },
            shipped: { color: 'primary', icon: Truck, label: 'Shipped' },
            delivered: { color: 'success', icon: CheckCircle, label: 'Delivered' },
            completed: { color: 'success', icon: CheckCircle, label: 'Completed' },
            cancelled: { color: 'error', icon: XCircle, label: 'Cancelled' },
            disputed: { color: 'error', icon: XCircle, label: 'Disputed' },
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`status-badge status-${config.color}`}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG');
    };

    // Filter logic
    const filteredSales = sales.filter(sale => {
        // Status filter
        let statusMatch = true;
        if (activeFilter === 'completed') {
            statusMatch = ['completed', 'delivered'].includes(sale.status);
        } else if (activeFilter === 'active') {
            statusMatch = ['pending', 'paid', 'shipped'].includes(sale.status);
        } else if (activeFilter === 'cancelled') {
            statusMatch = sale.status === 'cancelled';
        }

        // Search filter
        const searchMatch = searchQuery === '' ||
            sale.listing_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sale.other_party_name?.toLowerCase().includes(searchQuery.toLowerCase());

        return statusMatch && searchMatch;
    });

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
                    <div className="history-page-header">
                        <div className="header-content">
                            <div className="header-icon seller">
                                <DollarSign size={28} />
                            </div>
                            <div>
                                <h1 className="heading-1">My Sales</h1>
                                <p className="text-secondary">View all the phones you've sold on the marketplace</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="history-stats">
                        <div className="stat-card glass-card">
                            <div className="stat-icon total">
                                <Package size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.total}</span>
                                <span className="stat-label">Total Sales</span>
                            </div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon success">
                                <CheckCircle size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.completed}</span>
                                <span className="stat-label">Completed</span>
                            </div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon warning">
                                <Truck size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.pending}</span>
                                <span className="stat-label">In Progress</span>
                            </div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon success-alt">
                                <TrendingUp size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">₦{formatPrice(stats.totalEarned)}</span>
                                <span className="stat-label">Total Earned</span>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <div className="history-toolbar">
                        <div className="filter-tabs">
                            {filterTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveFilter(tab.id)}
                                        className={`filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
                                    >
                                        <Icon size={16} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search sales..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Sales List */}
                    <div className="history-container">
                        {loading ? (
                            <div className="history-loading">
                                <p className="text-secondary">Loading your sales...</p>
                            </div>
                        ) : filteredSales.length === 0 ? (
                            <div className="glass-card empty-state">
                                <div className="empty-icon-wrapper">
                                    <DollarSign size={80} />
                                </div>
                                <h3 className="heading-3">No Sales Found</h3>
                                <p className="text-secondary">
                                    {searchQuery
                                        ? "No sales match your search criteria."
                                        : activeFilter === 'all'
                                            ? "You haven't made any sales yet. List your products to start selling!"
                                            : `You don't have any ${activeFilter} sales.`
                                    }
                                </p>
                                <button
                                    onClick={() => navigate('/marketplace/create')}
                                    className="btn-primary"
                                >
                                    Create Listing
                                </button>
                            </div>
                        ) : (
                            <div className="history-list">
                                {filteredSales.slice(0, visibleRows).map((sale) => (
                                    <div key={sale.id} className="history-card glass-card seller-card">
                                        <div className="history-card-row">
                                            <div className="order-info">
                                                <span className="order-id">Order #{sale.id}</span>
                                                <div className="order-meta">
                                                    <span className="order-date">
                                                        <Calendar size={14} />
                                                        {formatDate(sale.created_at)}
                                                    </span>
                                                    <span className="party-name">• {sale.other_party_shop_name || sale.other_party_name || 'Marketplace Shop'}</span>
                                                </div>
                                            </div>

                                            <div className="order-status">
                                                {getStatusBadge(sale.status)}
                                            </div>

                                            <div className="order-actions">
                                                <button
                                                    onClick={() => navigate(`/marketplace/order/${sale.id}`)}
                                                    className="btn-secondary"
                                                >
                                                    <Eye size={16} />
                                                    View Details
                                                </button>
                                                {['completed', 'delivered'].includes(sale.status) && (
                                                    <button
                                                        onClick={() => navigate(`/marketplace/receipt/${sale.id}`)}
                                                        className="btn-primary"
                                                    >
                                                        <Receipt size={16} />
                                                        View Receipt
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && visibleRows < filteredSales.length && (
                            <div className="load-more-container">
                                <button className="btn-load-more" onClick={loadMore}>
                                    Load More Sales
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MySales;
