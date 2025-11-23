import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

const SuperAdminDashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>SuperAdmin Dashboard</h1>
                    <div className="user-info">
                        <span>Welcome, {user?.username}</span>
                        <button onClick={logout} className="logout-button">Logout</button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="cards-grid">
                    <div className="dashboard-card">
                        <h3>System Health</h3>
                        <p>Monitor server status and database performance.</p>
                        <button className="card-button">View Details</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>User Management</h3>
                        <p>Manage admins, users, and roles.</p>
                        <button className="card-button">Manage Users</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Shop Settings</h3>
                        <p>Configure global application settings.</p>
                        <button className="card-button">Settings</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>System Insights</h3>
                        <p>View detailed logs and analytics.</p>
                        <button className="card-button">View Logs</button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
