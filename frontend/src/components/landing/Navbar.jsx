import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', href: '#' },
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Pricing', href: '#pricing' },
    ];

    return (
        <nav className={`lp-navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="lp-container lp-navbar-container">
                <div className="lp-logo">
                    <span className="lp-logo-icon"></span>
                    <span className="lp-logo-text" style={{ color: 'black' }}>PRHub</span>
                </div>

                {/* Desktop Navigation */}
                <div className="lp-nav-links desktop-only">
                    {navLinks.map((link) => (
                        <a key={link.name} href={link.href} className="lp-nav-link">
                            {link.name}
                        </a>
                    ))}
                </div>

                <div className="lp-nav-actions desktop-only">
                    <Link to="/login" className="lp-btn lp-btn-ghost">
                        Login
                    </Link>
                    <Link to="/register" className="lp-btn lp-btn-primary">
                        Sign Up
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="lp-mobile-toggle mobile-only"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="lp-mobile-menu">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="lp-mobile-link"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}
                        <div className="lp-mobile-actions">
                            <Link to="/login" className="lp-btn lp-btn-ghost w-full">
                                Login
                            </Link>
                            <Link to="/register" className="lp-btn lp-btn-primary w-full">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
