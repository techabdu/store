import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import api from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';
import { FaSearch } from 'react-icons/fa';
import { FileText, ChevronRight } from 'lucide-react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import './SalesHistory.css';

const SalesHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const { showError } = useNotification();
    const { getPlanLimits } = useSubscription();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const limits = getPlanLimits();
    // Default limit should be 50 if max_sales_history_display is set, else pagination limit (e.g., 20)
    // Actually, 'max_sales_history_display' usually implies a hard cap on TOTAL viewable history for lower plans.
    // If limits.max_sales_history_display is set (e.g. 50), we should probably fetch ONLY that many and disable load more.

    const displayLimit = limits?.max_sales_history_display && limits?.max_sales_history_display !== -1
        ? limits.max_sales_history_display
        : 20; // Default page size if unlimited

    const isLimited = limits?.max_sales_history_display && limits?.max_sales_history_display !== -1;

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

    // Filter transactions when search term changes
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredTransactions(transactions);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = transactions.filter(tx => {
                const receiptNum = String(tx.id).padStart(6, '0');
                return (
                    tx.customer_name.toLowerCase().includes(lowerTerm) ||
                    (tx.customer_phone && tx.customer_phone.includes(lowerTerm)) ||
                    receiptNum.includes(lowerTerm) ||
                    lowerTerm.replace('#', '').includes(receiptNum) ||
                    tx.payment_method.toLowerCase().includes(lowerTerm) ||
                    (tx.processed_by && tx.processed_by.toLowerCase().includes(lowerTerm))
                );
            });
            setFilteredTransactions(filtered);
        }
    }, [searchTerm, transactions]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const fetchTransactions = async () => {
        try {
            const response = await api.get('/transactions/read.php', {
                params: {
                    limit: isLimited ? displayLimit : 20,
                    offset: isLimited ? 0 : page * 20
                }
            });

            if (response.data.success) {
                if (page === 0) {
                    setTransactions(response.data.transactions);
                    setFilteredTransactions(response.data.transactions);
                } else {
                    setTransactions(prev => [...prev, ...response.data.transactions]);
                    setFilteredTransactions(prev => [...prev, ...response.data.transactions]);
                }

                if (isLimited || response.data.transactions.length < 20) {
                    setHasMore(false);
                }
            }
        } catch (err) {
            showError('Failed to load sales history');
            console.error('Fetch transactions error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [page]);

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
                    <div className="header-section">
                        <div>
                            <h1>Sales History</h1>
                            <p className="text-secondary">View and manage past transactions</p>
                        </div>
                    </div>


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
                                            <tr key={tx.id} onClick={() => navigate(`/receipt/${tx.parent_transaction_id || tx.id}`)}>
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
                                                            navigate(`/receipt/${tx.parent_transaction_id || tx.id}`);
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
            </main>
        </div>
    );
};

export default SalesHistory;
