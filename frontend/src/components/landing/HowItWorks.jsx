import React from 'react';

const steps = [
    {
        number: "01",
        title: "Sign Up",
        description: "Create your account in seconds. No credit card required for the trial.",
        image: "signup"
    },
    {
        number: "02",
        title: "Add Inventory",
        description: "Import your existing stock or add items manually with our easy-to-use interface.",
        image: "inventory"
    },
    {
        number: "03",
        title: "Start Selling",
        description: "Process sales, print receipts, and track your business growth instantly.",
        image: "selling"
    }
];

const HowItWorks = () => {
    return (
        <section id="how-it-works" className="lp-section lp-how-it-works">
            <div className="lp-container">
                <div className="lp-section-header">
                    <h2 className="lp-h2">How It Works</h2>
                    <p className="lp-section-subtitle">Get up and running in three simple steps.</p>
                </div>

                <div className="lp-steps">
                    {steps.map((step, index) => (
                        <div key={index} className={`lp-step ${index % 2 !== 0 ? 'reverse' : ''}`}>
                            <div className="lp-step-content">
                                <span className="lp-step-number">{step.number}</span>
                                <h3 className="lp-h3">{step.title}</h3>
                                <p className="lp-body">{step.description}</p>
                            </div>
                            <div className="lp-step-visual">
                                <div className="lp-step-card-mockup">
                                    {/* Placeholder for visual */}
                                    <div className="mockup-content-simple"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
