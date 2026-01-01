/**
 * MyPurchases Component
 * Displays a dedicated history view of all phones purchased by the user
 * Includes detailed transaction info and quick access to receipts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import {
    ShoppingBag, Clock, CheckCircle, XCircle, Truck, Eye,
    Receipt, Package, Filter, Search, Calendar
} from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceHistory.css';

const MyPurchases = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showError } = useNotification();
    const [purchases, setPurchases] = useState([]);
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
        totalSpent: 0
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

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const response = await api.get('/marketplace/orders/list.php?role=buyer');
            if (response.data.success) {
                const orders = response.data.orders;
                setPurchases(orders);

                // Calculate stats
                const completed = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
                const pending = orders.filter(o => ['pending', 'paid', 'shipped'].includes(o.status)).length;
                const totalSpent = orders
                    .filter(o => o.status !== 'cancelled')
                    .reduce((sum, o) => sum + Number(o.total_amount), 0);

                setStats({
                    total: orders.length,
                    completed,
                    pending,
                    totalSpent
                });
            }
        } catch (error) {
            console.error("Error fetching purchases:", error);
            showError("Failed to fetch your purchases");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
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
    const filteredPurchases = purchases.filter(purchase => {
        // Status filter
        let statusMatch = true;
        if (activeFilter === 'completed') {
            statusMatch = ['completed', 'delivered'].includes(purchase.status);
        } else if (activeFilter === 'active') {
            statusMatch = ['pending', 'paid', 'shipped'].includes(purchase.status);
        } else if (activeFilter === 'cancelled') {
            statusMatch = purchase.status === 'cancelled';
        }

        // Search filter
        const searchMatch = searchQuery === '' ||
            purchase.listing_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            purchase.other_party_name?.toLowerCase().includes(searchQuery.toLowerCase());

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
                            <div className="header-icon buyer">
                                <ShoppingBag size={28} />
                            </div>
                            <div>
                                <h1 className="heading-1">My Purchases</h1>
                                <p className="text-secondary">View all the phones you've purchased on the marketplace</p>
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
                                <span className="stat-label">Total Orders</span>
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
                            <div className="stat-icon primary">
                                <Receipt size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">₦{formatPrice(stats.totalSpent)}</span>
                                <span className="stat-label">Total Spent</span>
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
                                placeholder="Search purchases..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Purchases List */}
                    <div className="history-container">
                        {loading ? (
                            <div className="history-loading">
                                <p className="text-secondary">Loading your purchases...</p>
                            </div>
                        ) : filteredPurchases.length === 0 ? (
                            <div className="glass-card empty-state">
                                <div className="empty-icon-wrapper">
                                    <ShoppingBag size={80} />
                                </div>
                                <h3 className="heading-3">No Purchases Found</h3>
                                <p className="text-secondary">
                                    {searchQuery
                                        ? "No purchases match your search criteria."
                                        : activeFilter === 'all'
                                            ? "You haven't made any purchases yet. Start shopping to see your purchases here!"
                                            : `You don't have any ${activeFilter} purchases.`
                                    }
                                </p>
                                <button
                                    onClick={() => navigate('/marketplace/listings')}
                                    className="btn-primary"
                                >
                                    Browse Marketplace
                                </button>
                            </div>
                        ) : (
                            <div className="history-list">
                                {filteredPurchases.slice(0, visibleRows).map((purchase) => (
                                    <div key={purchase.id} className="history-card glass-card">
                                        <div className="history-card-row">
                                            <div className="order-info">
                                                <span className="order-id">Order #{purchase.id}</span>
                                                <div className="order-meta">
                                                    <span className="order-date">
                                                        <Calendar size={14} />
                                                        {formatDate(purchase.created_at)}
                                                    </span>
                                                    <span className="party-name">• {purchase.other_party_shop_name || purchase.other_party_name || 'Marketplace Shop'}</span>
                                                </div>
                                            </div>

                                            <div className="order-status">
                                                {getStatusBadge(purchase.status)}
                                            </div>

                                            <div className="order-actions">
                                                <button
                                                    onClick={() => navigate(`/marketplace/order/${purchase.id}`)}
                                                    className="btn-secondary"
                                                >
                                                    <Eye size={16} />
                                                    View Details
                                                </button>
                                                {['completed', 'delivered'].includes(purchase.status) && (
                                                    <button
                                                        onClick={() => navigate(`/marketplace/receipt/${purchase.id}`)}
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

                        {!loading && visibleRows < filteredPurchases.length && (
                            <div className="load-more-container">
                                <button className="btn-load-more" onClick={loadMore}>
                                    Load More Purchases
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MyPurchases;
