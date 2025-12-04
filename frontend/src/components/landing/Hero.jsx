import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
    return (
        <section className="lp-hero">
            <div className="lp-container lp-hero-container">
                <div className="lp-hero-content">
                    <div className="lp-eyebrow">Phone Retail Hub: Management Software for Phone Retailers</div>
                    <h1 className="lp-h1">
                        Manage your phone retail business with ease
                    </h1>
                    <p className="lp-body">
                        Streamline inventory, track sales, expenses, finance, customers, generate reports and more in one powerful platform.
                        Designed for modern retailers who want to grow faster.
                    </p>
                    <div className="lp-hero-actions">
                        <Link to="/register" className="lp-btn lp-btn-primary lp-btn-large">
                            Get Started
                        </Link>
                        <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-large">
                            Live Demo <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                        </Link>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-image-placeholder">
                        {/* a screenshot or illustration */}
                        <div className="lp-dashboard-mockup">
                            <div className="mockup-header">
                                <div className="mockup-dot red"></div>
                                <div className="mockup-dot yellow"></div>
                                <div className="mockup-dot green"></div>
                            </div>
                            <div className="mockup-body">
                                <div className="mockup-sidebar"></div>
                                <div className="mockup-content">
                                    <div className="mockup-row"></div>
                                    <div className="mockup-row"></div>
                                    <div className="mockup-graph"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
