import React, { useState, useEffect } from 'react';
import axios from '../../utils/api';
import {
    Target,
    TrendingUp,
    TrendingDown,
    Save,
    Calendar,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    CheckCircle2
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
    RadialBarChart,
    RadialBar
} from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import './Budgeting.css';

const Budgeting = () => {
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [performance, setPerformance] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [currency, setCurrency] = useState('₦');
    const [budgetForm, setBudgetForm] = useState({
        target_sales: 0,
        target_profit: 0,
        max_expenses: 0
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        fetchShopSettings();
    }, []);

    useEffect(() => {
        fetchPerformance();
    }, [month]);

    const fetchShopSettings = async () => {
        try {
            const response = await axios.get('/admin/get_shop_settings.php');
            if (response.data.success) {
                // Determine currency - fallback to ₦ if not set
                setCurrency(response.data.settings.currency || '₦');
            }
        } catch (err) {
            console.error('Error fetching shop settings:', err);
        }
    };

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/admin/budgets.php?action=performance&month=${month}`);
            if (response.data.success) {
                setPerformance(response.data);
                setBudgetForm({
                    target_sales: response.data.budget.target_sales,
                    target_profit: response.data.budget.target_profit,
                    max_expenses: response.data.budget.max_expenses
                });
            }
        } catch (err) {
            console.error('Error fetching budget performance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await axios.post('/admin/budgets.php?action=save', {
                budget_month: month,
                ...budgetForm
            });
            if (response.data.success) {
                setMsg({ type: 'success', text: 'Budget saved!' });
                setEditMode(false);
                fetchPerformance();
                setTimeout(() => setMsg(null), 3000);
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Failed to save budget' });
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount) => {
        return `${currency}${new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0)}`;
    };

    const calculatePercentage = (actual, target) => {
        if (!target || target === 0) return 0;
        return Math.round((actual / target) * 100);
    };

    const radialData = [
        { name: 'Sales', value: Math.min(calculatePercentage(performance?.actuals?.sales, performance?.budget?.target_sales), 100), fill: '#3b82f6' },
        { name: 'Profit', value: Math.min(calculatePercentage(performance?.actuals?.net_profit, performance?.budget?.target_profit), 100), fill: '#22c55e' },
        { name: 'Expenses', value: performance?.actuals?.total_expenses > performance?.budget?.max_expenses ? 100 : calculatePercentage(performance?.actuals?.total_expenses, performance?.budget?.max_expenses), fill: '#ef4444' }
    ];

    const comparisonData = [
        {
            name: 'Sales',
            Target: parseFloat(performance?.budget?.target_sales || 0),
            Actual: parseFloat(performance?.actuals?.sales || 0)
        },
        {
            name: 'Profit',
            Target: parseFloat(performance?.budget?.target_profit || 0),
            Actual: parseFloat(performance?.actuals?.net_profit || 0)
        },
        {
            name: 'Expenses',
            Target: parseFloat(performance?.budget?.max_expenses || 0),
            Actual: parseFloat(performance?.actuals?.total_expenses || 0)
        }
    ];

    return (
        <AdminLayout
            title="Targets & Budgeting"
            subtitle="Set goals and track monthly performance variance"
            loading={loading && !performance}
        >
            <div className="budget-top-bar">
                <div className="month-picker">
                    <button onClick={() => {
                        const d = new Date(month + '-01');
                        d.setMonth(d.getMonth() - 1);
                        setMonth(d.toISOString().slice(0, 7));
                    }}><ChevronLeft size={20} /></button>
                    <span>{new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => {
                        const d = new Date(month + '-01');
                        d.setMonth(d.getMonth() + 1);
                        setMonth(d.toISOString().slice(0, 7));
                    }}><ChevronRight size={20} /></button>
                </div>
            </div>

            {msg && <div className={`alert-toast ${msg.type}`}><CheckCircle2 size={18} /> {msg.text}</div>}

            <div className="budget-grid">
                {/* SET BUDGET FORM */}
                <section className="budget-card edit-section">
                    <div className="card-header">
                        <Target size={20} className="text-primary" />
                        <h2>Monthly Targets</h2>
                        <button className="btn-toggle" onClick={() => setEditMode(!editMode)}>
                            {editMode ? 'Cancel' : 'Edit Targets'}
                        </button>
                    </div>

                    <div className="form-grid">
                        <div className="input-group">
                            <label>Target Sales Revenue</label>
                            <div className="input-with-symbol">
                                <span className="symbol">{currency}</span>
                                <input
                                    type="number"
                                    disabled={!editMode}
                                    value={budgetForm.target_sales}
                                    onChange={(e) => setBudgetForm({ ...budgetForm, target_sales: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Target Net Profit</label>
                            <div className="input-with-symbol">
                                <span className="symbol">{currency}</span>
                                <input
                                    type="number"
                                    disabled={!editMode}
                                    value={budgetForm.target_profit}
                                    onChange={(e) => setBudgetForm({ ...budgetForm, target_profit: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Max Total Outflows (Opex + Inventory)</label>
                            <div className="input-with-symbol">
                                <span className="symbol">{currency}</span>
                                <input
                                    type="number"
                                    disabled={!editMode}
                                    value={budgetForm.max_expenses}
                                    onChange={(e) => setBudgetForm({ ...budgetForm, max_expenses: e.target.value })}
                                />
                            </div>
                        </div>
                        {editMode && (
                            <button className="btn-save" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : <><Save size={18} /> Save Budget</>}
                            </button>
                        )}
                    </div>
                </section>

                {/* VISUAL PROGRESS */}
                <section className="budget-card progress-section">
                    <div className="card-header">
                        <TrendingUp size={20} className="text-success" />
                        <h2>Goal Achievement</h2>
                    </div>
                    <div className="radial-wrapper" style={{ width: '100%', height: 300, minHeight: 300, minWidth: 0, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="30%"
                                outerRadius="100%"
                                barSize={20}
                                data={radialData}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar
                                    minAngle={15}
                                    background
                                    clockWise
                                    dataKey="value"
                                    label={{ fill: '#fff', position: 'insideStart', fontSize: 10 }}
                                />
                                <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" />
                                <Tooltip formatter={(value) => `${value}%`} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <div className="variance-section">
                <div className="section-header">
                    <h2>Variance Analysis</h2>
                    <p>Comparison of Actual values vs Targets for {new Date(month + '-01').toLocaleDateString(undefined, { month: 'long' })}</p>
                </div>

                <div className="variance-grid">
                    <div className="v-card">
                        <span className="v-label">Sales Performance</span>
                        <div className="v-detail">
                            <div className="v-item">
                                <span>Target</span>
                                <strong>{formatCurrency(performance?.budget?.target_sales)}</strong>
                            </div>
                            <div className="v-divider"></div>
                            <div className="v-item">
                                <span>Actual</span>
                                <strong>{formatCurrency(performance?.actuals?.sales)}</strong>
                            </div>
                        </div>
                        <div className={`v-footer ${performance?.variance?.sales >= 0 ? 'pos' : 'neg'}`}>
                            {performance?.variance?.sales >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            <span>{performance?.variance?.sales >= 0 ? 'Over Target' : 'Under Target'} by {formatCurrency(Math.abs(performance?.variance?.sales))} ({calculatePercentage(performance?.actuals?.sales, performance?.budget?.target_sales)}%)</span>
                        </div>
                    </div>

                    <div className="v-card">
                        <span className="v-label">Expense & Stock Control</span>
                        <div className="v-detail">
                            <div className="v-item">
                                <span>Budget</span>
                                <strong>{formatCurrency(performance?.budget?.max_expenses)}</strong>
                            </div>
                            <div className="v-divider"></div>
                            <div className="v-item">
                                <span>Actual (Total)</span>
                                <strong>{formatCurrency(performance?.actuals?.total_expenses)}</strong>
                            </div>
                        </div>
                        <div className="v-breakdown mt-12 mb-12">
                            <div className="flex justify-between text-xs text-secondary">
                                <span>Operating Expenses:</span>
                                <span>{formatCurrency(performance?.actuals?.operating_expenses)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-secondary mt-4">
                                <span>Inventory Purchases:</span>
                                <span>{formatCurrency(performance?.actuals?.inventory_purchases)}</span>
                            </div>
                        </div>
                        <div className={`v-footer ${performance?.variance?.expenses >= 0 ? 'pos' : 'neg'}`}>
                            {performance?.variance?.expenses >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            <span>{performance?.variance?.expenses >= 0 ? 'Under Budget' : 'Over Budget'} by {formatCurrency(Math.abs(performance?.variance?.expenses))}</span>
                        </div>
                    </div>

                    <div className="v-card">
                        <span className="v-label">Net Profit Achievement</span>
                        <div className="v-detail">
                            <div className="v-item">
                                <span>Target</span>
                                <strong>{formatCurrency(performance?.budget?.target_profit)}</strong>
                            </div>
                            <div className="v-divider"></div>
                            <div className="v-item">
                                <span>Actual</span>
                                <strong>{formatCurrency(performance?.actuals?.net_profit)}</strong>
                            </div>
                        </div>
                        <div className={`v-footer ${performance?.variance?.net_profit >= 0 ? 'pos' : 'neg'}`}>
                            {performance?.variance?.net_profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            <span>{performance?.variance?.net_profit >= 0 ? 'Profitable' : 'Loss/Under Target'} by {formatCurrency(Math.abs(performance?.variance?.net_profit))} ({calculatePercentage(performance?.actuals?.net_profit, performance?.budget?.target_profit)}%)</span>
                        </div>
                    </div>
                </div>

                {performance && (
                    <div className="comparison-chart-section mt-32">
                        <h3 className="text-lg font-bold mb-16">Target vs Actual Comparison</h3>
                        <div className="chart-container" style={{ width: '100%', height: 350, minHeight: 350, minWidth: 0, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => `${currency}${value >= 1000 ? (value / 1000) + 'k' : value}`} />
                                    <Tooltip
                                        formatter={(value) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="Target" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={40} />
                                    <Bar dataKey="Actual" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default Budgeting;
