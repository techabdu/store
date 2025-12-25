import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import { ShoppingBag, Receipt, DollarSign } from 'lucide-react';
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
        total_expenses: 0,
        business_capital: 0,
        total_outstanding_debt: 0
    });
    const [inputs, setInputs] = useState({
        cash_in_hand: ''
    });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

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
            fetchHistory();
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
            setError('Failed to load financial data');
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await api.get('/admin/report.php?action=history');
            if (response.data.success) {
                setHistory(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
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
        const cash = parseFloat(inputs.cash_in_hand) || 0;
        const debt = parseFloat(stats.total_outstanding_debt) || 0;
        const inventory = parseFloat(stats.inventory_value) || 0;
        const expenses = parseFloat(stats.total_expenses) || 0;
        const capital = parseFloat(stats.business_capital) || 0;

        return (inventory + cash + debt) - expenses - capital;
    };

    const handleSaveReport = async () => {
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const response = await api.post('/admin/report.php?action=create', {
                cash_in_hand: parseFloat(inputs.cash_in_hand) || 0,
                start_date: dateRange.start,
                end_date: dateRange.end
            });

            if (response.data.success) {
                setSuccessMsg('Report saved successfully!');
                setInputs({ cash_in_hand: '' });
                fetchStats();
            }
        } catch (err) {
            console.error('Error saving report:', err);
            setError(err.response?.data?.message || 'Failed to save report');
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
                            <td>Inventory Value (In Stock)</td>
                            <td>${formatCurrency(report.inventory_value)}</td>
                        </tr>
                        <tr>
                            <td>Total Cash (Money in Account)</td>
                            <td>${formatCurrency(report.cash_in_hand)}</td>
                        </tr>
                        <tr>
                            <td>Total Outstanding Debt</td>
                            <td>${formatCurrency(report.total_debt)}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Assets</strong></td>
                            <td><strong>${formatCurrency(parseFloat(report.inventory_value) + parseFloat(report.cash_in_hand) + parseFloat(report.total_debt))}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="2" style="background-color: #eee;"></td>
                        </tr>
                        <tr>
                            <td>Total Expenses (${expensePeriodText})</td>
                            <td>- ${formatCurrency(report.total_expenses)}</td>
                        </tr>
                        <tr>
                            <td>Business Capital</td>
                            <td>- ${formatCurrency(report.business_capital)}</td>
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
                        <div className="report-card">
                            {error && <div className="error-message">{error}</div>}
                            {successMsg && <div className="success-message" style={{ color: 'green', marginBottom: '15px' }}>{successMsg}</div>}

                            <div className="period-selector">
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
                                    title="Inventory Value (In Stock)"
                                    value={formatCurrency(stats.inventory_value)}
                                    icon={ShoppingBag}
                                    color="info"
                                    subtitle="Current stock value"
                                />
                                <MetricCard
                                    title={`Sales (${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()})`}
                                    value={formatCurrency(stats.total_sales)}
                                    icon={DollarSign}
                                    color="success"
                                    subtitle="Total sales in period"
                                />
                                <MetricCard
                                    title={`Expenses (${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()})`}
                                    value={formatCurrency(stats.total_expenses)}
                                    icon={Receipt}
                                    color="danger"
                                    subtitle="Total spending in period"
                                />
                                <MetricCard
                                    title="Total Outstanding Debt"
                                    value={formatCurrency(stats.total_outstanding_debt)}
                                    icon={ShoppingBag}
                                    color="warning"
                                    subtitle="Current money owed to business"
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

                            <div className="result-section">
                                <h2>Net Profit / Loss</h2>
                                <p className={`net-profit ${calculateNetProfit() < 0 ? 'negative' : ''}`}>
                                    {formatCurrency(calculateNetProfit())}
                                </p>
                                <p className="formula-hint">
                                    (Inventory + Cash + Debt) - Expenses - Capital
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
                        <div className="table-container">
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
                    )}
                </div>
            </main>
        </div>
    );
};

export default Report;
