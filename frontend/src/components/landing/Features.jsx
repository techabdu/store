import React from 'react';
import { Package, TrendingUp, FileText, Smartphone, Shield, Users } from 'lucide-react';

const features = [
    {
        icon: <Package size={32} />,
        title: "Inventory Management",
        description: "Track stock levels, manage variants, and get low stock alerts in real-time.",
        color: "var(--lp-primary)"
    },
    {
        icon: <TrendingUp size={32} />,
        title: "Sales Tracking",
        description: "Monitor daily sales, profit margins, and top-performing products effortlessly.",
        color: "var(--lp-secondary)"
    },
    {
        icon: <FileText size={32} />,
        title: "Reports & Analytics",
        description: "Generate comprehensive financial reports to make data-driven business decisions.",
        color: "var(--lp-accent)"
    },
    {
        icon: <Smartphone size={32} />,
        title: "Device Management",
        description: "Keep detailed records of every device, including IMEI, specs, condition etc.",
        color: "#ea4335"
    },
    {
        icon: <Shield size={32} />,
        title: "Secure Access",
        description: "Role-based access control ensures your data is safe and only accessible to authorized staff.",
        color: "#673ab7"
    },
    {
        icon: <Users size={32} />,
        title: "Multi-User Support",
        description: "Create accounts for your staff and track their individual performance and activities.",
        color: "#00acc1"
    }
];

const Features = () => {
    return (
        <section id="features" className="lp-section lp-features">
            <div className="lp-container">
                <div className="lp-section-header">
                    <h2 className="lp-h2">Everything you need to run your shop</h2>
                    <p className="lp-section-subtitle">
                        Powerful features designed specifically for phone retailers.
                    </p>
                </div>

                <div className="lp-features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="lp-feature-card">
                            <div className="lp-feature-icon" style={{ color: feature.color, backgroundColor: `${feature.color}15` }}>
                                {feature.icon}
                            </div>
                            <h3 className="lp-h3" style={{ fontSize: '20px', marginBottom: '12px' }}>{feature.title}</h3>
                            <p className="lp-body" style={{ fontSize: '16px' }}>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
