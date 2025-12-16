import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplaceWallet.css';

const MarketplaceWallet = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFunding, setShowFunding] = useState(false);
    const [amount, setAmount] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [walletRes, txRes] = await Promise.all([
                api.get('/marketplace/wallet/get_balance.php'),
                api.get('/marketplace/wallet/get_transactions.php?limit=20')
            ]);

            if (walletRes.data.success) {
                setWallet(walletRes.data.wallet);
            }
            if (txRes.data.success) {
                setTransactions(txRes.data.transactions);
            }
        } catch (error) {
            console.error("Error fetching wallet data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFundWallet = async (e) => {
        e.preventDefault();
        if (!amount || amount < 100) {
            alert("Minimum funding amount is ₦100");
            return;
        }

        try {
            const res = await api.post('/marketplace/wallet/deposit/initialize.php', { amount });
            if (res.data.success && res.data.checkout_url) {
                window.location.href = res.data.checkout_url;
            }
        } catch (error) {
            alert(error.response?.data?.error || "Funding failed");
        }
    };

    const handleWithdraw = () => {
        navigate('/marketplace/wallet/withdraw');
    };

    const filterTabs = [
        { id: 'all', label: 'All' },
        { id: 'deposit', label: 'Deposits' },
        { id: 'withdrawal', label: 'Withdrawals' },
        { id: 'purchase', label: 'Purchases' },
        { id: 'sale_release', label: 'Sales' },
    ];

    const getTransactionIcon = (type) => {
        const icons = {
            deposit: ArrowDownCircle,
            withdrawal: ArrowUpCircle,
            purchase: ArrowUpCircle,
            sale_release: ArrowDownCircle,
            bid_lock: Clock,
            bid_release: CheckCircle,
        };
        return icons[type] || TrendingUp;
    };

    const getTransactionColor = (type) => {
        if (type === 'deposit' || type === 'sale_release' || type === 'bid_release') {
            return 'success';
        }
        return 'error';
    };

    const getStatusBadge = (status) => {
        const config = {
            completed: { color: 'success', icon: CheckCircle, label: 'Completed' },
            pending: { color: 'warning', icon: Clock, label: 'Pending' },
            failed: { color: 'error', icon: XCircle, label: 'Failed' },
        };

        const statusData = config[status] || config.pending;
        const Icon = statusData.icon;

        return (
            <span className={`status-badge status-${statusData.color}`}>
                <Icon size={12} />
                {statusData.label}
            </span>
        );
    };

    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredTransactions = activeFilter === 'all'
        ? transactions
        : transactions.filter(tx => tx.transaction_type === activeFilter);

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-wallet-main">
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">My Wallet</h1>
                        <p className="text-secondary">Manage your funds and transactions</p>
                    </div>

                    {/* Balance Cards */}
                    <div className="wallet-balance-cards">
                        {/* Main Balance Card */}
                        <div className="balance-card balance-card-primary">
                            <div className="balance-card-header">
                                <Wallet size={24} />
                                <h3>Available Balance</h3>
                            </div>
                            <p className="balance-amount">
                                ₦{wallet ? formatPrice(wallet.available_balance) : '0.00'}
                            </p>
                            <div className="balance-card-actions">
                                <button onClick={() => setShowFunding(!showFunding)} className="btn-action btn-fund">
                                    <Plus size={18} />
                                    Add Funds
                                </button>
                                <button onClick={handleWithdraw} className="btn-action btn-withdraw">
                                    <ArrowUpCircle size={18} />
                                    Withdraw
                                </button>
                            </div>
                        </div>

                        {/* Pending Balance */}
                        <div className="balance-card balance-card-secondary">
                            <div className="balance-card-icon" style={{ backgroundColor: 'rgba(251, 188, 4, 0.1)' }}>
                                <Clock size={24} style={{ color: 'var(--warning)' }} />
                            </div>
                            <div>
                                <h4 className="balance-card-title">Pending (Escrow)</h4>
                                <p className="balance-card-value">₦{wallet ? formatPrice(wallet.pending_balance) : '0.00'}</p>
                                <p className="balance-card-subtitle">Funds from sales</p>
                            </div>
                        </div>

                        {/* Held Balance */}
                        <div className="balance-card balance-card-secondary">
                            <div className="balance-card-icon" style={{ backgroundColor: 'rgba(156, 39, 176, 0.1)' }}>
                                <TrendingUp size={24} style={{ color: '#9C27B0' }} />
                            </div>
                            <div>
                                <h4 className="balance-card-title">Held (Bids)</h4>
                                <p className="balance-card-value">₦{wallet ? formatPrice(wallet.held_balance) : '0.00'}</p>
                                <p className="balance-card-subtitle">Locked in auctions</p>
                            </div>
                        </div>
                    </div>

                    {/* Funding Form */}
                    {showFunding && (
                        <div className="funding-form-container">
                            <form onSubmit={handleFundWallet} className="funding-form">
                                <h3 className="funding-title">Add Funds to Wallet</h3>
                                <div className="funding-input-group">
                                    <label className="funding-label">Enter Amount (Min: ₦100)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="funding-input"
                                        min="100"
                                        required
                                    />
                                </div>
                                <div className="funding-actions">
                                    <button type="button" onClick={() => setShowFunding(false)} className="btn-cancel">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-proceed">
                                        Proceed to Payment
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Transaction History */}
                    <div className="transactions-section">
                        <div className="transactions-header">
                            <h2 className="heading-2">Transaction History</h2>
                        </div>

                        {/* Filter Tabs */}
                        <div className="transaction-filters">
                            {filterTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveFilter(tab.id)}
                                    className={`filter-btn ${activeFilter === tab.id ? 'active' : ''}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Transactions List */}
                        <div className="transactions-list">
                            {loading ? (
                                <div className="transactions-loading">
                                    <p className="text-secondary">Loading transactions...</p>
                                </div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="transactions-empty">
                                    <Wallet size={48} style={{ opacity: 0.3, color: 'var(--text-secondary)' }} />
                                    <h3 className="heading-3">No transactions found</h3>
                                    <p className="text-secondary">
                                        {activeFilter === 'all'
                                            ? "You haven't made any transactions yet"
                                            : `No ${activeFilter} transactions found`}
                                    </p>
                                </div>
                            ) : (
                                filteredTransactions.map((tx) => {
                                    const Icon = getTransactionIcon(tx.transaction_type);
                                    const color = getTransactionColor(tx.transaction_type);
                                    const isCredit = tx.transaction_type === 'deposit' || tx.transaction_type === 'sale_release';

                                    return (
                                        <div key={tx.id} className="transaction-item">
                                            <div className={`transaction-icon transaction-icon-${color}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="transaction-details">
                                                <h4 className="transaction-type">
                                                    {tx.transaction_type.replace('_', ' ').toUpperCase()}
                                                </h4>
                                                <p className="transaction-description">{tx.description}</p>
                                                <span className="transaction-date">{formatDate(tx.created_at)}</span>
                                            </div>
                                            <div className="transaction-right">
                                                <p className={`transaction-amount transaction-amount-${color}`}>
                                                    {isCredit ? '+' : '-'}₦{formatPrice(tx.amount)}
                                                </p>
                                                {getStatusBadge(tx.status)}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceWallet;
