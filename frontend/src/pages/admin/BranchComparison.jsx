import React, { useState, useEffect } from 'react';
import axios from '../../utils/api';
import {
    GitBranch,
    TrendingUp,
    ArrowRight,
    Award,
    BarChart2,
    Calendar,
    Filter
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import './BranchComparison.css';

const BranchComparison = () => {
    const [loading, setLoading] = useState(true);
    const [comparisonData, setComparisonData] = useState([]);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const { showError } = useNotification();
    const [visibleRows, setVisibleRows] = useState(15);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/admin/branch_comparison.php?start_date=${dateRange.start}&end_date=${dateRange.end}`);
            if (response.data.success) {
                setComparisonData(response.data.data);
                setVisibleRows(15); // Reset visible rows on new fetch
            }
        } catch (err) {
            console.error('Error fetching branch comparison:', err);
            showError('Failed to load multi-branch comparison');
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

    const topPerformer = comparisonData.length > 0 ? comparisonData[0] : null;

    return (
        <AdminLayout
            title="Multi-Branch Comparison"
            subtitle="Compare performance metrics across all your business locations"
            loading={loading}
            error={null}
        >
            <div className="filter-area mb-24 glass-card">
                <div className="date-inputs">
                    <div className="input-group">
                        <label><Calendar size={14} /> From</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label><Calendar size={14} /> To</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                </div>
                <button className="btn-filter" onClick={fetchData}>
                    <Filter size={16} /> Update Result
                </button>
            </div>

            {topPerformer && (
                <div className="top-performer-card glass-card">
                    <div className="award-icon">
                        <Award size={48} />
                    </div>
                    <div className="award-content">
                        <h2>Top Performing Branch: {topPerformer.shop_name}</h2>
                        <div className="award-metrics">
                            <div className="award-m">
                                <span>Net Profit</span>
                                <strong>{formatCurrency(topPerformer.net_profit)}</strong>
                            </div>
                            <div className="award-m">
                                <span>Efficiency (Margin)</span>
                                <strong>{topPerformer.net_margin}%</strong>
                            </div>
                        </div>
                    </div>
                    <div className="award-badge">
                        #1 PERFOMER
                    </div>
                </div>
            )}

            <div className="charts-grid">
                <div className="chart-card glass-card">
                    <div className="card-header">
                        <BarChart2 size={20} />
                        <h3>Sales vs Net Profit per Branch</h3>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="shop_name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="total_sales" name="Total Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="net_profit" name="Net Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card glass-card">
                    <div className="card-header">
                        <TrendingUp size={20} />
                        <h3>Profit Distribution</h3>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={comparisonData.filter(d => d.net_profit > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="net_profit"
                                    nameKey="shop_name"
                                >
                                    {comparisonData.filter(d => d.net_profit > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="table-section glass-card">
                <div className="section-header">
                    <GitBranch />
                    <h2>Detailed Performance Breakdown</h2>
                </div>
                <div className="table-wrapper">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Branch Name</th>
                                <th>Location</th>
                                <th>Total Sales</th>
                                <th>Gross Profit</th>
                                <th>Expenses</th>
                                <th>Net Profit</th>
                                <th>Net Margin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparisonData.slice(0, visibleRows).map((shop) => (
                                <tr key={shop.shop_id}>
                                    <td className="bold">{shop.shop_name}</td>
                                    <td>{shop.location}</td>
                                    <td>{formatCurrency(shop.total_sales)}</td>
                                    <td>{formatCurrency(shop.gross_profit)}</td>
                                    <td className="text-red">{formatCurrency(shop.total_expenses)}</td>
                                    <td className={`bold ${shop.net_profit >= 0 ? 'text-green' : 'text-red'}`}>
                                        {formatCurrency(shop.net_profit)}
                                    </td>
                                    <td>
                                        <div className="margin-tag" style={{
                                            backgroundColor: shop.net_margin >= 20 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: shop.net_margin >= 20 ? '#22c55e' : '#f59e0b'
                                        }}>
                                            {shop.net_margin}%
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {visibleRows < comparisonData.length && (
                    <div className="load-more-container">
                        <button className="btn-load-more" onClick={loadMore}>
                            Load More Branches
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default BranchComparison;
