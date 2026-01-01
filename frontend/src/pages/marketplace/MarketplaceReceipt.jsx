/**
 * MarketplaceReceipt Component
 * Displays a printable receipt for completed marketplace transactions
 * Accessible by both buyers and sellers with role-specific views
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import {
    ArrowLeft, Printer, Download, CheckCircle, Package,
    User, Store, MapPin, Phone, Mail, Calendar,
    Hash, Truck, Shield, Clock
} from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import './MarketplacePage.css';
import './MarketplaceReceipt.css';

const MarketplaceReceipt = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const receiptRef = useRef(null);

    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [canPrint, setCanPrint] = useState(false);
    const { showError } = useNotification();

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

    useEffect(() => {
        fetchReceipt();
    }, [id]);

    const fetchReceipt = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/marketplace/orders/receipt.php?id=${id}`);
            if (response.data.success) {
                setReceipt(response.data.receipt);
                setCanPrint(response.data.can_print);
            } else {
                setError(response.data.error || 'Failed to load receipt');
                showError(response.data.error || 'Failed to load receipt');
            }
        } catch (err) {
            console.error("Error fetching receipt:", err);
            const errMsg = err.response?.data?.error || 'An error occurred while loading receipt';
            setError(errMsg);
            showError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG');
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
                <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content marketplace-main">
                    <div className="content-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                        <div className="loading-spinner">
                            <p>Loading receipt...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !receipt) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
                <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content marketplace-main">
                    <div className="content-wrapper">
                        <div className="error-state glass-card" style={{ textAlign: 'center', padding: '60px 40px', maxWidth: '500px', margin: '40px auto' }}>
                            <Package size={64} style={{ color: 'var(--error)', opacity: 0.3, marginBottom: '20px' }} />
                            <h3 className="heading-3">Receipt Not Available</h3>
                            <p className="text-secondary">{error || 'Unable to load receipt'}</p>
                            <button onClick={() => navigate('/marketplace/orders')} className="btn-primary" style={{ marginTop: '20px' }}>
                                Back to Orders
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const isBuyer = receipt.user_role === 'buyer';

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    {/* Header Actions - Hidden when printing */}
                    <div className="receipt-actions no-print">
                        <button onClick={() => navigate(`/marketplace/order/${id}`)} className="btn-back">
                            <ArrowLeft size={18} />
                            <span>Back to Order</span>
                        </button>
                        <div className="receipt-action-btns">
                            <button onClick={handlePrint} className="btn-primary" disabled={!canPrint}>
                                <Printer size={18} />
                                Print Receipt
                            </button>
                        </div>
                    </div>

                    {/* Receipt Document */}
                    <div className="receipt-document glass-card" ref={receiptRef}>
                        {/* Receipt Header */}
                        <div className="receipt-header">
                            <div className="receipt-logo">
                                <Store size={32} />
                                <span>PRHub Marketplace</span>
                            </div>
                            <div className="receipt-title-section">
                                <h1 className="receipt-title">
                                    {isBuyer ? 'Purchase Receipt' : 'Sales Receipt'}
                                </h1>
                                <div className="receipt-badge">
                                    <CheckCircle size={16} />
                                    <span>{receipt.transaction.status.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Meta Info */}
                        <div className="receipt-meta">
                            <div className="meta-item">
                                <Hash size={16} />
                                <span className="meta-label">Receipt No:</span>
                                <span className="meta-value">{receipt.receipt_number}</span>
                            </div>
                            <div className="meta-item">
                                <Calendar size={16} />
                                <span className="meta-label">Date:</span>
                                <span className="meta-value">{formatDate(receipt.transaction.order_date)}</span>
                            </div>
                        </div>

                        {/* Parties Section */}
                        <div className="receipt-parties">
                            <div className="party-card">
                                <h3 className="party-title">
                                    <User size={18} />
                                    {isBuyer ? 'Buyer (You)' : 'Buyer'}
                                </h3>
                                <div className="party-details">
                                    <p className="party-name">{receipt.buyer.name}</p>
                                    {receipt.buyer.shop_name && (
                                        <p className="shop-name">
                                            <Store size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                                            {receipt.buyer.shop_name}
                                        </p>
                                    )}
                                    {receipt.buyer.shop_address && (
                                        <p className="party-address" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <MapPin size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                                            {receipt.buyer.shop_address}
                                        </p>
                                    )}
                                    {receipt.buyer.phone && (
                                        <p className="party-phone" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <Phone size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                                            {receipt.buyer.phone}
                                        </p>
                                    )}
                                    {receipt.buyer.is_verified && (
                                        <span className="verified-badge">
                                            <Shield size={12} />
                                            Verified
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="party-divider">
                                <Truck size={20} />
                            </div>
                            <div className="party-card">
                                <h3 className="party-title">
                                    <Store size={18} />
                                    {!isBuyer ? 'Seller (You)' : 'Seller'}
                                </h3>
                                <div className="party-details">
                                    <p className="party-name">{receipt.seller.name}</p>
                                    {receipt.seller.shop_name && (
                                        <p className="shop-name">
                                            <Store size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                                            {receipt.seller.shop_name}
                                        </p>
                                    )}
                                    {receipt.seller.shop_address && (
                                        <p className="party-address" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <MapPin size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                                            {receipt.seller.shop_address}
                                        </p>
                                    )}
                                    {receipt.seller.phone && (
                                        <p className="party-phone" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <Phone size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                                            {receipt.seller.phone}
                                        </p>
                                    )}
                                    {receipt.seller.is_verified && (
                                        <span className="verified-badge">
                                            <Shield size={12} />
                                            Verified
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Item Details */}
                        <div className="receipt-section">
                            <h3 className="section-heading">
                                <Package size={18} />
                                Item Details
                            </h3>
                            <div className="item-card">
                                <div className="item-info">
                                    <h4 className="item-title">{receipt.item.title}</h4>
                                    <div className="item-specs">
                                        {receipt.item.brand && (
                                            <span className="spec-tag">Brand: {receipt.item.brand}</span>
                                        )}
                                        {receipt.item.storage && (
                                            <span className="spec-tag">Storage: {receipt.item.storage}</span>
                                        )}
                                        {receipt.item.color && (
                                            <span className="spec-tag">Color: {receipt.item.color}</span>
                                        )}
                                        {receipt.item.condition && (
                                            <span className="spec-tag">Condition: {receipt.item.condition}</span>
                                        )}
                                    </div>
                                    {receipt.item.imei && (
                                        <p className="item-imei">IMEI: {receipt.item.imei}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="receipt-section">
                            <h3 className="section-heading">
                                <Hash size={18} />
                                Payment Summary
                            </h3>
                            <div className="financial-table">
                                <div className="financial-row">
                                    <span>Item Price</span>
                                    <span>₦{formatPrice(receipt.financial.subtotal)}</span>
                                </div>
                                {receipt.financial.shipping_fee > 0 && (
                                    <div className="financial-row">
                                        <span>Shipping Fee</span>
                                        <span>₦{formatPrice(receipt.financial.shipping_fee)}</span>
                                    </div>
                                )}
                                <div className="financial-row total">
                                    <span>Total {isBuyer ? 'Paid' : 'Received'}</span>
                                    <span className="total-amount">₦{formatPrice(receipt.financial.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Info (if available) */}
                        {receipt.delivery.address && (
                            <div className="receipt-section">
                                <h3 className="section-heading">
                                    <MapPin size={18} />
                                    Delivery Information
                                </h3>
                                <div className="delivery-info">
                                    <p><strong>Address:</strong> {receipt.delivery.address}</p>
                                    {receipt.delivery.method && (
                                        <p><strong>Method:</strong> {receipt.delivery.method}</p>
                                    )}
                                    {receipt.delivery.tracking_number && (
                                        <p><strong>Tracking:</strong> {receipt.delivery.tracking_number}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="receipt-section">
                            <h3 className="section-heading">
                                <Clock size={18} />
                                Transaction Timeline
                            </h3>
                            <div className="timeline">
                                <div className="timeline-item">
                                    <div className="timeline-dot completed"></div>
                                    <div className="timeline-content">
                                        <span className="timeline-label">Order Placed</span>
                                        <span className="timeline-date">{formatDate(receipt.transaction.order_date)}</span>
                                    </div>
                                </div>
                                {receipt.transaction.payment_date && (
                                    <div className="timeline-item">
                                        <div className="timeline-dot completed"></div>
                                        <div className="timeline-content">
                                            <span className="timeline-label">Payment Confirmed</span>
                                            <span className="timeline-date">{formatDate(receipt.transaction.payment_date)}</span>
                                        </div>
                                    </div>
                                )}
                                {receipt.transaction.shipped_date && (
                                    <div className="timeline-item">
                                        <div className="timeline-dot completed"></div>
                                        <div className="timeline-content">
                                            <span className="timeline-label">Item Shipped</span>
                                            <span className="timeline-date">{formatDate(receipt.transaction.shipped_date)}</span>
                                        </div>
                                    </div>
                                )}
                                {receipt.transaction.delivered_date && (
                                    <div className="timeline-item">
                                        <div className="timeline-dot completed"></div>
                                        <div className="timeline-content">
                                            <span className="timeline-label">Delivery Confirmed</span>
                                            <span className="timeline-date">{formatDate(receipt.transaction.delivered_date)}</span>
                                        </div>
                                    </div>
                                )}
                                {receipt.transaction.completed_date && (
                                    <div className="timeline-item">
                                        <div className="timeline-dot completed success"></div>
                                        <div className="timeline-content">
                                            <span className="timeline-label">Transaction Completed</span>
                                            <span className="timeline-date">{formatDate(receipt.transaction.completed_date)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="receipt-footer">
                            <p className="footer-note">
                                This is an official receipt for your marketplace transaction.
                                Please keep this for your records.
                            </p>
                            <p className="footer-support">
                                Questions? Contact our support team.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceReceipt;
