import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import './ConfirmDeliveryModal.css';

const ConfirmDeliveryModal = ({ isOpen, onClose, onConfirm, order, isLoading }) => {
    if (!isOpen || !order) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content delivery-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Order Completion Confirmation</h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="confirmation-alert">
                        <AlertCircle size={24} className="alert-icon" />
                        <p className="alert-text">
                            By confirming delivery, you acknowledge that you have received the goods in satisfactory condition.
                        </p>
                    </div>

                    <div className="financial-details">
                        <h3>Financial Transaction</h3>
                        <div className="transaction-item">
                            <span className="transaction-label">Order Amount:</span>
                            <span className="transaction-value">{formatCurrency(order.total_amount)}</span>
                        </div>
                        <div className="transaction-item">
                            <span className="transaction-label">Your Held Balance (Debit):</span>
                            <span className="transaction-value negative">-{formatCurrency(order.total_amount)}</span>
                        </div>
                        <div className="transaction-item">
                            <span className="transaction-label">Seller Available Balance (Credit):</span>
                            <span className="transaction-value positive">+{formatCurrency(order.total_amount)}</span>
                        </div>
                    </div>

                    <div className="important-notes">
                        <h3>Important Notes</h3>
                        <ul>
                            <li>✓ This action is <strong>irreversible</strong> and cannot be undone</li>
                            <li>✓ Funds will be <strong>immediately released</strong> to the seller</li>
                            <li>✓ The escrow protection will be cleared</li>
                            <li>✓ Your held balance will be debited: {formatCurrency(order.total_amount)}</li>
                            <li>⚠️ If you have any issues with the order, please click <strong>"Report Problem"</strong> instead</li>
                        </ul>
                    </div>

                    <div className="confirmation-question">
                        <p>Are you sure you want to proceed?</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-proceed"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Proceed'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeliveryModal;
