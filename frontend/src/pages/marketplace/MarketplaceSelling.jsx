import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';

const MarketplaceSelling = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

    // Detect mobile screen size
    React.useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />

            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-page-main">
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">Selling</h1>
                        <p className="text-secondary">Manage your listings and sales</p>
                    </div>

                    {/* Placeholder Content */}
                    <div className="dashboard-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                        <Tag size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 20px' }} />
                        <h2 className="heading-2" style={{ marginBottom: '12px' }}>Selling Page</h2>
                        <p className="text-secondary">
                            This page will show your active listings, sold items, and sales analytics.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceSelling;
