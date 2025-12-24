import React, { forwardRef } from 'react';
import '../pages/user/Receipt.css'; // Re-use standard receipt styles where possible

const DebtPaymentReceipt = forwardRef(({ paymentData, shopDetails, inline = false }, ref) => {
    if (!paymentData || !shopDetails) return null;

    const {
        customer_name,
        payment_date,
        amount_paid,
        previous_balance,
        new_balance,
        recorded_by,
        receipt_number // Generated or transaction ID reference
    } = paymentData;

    const content = (
        <>
            <div className="store-header">
                <h1>{shopDetails.shop_name || shopDetails.name}</h1>
                <div className="store-info">
                    <p>{shopDetails.shop_address || shopDetails.address}</p>
                    <p>Phone: {shopDetails.shop_phone || shopDetails.phone}</p>
                </div>
                <div className="receipt-divider"></div>
                <h3>PAYMENT RECEIPT</h3>
                <p className="receipt-date">{new Date(payment_date).toLocaleString()}</p>
                <p className="receipt-id">Ref: {receipt_number}</p>
            </div>

            <div className="receipt-details">
                <div className="customer-info">
                    <p><strong>Customer:</strong> {customer_name}</p>
                </div>
            </div>

            <div className="receipt-items">
                <table className="receipt-table">
                    <tbody>
                        <tr>
                            <td>Previous Balance</td>
                            <td className="text-right">₦{parseFloat(previous_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="receipt-total-row">
                            <td><strong>Amount Paid</strong></td>
                            <td className="text-right"><strong>₦{parseFloat(amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="receipt-summary">
                <div className="summary-row total">
                    <span>Remaining Balance</span>
                    <span>₦{parseFloat(new_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            <div className="receipt-footer">
                <p>Received by: {recorded_by}</p>
                <p>Thank you for your payment!</p>
            </div>
        </>
    );

    if (inline) return <div ref={ref}>{content}</div>;

    return (
        <div className="receipt-container" ref={ref}>
            <div className="receipt-paper">
                {content}
            </div>
        </div>
    );
});

export default DebtPaymentReceipt;
