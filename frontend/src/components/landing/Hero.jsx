import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
    return (
        <section className="lp-hero">
            <div className="lp-container lp-hero-container">
                <div className="lp-hero-content">
                    <div className="lp-eyebrow">Phone Retail Hub</div>
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
            </div>
        </section>
    );
};

export default Hero;
