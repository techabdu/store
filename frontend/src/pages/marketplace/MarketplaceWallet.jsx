import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import MetricCard from '../../components/MetricCard';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, TrendingUp, DollarSign, Lock, RotateCcw } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceDashboard.css'; // Use dashboard styles for consistency
import './MarketplaceWallet.css';

const MarketplaceWallet = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(true); // Default true until check
    const [showFunding, setShowFunding] = useState(false);
    const [amount, setAmount] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [visibleRows, setVisibleRows] = useState(15);

    // Withdrawal State
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    // Refs for scrolling
    const fundingFormRef = useRef(null);
    const withdrawFormRef = useRef(null);

    const banks = [
        { code: '044', name: 'Access Bank' },
        { code: '058', name: 'Guaranty Trust Bank' },
        { code: '033', name: 'United Bank for Africa (UBA)' },
        { code: '057', name: 'Zenith Bank' },
        { code: '011', name: 'First Bank of Nigeria' },
        { code: '214', name: 'FCMB' },
        { code: '050', name: 'Ecobank Nigeria' },
        { code: '070', name: 'Fidelity Bank' },
        { code: '082', name: 'Keystone Bank' },
        { code: '221', name: 'Stanbic IBTC Bank' },
        { code: '232', name: 'Sterling Bank' },
        { code: '032', name: 'Union Bank of Nigeria' },
        { code: '035', name: 'Wema Bank' },
        { code: '999992', name: 'Opay' },
        { code: '50211', name: 'Kuda Bank' },
        { code: '999991', name: 'PalmPay' },
    ];

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
        const queryParams = new URLSearchParams(window.location.search);
        const reference = queryParams.get('reference');
        const status = queryParams.get('status');

        if (reference && status === 'processing') {
            handleVerifyPayment(reference);
        } else {
            fetchData();
        }
    }, []);

    // Refetch transactions when filter changes
    useEffect(() => {
        if (!loading) {
            fetchTransactions(activeFilter);
        }
    }, [activeFilter]);

    const fetchTransactions = async (filter) => {
        try {
            const txRes = await api.get(`/marketplace/wallet/get_transactions.php?limit=50&type=${filter}`);
            if (txRes.data.success) {
                setTransactions(txRes.data.transactions);
            }
        } catch (error) {
            console.error("Error fetching transactions", error);
        }
    };

    const handleVerifyPayment = async (reference) => {
        setVerifying(true);
        try {
            const res = await api.post('/marketplace/wallet/deposit/verify.php', { reference });
            if (res.data.success) {
                // Clear query params without reload
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error("Verification failed", error);
        } finally {
            setVerifying(false);
            fetchData();
        }
    };

    const fetchData = async () => {
        try {
            const [walletRes, txRes, verifyRes] = await Promise.all([
                api.get('/marketplace/wallet/get_balance.php'),
                api.get(`/marketplace/wallet/get_transactions.php?limit=50&type=${activeFilter}`),
                api.get('/marketplace/identity/check_status.php')
            ]);

            if (walletRes.data.success) {
                setWallet(walletRes.data.wallet);
            }
            if (txRes.data.success) {
                setTransactions(txRes.data.transactions);
            }
            if (verifyRes.data.success) {
                setIsVerified(verifyRes.data.is_verified);
            }
        } catch (error) {
            console.error("Error fetching wallet data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        setVisibleRows(prev => prev + 15);
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
        setShowWithdraw(true);
        // Use timeout to allow React to render the component before scrolling
        setTimeout(() => {
            withdrawFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        if (!withdrawAmount || !accountNumber || !selectedBank) {
            alert("Please fill all withdrawal details");
            return;
        }

        if (Number(withdrawAmount) > Number(wallet?.available_balance || 0)) {
            alert("Insufficient balance");
            return;
        }

        setWithdrawLoading(true);
        try {
            const res = await api.post('/marketplace/wallet/withdraw/initiate.php', {
                amount: withdrawAmount,
                account_number: accountNumber,
                bank_code: selectedBank
            });

            if (res.data.success) {
                alert(`Withdrawal initiated successfully!\nReference: ${res.data.reference}\n(Save this reference for webhook simulation)`);
                setShowWithdraw(false);
                setWithdrawAmount('');
                setAccountNumber('');
                setSelectedBank('');
                fetchData(); // Refresh balance
            }
        } catch (error) {
            console.error("Withdrawal error", error);
            alert(error.response?.data?.error || "Withdrawal failed. Please try again.");
        } finally {
            setWithdrawLoading(false);
        }
    };

    const filterTabs = [
        { id: 'all', label: 'All Transactions' },
        { id: 'fund', label: 'Deposits' },
        { id: 'withdraw', label: 'Withdrawals' },
        { id: 'purchase', label: 'Purchases' },
        { id: 'sale', label: 'Sales' },
    ];

    const getTransactionIcon = (type) => {
        const icons = {
            fund: ArrowDownCircle,
            withdraw: ArrowUpCircle,
            purchase_hold: Clock,
            purchase_release: ArrowUpCircle,
            sale_pending: Clock,
            sale_complete: ArrowDownCircle,
            refund: RotateCcw,
        };
        return icons[type] || TrendingUp;
    };

    const getStatusBadge = (status) => {
        const s = status || 'completed';
        const config = {
            completed: 'success',
            pending: 'warning',
            failed: 'danger',
            processing: 'info'
        };

        const color = config[s] || 'secondary';
        return (
            <span className={`status-badge status-${color}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
        );
    };

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('en-NG', {
            style: 'currency',
            currency: 'NGN'
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredTransactions = transactions;

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    {/* Verification Warning */}
                    {!isVerified && !loading && (
                        <div className="warning-banner" style={{
                            backgroundColor: '#fff4e5',
                            color: '#663c00',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: '1px solid #ffe7c4'
                        }}>
                            <Clock size={20} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: '600', marginBottom: '2px' }}>Verification Required</p>
                                <p style={{ fontSize: '13px' }}>You must verify your identity before you can add funds to your wallet.</p>
                            </div>
                            <button
                                onClick={() => navigate('/marketplace/verify')}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                                Verify Now
                            </button>
                        </div>
                    )}

                    {/* Page Header */}
                    <div className="page-header">
                        <div>
                            <h1 className="heading-1">My Wallet</h1>
                            <p className="text-secondary">
                                {verifying ? "Verifying your payment, please wait..." : "Manage your funds and transactions"}
                            </p>
                        </div>
                    </div>

                    {/* Main Wallet Card */}
                    {wallet && (
                        <div className="wallet-card" style={{ marginBottom: '24px' }}>
                            <div className="wallet-header">
                                <div className="wallet-title">
                                    <div className="wallet-icon">
                                        <Wallet size={24} style={{ color: 'var(--primary)' }} />
                                    </div>
                                    <span>Available Balance</span>
                                </div>
                            </div>
                            <div className="wallet-balance">
                                <span className="wallet-balance-value">
                                    {formatPrice(wallet.available_balance)}
                                </span>
                                <span className="wallet-balance-label">Total available for withdrawal or purchase</span>
                            </div>
                            <div className="wallet-actions">
                                <button
                                    className="wallet-btn"
                                    onClick={handleWithdraw}
                                >
                                    <ArrowUpCircle size={18} />
                                    <span>Withdraw</span>
                                </button>
                                <button
                                    className="wallet-btn wallet-btn-primary"
                                    onClick={() => {
                                        if (!isVerified) {
                                            alert("Please verify your account to fund your wallet.");
                                            navigate('/marketplace/verify');
                                            return;
                                        }
                                        setShowFunding(true);
                                        setTimeout(() => {
                                            fundingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                    }}
                                    style={{
                                        opacity: isVerified ? 1 : 0.6,
                                        cursor: isVerified ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    <Plus size={18} />
                                    <span>Add Money</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Secondary Metrics */}
                    <div className="stats-grid">
                        <MetricCard
                            title="Pending Balance"
                            value={formatPrice(wallet?.pending_balance)}
                            icon={Clock}
                            subtitle="Funds from sales in escrow"
                            color="warning"
                        />
                        <MetricCard
                            title="Held Balance"
                            value={formatPrice(wallet?.held_balance)}
                            icon={Lock}
                            subtitle="Funds locked in active bids"
                            color="info"
                        />
                    </div>

                    {/* Funding Form Modal/Overlay or Inline */}
                    {showFunding && (
                        <div ref={fundingFormRef} className="dashboard-card" style={{ marginBottom: '24px', border: '1px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="heading-3">Add Funds</h3>
                                <button onClick={() => setShowFunding(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <XCircle size={20} color="var(--text-secondary)" />
                                </button>
                            </div>
                            <form onSubmit={handleFundWallet} style={{ maxWidth: '400px' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Amount (NGN)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Enter amount (min 100)"
                                        className="form-control"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px'
                                        }}
                                        min="100"
                                        required
                                    />
                                </div>
                                <div className="funding-actions">
                                    <button type="button" onClick={() => setShowFunding(false)} className="btn-secondary">Cancel</button>
                                    <button type="submit" className="btn-primary">Proceed to Payment</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Withdrawal Modal */}
                    {showWithdraw && (
                        <div ref={withdrawFormRef} className="dashboard-card" style={{ marginBottom: '24px', border: '1px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="heading-3">Withdraw Funds</h3>
                                <button onClick={() => setShowWithdraw(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <XCircle size={20} color="var(--text-secondary)" />
                                </button>
                            </div>
                            <form onSubmit={handleWithdrawSubmit} style={{ maxWidth: '400px' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Amount (NGN)</label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder={`Max: ${wallet?.available_balance || 0}`}
                                        className="form-control"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px'
                                        }}
                                        min="100"
                                        max={wallet?.available_balance}
                                        required
                                    />
                                    <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                        Processing fee may apply.
                                    </small>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Select Bank</label>
                                    <select
                                        value={selectedBank}
                                        onChange={(e) => setSelectedBank(e.target.value)}
                                        className="form-control"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px'
                                        }}
                                        required
                                    >
                                        <option value="">-- Choose Bank --</option>
                                        {banks.map(bank => (
                                            <option key={bank.code} value={bank.code}>{bank.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Account Number</label>
                                    <input
                                        type="text"
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="10-digit account number"
                                        className="form-control"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px'
                                        }}
                                        minLength="10"
                                        maxLength="10"
                                        required
                                    />
                                </div>

                                <div className="funding-actions">
                                    <button type="button" onClick={() => setShowWithdraw(false)} className="btn-secondary">Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={withdrawLoading}>
                                        {withdrawLoading ? 'Processing...' : 'Withdraw Funds'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Transaction History */}
                    <div className="table-container glass-card mb-24">
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '10px', overflowX: 'auto' }}>
                            {filterTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveFilter(tab.id)}
                                    className={`filter-btn ${activeFilter === tab.id ? 'active' : ''}`}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        border: activeFilter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                        backgroundColor: activeFilter === tab.id ? 'var(--primary)' : 'transparent',
                                        color: activeFilter === tab.id ? '#fff' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>Loading transactions...</div>
                        ) : filteredTransactions.length === 0 ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <DollarSign size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                                <h3 className="heading-3">No transactions found</h3>
                                <p className="text-secondary">Your transaction history will appear here.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="inventory-table wallet-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Description</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.slice(0, visibleRows).map(tx => {
                                            const isCredit = ['fund', 'sale_complete', 'sale_release', 'refund', 'bid_release'].includes(tx.transaction_type);
                                            return (
                                                <tr key={tx.id}>
                                                    <td>
                                                        <span style={{
                                                            fontWeight: '500',
                                                            textTransform: 'capitalize',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}>
                                                            {tx.transaction_type.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="text-secondary" style={{ fontSize: '13px' }}>{tx.description}</td>
                                                    <td>{formatDate(tx.created_at)}</td>
                                                    <td>{getStatusBadge(tx.status)}</td>
                                                    <td style={{
                                                        textAlign: 'right',
                                                        fontWeight: '600',
                                                        color: isCredit ? 'var(--success)' : 'var(--text-primary)'
                                                    }}>
                                                        {isCredit ? '+' : '-'}{formatPrice(tx.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}


                        {visibleRows < filteredTransactions.length && (
                            <div className="load-more-container">
                                <button className="btn-load-more" onClick={loadMore}>
                                    Load More Transactions
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceWallet;
