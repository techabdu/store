import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { FaSearch } from 'react-icons/fa';
import { FileText, ChevronRight } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import './SalesHistory.css';

const SalesHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Filter transactions when search term changes
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredTransactions(transactions);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = transactions.filter(tx => {
                const receiptNum = String(tx.id).padStart(6, '0');
                const receiptWithHash = `#${receiptNum}`;
                return (
                    tx.customer_name.toLowerCase().includes(lowerTerm) ||
                    (tx.customer_phone && tx.customer_phone.includes(lowerTerm)) ||
                    receiptNum.includes(lowerTerm) ||
                    receiptWithHash.toLowerCase().includes(lowerTerm) ||
                    tx.payment_method.toLowerCase().includes(lowerTerm) ||
                    (tx.processed_by && tx.processed_by.toLowerCase().includes(lowerTerm))
                );
            });
            setFilteredTransactions(filtered);
        }
    }, [searchTerm, transactions]);

    const fetchTransactions = async () => {
        try {
            if (page === 0) setLoading(true);
            const response = await api.get('/transactions/read.php', {
                params: {
                    limit: 20,
                    offset: page * 20
                }
            });

            if (response.data.success) {
                if (page === 0) {
                    setTransactions(response.data.transactions);
                    setFilteredTransactions(response.data.transactions);
                } else {
                    setTransactions(prev => [...prev, ...response.data.transactions]);
                }

                if (response.data.transactions.length < 20) {
                    setHasMore(false);
                }
            }
        } catch (err) {
            setError('Failed to load sales history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [page]);

    return (
        <AdminLayout
            title="Sales History"
            subtitle="View and manage past transactions"
            loading={loading && page === 0}
            error={error}
        >
            <div className="sales-history-container">
                {/* Search Bar */}
                <div className="search-bar-container glass-card mb-24">
                    <div className="search-input-wrapper">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by customer, phone, receipt #, payment method, or processor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div className="table-container glass-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Receipt #</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Method</th>
                                    <th>Processed By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan="8" className="empty-row">
                                            <div className="empty-state-content">
                                                <FileText size={48} />
                                                <p>{searchTerm ? 'No sales match your search' : 'No sales found'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <tr key={tx.id} onClick={() => navigate(`/admin/receipt/${tx.parent_transaction_id || tx.id}`)}>
                                            <td>
                                                <div className="date-cell">
                                                    <span className="date-main">{new Date(tx.created_at).toLocaleDateString()}</span>
                                                    <span className="date-sub">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td><span className="receipt-badge">#{String(tx.id).padStart(6, '0')}</span></td>
                                            <td>
                                                <div className="customer-cell">
                                                    <div className="customer-name">{tx.customer_name}</div>
                                                    <div className="customer-phone">{tx.customer_phone}</div>
                                                </div>
                                            </td>
                                            <td><span className="items-count">{tx.item_count} items</span></td>
                                            <td><span className="total-amount">₦{parseFloat(tx.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                            <td>
                                                <div className="method-cell">
                                                    <span className={`method-badge ${tx.payment_method === 'cash' ? 'cash' : 'other'}`}>
                                                        {tx.payment_method.toUpperCase()}
                                                    </span>
                                                    {tx.transaction_type === 'debt_payment' && (
                                                        <span className="debt-payment-tag">
                                                            DEBT PAYMENT
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td><span className="processor-name">{tx.processed_by}</span></td>
                                            <td>
                                                <button
                                                    className="action-btn-view"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/admin/receipt/${tx.parent_transaction_id || tx.id}`);
                                                    }}
                                                >
                                                    View Details <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {hasMore && !loading && (
                    <div className="load-more-container">
                        <button
                            className="btn-load-more"
                            onClick={() => setPage(p => p + 1)}
                        >
                            Load More Transactions
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default SalesHistory;
