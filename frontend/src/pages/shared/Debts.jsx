import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import DebtPaymentReceipt from '../../components/DebtPaymentReceipt';
import './Debts.css';

const Debts = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        status: 'all',
        start_date: '',
        end_date: '',
        search: ''
    });

    // Pagination
    const [pagination, setPagination] = useState({
        page: 1,
        total_pages: 1,
        total_count: 0
    });

    // Summary statistics
    const [summary, setSummary] = useState({
        total_debts: 0,
        total_outstanding: '0.00',
        fully_paid_count: 0
    });

    const [view, setView] = useState('list'); // 'list', 'details', 'payment', 'receipt'
    const [selectedDebt, setSelectedDebt] = useState(null);
    const [debtDetails, setDebtDetails] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [receiptData, setReceiptData] = useState(null);
    const [shopSettings, setShopSettings] = useState(null); // For receipt header

    // Fetch shop settings for receipt
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

    // Payment form
    const [paymentForm, setPaymentForm] = useState({
        amount_paid: '',
        notes: ''
    });

    // Responsive sidebar logic
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

    // Fetch debts
    const fetchDebts = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {
                ...filters,
                page: pagination.page,
                limit: 20
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key] || params[key] === 'all') {
                    delete params[key];
                }
            });

            const response = await api.get('/debts/get_debts.php', { params });

            if (response.data.success) {
                setDebts(response.data.debts);
                setPagination({
                    page: response.data.page,
                    total_pages: response.data.total_pages,
                    total_count: response.data.total_count
                });
                setSummary(response.data.summary);
            } else {
                setError(response.data.error || 'Failed to load debts');
            }
        } catch (err) {
            console.error('Error fetching debts:', err);
            setError('Failed to load debts');
        } finally {
            setLoading(false);
        }
    };

    // Fetch debt details
    const fetchDebtDetails = async (debtId, updateView = true) => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/debts/get_debt_details.php', {
                params: { debt_id: debtId }
            });

            if (response.data.success) {
                setDebtDetails(response.data.debt);
                setPaymentHistory(response.data.payment_history);
                if (updateView) setView('details');
                return response.data; // Return data for chaining
            } else {
                setError(response.data.error || 'Failed to load debt details');
                return null;
            }
        } catch (err) {
            console.error('Error fetching debt details:', err);
            setError('Failed to load debt details');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Open payment panel
    const openPaymentPanel = (debt) => {
        setSelectedDebt(debt);
        setPaymentForm({ amount_paid: '', notes: '' });
        setView('payment');
    };

    // Record payment
    const handleRecordPayment = async () => {
        if (!paymentForm.amount_paid || parseFloat(paymentForm.amount_paid) <= 0) {
            setError('Please enter a valid payment amount');
            return;
        }

        const amount = parseFloat(paymentForm.amount_paid);
        const remaining = parseFloat(selectedDebt.remaining_balance);

        if (amount > remaining) {
            setError(`Payment amount cannot exceed remaining balance of ₦${remaining.toFixed(2)}`);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/debts/record_debt_payment.php', {
                debt_id: selectedDebt.id,
                amount_paid: amount,
                notes: paymentForm.notes
            });

            if (response.data.success) {
                setSuccess('Payment recorded successfully!');

                // Fetch updated details to check status
                const updatedData = await fetchDebtDetails(selectedDebt.id, false);

                if (updatedData && updatedData.debt.status === 'fully_paid') {
                    // Redirect to main receipt for full history
                    setTimeout(() => {
                        navigate(`/receipt/${updatedData.debt.transaction_id}`);
                    }, 1000);
                } else if (updatedData) {
                    // Show partial payment receipt ("little invoice")
                    const newPayment = {
                        customer_name: updatedData.debt.customer_name,
                        payment_date: new Date().toISOString(),
                        amount_paid: amount,
                        previous_balance: parseFloat(updatedData.debt.remaining_balance) + amount,
                        new_balance: updatedData.debt.remaining_balance,
                        recorded_by: user.username,
                        receipt_number: `PMT-${Date.now().toString().slice(-6)}`
                    };
                    setReceiptData(newPayment);
                    setPaymentForm({ amount_paid: '', notes: '' });
                    setView('receipt');
                } else {
                    setView('list');
                }

                fetchDebts(); // Refresh the main list logic background


                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.error || 'Failed to record payment');
            }
        } catch (err) {
            console.error('Error recording payment:', err);
            setError(err.response?.data?.error || 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    // Write off debt (admin only)
    const handleWriteOff = async (debtId) => {
        if (!window.confirm('Are you sure you want to write off this debt? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/debts/write_off_debt.php', {
                debt_id: debtId,
                notes: 'Debt written off by admin'
            });

            if (response.data.success) {
                setSuccess('Debt written off successfully!');
                setView('list');
                fetchDebts(); // Refresh the list

                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.error || 'Failed to write off debt');
            }
        } catch (err) {
            console.error('Error writing off debt:', err);
            setError(err.response?.data?.error || 'Failed to write off debt');
        } finally {
            setLoading(false);
        }
    };

    // Handle filter change
    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value });
        setPagination({ ...pagination, page: 1 }); // Reset to page 1
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            status: 'all',
            start_date: '',
            end_date: '',
            search: ''
        });
        setPagination({ ...pagination, page: 1 });
    };

    // Load debts on mount and filter changes
    useEffect(() => {
        fetchDebts();
    }, [filters, pagination.page]);

    // Get status badge class
    const getStatusBadge = (status) => {
        const badges = {
            unpaid: { class: 'status-unpaid', label: 'Unpaid' },
            partially_paid: { class: 'status-partially-paid', label: 'Partially Paid' },
            fully_paid: { class: 'status-fully-paid', label: 'Fully Paid' },
            written_off: { class: 'status-written-off', label: 'Written Off' }
        };
        return badges[status] || badges.unpaid;
    };

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
                    {view === 'list' ? (
                        <div className="debts-container">
                            {/* Header */}
                            <div className="debts-header">
                                <div>
                                    <h1>Debt Management</h1>
                                    <p className="text-secondary">Track and manage customer debts</p>
                                </div>
                            </div>

                            {/* Messages */}
                            {error && <div className="error-message">{error}</div>}
                            {success && <div className="success-message">{success}</div>}

                            {/* Summary Cards */}
                            <div className="summary-cards">
                                <div className="summary-card">
                                    <div className="card-icon outstanding">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M7 15h0M2 9.5h20" />
                                        </svg>
                                    </div>
                                    <div className="card-content">
                                        <p className="card-label">Total Outstanding</p>
                                        <p className="card-value outstanding">₦{parseFloat(summary.total_outstanding).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                <div className="summary-card">
                                    <div className="card-icon total">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                                            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                                            <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4Z" />
                                        </svg>
                                    </div>
                                    <div className="card-content">
                                        <p className="card-label">Total Debts</p>
                                        <p className="card-value">{summary.total_debts}</p>
                                    </div>
                                </div>

                                <div className="summary-card">
                                    <div className="card-icon paid">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                    </div>
                                    <div className="card-content">
                                        <p className="card-label">Fully Paid</p>
                                        <p className="card-value paid">{summary.fully_paid_count}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="filters-section">
                                <div className="filters-group">
                                    <div className="filter-item">
                                        <label>Status</label>
                                        <select
                                            value={filters.status}
                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                        >
                                            <option value="all">All</option>
                                            <option value="unpaid">Unpaid</option>
                                            <option value="partially_paid">Partially Paid</option>
                                            <option value="fully_paid">Fully Paid</option>
                                            <option value="written_off">Written Off</option>
                                        </select>
                                    </div>

                                    <div className="filter-item">
                                        <label>Start Date</label>
                                        <input
                                            type="date"
                                            value={filters.start_date}
                                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                        />
                                    </div>

                                    <div className="filter-item">
                                        <label>End Date</label>
                                        <input
                                            type="date"
                                            value={filters.end_date}
                                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                        />
                                    </div>

                                    <div className="filter-item search">
                                        <label>Search</label>
                                        <input
                                            type="text"
                                            placeholder="Customer name or phone..."
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                        />
                                    </div>

                                    <button className="btn-clear-filters" onClick={clearFilters}>
                                        Clear Filters
                                    </button>
                                </div>
                            </div>

                            {/* Debts Table */}
                            <div className="table-container">
                                {loading && debts.length === 0 ? (
                                    <div className="loading-state">Loading debts...</div>
                                ) : debts.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No debts found</p>
                                        <small>Debts will appear here when created from the POS</small>
                                    </div>
                                ) : (
                                    <>
                                        <table className="debts-table">
                                            <thead>
                                                <tr>
                                                    <th>Customer Name</th>
                                                    <th>Phone</th>
                                                    <th>Total Amount</th>
                                                    <th>Paid Amount</th>
                                                    <th>Remaining</th>
                                                    <th>Status</th>
                                                    <th>Created</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {debts.map((debt) => (
                                                    <tr key={debt.id}>
                                                        <td className="customer-name">{debt.customer_name}</td>
                                                        <td className="phone">{debt.customer_phone}</td>
                                                        <td className="amount">₦{parseFloat(debt.total_amount).toFixed(2)}</td>
                                                        <td className="amount paid">₦{parseFloat(debt.paid_amount).toFixed(2)}</td>
                                                        <td className="amount remaining">₦{parseFloat(debt.remaining_balance).toFixed(2)}</td>
                                                        <td>
                                                            <span className={`status-badge ${getStatusBadge(debt.status).class}`}>
                                                                {getStatusBadge(debt.status).label}
                                                            </span>
                                                        </td>
                                                        <td className="date">{new Date(debt.created_at).toLocaleDateString()}</td>
                                                        <td className="actions">
                                                            <button
                                                                className="btn-action view"
                                                                onClick={() => fetchDebtDetails(debt.id)}
                                                                title="View Details"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                    <circle cx="12" cy="12" r="3" />
                                                                </svg>
                                                            </button>
                                                            {debt.status !== 'fully_paid' && debt.status !== 'written_off' && (
                                                                <button
                                                                    className="btn-action payment"
                                                                    onClick={() => openPaymentPanel(debt)}
                                                                    title="Record Payment"
                                                                >
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                                                        <path d="M7 15h4M2 9.5h20" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Pagination */}
                                        {pagination.total_pages > 1 && (
                                            <div className="pagination">
                                                <button
                                                    className="btn-page"
                                                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                                    disabled={pagination.page === 1}
                                                >
                                                    Previous
                                                </button>
                                                <span className="page-info">
                                                    Page {pagination.page} of {pagination.total_pages}
                                                </span>
                                                <button
                                                    className="btn-page"
                                                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                                    disabled={pagination.page === pagination.total_pages}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ) : view === 'details' && debtDetails ? (
                        <div className="focus-view-container">
                            <div className="focus-view-header">
                                <button className="btn-back" onClick={() => setView('list')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Back to List
                                </button>
                                <div className="header-title-actions">
                                    <h2>Debt Details</h2>
                                    {debtDetails.transaction_id && (
                                        <button
                                            className="btn-print-receipt"
                                            onClick={() => navigate(`${user.role === 'admin' ? '/admin' : ''}/receipt/${debtDetails.transaction_id}`)}
                                            title="View Full Receipt"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                                <rect x="6" y="14" width="12" height="8" />
                                            </svg>
                                            <span>Full Receipt</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="focus-view-content">
                                <div className="focus-view-card">
                                    {/* Customer Information */}
                                    <div className="detail-section">
                                        <div className="section-header">
                                            <div className="section-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                    <circle cx="12" cy="7" r="4" />
                                                </svg>
                                            </div>
                                            <h4>Customer Information</h4>
                                        </div>
                                        <div className="customer-info-grid">
                                            <div className="customer-info-item">
                                                <div className="item-icon">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                        <circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                </div>
                                                <div className="item-content">
                                                    <span className="label">Name</span>
                                                    <span className="value">{debtDetails.customer_name}</span>
                                                </div>
                                            </div>
                                            <div className="customer-info-item">
                                                <div className="item-icon">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                    </svg>
                                                </div>
                                                <div className="item-content">
                                                    <span className="label">Phone</span>
                                                    <span className="value">{debtDetails.customer_phone}</span>
                                                </div>
                                            </div>
                                            <div className="customer-info-item full-width">
                                                <div className="item-icon">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                </div>
                                                <div className="item-content">
                                                    <span className="label">Address</span>
                                                    <span className="value">{debtDetails.customer_address || 'No address provided'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="divider" />

                                    {/* Debt Summary */}
                                    <div className="detail-section">
                                        <div className="section-header">
                                            <div className="section-icon summary">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                                    <path d="M7 15h0M2 9.5h20" />
                                                </svg>
                                            </div>
                                            <h4>Debt Summary</h4>
                                        </div>
                                        <div className="summary-grid-focus">
                                            <div className="summary-item-focus">
                                                <span className="label">Total Amount:</span>
                                                <span className="value">₦{parseFloat(debtDetails.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="summary-item-focus paid">
                                                <span className="label">Paid Amount:</span>
                                                <span className="value">₦{parseFloat(debtDetails.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="summary-item-focus remaining highlight">
                                                <span className="label">Remaining Balance:</span>
                                                <span className="value">₦{parseFloat(debtDetails.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="summary-item-focus">
                                                <span className="label">Status:</span>
                                                <span className={`status-badge ${getStatusBadge(debtDetails.status).class}`}>
                                                    {getStatusBadge(debtDetails.status).label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="divider" />

                                    {/* Payment History */}
                                    <div className="detail-section">
                                        <div className="section-header">
                                            <div className="section-icon history">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                                                </svg>
                                            </div>
                                            <h4>Payment History</h4>
                                        </div>
                                        {paymentHistory.length === 0 ? (
                                            <div className="empty-payments">
                                                <div className="empty-icon">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                                        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                                                    </svg>
                                                </div>
                                                <p>No payments recorded yet</p>
                                                <small>Payments will appear here as they are recorded</small>
                                            </div>
                                        ) : (
                                            <div className="payment-timeline">
                                                {paymentHistory.map((payment) => (
                                                    <div key={payment.id} className="timeline-item">
                                                        <div className="timeline-marker">
                                                            <div className="marker-dot"></div>
                                                        </div>
                                                        <div className="timeline-card">
                                                            <div className="card-top">
                                                                <div className="payment-amount">
                                                                    <span className="currency">₦</span>
                                                                    {parseFloat(payment.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </div>
                                                                <div className="payment-badge success">Success</div>
                                                            </div>
                                                            <div className="card-middle">
                                                                <div className="payment-date-info">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                                    </svg>
                                                                    {new Date(payment.payment_date).toLocaleString(undefined, {
                                                                        dateStyle: 'medium',
                                                                        timeStyle: 'short'
                                                                    })}
                                                                </div>
                                                                <div className="recorded-by">
                                                                    <span>Recorded by</span>
                                                                    <strong>{payment.recorded_by_name}</strong>
                                                                </div>
                                                            </div>
                                                            {payment.notes && (
                                                                <div className="payment-notes-bubble">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                                    </svg>
                                                                    {payment.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="focus-view-actions">
                                    <button className="btn-cancel" onClick={() => setView('list')}>Close</button>
                                    <div className="primary-actions">
                                        {(user.role === 'admin' || user.role === 'superadmin') &&
                                            debtDetails.status !== 'written_off' &&
                                            debtDetails.status !== 'fully_paid' && (
                                                <button
                                                    className="btn-danger"
                                                    onClick={() => handleWriteOff(debtDetails.id)}
                                                    disabled={loading}
                                                >
                                                    Write Off Debt
                                                </button>
                                            )}
                                        {debtDetails.status !== 'fully_paid' && debtDetails.status !== 'written_off' && (
                                            <button
                                                className="btn-primary"
                                                onClick={() => {
                                                    setSelectedDebt(debtDetails);
                                                    setView('payment');
                                                }}
                                            >
                                                Record Payment
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : view === 'payment' && selectedDebt ? (
                        <div className="focus-view-container">
                            <div className="focus-view-header">
                                <button className="btn-back" onClick={() => setView('list')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Back to List
                                </button>
                                <h2>Record Payment</h2>
                            </div>

                            <div className="focus-view-content">
                                <div className="focus-view-card">
                                    {/* Debt Summary */}
                                    <div className="detail-section">
                                        <h4>{selectedDebt.customer_name}</h4>
                                        <div className="summary-grid-focus">
                                            <div className="summary-item-focus">
                                                <span className="label">Total Amount:</span>
                                                <span className="value">₦{parseFloat(selectedDebt.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="summary-item-focus paid">
                                                <span className="label">Already Paid:</span>
                                                <span className="value">₦{parseFloat(selectedDebt.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="summary-item-focus remaining highlight">
                                                <span className="label">Remaining Balance:</span>
                                                <span className="value">₦{parseFloat(selectedDebt.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="divider" />

                                    {/* Payment Form */}
                                    <div className="detail-section">
                                        <h4>Payment Details</h4>
                                        <div className="form-group-focus">
                                            <label>Payment Amount (₦) *</label>
                                            <div className="input-with-icon">
                                                <span className="input-icon">₦</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={selectedDebt.remaining_balance}
                                                    value={paymentForm.amount_paid}
                                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                                                    placeholder="0.00"
                                                    className="form-input-focus"
                                                />
                                            </div>
                                            <small className="form-help">
                                                Maximum: ₦{parseFloat(selectedDebt.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </small>
                                        </div>

                                        <div className="form-group-focus">
                                            <label>Notes (Optional)</label>
                                            <textarea
                                                value={paymentForm.notes}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                                placeholder="Add any notes about this payment..."
                                                rows="4"
                                                className="form-input-focus"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="focus-view-actions">
                                    <button className="btn-cancel" onClick={() => setView('list')} disabled={loading}>Cancel</button>
                                    <button
                                        className="btn-primary"
                                        onClick={handleRecordPayment}
                                        disabled={loading || !paymentForm.amount_paid}
                                    >
                                        {loading ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </div>
                            </div>
                        </div>

                    ) : view === 'receipt' && receiptData ? (
                        <div className="focus-view-container">
                            <div className="focus-view-header">
                                <button className="btn-back" onClick={() => setView('list')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Back to List
                                </button>
                                <h2>Payment Receipt</h2>
                            </div>

                            <div className="focus-view-content" style={{ maxWidth: '600px' }}>
                                <div className="focus-view-card" style={{ padding: '0', overflow: 'hidden' }}>
                                    <DebtPaymentReceipt
                                        paymentData={receiptData}
                                        shopDetails={shopSettings || { name: 'Store Name', address: 'Store Address', phone: 'Phone' }}
                                    />
                                </div>

                                <div className="focus-view-actions">
                                    <button className="btn-cancel" onClick={() => setView('list')}>Close</button>
                                    <button
                                        className="btn-primary"
                                        onClick={() => window.print()}
                                    >
                                        Print Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </main >
        </div >
    );
};

export default Debts;
