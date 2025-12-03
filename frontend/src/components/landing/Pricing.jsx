import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
    {
        name: "Starter",
        price: "Free",
        period: "forever",
        features: [
            "Up to 50 items",
            "Basic sales tracking",
            "1 User account",
            "Email support"
        ],
        cta: "Start for Free",
        highlighted: false
    },
    {
        name: "Pro",
        price: "$29",
        period: "/month",
        features: [
            "Unlimited items",
            "Advanced analytics",
            "Up to 5 User accounts",
            "Priority support",
            "Barcode scanning",
            "Receipt printing"
        ],
        cta: "Get Started",
        highlighted: true
    },
    {
        name: "Enterprise",
        price: "Custom",
        period: "",
        features: [
            "Unlimited everything",
            "Custom integrations",
            "Dedicated account manager",
            "SLA support",
            "Multi-store management"
        ],
        cta: "Contact Sales",
        highlighted: false
    }
];

const Pricing = () => {
    return (
        <section id="pricing" className="lp-section lp-pricing">
            <div className="lp-container">
                <div className="lp-section-header">
                    <h2 className="lp-h2">Simple, Transparent Pricing</h2>
                    <p className="lp-section-subtitle">Choose the plan that fits your business needs.</p>
                </div>

                <div className="lp-pricing-grid">
                    {plans.map((plan, index) => (
                        <div key={index} className={`lp-pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
                            {plan.highlighted && <div className="lp-badge">Most Popular</div>}
                            <h3 className="lp-plan-name">{plan.name}</h3>
                            <div className="lp-plan-price">
                                <span className="amount">{plan.price}</span>
                                <span className="period">{plan.period}</span>
                            </div>
                            <ul className="lp-plan-features">
                                {plan.features.map((feature, i) => (
                                    <li key={i}>
                                        <Check size={18} className="check-icon" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                to="/register"
                                className={`lp-btn w-full ${plan.highlighted ? 'lp-btn-primary' : 'lp-btn-ghost'}`}
                                style={!plan.highlighted ? { border: '1px solid var(--lp-border)' } : {}}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
