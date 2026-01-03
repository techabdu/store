import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, Info, AlertTriangle, Receipt, ShieldAlert } from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import ReportWizard from '../../components/Marketplace/ReportWizard';
import './MarketplacePage.css';
import '../../styles/wizard.css';
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
    const [isReportWizardOpen, setIsReportWizardOpen] = useState(false);
    const { showError, showSuccess } = useNotification();

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
                showError(response.data.error || 'Failed to fetch order details');
            }
        } catch (err) {
            console.error("Error fetching order:", err);
            const errMsg = err.response?.data?.error || 'An error occurred while fetching order details';
            setError(errMsg);
            showError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const handleCancelOrder = async () => {
        if (!cancelReason.trim()) {
            showError("Please provide a reason for cancellation");
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
                showSuccess("Order cancelled successfully. The listing is now back on the marketplace.");
            } else {
                showError(response.data.error || "Failed to cancel order");
            }
        } catch (err) {
            console.error("Error cancelling order:", err);
            showError(err.response?.data?.error || "An error occurred");
        } finally {
            setCancelling(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock size={20} className="text-warning" />;
            case 'paid': return <Package size={20} className="text-info" />;
            case 'shipped': return <Truck size={20} className="text-primary" />;
            case 'delivered': return <CheckCircle size={20} className="text-success" />;
            case 'completed': return <CheckCircle size={20} className="text-success" />;
            case 'cancelled': return <XCircle size={20} className="text-error" />;
            case 'disputed': return <AlertTriangle size={20} className="text-error" />;
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
                <main className="main-content marketplace-main">
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
                <main className="main-content marketplace-main">
                    <div className="content-wrapper">
                        <div className="alert-error" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                            <AlertTriangle size={48} style={{ marginBottom: '10px' }} />
                            <h3 className="heading-3">Error</h3>
                            <p>{error || "Order not found"}</p>
                            <button className="btn-back" onClick={() => navigate('/marketplace/orders')} style={{ marginTop: '20px' }}>
                                Back to Orders
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const isBuyer = order.buyer_id == user?.id;
    const canCancel = ['pending', 'paid'].includes(order.order_status);

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    <div className="focus-view-container">
                        <div className="focus-view-header">
                            <button onClick={() => navigate('/marketplace/orders')} className="btn-back">
                                <ArrowLeft size={18} />
                                <span>Back to Orders</span>
                            </button>
                            <h2>Order Details</h2>
                        </div>

                        <div className="focus-view-content">
                            <div className="focus-view-card glass-card animate-slide-in">
                                <div className="focus-view-body">
                                    {/* Wizard Progress - Handle cancelled orders differently */}
                                    {order.order_status === 'cancelled' ? (
                                        <div className="cancelled-order-banner">
                                            <XCircle size={24} />
                                            <div>
                                                <strong>Order Cancelled</strong>
                                                <p>{order.cancellation_reason || 'This order has been cancelled.'}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="wizard-steps">
                                            <div className={`step completed`}>
                                                <div className="step-number"><CheckCircle size={14} /></div>
                                                <div className="step-label">Ordered</div>
                                            </div>
                                            <div className={`step ${order.order_status !== 'pending' ? 'completed' : 'active'}`}>
                                                <div className="step-number">
                                                    {order.order_status !== 'pending' ? <CheckCircle size={14} /> : '2'}
                                                </div>
                                                <div className="step-label">Paid</div>
                                            </div>
                                            <div className={`step ${['shipped', 'delivered', 'completed'].includes(order.order_status) || order.delivery_status === 'shipped' || order.delivery_status === 'received' ? 'completed' : (order.order_status === 'paid' ? 'active' : '')}`}>
                                                <div className="step-number">
                                                    {['shipped', 'delivered', 'completed'].includes(order.order_status) || order.delivery_status === 'shipped' || order.delivery_status === 'received' ? <CheckCircle size={14} /> : '3'}
                                                </div>
                                                <div className="step-label">Shipped</div>
                                            </div>
                                            <div className={`step ${['delivered', 'completed'].includes(order.order_status) || order.delivery_status === 'received' ? 'completed' : (['shipped'].includes(order.order_status) || order.delivery_status === 'shipped' ? 'active' : '')}`}>
                                                <div className="step-number">
                                                    {['delivered', 'completed'].includes(order.order_status) || order.delivery_status === 'received' ? <CheckCircle size={14} /> : '4'}
                                                </div>
                                                <div className="step-label">Completed</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="order-info-grid">
                                        <div className="order-main-info">
                                            {/* Order Item Card */}
                                            <div className="order-detail-section">
                                                <h3 className="section-title">Order Item</h3>
                                                <div className="order-item-display">
                                                    <div className="order-item-img-wrapper">
                                                        <img
                                                            src={order.listing_image ? (order.listing_image.startsWith('http') ? order.listing_image : `${SERVER_URL}${order.listing_image}`) : '/placeholder-phone.png'}
                                                            alt={order.listing_title}
                                                        />
                                                    </div>
                                                    <div className="order-item-txt">
                                                        <h4>{order.listing_title}</h4>
                                                        <p className="subtitle">{order.listing_type} Listing • {order.phone_condition}</p>
                                                        <div className="price-tag">
                                                            ₦{Number(order.agreed_price).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Transaction Info Card */}
                                            <div className="order-detail-section">
                                                <h3 className="section-title">Transaction Details</h3>
                                                <div className="details-list">
                                                    <div className="detail-row">
                                                        <span className="detail-label">Reference Number</span>
                                                        <span className="detail-value">{order.order_number}</span>
                                                    </div>
                                                    <div className="detail-row">
                                                        <span className="detail-label">Payment Method</span>
                                                        <span className="detail-value text-uppercase">{order.payment_method}</span>
                                                    </div>
                                                    <div className="detail-row">
                                                        <span className="detail-label">Date Placed</span>
                                                        <span className="detail-value">{formatDate(order.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="order-side-info">
                                            {/* Status Card */}
                                            <div className="order-detail-section">
                                                <h3 className="section-title">Order Status</h3>
                                                <div className="status-display">
                                                    <span className={`status-badge status-${['cancelled', 'disputed'].includes(order.order_status) ? 'error' : (['completed', 'delivered'].includes(order.order_status) ? 'success' : 'primary')}`}>
                                                        {getStatusIcon(order.order_status)}
                                                        {order.order_status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="status-note">
                                                    {order.order_status === 'pending' && "Awaiting payment verification to proceed."}
                                                    {order.order_status === 'paid' && "Payment received. Seller is preparing your item for shipment."}
                                                    {order.order_status === 'shipped' && "Your item is on its way!"}
                                                    {order.order_status === 'delivered' && "Item received and confirmed."}
                                                    {order.order_status === 'completed' && "Transaction completed successfully!"}
                                                    {order.order_status === 'cancelled' && `Order cancelled: ${order.cancellation_reason || 'No reason provided'}.`}
                                                    {order.order_status === 'disputed' && "This order is under review by our support team."}
                                                </p>
                                            </div>

                                            {/* Action Card */}
                                            <div className="order-detail-section">
                                                <h3 className="section-title">Actions</h3>
                                                <div className="actions-list">
                                                    <button
                                                        onClick={() => navigate(`/marketplace/messages?listing_id=${order.listing_id}${!isBuyer ? `&buyer_id=${order.buyer_id}` : ''}`)}
                                                        className="btn-secondary full-width"
                                                    >
                                                        Message {isBuyer ? 'Seller' : 'Buyer'}
                                                    </button>
                                                    {canCancel && (
                                                        <button
                                                            onClick={() => setShowCancelModal(true)}
                                                            className="btn-outline-danger full-width"
                                                        >
                                                            Cancel Order
                                                        </button>
                                                    )}
                                                    {['completed', 'delivered'].includes(order.order_status) && (
                                                        <button
                                                            onClick={() => navigate(`/marketplace/receipt/${id}`)}
                                                            className="btn-primary full-width"
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                        >
                                                            <Receipt size={16} />
                                                            View Receipt
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setIsReportWizardOpen(true)}
                                                        className="btn-outline-secondary full-width"
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                                                    >
                                                        <ShieldAlert size={16} />
                                                        Dispute / Report
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="focus-view-footer">
                                    <button onClick={() => navigate('/marketplace/orders')} className="btn-secondary">
                                        Back to All Orders
                                    </button>
                                    {isBuyer && order.order_status === 'shipped' && (
                                        <button className="btn-primary">
                                            Confirm Receipt
                                        </button>
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

            <ReportWizard
                isOpen={isReportWizardOpen}
                onClose={() => setIsReportWizardOpen(false)}
                initialType="dispute"
                contextData={{
                    orderId: order.id,
                    orderNumber: order.order_number,
                    listingId: order.listing_id,
                    subject: `Dispute for Order: ${order.order_number}`
                }}
            />
        </div>
    );
};

export default MarketplaceOrderDetails;
