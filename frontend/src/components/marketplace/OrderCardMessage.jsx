import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../utils/api';
import './MessageCards.css';

/**
 * OrderCardMessage - Displays order details as an embedded card in chat
 * Used when orders are placed to show order confirmation in the conversation
 */
const OrderCardMessage = ({ metadata, isSent }) => {
    const navigate = useNavigate();

    const getImageUrl = (url) => {
        if (!url) return '/placeholder-phone.png';
        if (url.startsWith('http')) return url;
        return `${SERVER_URL}${url}`;
    };

    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG');
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: '#f59e0b',
            paid: '#3b82f6',
            shipped: '#8b5cf6',
            delivered: '#10b981',
            completed: '#22c55e',
            cancelled: '#ef4444',
            disputed: '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    const handleClick = () => {
        if (metadata?.order_id) {
            navigate(`/marketplace/order/${metadata.order_id}`);
        }
    };

    return (
        <div className={`message-card order-card ${isSent ? 'sent' : 'received'}`} onClick={handleClick}>
            <div className="order-card-header">
                <span className="order-card-label">Order Placed</span>
                <span
                    className="order-card-status"
                    style={{ backgroundColor: getStatusColor(metadata?.status) }}
                >
                    {metadata?.status || 'Pending'}
                </span>
            </div>
            <div className="message-card-body">
                <div className="message-card-image small">
                    <img
                        src={getImageUrl(metadata?.image_url)}
                        alt={metadata?.title || 'Product'}
                    />
                </div>
                <div className="message-card-content">
                    <h4 className="message-card-title">{metadata?.title || 'Order'}</h4>
                    <p className="message-card-price">₦{formatPrice(metadata?.price || 0)}</p>
                    {metadata?.order_number && (
                        <p className="order-card-reference">#{metadata.order_number}</p>
                    )}
                </div>
            </div>
            <div className="order-card-footer">
                <span className="order-card-action">View Order Details →</span>
            </div>
        </div>
    );
};

export default OrderCardMessage;
