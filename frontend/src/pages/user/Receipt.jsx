import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import DebtPaymentReceipt from '../../components/DebtPaymentReceipt';
import './Receipt.css';

const Receipt = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [transaction, setTransaction] = useState(null);
    const [shopSettings, setShopSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Fetch shop settings
    useEffect(() => {
        const fetchShopSettings = async () => {
            try {
                const response = await api.get('/shop_settings.php');
                if (response.data.success) {
                    setShopSettings(response.data.settings);
                }
            } catch (err) {
                console.error('Failed to load shop settings:', err);
            }
        };

        fetchShopSettings();
    }, []);

    useEffect(() => {
        const fetchTransaction = async () => {
            try {
                const response = await api.get(`/transactions/read.php?id=${id}`);
                if (response.data.success) {
                    setTransaction(response.data.transaction);
                } else {
                    setError('Transaction not found');
                }
            } catch (err) {
                setError('Failed to load transaction details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTransaction();
        }
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="loading">Loading receipt...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!transaction) return <div className="error-message">Transaction not found</div>;

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    <div className="receipt-container">
                        <div className="receipt-actions">
                            <button className="btn-secondary" onClick={() => navigate('/sales-history')}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={handlePrint}>
                                Print Receipt
                            </button>
                        </div>

                        <div className="receipt-paper">
                            {transaction.transaction_type === 'debt_payment' && transaction.installment_info ? (
                                <DebtPaymentReceipt
                                    inline={true}
                                    paymentData={{
                                        customer_name: transaction.customer_name,
                                        payment_date: transaction.created_at,
                                        recorded_by: transaction.processed_by,
                                        ...transaction.installment_info
                                    }}
                                    shopDetails={shopSettings}
                                />
                            ) : (
                                <>
                                    <div className="store-header">
                                        <h1>{shopSettings?.shop_name || 'Phone Retailer Store'}</h1>
                                        <div className="store-info">
                                            <p>{shopSettings?.shop_address || '123 Tech Street, Digital City'}</p>
                                            <p>Phone: {shopSettings?.shop_phone || '+234 800 123 4567'}</p>
                                            <p>Email: {shopSettings?.shop_email || 'support@store.com'}</p>
                                        </div>
                                    </div>

                                    <div className="receipt-details">
                                        <div className="detail-group">
                                            <h3>Transaction Info</h3>
                                            <p>Receipt #: {String(transaction.id).padStart(6, '0')}</p>
                                            <p>Date: {new Date(transaction.created_at).toLocaleString()}</p>
                                            <p>Cashier: {transaction.processed_by}</p>
                                        </div>
                                        <div className="detail-group" style={{ textAlign: 'right' }}>
                                            <h3>Customer Info</h3>
                                            <p>{transaction.customer_name}</p>
                                            <p>{transaction.customer_phone || 'N/A'}</p>
                                            <p>Method: {transaction.payment_method.toUpperCase()}</p>
                                        </div>
                                    </div>

                                    <div className="receipt-items">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Item Description</th>
                                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transaction.items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <span className="item-main">
                                                                {item.brand} {item.model}
                                                                {item.type === 'trade_in' && <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '0.7em' }}>TRADE-IN</span>}
                                                            </span>
                                                            <div className="item-specs">
                                                                <span>IMEI: {item.imei}</span>
                                                                {item.storage && <span>{item.storage}</span>}
                                                                {item.color && <span>{item.color}</span>}
                                                                {item.condition_status && <span>{item.condition_status}</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {item.type === 'trade_in' ? '-' : ''}₦{parseFloat(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="receipt-summary">
                                        <div className="summary-rows">
                                            <div className="summary-row">
                                                <span>Subtotal</span>
                                                <span>₦{parseFloat(transaction.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="summary-row">
                                                <span>Tax (0%)</span>
                                                <span>₦0.00</span>
                                            </div>
                                            <div className="summary-row total">
                                                <span>Total Amount</span>
                                                <span>₦{parseFloat(transaction.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>

                                            {transaction.debt_id && (
                                                <>
                                                    <div className="summary-row">
                                                        <span>Amount Paid</span>
                                                        <span className="text-success">₦{parseFloat(transaction.debt_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="summary-row total">
                                                        <span>Outstanding Balance</span>
                                                        <span className="text-danger">₦{parseFloat(transaction.debt_remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {transaction.payment_history && transaction.payment_history.length > 0 && (
                                        <div className="payment-history-section">
                                            <h3>Payment History</h3>
                                            <table className="history-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Recorded By</th>
                                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transaction.payment_history.map((payment, index) => (
                                                        <tr key={index}>
                                                            <td>{new Date(payment.payment_date).toLocaleString()}</td>
                                                            <td>{payment.recorded_by_name}</td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                ₦{parseFloat(payment.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <div className="receipt-footer">
                                        <p>Thank you for your business!</p>
                                        <p>Please keep this receipt for warranty purposes.</p>
                                        <p>Warranty valid for 30 days on used devices.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Receipt;
