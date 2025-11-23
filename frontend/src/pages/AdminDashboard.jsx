import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

const AdminDashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>Admin Dashboard</h1>
                    <div className="user-info">
                        <span>Welcome, {user?.username}</span>
                        <button onClick={logout} className="logout-button">Logout</button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="cards-grid">
                    <div className="dashboard-card">
                        <h3>Manage Users</h3>
                        <p>Create and manage standard user accounts.</p>
                        <button className="card-button">Users</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Finances</h3>
                        <p>Track sales, revenue, and profits.</p>
                        <button className="card-button">View Finances</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Inventory</h3>
                        <p>Manage stock levels and products.</p>
                        <button className="card-button">Inventory</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Invoices</h3>
                        <p>Generate and view customer invoices.</p>
                        <button className="card-button">Invoices</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Expenses</h3>
                        <p>Track operational expenses.</p>
                        <button className="card-button">Expenses</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Activity Logs</h3>
                        <p>View user activity history.</p>
                        <button className="card-button">Logs</button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
