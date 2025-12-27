import React, { useState, useEffect } from 'react';
import axios from '../../utils/api';
import {
    Package,
    TrendingUp,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    HelpCircle,
    Info
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell
} from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import './ABCAnalysis.css';

const ABCAnalysis = () => {
    const [loading, setLoading] = useState(true);
    const [abcData, setAbcData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [totalProfit, setTotalProfit] = useState(0);
    const [error, setError] = useState(null);
    const [visibleRows, setVisibleRows] = useState(15);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/admin/abc_analysis.php');
            if (response.data.success) {
                setAbcData(response.data.data);
                setSummary(response.data.summary);
                setTotalProfit(response.data.total_profit);
            }
            setError(null);
        } catch (err) {
            console.error('Error fetching ABC analysis:', err);
            setError('Failed to load ABC inventory analysis');
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
            title="ABC Inventory Analysis"
            subtitle="Identify products that drive 80% of your business profit"
            loading={loading}
            error={error}
        >
            <div className="abc-alerts">
                <div className="info-card glass-card">
                    <Info size={20} />
                    <div className="info-content">
                        <strong>What is ABC Analysis?</strong>
                        <p>It categorizes inventory based on profitability:
                            <span className="cat-a"> [A] 80% Profit</span>,
                            <span className="cat-b"> [B] 15% Profit</span>,
                            <span className="cat-c"> [C] 5% Profit</span>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="abc-metrics-grid">
                <div className="abc-metric-card category-a glass-card">
                    <div className="cat-tag">Category A</div>
                    <div className="metric-body">
                        <h3>{summary?.A?.count || 0} Models</h3>
                        <p className="profit-val">{formatCurrency(summary?.A?.profit)}</p>
                        <p className="share-text">~80% of Total Profit</p>
                    </div>
                </div>
                <div className="abc-metric-card category-b glass-card">
                    <div className="cat-tag">Category B</div>
                    <div className="metric-body">
                        <h3>{summary?.B?.count || 0} Models</h3>
                        <p className="profit-val">{formatCurrency(summary?.B?.profit)}</p>
                        <p className="share-text">~15% of Total Profit</p>
                    </div>
                </div>
                <div className="abc-metric-card category-c glass-card">
                    <div className="cat-tag">Category C</div>
                    <div className="metric-body">
                        <h3>{summary?.C?.count || 0} Models</h3>
                        <p className="profit-val">{formatCurrency(summary?.C?.profit)}</p>
                        <p className="share-text">~5% of Total Profit</p>
                    </div>
                </div>
            </div>

            <div className="analysis-grid-layout">
                {/* Left: Table Section (Takes 2/3) */}
                <div className="data-section glass-card">
                    <div className="section-header">
                        <Package />
                        <h2>Inventory Performance Table</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="abc-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Brand & Model</th>
                                    <th>Units Sold</th>
                                    <th>Revenue</th>
                                    <th>Profit</th>
                                    <th>Margin</th>
                                    <th>Cumulative %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abcData.slice(0, visibleRows).map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <span className={`cat-badge cat-${item.category.toLowerCase()}`}>
                                                {item.category}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="model-info">
                                                <span className="brand">{item.brand}</span>
                                                <span className="model">{item.model}</span>
                                            </div>
                                        </td>
                                        <td>{item.units_sold}</td>
                                        <td>{formatCurrency(item.total_revenue)}</td>
                                        <td className="bold">{formatCurrency(item.total_profit)}</td>
                                        <td>
                                            <div className="margin-indicator">
                                                <span className="margin-text">{item.profit_margin}%</span>
                                                <div className="margin-bar">
                                                    <div className="margin-fill" style={{ width: `${item.profit_margin}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="cum-perc">{item.cumulative_percentage}%</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {visibleRows < abcData.length && (
                        <div className="load-more-btn-container">
                            <button className="load-more-btn" onClick={loadMore}>
                                Load More Products
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Recommendations (Takes 1/3) */}
                <div className="recommendation-sidebar">
                    <div className="recommendation-card glass-card">
                        <div className="card-header">
                            <TrendingUp size={20} className="icon-blue" />
                            <h3>Strategic Recommendations</h3>
                        </div>
                        <ul className="rec-list">
                            <li className="rec-item item-a">
                                <div className="rec-badge badge-a">Category A</div>
                                <div className="rec-content">
                                    <strong>High Priority</strong>
                                    <p>Ensure these are NEVER out of stock. Optimized supply chain for these models.</p>
                                </div>
                            </li>
                            <li className="rec-item item-b">
                                <div className="rec-badge badge-b">Category B</div>
                                <div className="rec-content">
                                    <strong>Target for Growth</strong>
                                    <p>Can we increase their price or reduce cost to move them into A?</p>
                                </div>
                            </li>
                            <li className="rec-item item-c">
                                <div className="rec-badge badge-c">Category C</div>
                                <div className="rec-content">
                                    <strong>Low Priority</strong>
                                    <p>Consider liquidating or reducing stock levels. Don't tie up capital here.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ABCAnalysis;
