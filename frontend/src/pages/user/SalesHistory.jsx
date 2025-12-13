import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { FaSearch } from 'react-icons/fa';
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
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

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
                    setFilteredTransactions(prev => [...prev, ...response.data.transactions]);
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

                    {error && <div className="error-message">{error}</div>}

                    <div className="search-bar-container">
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

                    <div className="table-container">
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
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                            {searchTerm ? 'No sales match your search' : 'No sales found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <tr key={tx.id}>
                                            <td>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>#{String(tx.id).padStart(6, '0')}</td>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{tx.customer_name}</div>
                                                <div style={{ fontSize: '0.8em', color: '#666' }}>{tx.customer_phone}</div>
                                            </td>
                                            <td>{tx.item_count} items</td>
                                            <td>₦{parseFloat(tx.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td>
                                                <span className={`badge badge-${tx.payment_method === 'cash' ? 'success' : 'primary'}`}>
                                                    {tx.payment_method.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{tx.processed_by}</td>
                                            <td>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => navigate(`/receipt/${tx.id}`)}
                                                    title="View Receipt"
                                                >
                                                    📄
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {hasMore && !loading && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setPage(p => p + 1)}
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SalesHistory;
