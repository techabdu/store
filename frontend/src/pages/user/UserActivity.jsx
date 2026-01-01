import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import './SalesHistory.css'; // Reusing SalesHistory styles for consistency

const UserActivity = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError } = useNotification();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

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

    const fetchLogs = async () => {
        try {
            const response = await api.get('/activity_logs.php', {
                params: {
                    limit: 20,
                    offset: page * 20
                }
            });

            if (response.data.success) {
                if (page === 0) {
                    setLogs(response.data.logs);
                } else {
                    setLogs(prev => [...prev, ...response.data.logs]);
                }

                if (response.data.logs.length < 20) {
                    setHasMore(false);
                }
            }
        } catch (err) {
            showError('Failed to load activity logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

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
                    <div className="header-section">
                        <div>
                            <h1>My Activity</h1>
                            <p className="text-secondary">View your recent actions and updates</p>
                        </div>
                    </div>


                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Action</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>
                                            No activity found
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>
                                                <span className="badge badge-primary">
                                                    {log.action.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                {log.details ? (
                                                    <span className="text-secondary">
                                                        {log.details}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {hasMore && !loading && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setPage(p => p + 1)}
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserActivity;
