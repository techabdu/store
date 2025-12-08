import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { docsNavigation } from '../data/docsNavigation';
import Navbar from './landing/Navbar';
import './docs.css';

const DocsLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    // Generate breadcrumbs based on current path
    const generateBreadcrumbs = () => {
        const breadcrumbs = [{ title: 'Home', path: '/docs/intro' }];
        const pathSegments = location.pathname.split('/').filter(Boolean);

        // Find current page in navigation
        let currentPage = null;
        let parentSection = null;

        docsNavigation.forEach(item => {
            if (item.children) {
                item.children.forEach(child => {
                    if (`/docs${child.path}` === location.pathname) {
                        currentPage = child;
                        parentSection = item;
                    }
                });
            } else if (`/docs${item.path}` === location.pathname) {
                currentPage = item;
            }
        });

        // Build breadcrumb trail
        if (parentSection) {
            breadcrumbs.push({ title: parentSection.title, path: null });
        }
        if (currentPage) {
            breadcrumbs.push({ title: currentPage.title, path: location.pathname });
        }

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    // Helper to render navigation items recursively
    const renderNavItems = (items) => {
        return items.map((item, index) => {
            if (item.children) {
                return (
                    <div key={index} className="docs-nav-group">
                        <div className="docs-nav-group-title">{item.title}</div>
                        {renderNavItems(item.children)}
                    </div>
                );
            }
            return (
                <NavLink
                    key={item.path}
                    to={`/docs${item.path}`}
                    className={({ isActive }) =>
                        `docs-nav-item ${isActive ? 'active' : ''}`
                    }
                    onClick={closeSidebar}
                >
                    {item.title}
                </NavLink>
            );
        });
    };

    return (
        <>
            {/* Landing Page Navbar - Sticky */}
            <div className="docs-navbar-wrapper">
                <Navbar />
            </div>

            <div className="docs-container">
                {/* Mobile Overlay */}
                <div
                    className={`docs-overlay ${isSidebarOpen ? 'open' : ''}`}
                    onClick={closeSidebar}
                />

                {/* Sidebar */}
                <aside className={`docs-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="docs-sidebar-header">
                        <Link to="/login" className="docs-brand">
                            <span>← Back to App</span>
                        </Link>
                    </div>
                    <nav>
                        {renderNavItems(docsNavigation)}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="docs-main">
                    {/* Breadcrumbs */}
                    <nav className="docs-breadcrumbs">
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <span className="breadcrumb-separator">/</span>}
                                {crumb.path ? (
                                    <Link to={crumb.path} className="breadcrumb-link">
                                        {crumb.title}
                                    </Link>
                                ) : (
                                    <span className="breadcrumb-text">{crumb.title}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>

                    <Outlet />
                </main>

                {/* Mobile Toggle Button */}
                <button className="mobile-menu-toggle" onClick={toggleSidebar}>
                    {isSidebarOpen ? '×' : '≡'}
                </button>
            </div>
        </>
    );
};

export default DocsLayout;
