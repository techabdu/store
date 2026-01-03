import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../TopBar';
import Sidebar from '../Sidebar';

const SuperAdminLayout = ({ children, title, subtitle, loading, error, headerActions }) => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    {/* Page Header */}
                    {(title || subtitle || headerActions) && (
                        <div className="page-header mb-24" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <div>
                                {title && <h1 className="heading-1">{title}</h1>}
                                {subtitle && <p className="text-secondary">{subtitle}</p>}
                            </div>
                            {headerActions && <div className="page-header-actions">{headerActions}</div>}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-secondary mt-4">Loading stats...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--error)' }}>{error}</p>
                        </div>
                    )}

                    {/* Content */}
                    {!loading && !error && children}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminLayout;
