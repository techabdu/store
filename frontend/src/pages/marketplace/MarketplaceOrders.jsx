import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Package, Clock, CheckCircle, XCircle, Truck, Eye } from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceOrders.css';

const MarketplaceOrders = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeRole, setActiveRole] = useState('buyer'); // 'buyer' or 'seller'
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

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/marketplace/orders/list.php?role=${activeRole}`);
            if (response.data.success) {
                setOrders(response.data.orders);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        setVisibleRows(prev => prev + 10);
    };

    useEffect(() => {
        fetchOrders();
    }, [activeRole]);

    const filterTabs = [
        { id: 'all', label: 'All Orders' },
        { id: 'pending', label: 'Pending' },
        { id: 'processing', label: 'Processing' },
        { id: 'shipped', label: 'Shipped' },
        { id: 'delivered', label: 'Delivered' },
        { id: 'cancelled', label: 'Cancelled' },
    ];

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { color: 'warning', icon: Clock, label: 'Pending' },
            processing: { color: 'info', icon: Package, label: 'Processing' },
            shipped: { color: 'primary', icon: Truck, label: 'Shipped' },
            delivered: { color: 'success', icon: CheckCircle, label: 'Delivered' },
            cancelled: { color: 'error', icon: XCircle, label: 'Cancelled' },
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

    const filteredOrders = activeFilter === 'all'
        ? orders
        : orders.filter(order => order.status === activeFilter);

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
                    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <div>
                            <h1 className="heading-1">My Orders</h1>
                            <p className="text-secondary">Track and manage your marketplace {activeRole === 'buyer' ? 'purchases' : 'sales'}</p>
                        </div>
                        <div className="orders-role-toggle" style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                            <button
                                onClick={() => setActiveRole('buyer')}
                                className={`role-toggle-btn ${activeRole === 'buyer' ? 'active' : ''}`}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    background: activeRole === 'buyer' ? 'var(--primary-color)' : 'transparent',
                                    color: activeRole === 'buyer' ? 'white' : 'var(--text-secondary)'
                                }}
                            >
                                Buying
                            </button>
                            <button
                                onClick={() => setActiveRole('seller')}
                                className={`role-toggle-btn ${activeRole === 'seller' ? 'active' : ''}`}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    background: activeRole === 'seller' ? 'var(--primary-color)' : 'transparent',
                                    color: activeRole === 'seller' ? 'white' : 'var(--text-secondary)'
                                }}
                            >
                                Selling
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="orders-filter-tabs">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id)}
                                className={`orders-filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Orders List */}
                    <div className="orders-container">
                        {loading ? (
                            <div className="orders-loading">
                                <p className="text-secondary">Loading orders...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '80px 40px', maxWidth: '600px', margin: '40px auto' }}>
                                <div className="empty-icon-wrapper" style={{ marginBottom: '24px' }}>
                                    <Package size={80} style={{ color: 'var(--primary-color)', opacity: 0.2 }} />
                                </div>
                                <h3 className="heading-3" style={{ marginBottom: '16px' }}>No Orders Found</h3>
                                <p className="text-secondary" style={{ marginBottom: '32px', fontSize: '1.1rem' }}>
                                    {activeFilter === 'all'
                                        ? (activeRole === 'buyer' ? "You haven't placed any orders yet. Start shopping to see your orders here!" : "You haven't sold any items yet. List your products to start selling!")
                                        : `You don't have any ${activeFilter} orders at the moment.`}
                                </p>
                                {activeRole === 'buyer' && (
                                    <button
                                        onClick={() => navigate('/marketplace/listings')}
                                        className="btn-primary"
                                        style={{ padding: '14px 40px' }}
                                    >
                                        Start Shopping
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="orders-list">
                                {filteredOrders.slice(0, visibleRows).map((order) => (
                                    <div key={order.id} className="order-card glass-card">
                                        {/* Order Header */}
                                        <div className="order-header">
                                            <div className="order-header-left">
                                                <h4 className="order-id">Order #{order.id}</h4>
                                                <span className="order-date">{formatDate(order.created_at)}</span>
                                            </div>
                                            <div className="order-header-right">
                                                {getStatusBadge(order.status)}
                                            </div>
                                        </div>

                                        {/* Order Item */}
                                        <div className="order-items">
                                            <div className="order-item">
                                                <img
                                                    src={order.listing_image ? (order.listing_image.startsWith('http') ? order.listing_image : `${SERVER_URL}${order.listing_image}`) : '/placeholder-phone.png'}
                                                    alt={order.listing_title}
                                                    className="order-item-image"
                                                />
                                                <div className="order-item-info">
                                                    <h5 className="order-item-name">{order.listing_title}</h5>
                                                    <p className="order-item-details">
                                                        {activeRole === 'buyer' ? 'Seller' : 'Buyer'}: {order.other_party_name || 'Marketplace User'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Footer */}
                                        <div className="order-footer">
                                            <div className="order-total">
                                                <span className="order-total-label">{activeRole === 'buyer' ? 'Amount Paid' : 'Amount Earned'}:</span>
                                                <span className="order-total-amount">₦{formatPrice(order.total_amount)}</span>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/marketplace/order/${order.id}`)}
                                                className="btn-view-order"
                                            >
                                                <Eye size={16} />
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && visibleRows < filteredOrders.length && (
                            <div className="load-more-container">
                                <button className="btn-load-more" onClick={loadMore}>
                                    Load More Orders
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceOrders;
