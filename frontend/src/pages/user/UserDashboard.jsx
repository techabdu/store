import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';

const UserDashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>User Dashboard</h1>
                    <div className="user-info">
                        <span>Welcome, {user?.username}</span>
                        <button onClick={logout} className="logout-button">Logout</button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="cards-grid">
                    <div className="dashboard-card">
                        <h3>Inventory</h3>
                        <p>View product stock and details.</p>
                        <button className="card-button">View Inventory</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Invoices</h3>
                        <p>Create and manage invoices.</p>
                        <button className="card-button">Invoices</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>Expenses</h3>
                        <p>Record daily expenses.</p>
                        <button className="card-button">Expenses</button>
                    </div>

                    <div className="dashboard-card">
                        <h3>My Activity</h3>
                        <p>View your recent actions.</p>
                        <button className="card-button">Activity</button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserDashboard;
