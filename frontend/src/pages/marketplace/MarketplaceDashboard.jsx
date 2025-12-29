import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import MetricCard from '../../components/MetricCard';
import { FaStore, FaWallet, FaCommentDots, FaUserCircle, FaBox, FaShoppingCart, FaReceipt, FaHistory } from 'react-icons/fa';
import { Wallet, Store, MessageSquare, User, TrendingUp, Package } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css'; // Reuse admin styles for consistency
import './MarketplaceDashboard.css'; // Custom marketplace styles

const MarketplaceDashboard = () => {
    const { user, currentShop } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Profile for current shop
                const profileRes = await api.get('/marketplace/profile/get.php', {
                    params: { shop_id: currentShop?.id }
                });
                if (profileRes.data.success) {
                    setProfile(profileRes.data.profile);
                }

                // Fetch Wallet
                const walletRes = await api.get('/marketplace/wallet/get_balance.php');
                if (walletRes.data.success) {
                    setWallet(walletRes.data.wallet);
                }

                // Fetch Stats
                const statsRes = await api.get('/marketplace/profile/get_stats.php', {
                    params: { shop_id: currentShop?.id }
                });
                if (statsRes.data.success) {
                    setStats(statsRes.data.stats);
                }
            } catch (error) {
                console.error("Error fetching marketplace data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentShop]);

    // Format balance for display
    const formatBalance = (amount) => {
        return amount ? Number(amount).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) : '0.00';
    };

    // Metrics data for dashboard cards
    const metrics = [
        {
            title: 'Available Balance',
            value: `₦${formatBalance(wallet?.available_balance)}`,
            icon: Wallet,
            subtitle: 'Wallet balance',
            color: 'success'
        },
        {
            title: 'Total Purchases',
            value: stats?.total_purchases || '0',
            icon: FaShoppingCart,
            subtitle: 'Items bought',
            color: 'success'
        },
        {
            title: 'Total Sales',
            value: stats?.total_sales || '0',
            icon: TrendingUp,
            subtitle: 'Items sold',
            color: 'warning'
        },
        {
            title: 'Active Listings',
            value: stats?.active_listings || '0',
            icon: Store,
            subtitle: 'Products for sale',
            color: 'info'
        },
        {
            title: 'Pending Orders',
            value: stats?.pending_orders || '0',
            icon: Package,
            subtitle: 'Orders to process',
            color: 'info'
        }
    ];

    // Quick action cards
    const quickActions = [
        {
            title: "Browse Listings",
            icon: <FaStore size={28} style={{ color: 'var(--primary)' }} />,
            description: "Buy phones from verified sellers",
            action: () => navigate('/marketplace/listings'),
            colorClass: "blue"
        },
        {
            title: "My Purchases",
            icon: <FaHistory size={28} style={{ color: '#F44336' }} />,
            description: "View item purchases and receipts",
            action: () => navigate('/marketplace/my-purchases'),
            colorClass: "red"
        },
        {
            title: "My Sales",
            icon: <FaReceipt size={28} style={{ color: '#4CAF50' }} />,
            description: "View sold items and sales receipts",
            action: () => navigate('/marketplace/my-sales'),
            colorClass: "green"
        },
        {
            title: "Messages",
            icon: <FaCommentDots size={28} style={{ color: '#9C27B0' }} />,
            description: "Chat with buyers and sellers",
            action: () => navigate('/marketplace/messages'),
            colorClass: "purple"
        },
        {
            title: "My Profile",
            icon: <FaUserCircle size={28} style={{ color: '#FF9800' }} />,
            description: profile ? profile.display_name : "Create your profile",
            action: () => navigate('/marketplace/profile'),
            colorClass: "orange"
        }
    ];

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />

            {/* Use MarketplaceSidebar instead of regular Sidebar */}
            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">Marketplace Dashboard</h1>
                        <p className="text-secondary">Buy, sell, and manage your phone listings</p>
                    </div>

                    {/* Profile Verification Alert */}
                    {!profile && !loading && (
                        <div className="alert-banner">
                            <div className="alert-content">
                                <h4>Complete your Profile</h4>
                                <p>You need to verify your identity to buy or sell on the marketplace</p>
                            </div>
                            <button
                                onClick={() => navigate('/marketplace/profile')}
                                className="alert-button"
                            >
                                Get Verified
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p className="text-secondary">Loading marketplace data...</p>
                        </div>
                    )}

                    {!loading && (
                        <>
                            {/* Wallet Section */}
                            <div className="wallet-card" style={{ marginBottom: '24px' }}>
                                <div className="wallet-header">
                                    <div className="wallet-title">
                                        <div className="wallet-icon">
                                            <FaWallet size={24} style={{ color: 'var(--success)' }} />
                                        </div>
                                        <span>My Wallet</span>
                                    </div>
                                </div>
                                <div className="wallet-balance">
                                    <span className="wallet-balance-label">Available Balance</span>
                                    <span className="wallet-balance-value">
                                        ₦{formatBalance(wallet?.available_balance)}
                                    </span>
                                </div>
                                <div className="wallet-actions">
                                    <button
                                        className="wallet-btn wallet-btn-primary"
                                        onClick={() => navigate('/marketplace/wallet')}
                                    >
                                        View Wallet
                                    </button>
                                    <button
                                        className="wallet-btn"
                                        onClick={() => navigate('/marketplace/wallet')}
                                    >
                                        Transaction History
                                    </button>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="stats-grid">
                                {metrics.map((metric, index) => (
                                    <MetricCard key={index} {...metric} />
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div style={{ marginBottom: '24px' }}>
                                <h2 className="heading-2" style={{ marginBottom: '16px' }}>Quick Actions</h2>
                                <div className="quick-actions">
                                    {quickActions.map((action, index) => (
                                        <div
                                            key={index}
                                            onClick={action.action}
                                            className="action-card"
                                        >
                                            <div className={`action-icon ${action.colorClass}`}>
                                                {action.icon}
                                            </div>
                                            <h3>{action.title}</h3>
                                            <p>{action.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Getting Started Section */}
                            {!profile && (
                                <div className="dashboard-card">
                                    <h3 className="heading-3" style={{ marginBottom: '12px' }}>Getting Started</h3>
                                    <p className="text-secondary" style={{ marginBottom: '16px' }}>
                                        Complete these steps to start buying and selling on the marketplace:
                                    </p>
                                    <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                                        <li style={{ marginBottom: '8px' }}>Verify your identity and create your profile</li>
                                        <li style={{ marginBottom: '8px' }}>Fund your wallet to make purchases</li>
                                        <li style={{ marginBottom: '8px' }}>Browse listings and connect with sellers</li>
                                        <li style={{ marginBottom: '8px' }}>List your own products for sale</li>
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MarketplaceDashboard;
