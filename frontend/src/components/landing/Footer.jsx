import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Github, Instagram } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="lp-footer">
            <div className="lp-container">
                <div className="lp-footer-grid">
                    <div className="lp-footer-brand">
                        <div className="lp-logo">
                            <span className="lp-logo-icon">PR</span>
                            <span className="lp-logo-text" style={{ color: 'white' }}>Hub</span>
                        </div>
                        <p className="lp-footer-desc">
                            The complete solution for modern phone retailers. Manage inventory, Finance, Expenses, Sales, and Customers in one place.
                        </p>
                    </div>

                    <div className="lp-footer-col">
                        <h4>Product</h4>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#pricing">Pricing</a></li>
                            <li><a href="#">Docs</a></li>
                        </ul>
                    </div>

                    <div className="lp-footer-col">
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#">About</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>

                    <div className="lp-footer-col">
                        <h4>Legal</h4>
                        <ul>
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Terms of Service</a></li>
                            <li><a href="#">Cookie Policy</a></li>
                        </ul>
                    </div>
                </div>

                <div className="lp-footer-bottom">
                    <p>&copy; {new Date().getFullYear()} PRHub. All rights reserved.</p>
                    <div className="lp-social-links">
                        <a href="#"><Twitter size={20} /></a>
                        <a href="#"><Linkedin size={20} /></a>
                        <a href="#"><Github size={20} /></a>
                        <a href="#"><Instagram size={20} /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
