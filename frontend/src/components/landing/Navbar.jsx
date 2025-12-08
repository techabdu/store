import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Handle scrolling to section after navigation
    useEffect(() => {
        if (location.pathname === '/' && location.hash) {
            setTimeout(() => {
                const element = document.querySelector(location.hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [location]);

    const navLinks = [
        { name: 'Home', href: '/', hash: '' },
        { name: 'Features', href: '/', hash: '#features' },
        { name: 'How It Works', href: '/', hash: '#how-it-works' },
        { name: 'Pricing', href: '/', hash: '#pricing' },
        { name: 'Documentation', href: '/docs/intro', hash: '' },
    ];

    const handleNavClick = (e, link) => {
        e.preventDefault();

        if (link.href === '/docs/intro') {
            // Navigate to documentation
            navigate('/docs/intro');
            setIsMobileMenuOpen(false);
            return;
        }

        // Check if we're already on the landing page
        if (location.pathname === '/') {
            // Already on landing page, just scroll to section
            if (link.hash) {
                const element = document.querySelector(link.hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                // Scroll to top for Home
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            // Navigate to landing page with hash
            navigate(link.href + link.hash);
        }

        setIsMobileMenuOpen(false);
    };

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
                        <a
                            key={link.name}
                            href={link.href + link.hash}
                            className="lp-nav-link"
                            onClick={(e) => handleNavClick(e, link)}
                        >
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
                                href={link.href + link.hash}
                                className="lp-mobile-link"
                                onClick={(e) => handleNavClick(e, link)}
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
