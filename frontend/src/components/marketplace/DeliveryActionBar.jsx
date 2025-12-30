import React, { useState } from 'react';
import { Package, CheckCircle, AlertTriangle } from 'lucide-react';
import './DeliveryActionBar.css';

const DeliveryActionBar = ({
    order,
    currentUserId,
    onShipped,
    onReceived,
    onReportIssue
}) => {
    const [isLoading, setIsLoading] = useState(false);

    // Don't show if no order exists
    if (!order) {
        return null;
    }

    // Normalize statuses for robust comparison
    const orderStatus = String(order.status || '').trim().toLowerCase();
    const deliveryStatus = String(order.delivery_status || '').trim().toLowerCase();

    // Show buttons for pending (paid/escrowed), paid, processing, shipped, delivered or completed orders
    // Don't show for cancelled orders
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed'];
    if (!validStatuses.includes(orderStatus)) {
        return null;
    }

    // Don't show if delivery is already confirmed
    if (deliveryStatus === 'received') {
        return null;
    }

    const isSeller = String(order.seller_id) === String(currentUserId);
    const isBuyer = String(order.buyer_id) === String(currentUserId);

    const handleMarkShipped = async () => {
        setIsLoading(true);
        try {
            await onShipped();
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDelivery = async () => {
        setIsLoading(true);
        try {
            await onReceived();
        } finally {
            setIsLoading(false);
        }
    };

    const handleReportIssue = () => {
        onReportIssue();
    };

    return (
        <div className="delivery-action-bar">
            <div className="delivery-action-buttons">
                {/* Seller: Show "Deliver" button when delivery is pending */}
                {isSeller && deliveryStatus === 'pending' && (
                    <>
                        <button
                            className="delivery-btn deliver-btn"
                            onClick={handleMarkShipped}
                            disabled={isLoading}
                        >
                            <Package size={18} />
                            <span>{isLoading ? 'Processing...' : 'Mark as Delivered'}</span>
                        </button>
                        <button
                            className="delivery-btn report-btn"
                            onClick={handleReportIssue}
                            disabled={isLoading}
                        >
                            <AlertTriangle size={18} />
                            <span>Report Problem</span>
                        </button>
                    </>
                )}

                {/* Buyer: Show "Received" button when delivery is shipped */}
                {isBuyer && deliveryStatus === 'shipped' && (
                    <>
                        <button
                            className="delivery-btn received-btn"
                            onClick={handleConfirmDelivery}
                            disabled={isLoading}
                        >
                            <CheckCircle size={18} />
                            <span>{isLoading ? 'Processing...' : 'Confirm Received'}</span>
                        </button>
                        <button
                            className="delivery-btn report-btn"
                            onClick={handleReportIssue}
                            disabled={isLoading}
                        >
                            <AlertTriangle size={18} />
                            <span>Report Problem</span>
                        </button>
                    </>
                )}

                {/* Both parties can report problems during pending/shipped states */}
                {((isSeller && deliveryStatus === 'shipped') ||
                    (isBuyer && deliveryStatus === 'pending')) && (
                        <button
                            className="delivery-btn report-btn"
                            onClick={handleReportIssue}
                            disabled={isLoading}
                        >
                            <AlertTriangle size={18} />
                            <span>Report Problem</span>
                        </button>
                    )}
            </div>
        </div>
    );
};

export default DeliveryActionBar;
