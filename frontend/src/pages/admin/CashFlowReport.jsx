import React, { useState, useEffect } from 'react';
import axios from '../../utils/api';
import {
    DollarSign,
    ArrowUpCircle,
    ArrowDownCircle,
    TrendingUp,
    Calendar,
    Activity,
    Landmark
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import './CashFlowReport.css';

const CashFlowReport = () => {
    const [loading, setLoading] = useState(true);
    const [cashFlowData, setCashFlowData] = useState([]);
    const [visibleRows, setVisibleRows] = useState(15);

    // Date Range State
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Last 30 days
        endDate: new Date().toISOString().split('T')[0]
    });
    const [rangeType, setRangeType] = useState('30days'); // 7days, 30days, thisMonth, custom

    const [summary, setSummary] = useState({
        inflow: 0,
        outflow: 0,
        net: 0,
        balance: 0,
        opening: 0
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
        setVisibleRows(15); // Reset visible rows on date change
    }, [dateRange]); // Refetch when date range changes

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRangeChange = (type) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (type) {
            case '7days':
                start.setDate(today.getDate() - 7);
                break;
            case '30days':
                start.setDate(today.getDate() - 30);
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            default:
                break;
        }

        setRangeType(type);
        setIsDropdownOpen(false);
        if (type !== 'custom') {
            setDateRange({
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            });
        }
    };

    const getRangeLabel = () => {
        switch (rangeType) {
            case '7days': return 'Last 7 Days';
            case '30days': return 'Last 30 Days';
            case 'thisMonth': return 'This Month';
            case 'lastMonth': return 'Last Month';
            case 'custom': return 'Custom Range';
            default: return 'Select Range';
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/admin/cash_flow.php?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`);
            if (response.data.success) {
                setCashFlowData(response.data.data);

                // Use backend provided period summary
                if (response.data.period_summary) {
                    setSummary({
                        inflow: response.data.period_summary.inflow,
                        outflow: response.data.period_summary.outflow,
                        net: response.data.period_summary.net,
                        balance: response.data.period_summary.closing_balance,
                        opening: response.data.period_summary.opening_balance
                    });
                } else {
                    // Fallback calculation
                    const data = response.data.data;
                    const inflow = data.reduce((acc, curr) => acc + curr.inflow, 0);
                    const outflow = data.reduce((acc, curr) => acc + curr.outflow, 0);
                    setSummary({
                        inflow,
                        outflow,
                        net: inflow - outflow,
                        balance: response.data.current_balance,
                        opening: 0
                    });
                }
            }
            setError(null);
        } catch (err) {
            console.error('Error fetching cash flow:', err);
            setError('Failed to load cash flow analysis');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        setVisibleRows(prev => prev + 15);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <AdminLayout
            title="Cash Flow Analysis"
            subtitle="Track your liquidity and movement of funds"
            loading={loading}
            error={error}
        >
            <div className="cf-actions mb-24">
                <div className="filter-group">
                    {/* Date Range Dropdown */}
                    <div className="date-range-dropdown" ref={dropdownRef}>
                        <div
                            className="dropdown-trigger"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span>{getRangeLabel()}</span>
                            <Calendar size={16} />
                        </div>

                        {isDropdownOpen && (
                            <div className="dropdown-menu">
                                <button className={`dropdown-item ${rangeType === '7days' ? 'active' : ''}`} onClick={() => handleRangeChange('7days')}>Last 7 Days</button>
                                <button className={`dropdown-item ${rangeType === '30days' ? 'active' : ''}`} onClick={() => handleRangeChange('30days')}>Last 30 Days</button>
                                <button className={`dropdown-item ${rangeType === 'thisMonth' ? 'active' : ''}`} onClick={() => handleRangeChange('thisMonth')}>This Month</button>
                                <button className={`dropdown-item ${rangeType === 'lastMonth' ? 'active' : ''}`} onClick={() => handleRangeChange('lastMonth')}>Last Month</button>
                                <button className={`dropdown-item ${rangeType === 'custom' ? 'active' : ''}`} onClick={() => handleRangeChange('custom')}>Custom Range</button>
                            </div>
                        )}
                    </div>

                    {/* Custom Date Inputs (only visible if custom selected) */}
                    {rangeType === 'custom' && (
                        <div className="custom-range-inputs">
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="input-date"
                            />
                            <span className="separator">to</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="input-date"
                            />
                        </div>
                    )}
                </div>

                <button className="btn-refresh" onClick={fetchData}>
                    <Activity size={18} />
                    <span>Refresh Data</span>
                </button>
            </div>

            <div className="metrics-grid">
                <div className="cf-card inflow">
                    <div className="card-icon"><ArrowUpCircle size={24} /></div>
                    <div className="card-info">
                        <span className="card-label">Period Inflow</span>
                        <h3>{formatCurrency(summary.inflow)}</h3>
                        <p className="card-desc">Total cash earned from sales & payments in this period</p>
                    </div>
                </div>
                <div className="cf-card outflow">
                    <div className="card-icon"><ArrowDownCircle size={24} /></div>
                    <div className="card-info">
                        <span className="card-label">Period Outflow</span>
                        <h3>{formatCurrency(summary.outflow)}</h3>
                        <p className="card-desc">Total spent on expenses & inventory purchases in this period</p>
                    </div>
                </div>
                <div className="cf-card net">
                    <div className="card-icon"><Activity size={24} /></div>
                    <div className="card-info">
                        <span className="card-label">Net Period Flow</span>
                        <h3 className={summary.net >= 0 ? 'text-green' : 'text-red'}>
                            {formatCurrency(summary.net)}
                        </h3>
                        <p className="card-desc">Difference between inflow and outflow for the selected timeframe</p>
                    </div>
                </div>
                <div className="cf-card balance">
                    <div className="card-icon"><Landmark size={24} /></div>
                    <div className="card-info">
                        <span className="card-label">Closing Balance</span>
                        <h3>{formatCurrency(summary.balance)}</h3>
                        <span className="balance-meta">Op. Bal: {formatCurrency(summary.opening)}</span>
                        <p className="card-desc">Final cash position including capital & previous earnings</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <div className="chart-header">
                        <h3><TrendingUp size={18} /> Cash Balance Trend</h3>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={cashFlowData}>
                                <defs>
                                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    interval="preserveStartEnd"
                                />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#8b5cf6"
                                    fillOpacity={1}
                                    fill="url(#colorBal)"
                                    strokeWidth={2}
                                    name="Balance"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h3><Activity size={18} /> Daily Inflow vs Outflow</h3>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={cashFlowData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend />
                                <Bar dataKey="inflow" name="Inflow" fill="#22c55e" radius={[2, 2, 0, 0]} />
                                <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="table-section">
                <div className="table-header">
                    <h3><Calendar size={18} /> Daily Transaction Summary</h3>
                </div>
                <div className="table-wrapper">
                    <table className="cf-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Cash Inflow</th>
                                <th>Cash Outflow</th>
                                <th>Net Flow</th>
                                <th>Closing Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...cashFlowData].reverse().slice(0, visibleRows).map((row, idx) => (
                                <tr key={idx}>
                                    <td>{new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                    <td className="text-green">+{formatCurrency(row.inflow)}</td>
                                    <td className="text-red">-{formatCurrency(row.outflow)}</td>
                                    <td className={`bold ${row.net >= 0 ? 'text-green' : 'text-red'}`}>
                                        {formatCurrency(row.net)}
                                    </td>
                                    <td className="bold">{formatCurrency(row.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {visibleRows < cashFlowData.length && (
                    <div className="load-more-container">
                        <button className="btn-load-more" onClick={loadMore}>
                            Show More Transactions
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default CashFlowReport;
