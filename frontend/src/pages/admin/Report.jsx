import { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import { ShoppingBag, Receipt, DollarSign, TrendingUp, Activity, BarChart3, PieChart } from 'lucide-react';
import './Report.css';

const Report = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('new');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Date range for expenses
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Default to start of month
        end: new Date().toISOString().split('T')[0] // Default to today
    });

    // Data states
    const [stats, setStats] = useState({
        inventory_value: 0,
        total_sales: 0,
        total_cogs: 0,
        total_expenses: 0,
        business_capital: 0,
        total_outstanding_debt: 0
    });
    const [inputs, setInputs] = useState({
        cash_in_hand: ''
    });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const { showError, showSuccess } = useNotification();

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

    // Fetch initial stats
    useEffect(() => {
        fetchStats();
    }, [dateRange]);

    // Fetch history when tab changes
    useEffect(() => {
        if (activeTab === 'history') {
            setOffset(0);
            setHasMore(true);
            fetchHistory(0);
        }
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const response = await api.get(`/admin/report.php?action=stats&start_date=${dateRange.start}&end_date=${dateRange.end}`);
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
            showError('Unable to load financial data.');
        }
    };

    const fetchHistory = async (newOffset) => {
        try {
            if (newOffset === 0) setLoading(true);
            else setLoadingMore(true);

            const response = await api.get(`/admin/report.php?action=history&limit=15&offset=${newOffset}`);
            if (response.data.success) {
                if (newOffset === 0) {
                    setHistory(response.data.data);
                } else {
                    setHistory(prev => [...prev, ...response.data.data]);
                }

                if (response.data.data.length < 15) {
                    setHasMore(false);
                }
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        const nextOffset = offset + 15;
        setOffset(nextOffset);
        fetchHistory(nextOffset);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInputs(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const calculateNetProfit = () => {
        const sales = parseFloat(stats.total_sales) || 0;
        const cogs = parseFloat(stats.total_cogs) || 0;
        const expenses = parseFloat(stats.total_expenses) || 0;

        return (sales - cogs) - expenses;
    };

    const calculateGrossProfit = () => {
        const sales = parseFloat(stats.total_sales) || 0;
        const cogs = parseFloat(stats.total_cogs) || 0;
        return sales - cogs;
    };

    const calculateGrossMargin = () => {
        const sales = parseFloat(stats.total_sales) || 0;
        const gp = calculateGrossProfit();
        if (sales === 0) return 0;
        return ((gp / sales) * 100).toFixed(1);
    };

    const calculateNetMargin = () => {
        const sales = parseFloat(stats.total_sales) || 0;
        const np = calculateNetProfit();
        if (sales === 0) return 0;
        return ((np / sales) * 100).toFixed(1);
    };

    const calculateEquity = () => {
        const cash = parseFloat(inputs.cash_in_hand) || 0;
        const debt = parseFloat(stats.total_outstanding_debt) || 0;
        const inventory = parseFloat(stats.inventory_value) || 0;
        const capital = parseFloat(stats.business_capital) || 0;

        return (inventory + cash + debt) - capital;
    };

    const handleSaveReport = async () => {
        setLoading(true);

        try {
            const response = await api.post('/admin/report.php?action=create', {
                cash_in_hand: parseFloat(inputs.cash_in_hand) || 0,
                start_date: dateRange.start,
                end_date: dateRange.end
            });

            if (response.data.success) {
                showSuccess('The report has been successfully saved.');
                setInputs({ cash_in_hand: '' });
                fetchStats();
            }
        } catch (err) {
            console.error('Error saving report:', err);
            showError(err.response?.data?.message || 'Unable to save the report.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (report) => {
        const printWindow = window.open('', '_blank');
        const expensePeriodText = report.expense_start_date && report.expense_end_date
            ? `${new Date(report.expense_start_date).toLocaleDateString()} to ${new Date(report.expense_end_date).toLocaleDateString()}`
            : 'All Time';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Financial Report - ${new Date(report.created_at).toLocaleDateString()}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .report-info { margin-bottom: 20px; }
                        .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .report-table th, .report-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                        .report-table th { background-color: #f8f9fa; }
                        .total-section { text-align: right; margin-top: 20px; font-size: 1.2em; font-weight: bold; }
                        .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #666; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Financial Report</h1>
                        <p>Generated on: ${new Date(report.created_at).toLocaleString()}</p>
                        <p>Generated by: ${report.generated_by_name}</p>
                        <p><strong>Expense Period:</strong> ${expensePeriodText}</p>
                    </div>

                    <table class="report-table">
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                        <tr>
                            <td>Total Sales Revenue</td>
                            <td>${formatCurrency(report.total_sales)}</td>
                        </tr>
                        <tr>
                            <td>Cost of Goods Sold (COGS)</td>
                            <td>- ${formatCurrency(report.total_cogs)}</td>
                        </tr>
                        <tr>
                            <td><strong>Gross Profit</strong></td>
                            <td><strong>${formatCurrency(parseFloat(report.total_sales) - parseFloat(report.total_cogs))}</strong></td>
                        </tr>
                        <tr>
                            <td>Total Expenses</td>
                            <td>- ${formatCurrency(report.total_expenses)}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="background-color: #eee;"></td>
                        </tr>
                        <tr>
                            <td>Inventory Value</td>
                            <td>${formatCurrency(report.inventory_value)}</td>
                        </tr>
                        <tr>
                            <td>Cash in Hand</td>
                            <td>${formatCurrency(report.cash_in_hand)}</td>
                        </tr>
                        <tr>
                            <td>Outstanding Debt</td>
                            <td>${formatCurrency(report.total_debt)}</td>
                        </tr>
                    </table>

                    <div class="total-section">
                        Net Profit / Loss: <span style="color: ${report.net_profit < 0 ? 'red' : 'green'}">${formatCurrency(report.net_profit)}</span>
                    </div>

                    <div class="footer">
                        <p>This is a computer-generated document.</p>
                    </div>

                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount);
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    <div className="header-section">
                        <h1>Financial Report</h1>
                        <p className="text-secondary">Generate and view financial health reports</p>
                    </div>

                    <div className="report-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
                            onClick={() => setActiveTab('new')}
                        >
                            New Report
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History
                        </button>
                    </div>

                    {activeTab === 'new' ? (
                        <div className="report-card glass-card">

                            <div className="period-selector glass-card">
                                <h3>Expense Calculation Period</h3>
                                <div className="period-grid">
                                    <div className="input-group">
                                        <label>Start Date</label>
                                        <input
                                            type="date"
                                            name="start"
                                            value={dateRange.start}
                                            onChange={handleDateChange}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>End Date</label>
                                        <input
                                            type="date"
                                            name="end"
                                            value={dateRange.end}
                                            onChange={handleDateChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="report-stats-grid">
                                <MetricCard
                                    title={`Sales Revenue`}
                                    value={formatCurrency(stats.total_sales)}
                                    icon={DollarSign}
                                    color="success"
                                    subtitle="Total revenue in period"
                                    className="glass-card"
                                />
                                <MetricCard
                                    title="Cost of Goods Sold"
                                    value={formatCurrency(stats.total_cogs)}
                                    icon={Activity}
                                    color="warning"
                                    subtitle="Cost of items sold"
                                    className="glass-card"
                                />
                                <MetricCard
                                    title="Operating Expenses"
                                    value={formatCurrency(stats.total_expenses)}
                                    icon={Receipt}
                                    color="danger"
                                    subtitle="Total spending in period"
                                    className="glass-card"
                                />
                                <MetricCard
                                    title="Gross Margin"
                                    value={`${calculateGrossMargin()}%`}
                                    icon={TrendingUp}
                                    color="info"
                                    subtitle="Revenue after COGS"
                                    className="glass-card"
                                />
                            </div>

                            <div className="report-stats-grid" style={{ marginTop: '20px' }}>
                                <MetricCard
                                    title="Inventory Value"
                                    value={formatCurrency(stats.inventory_value)}
                                    icon={ShoppingBag}
                                    color="info"
                                    subtitle="Current stock cost"
                                    className="glass-card"
                                />
                                <MetricCard
                                    title="Total Outstanding Debt"
                                    value={formatCurrency(stats.total_outstanding_debt)}
                                    icon={BarChart3}
                                    color="warning"
                                    subtitle="Owed to business"
                                    className="glass-card"
                                />
                                <MetricCard
                                    title="Net Profit Margin"
                                    value={`${calculateNetMargin()}%`}
                                    icon={PieChart}
                                    color={calculateNetProfit() >= 0 ? "success" : "danger"}
                                    subtitle="Bottom line efficiency"
                                    className="glass-card"
                                />
                                <MetricCard
                                    title="Business Equity"
                                    value={formatCurrency(calculateEquity())}
                                    icon={Activity}
                                    color="secondary"
                                    subtitle="Assets - Invested Capital"
                                    className="glass-card"
                                />
                            </div>

                            <div className="input-grid-full">
                                <div className="input-group">
                                    <label>Total Cash (Money in Account/Hand)</label>
                                    <input
                                        type="number"
                                        name="cash_in_hand"
                                        value={inputs.cash_in_hand}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        className="cash-input"
                                    />
                                    <p className="input-hint">
                                        Enter the physical cash or bank balance currently available.
                                    </p>
                                </div>
                            </div>

                            <div className="result-section glass-card">
                                <h2>Net Profit Breakdown</h2>
                                <div className="breakdown-container glass-card">
                                    <div className="breakdown-item">
                                        <span>Total Sales</span>
                                        <span className="val positive">{formatCurrency(stats.total_sales)}</span>
                                    </div>
                                    <div className="breakdown-item">
                                        <span>- Cost of Goods Sold</span>
                                        <span className="val negative">({formatCurrency(stats.total_cogs)})</span>
                                    </div>
                                    <div className="breakdown-divider"></div>
                                    <div className="breakdown-item subtotal">
                                        <span>= Gross Profit</span>
                                        <span className="val">{formatCurrency(calculateGrossProfit())}</span>
                                    </div>
                                    <div className="breakdown-item">
                                        <span>- Operating Expenses</span>
                                        <span className="val negative">({formatCurrency(stats.total_expenses)})</span>
                                    </div>
                                    <div className="breakdown-divider major"></div>
                                    <div className="breakdown-item final">
                                        <span>Net Profit / Loss</span>
                                        <span className={`val large ${calculateNetProfit() < 0 ? 'negative' : 'positive'}`}>
                                            {formatCurrency(calculateNetProfit())}
                                        </span>
                                    </div>
                                </div>
                                <p className="formula-hint">
                                    Net Profit = (Sales - COGS) - Expenses
                                </p>
                            </div>

                            <div className="action-buttons">
                                <button
                                    className="btn-primary-full"
                                    onClick={handleSaveReport}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Report & Record Snapshot'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="history-section">
                            <div className="table-container glass-card">
                                {loading && offset === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading history...</div>
                                ) : (
                                    <>
                                        <div className="table-responsive">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Generated By</th>
                                                        <th>Period</th>
                                                        <th>Inventory</th>
                                                        <th>Sales</th>
                                                        <th>Cash</th>
                                                        <th>Debt</th>
                                                        <th>Expenses</th>
                                                        <th>Net Profit</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {history.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>No reports found</td>
                                                        </tr>
                                                    ) : (
                                                        history.map(report => (
                                                            <tr key={report.id}>
                                                                <td>{new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                                <td>{report.generated_by_name}</td>
                                                                <td style={{ fontSize: '0.85rem' }}>
                                                                    {report.expense_start_date ? (
                                                                        <>
                                                                            {new Date(report.expense_start_date).toLocaleDateString()} - <br />
                                                                            {new Date(report.expense_end_date).toLocaleDateString()}
                                                                        </>
                                                                    ) : 'All Time'}
                                                                </td>
                                                                <td>{formatCurrency(report.inventory_value)}</td>
                                                                <td>{formatCurrency(report.total_sales)}</td>
                                                                <td>{formatCurrency(report.cash_in_hand)}</td>
                                                                <td>{formatCurrency(report.total_debt)}</td>
                                                                <td>{formatCurrency(report.total_expenses)}</td>
                                                                <td style={{ fontWeight: 'bold', color: report.net_profit < 0 ? 'red' : 'green' }}>
                                                                    {formatCurrency(report.net_profit)}
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        className="btn-secondary"
                                                                        style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                                                                        onClick={() => handlePrint(report)}
                                                                    >
                                                                        Print
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {hasMore && history.length > 0 && (
                                            <div className="load-more-container">
                                                <button
                                                    className="btn-load-more"
                                                    onClick={loadMore}
                                                    disabled={loadingMore}
                                                >
                                                    {loadingMore ? 'Loading...' : 'Load More Reports'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Report;
