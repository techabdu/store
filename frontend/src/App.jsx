import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

const TestAuth = () => {
    const { user, isAuthenticated, isLoading, login, logout } = useAuth();

    const handleLogin = async () => {
        console.log('Attempting login...');
        const result = await login('it support', 'superadmin123');
        console.log('Login result:', result);
    };

    const handleLogout = async () => {
        console.log('Attempting logout...');
        await logout();
        console.log('Logged out');
    };

    if (isLoading) return <div>Loading session...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>Auth Context Test</h2>
            <div style={{ marginBottom: '10px' }}>
                <strong>Status:</strong> {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </div>
            {user && (
                <div style={{ marginBottom: '10px' }}>
                    <strong>User:</strong> {user.username} ({user.role})
                </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
                {!isAuthenticated ? (
                    <button onClick={handleLogin}>Test Login</button>
                ) : (
                    <button onClick={handleLogout}>Test Logout</button>
                )}
            </div>
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <TestAuth />
        </AuthProvider>
    );
}

export default App;
