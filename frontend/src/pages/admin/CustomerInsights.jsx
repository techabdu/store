import React, { useState, useEffect } from 'react';
import axios from '../../utils/api';
import MetricCard from '../../components/MetricCard';
import {
    Users,
    Star,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Calendar,
    Phone,
    User
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import './CustomerInsights.css';

const CustomerInsights = () => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [vips, setVips] = useState([]);
    const [atRisk, setAtRisk] = useState([]);
    const [topDebtors, setTopDebtors] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [summaryRes, vipsRes, atRiskRes, debtorsRes] = await Promise.all([
                axios.get('/admin/customer_analytics.php?action=summary'),
                axios.get('/admin/customer_analytics.php?action=vips'),
                axios.get('/admin/customer_analytics.php?action=at_risk'),
                axios.get('/admin/customer_analytics.php?action=top_debtors')
            ]);

            if (summaryRes.data.success) setSummary(summaryRes.data);
            if (vipsRes.data.success) setVips(vipsRes.data.customers);
            if (atRiskRes.data.success) setAtRisk(atRiskRes.data.customers);
            if (debtorsRes.data.success) setTopDebtors(debtorsRes.data.customers);

            setError(null);
        } catch (err) {
            console.error('Error fetching customer analytics:', err);
            setError('Failed to load customer insights');
        } finally {
            setLoading(false);
        }
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
            title="Customer Insights & Segmentation"
            subtitle="Understand your customers and drive targeted growth"
            loading={loading}
            error={error}
        >
            <div className="metrics-grid">
                <MetricCard
                    title="Total Customers"
                    value={summary?.metrics?.total_customers || 0}
                    icon={Users}
                    color="blue"
                />
                <MetricCard
                    title="Avg. Lifetime Value"
                    value={formatCurrency(summary?.metrics?.avg_ltv)}
                    icon={TrendingUp}
                    color="green"
                    subtitle="Average revenue generated per customer over their entire relationship"
                />
                <MetricCard
                    title="Total Outstanding Debt"
                    value={formatCurrency(summary?.metrics?.total_debt)}
                    icon={DollarSign}
                    color="red"
                />

            </div>

            <div className="segments-overview">
                <h2>Customer Segments</h2>
                <div className="segment-pills">
                    {summary?.segments?.map(seg => (
                        <div key={seg.segment} className={`segment-pill ${seg.segment.toLowerCase().replace(' ', '-')}`}>
                            <span className="segment-name">{seg.segment}</span>
                            <span className="segment-count">{seg.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="insights-grid">
                {/* VIP Customers Table */}
                <section className="insight-section">
                    <div className="section-header">
                        <Star className="icon-gold" />
                        <h2>Top VIP Customers</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="insights-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>LTV</th>
                                    <th>Orders</th>
                                    <th>Last Visit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vips.map(customer => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div className="customer-info">
                                                <span className="name">{customer.customer_name}</span>
                                                <span className="phone">{customer.customer_phone}</span>
                                            </div>
                                        </td>
                                        <td className="bold">{formatCurrency(customer.lifetime_value)}</td>
                                        <td>{customer.total_transactions}</td>
                                        <td>{new Date(customer.last_purchase_date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* At Risk Customers Table */}
                <section className="insight-section">
                    <div className="section-header">
                        <AlertTriangle className="icon-red" />
                        <h2>At-Risk Customers</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="insights-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Last Seen</th>
                                    <th>LTV</th>
                                    <th>Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atRisk.map(customer => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div className="customer-info">
                                                <span className="name">{customer.customer_name}</span>
                                                <span className="phone">{customer.customer_phone}</span>
                                            </div>
                                        </td>
                                        <td>{customer.days_since_last_purchase} days ago</td>
                                        <td>{formatCurrency(customer.lifetime_value)}</td>
                                        <td>
                                            <span className="badge-risk">Inactive</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Top Debtors Table */}
                <section className="insight-section full-width">
                    <div className="section-header">
                        <DollarSign className="icon-blue" />
                        <h2>Top Debtors</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="insights-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Debt</th>
                                    <th>Reliability</th>
                                    <th>Last Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topDebtors.map(customer => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div className="customer-info">
                                                <span className="name">{customer.customer_name}</span>
                                                <span className="phone">{customer.customer_phone}</span>
                                            </div>
                                        </td>
                                        <td className="text-red bold">{formatCurrency(customer.current_outstanding_debt)}</td>
                                        <td>
                                            <div className="score-wrapper">
                                                <div className="score-bar">
                                                    <div
                                                        className={`score-fill ${customer.payment_reliability_score * 100 < 50 ? 'bad' : customer.payment_reliability_score * 100 < 80 ? 'avg' : 'good'}`}
                                                        style={{ width: `${customer.payment_reliability_score * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span>{(customer.payment_reliability_score * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td>{customer.last_debt_payment_date ? new Date(customer.last_debt_payment_date).toLocaleDateString() : 'Never'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
};

export default CustomerInsights;
