import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/protected.css';

const AccessDenied = () => {
    const navigate = useNavigate();
    const { getDashboardRoute } = useAuth();

    return (
        <div className="access-denied-container">
            <div className="access-denied-card">
                <div className="icon">🚫</div>
                <h1>Access Denied</h1>
                <p>You do not have permission to view this page.</p>
                <button onClick={() => navigate(getDashboardRoute())} className="back-button">
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
