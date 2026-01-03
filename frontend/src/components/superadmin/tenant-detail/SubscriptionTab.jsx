import { useState, useEffect } from 'react';
import { CreditCard, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../../../utils/api';
import './SubscriptionTab.css';

const SubscriptionTab = ({ tenantId }) => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [upgrading, setUpgrading] = useState(false);
    const [daysToExtend, setDaysToExtend] = useState('');
    const [extending, setExtending] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const plans = ['Trial', 'Basic', 'Premium', 'Enterprise'];

    useEffect(() => {
        if (tenantId) {
            fetchSubscription();
        }
    }, [tenantId]);

    const fetchSubscription = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get(`/superadmin/tenant_subscription.php?action=current_plan&tenant_id=${tenantId}`);

            if (response.data.success) {
                setSubscription(response.data.subscription);
                setSelectedPlan(response.data.subscription.subscription_plan || 'Trial');
            } else {
                setError(response.data.error || 'Failed to load subscription data');
            }
        } catch (err) {
            console.error('Error fetching subscription:', err);
            setError(err.response?.data?.error || 'Failed to load subscription details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpgradeClick = () => {
        if (selectedPlan === subscription.subscription_plan) {
            alert('Please select a different plan to upgrade');
            return;
        }
        setShowUpgradeModal(true);
    };

    const handleUpgradeConfirm = async () => {
        try {
            setUpgrading(true);
            setShowUpgradeModal(false);

            const response = await api.post('/superadmin/tenant_subscription.php?action=upgrade', {
                tenant_id: tenantId,
                new_plan: selectedPlan
            });

            if (response.data.success) {
                alert(`Successfully upgraded to ${selectedPlan} plan`);
                fetchSubscription();
            } else {
                alert(response.data.error || 'Upgrade failed');
            }
        } catch (err) {
            console.error('Error upgrading plan:', err);
            alert(err.response?.data?.error || 'Failed to upgrade plan');
        } finally {
            setUpgrading(false);
        }
    };

    const handleExtendTrial = async () => {
        const days = parseInt(daysToExtend);

        if (!days || days <= 0) {
            alert('Please enter a valid number of days (greater than 0)');
            return;
        }

        try {
            setExtending(true);

            const response = await api.post('/superadmin/tenant_subscription.php?action=extend_trial', {
                tenant_id: tenantId,
                days: days
            });

            if (response.data.success) {
                alert(`Trial extended by ${days} days`);
                setDaysToExtend('');
                fetchSubscription();
            } else {
                alert(response.data.error || 'Extension failed');
            }
        } catch (err) {
            console.error('Error extending trial:', err);
            alert(err.response?.data?.error || 'Failed to extend trial');
        } finally {
            setExtending(false);
        }
    };

    const getPlanColor = (plan) => {
        const colors = {
            'Trial': 'plan-trial',
            'Basic': 'plan-basic',
            'Premium': 'plan-premium',
            'Enterprise': 'plan-enterprise'
        };
        return colors[plan] || 'plan-trial';
    };

    const getStatusColor = (status) => {
        const colors = {
            'active': 'status-active',
            'cancelled': 'status-cancelled',
            'expired': 'status-expired',
            'trial': 'status-trial'
        };
        return colors[status] || 'status-active';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateDaysRemaining = (endDate) => {
        if (!endDate) return null;
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return (
            <div className="subscription-tab skeleton-mode">
                <SkeletonLoader type="card" />
                <div style={{ marginTop: '2rem' }}>
                    <SkeletonLoader type="card" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <AlertCircle size={48} />
                <h3>Error Loading Subscription</h3>
                <p>{error}</p>
                <button onClick={fetchSubscription} className="btn-retry">Retry</button>
            </div>
        );
    }

    const daysRemaining = calculateDaysRemaining(subscription?.trial_end_date || subscription?.subscription_end_date);

    return (
        <div className="subscription-tab">
            {/* Current Plan Card */}
            <div className="current-plan-card">
                <div className="card-header">
                    <h3><CreditCard size={24} /> Current Subscription</h3>
                </div>

                <div className="plan-details">
                    <div className="plan-info">
                        <div className="plan-badge-container">
                            <span className={`plan-badge ${getPlanColor(subscription?.subscription_plan)}`}>
                                {subscription?.subscription_plan || 'Trial'}
                            </span>
                            <span className={`status-badge ${getStatusColor(subscription?.status)}`}>
                                {subscription?.status || 'Active'}
                            </span>
                        </div>

                        <div className="plan-meta">
                            <div className="meta-item">
                                <Calendar size={18} />
                                <div>
                                    <label>Start Date</label>
                                    <span>{formatDate(subscription?.subscription_start_date || subscription?.trial_start_date)}</span>
                                </div>
                            </div>
                            <div className="meta-item">
                                <Calendar size={18} />
                                <div>
                                    <label>End Date</label>
                                    <span>{formatDate(subscription?.subscription_end_date || subscription?.trial_end_date)}</span>
                                </div>
                            </div>
                            {daysRemaining !== null && (
                                <div className="meta-item">
                                    <Clock size={18} />
                                    <div>
                                        <label>Days Remaining</label>
                                        <span className={daysRemaining < 7 ? 'text-warning' : ''}>{daysRemaining} days</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {subscription?.subscription_plan === 'Trial' && daysRemaining < 7 && (
                        <div className="trial-warning">
                            <AlertCircle size={20} />
                            <span>Trial ending soon. Consider upgrading to a paid plan.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Plan Upgrade Section */}
            <div className="upgrade-section">
                <div className="section-header">
                    <h3><TrendingUp size={24} /> Manage Plan</h3>
                </div>

                <div className="upgrade-content">
                    <div className="upgrade-form">
                        <label>Select New Plan</label>
                        <select
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            disabled={upgrading}
                        >
                            {plans.map(plan => (
                                <option
                                    key={plan}
                                    value={plan}
                                    disabled={plan === subscription?.subscription_plan}
                                >
                                    {plan} {plan === subscription?.subscription_plan ? '(Current)' : ''}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleUpgradeClick}
                            disabled={upgrading || selectedPlan === subscription?.subscription_plan}
                            className="btn-upgrade"
                        >
                            {upgrading ? 'Upgrading...' : 'Upgrade Plan'}
                        </button>
                    </div>

                    <div className="plan-features">
                        <h4>Plan Features</h4>
                        <div className="features-grid">
                            <div className={`feature-card ${selectedPlan === 'Trial' ? 'selected' : ''}`}>
                                <h5>Trial</h5>
                                <ul>
                                    <li><CheckCircle size={16} /> 14-day trial</li>
                                    <li><CheckCircle size={16} /> Basic features</li>
                                    <li><CheckCircle size={16} /> Limited support</li>
                                </ul>
                            </div>
                            <div className={`feature-card ${selectedPlan === 'Basic' ? 'selected' : ''}`}>
                                <h5>Basic</h5>
                                <ul>
                                    <li><CheckCircle size={16} /> All trial features</li>
                                    <li><CheckCircle size={16} /> Email support</li>
                                    <li><CheckCircle size={16} /> 100 products</li>
                                </ul>
                            </div>
                            <div className={`feature-card ${selectedPlan === 'Premium' ? 'selected' : ''}`}>
                                <h5>Premium</h5>
                                <ul>
                                    <li><CheckCircle size={16} /> All basic features</li>
                                    <li><CheckCircle size={16} /> Priority support</li>
                                    <li><CheckCircle size={16} /> 1000 products</li>
                                    <li><CheckCircle size={16} /> Advanced analytics</li>
                                </ul>
                            </div>
                            <div className={`feature-card ${selectedPlan === 'Enterprise' ? 'selected' : ''}`}>
                                <h5>Enterprise</h5>
                                <ul>
                                    <li><CheckCircle size={16} /> Unlimited products</li>
                                    <li><CheckCircle size={16} /> 24/7 support</li>
                                    <li><CheckCircle size={16} /> Custom integrations</li>
                                    <li><CheckCircle size={16} /> Dedicated account manager</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trial Extension Section - Only show if on trial */}
            {subscription?.subscription_plan === 'Trial' && (
                <div className="trial-extension-section">
                    <div className="section-header">
                        <h3><Clock size={24} /> Extend Trial Period</h3>
                    </div>

                    <div className="extension-form">
                        <div className="form-group">
                            <label>Days to Add</label>
                            <input
                                type="number"
                                min="1"
                                max="30"
                                value={daysToExtend}
                                onChange={(e) => setDaysToExtend(e.target.value)}
                                placeholder="Enter number of days"
                                disabled={extending}
                            />
                            <span className="form-hint">Current trial ends: {formatDate(subscription?.trial_end_date)}</span>
                        </div>

                        <button
                            onClick={handleExtendTrial}
                            disabled={extending || !daysToExtend}
                            className="btn-extend"
                        >
                            {extending ? 'Extending...' : 'Extend Trial'}
                        </button>
                    </div>
                </div>
            )}

            {/* Upgrade Confirmation Modal */}
            {showUpgradeModal && (
                <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Confirm Plan Upgrade</h3>
                        <p>
                            Are you sure you want to upgrade this tenant from
                            <strong> {subscription?.subscription_plan}</strong> to
                            <strong> {selectedPlan}</strong>?
                        </p>
                        <div className="modal-actions">
                            <button onClick={() => setShowUpgradeModal(false)} className="btn-cancel">
                                Cancel
                            </button>
                            <button onClick={handleUpgradeConfirm} className="btn-confirm">
                                Confirm Upgrade
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionTab;
