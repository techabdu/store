import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Package, Clock, CheckCircle, XCircle, Truck, Eye } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplaceOrders.css';

const MarketplaceOrders = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
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

    // Mock data for demonstration (replace with API calls)
    useEffect(() => {
        // TODO: Fetch orders from API
        const mockOrders = [];
        setOrders(mockOrders);
        setLoading(false);
    }, []);

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

            <main className="main-content marketplace-orders-main">
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">My Orders</h1>
                        <p className="text-secondary">Track and manage your marketplace orders</p>
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
                            <div className="orders-empty-state">
                                <div className="empty-icon">
                                    <Package size={64} style={{ opacity: 0.3 }} />
                                </div>
                                <h3 className="heading-3">No orders found</h3>
                                <p className="text-secondary">
                                    {activeFilter === 'all'
                                        ? "You haven't placed any orders yet"
                                        : `No ${activeFilter} orders at the moment`}
                                </p>
                                <button
                                    onClick={() => navigate('/marketplace/listings')}
                                    className="btn-browse-products"
                                >
                                    Browse Products
                                </button>
                            </div>
                        ) : (
                            <div className="orders-list">
                                {filteredOrders.map((order) => (
                                    <div key={order.id} className="order-card">
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

                                        {/* Order Items */}
                                        <div className="order-items">
                                            {order.items && order.items.map((item, index) => (
                                                <div key={index} className="order-item">
                                                    <img
                                                        src={item.image || '/placeholder-phone.png'}
                                                        alt={item.name}
                                                        className="order-item-image"
                                                    />
                                                    <div className="order-item-info">
                                                        <h5 className="order-item-name">{item.name}</h5>
                                                        <p className="order-item-details">
                                                            Qty: {item.quantity} × ₦{formatPrice(item.price)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Order Footer */}
                                        <div className="order-footer">
                                            <div className="order-total">
                                                <span className="order-total-label">Total:</span>
                                                <span className="order-total-amount">₦{formatPrice(order.total)}</span>
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
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceOrders;
