import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaArrowLeft, FaClock } from 'react-icons/fa';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import ParticlesBackground from '../../components/landing/ParticlesBackground';
import { useNotification } from '../../context/NotificationContext';
import '../../styles/register.css';
import './Subscribe.css';

/**
 * Subscribe Page
 * 
 * Subscription page that mirrors the registration plan selection wizard
 * to maintain UI/UX consistency.
 */
const Subscribe = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { subscription } = useSubscription();
    const { showInfo } = useNotification();
    const [selectedPlan, setSelectedPlan] = useState(subscription?.plan || null);

    const plans = [
        {
            id: 'basic',
            name: 'Starter',
            price: 39999,
            originalPrice: 39999,
            isFree: true,
            currency: '₦',
            duration: '14 days free, then /month',
            features: [
                'Up to 29 items in inventory',
                'Last 50 sales in history',
                '2 User accounts (Admin + 1)',
                'Basic sales tracking',
                'POS system access',
                'Stock level alerts',
                'Basic reporting'
            ],
            recommended: false
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 50000,
            duration: 'per month',
            currency: '₦',
            features: [
                'Unlimited inventory items',
                'Unlimited sales history',
                'Unlimited User accounts',
                'Advanced analytics',
                'Priority support',
                'Receipt printing',
                'Finance Calculation',
                'Customer Management',
                'Multi-store management',
                'Debt Management'
            ],
            recommended: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 'Custom',
            duration: '',
            features: [
                'Unlimited everything',
                'Custom integrations',
                'Multi-user support',
                'Dedicated support',
                'API access'
            ],
            isContact: true,
            contactEmail: 'support@prhub.shop',
            recommended: false
        }
    ];

    const handleBack = () => {
        navigate(-1);
    };

    const handleSubscribe = (plan) => {
        if (plan.id === subscription?.plan) {
            showInfo("You are already on this plan.");
            return;
        }

        // This will be expanded with payment gateway integration
        showInfo(`${plan.name} plan subscription coming soon! Please contact support to upgrade manually.`);
    };

    return (
        <div className="register-page" data-theme="light">
            <ParticlesBackground />

            <div className="subscribe-page-wrapper">
                <button className="page-back-button" onClick={handleBack}>
                    <FaArrowLeft />
                    <span>Back</span>
                </button>

                <div className="register-container plan-selection">
                    <div className="register-header">
                        <div className="prhub-logo">PRHub</div>
                        <h1>Choose Your Plan</h1>
                        <p>Select the plan that best fits your business needs</p>
                    </div>

                    {/* Coming Soon Alert */}
                    <div className="sp-coming-soon-alert">
                        <FaClock className="alert-icon" />
                        <div className="alert-content">
                            <h3>Payment Integration Coming Soon</h3>
                            <p>We're currently finalizing our secure checkout system. For immediate upgrades, please reach out via email.</p>
                        </div>
                    </div>

                    <div className="plans-grid">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.recommended ? 'recommended' : ''} ${subscription?.plan === plan.id ? 'current-active' : ''}`}
                                onClick={() => !plan.isContact && setSelectedPlan(plan.id)}
                            >
                                {plan.recommended && <div className="recommended-badge">Recommended</div>}
                                {subscription?.plan === plan.id && <div className="current-badge">Active Plan</div>}

                                <h3>{plan.name}</h3>

                                <div className="plan-price-wrapper">
                                    {plan.isFree && plan.originalPrice ? (
                                        <div className="price-stack">
                                            <div className="price-focus is-free">FREE</div>
                                            <div className="price-details">
                                                <span className="price-old">{plan.currency || '₦'}{plan.originalPrice.toLocaleString()}</span>
                                                <span className="price-condition">14 days free, then {plan.currency || '₦'}{plan.originalPrice.toLocaleString()}/month</span>
                                            </div>
                                        </div>
                                    ) : plan.price === 'Custom' ? (
                                        <div className="price-stack">
                                            <div className="price-focus">Custom</div>
                                            <div className="price-details">
                                                <span className="price-condition">Contact for tailored pricing</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="price-stack">
                                            <div className="price-focus">
                                                {plan.currency || '₦'}
                                                {typeof plan.price === 'number' ? plan.price.toLocaleString() : plan.price}
                                            </div>
                                            <div className="price-details">
                                                <span className="price-condition">billed monthly</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <ul className="plan-features">
                                    {plan.features.map((feature, index) => (
                                        <li key={index}>
                                            <FaCheckCircle className="feature-icon" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {plan.isContact ? (
                                    <button
                                        className="select-plan-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `mailto:${plan.contactEmail}?subject=Enterprise Plan Inquiry`;
                                        }}
                                    >
                                        Contact Us
                                    </button>
                                ) : (
                                    <button
                                        className={`select-plan-btn ${selectedPlan === plan.id ? 'is-selected' : ''} btn-disabled`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Functionality disabled for now as per user request
                                        }}
                                        disabled={true}
                                    >
                                        {subscription?.plan === plan.id ? 'Active Plan' : (selectedPlan === plan.id ? 'Upgrade' : 'Select Plan')}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="subscribe-footer">
                        <p>Need a custom solution? <a href="mailto:support@prhub.shop">Contact our sales team</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscribe;
