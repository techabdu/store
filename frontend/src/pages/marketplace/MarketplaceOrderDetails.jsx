import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, Info, AlertTriangle } from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './MarketplacePage.css';
import './MarketplaceOrderDetails.css';

const MarketplaceOrderDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/marketplace/orders/get.php?id=${id}`);
            if (response.data.success) {
                setOrder(response.data.order);
            } else {
                setError(response.data.error || 'Failed to fetch order details');
            }
        } catch (err) {
            console.error("Error fetching order:", err);
            setError(err.response?.data?.error || 'An error occurred while fetching order details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const handleCancelOrder = async () => {
        if (!cancelReason.trim()) {
            alert("Please provide a reason for cancellation");
            return;
        }

        try {
            setCancelling(true);
            const response = await api.post('/marketplace/orders/cancel.php', {
                order_id: id,
                reason: cancelReason
            });

            if (response.data.success) {
                setShowCancelModal(false);
                fetchOrderDetails(); // Refresh data
                alert("Order cancelled successfully. The listing is now back on the marketplace.");
            } else {
                alert(response.data.error || "Failed to cancel order");
            }
        } catch (err) {
            console.error("Error cancelling order:", err);
            alert(err.response?.data?.error || "An error occurred");
        } finally {
            setCancelling(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock size={20} className="text-warning" />;
            case 'processing': return <Package size={20} className="text-info" />;
            case 'shipped': return <Truck size={20} className="text-primary" />;
            case 'delivered': return <CheckCircle size={20} className="text-success" />;
            case 'cancelled': return <XCircle size={20} className="text-error" />;
            default: return <Info size={20} />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
                <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content marketplace-page-main">
                    <div className="content-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                        <p>Loading order details...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
                <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content marketplace-page-main">
                    <div className="content-wrapper">
                        <div className="alert-error" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                            <AlertTriangle size={48} style={{ marginBottom: '10px' }} />
                            <h3 className="heading-3">Error</h3>
                            <p>{error || "Order not found"}</p>
                            <button onClick={() => navigate('/marketplace/orders')} className="btn-primary" style={{ marginTop: '20px' }}>
                                Back to Orders
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const isBuyer = order.buyer_id == user?.id;
    const canCancel = ['pending', 'processing'].includes(order.order_status);

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />

            <main className="main-content marketplace-page-main">
                <div className="content-wrapper">
                    <button onClick={() => navigate('/marketplace/orders')} className="back-btn">
                        <ArrowLeft size={16} />
                        Back to Orders
                    </button>

                    <div className="order-details-header">
                        <div className="order-header-main">
                            <div className="order-title-group">
                                <h1 className="heading-1">Order #{order.id}</h1>
                                <div className="order-status-badge">
                                    <span className={`status-badge status-${order.order_status === 'cancelled' ? 'error' : 'primary'}`}>
                                        {getStatusIcon(order.order_status)}
                                        <span className="status-text">{order.order_status.toUpperCase()}</span>
                                    </span>
                                </div>
                            </div>
                            <p className="text-secondary">Placed on {formatDate(order.created_at)}</p>
                        </div>
                    </div>

                    <div className="order-info-grid">
                        <div className="order-main-info">
                            {/* Order Details */}
                            <div className="order-card-detail">
                                <h3>Order Items</h3>
                                <div className="order-item-display">
                                    <img
                                        src={order.listing_image ? (order.listing_image.startsWith('http') ? order.listing_image : `${SERVER_URL}${order.listing_image}`) : '/placeholder-phone.png'}
                                        alt={order.listing_title}
                                        className="order-item-img"
                                    />
                                    <div className="order-item-txt">
                                        <h4>{order.listing_title}</h4>
                                        <p>{order.listing_type} Listing • {order.phone_condition} • {order.phone_storage}</p>
                                        <p className="text-primary" style={{ fontWeight: '600', marginTop: '5px' }}>₦{Number(order.agreed_price).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Details */}
                            <div className="order-card-detail">
                                <h3>Transaction Information</h3>
                                <div className="detail-row">
                                    <span className="detail-label">Reference Number</span>
                                    <span className="detail-value">{order.order_number}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Payment Method</span>
                                    <span className="detail-value">{order.payment_method?.toUpperCase()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Agreed Price</span>
                                    <span className="detail-value">₦{Number(order.agreed_price).toLocaleString()}</span>
                                </div>
                                {order.commission_amount > 0 && (
                                    <div className="detail-row">
                                        <span className="detail-label">Platform Fee</span>
                                        <span className="detail-value">₦{Number(order.commission_amount).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Party Information */}
                            <div className="order-card-detail">
                                <h3>{isBuyer ? 'Seller' : 'Buyer'} Information</h3>
                                <div className="detail-row">
                                    <span className="detail-label">Name</span>
                                    <span className="detail-value">{isBuyer ? order.seller_name : order.buyer_name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="order-side-info">
                            {/* Actions */}
                            <div className="order-card-detail">
                                <h3>Actions</h3>
                                <div className="order-actions">
                                    {canCancel && (
                                        <button onClick={() => setShowCancelModal(true)} className="btn-action btn-cancel">
                                            <XCircle size={18} />
                                            Cancel Order
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate(`/marketplace/messages?listing_id=${order.listing_id}${!isBuyer ? `&buyer_id=${order.buyer_id}` : ''}`)}
                                        className="btn-action btn-secondary"
                                    >
                                        Message {isBuyer ? 'Seller' : 'Buyer'}
                                    </button>
                                </div>
                            </div>

                            {/* Status Timeline */}
                            <div className="order-card-detail">
                                <h3>Order Status</h3>
                                <div className="order-status-timeline">
                                    <div className={`timeline-item ${order.created_at ? 'active' : ''}`}>
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-content">
                                            <h5>Order Placed</h5>
                                            <p>{formatDate(order.created_at)}</p>
                                        </div>
                                    </div>
                                    {order.paid_at && (
                                        <div className="timeline-item active">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <h5>Payment Verified</h5>
                                                <p>{formatDate(order.paid_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {order.shipped_at && (
                                        <div className="timeline-item active">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <h5>Order Shipped</h5>
                                                <p>{formatDate(order.shipped_at)}</p>
                                                {order.tracking_number && <p className="text-primary">Tracking: {order.tracking_number}</p>}
                                            </div>
                                        </div>
                                    )}
                                    {order.delivered_at && (
                                        <div className="timeline-item active">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <h5>Order Delivered</h5>
                                                <p>{formatDate(order.delivered_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {order.order_status === 'cancelled' && (
                                        <div className="timeline-item active">
                                            <div className="timeline-dot" style={{ backgroundColor: '#ef4444' }}></div>
                                            <div className="timeline-content">
                                                <h5 style={{ color: '#ef4444' }}>Order Cancelled</h5>
                                                <p>{formatDate(order.cancelled_at)}</p>
                                                {order.cancellation_reason && <p className="text-secondary italic">"{order.cancellation_reason}"</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="heading-3">Cancel Order</h3>
                        <p className="text-secondary" style={{ marginBottom: '15px' }}>Please provide a reason for cancelling this order. This action cannot be undone.</p>
                        <textarea
                            className="reason-textarea"
                            placeholder="Reason for cancellation..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        ></textarea>
                        <div className="modal-actions">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="btn-action btn-secondary"
                                disabled={cancelling}
                            >
                                Close
                            </button>
                            <button
                                onClick={handleCancelOrder}
                                className="btn-action btn-danger"
                                disabled={cancelling}
                            >
                                {cancelling ? 'Processing...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketplaceOrderDetails;
