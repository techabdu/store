import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import '../user/Inventory.css'; // Reusing inventory styles for consistent table look

const StockLevels = () => {
    const { user } = useAuth();
    const [stockLevels, setStockLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Fetch stock levels
    useEffect(() => {
        const fetchStockLevels = async () => {
            try {
                setLoading(true);
                const response = await api.get('/inventory/stock_levels.php');
                if (response.data.success) {
                    setStockLevels(response.data.stock_levels);
                } else {
                    setError(response.data.error || 'Failed to load stock levels');
                }
            } catch (err) {
                setError('Failed to load stock levels');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStockLevels();
    }, []);

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
                    <div className="inventory-container">
                        <div className="inventory-header">
                            <div className="header-content">
                                <h1>Stock Levels</h1>
                                <p className="text-secondary">Overview of available stock by model</p>
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        {loading ? (
                            <div className="loading">Loading stock levels...</div>
                        ) : (
                            <div className="inventory-table-container">
                                <table className="inventory-table">
                                    <thead>
                                        <tr>
                                            <th>Brand</th>
                                            <th>Model</th>
                                            <th>Available Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockLevels.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="no-data">No stock data available</td>
                                            </tr>
                                        ) : (
                                            stockLevels.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.brand}</td>
                                                    <td>{item.model}</td>
                                                    <td style={{ fontWeight: 'bold', color: '#10b981' }}>{item.quantity} available</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StockLevels;
