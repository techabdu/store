import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await api.get('/auth/check-session.php');
                if (response.data.success) {
                    setUser(response.data.user);
                    setIsAuthenticated(true);
                }
            } catch (error) {
                // Session invalid or expired
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login.php', { username, password });
            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed',
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout.php');
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const getDashboardRoute = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'superadmin':
                return '/superadmin/dashboard';
            case 'admin':
                return '/admin/dashboard';
            case 'user':
                return '/user/dashboard';
            default:
                return '/login';
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                login,
                logout,
                getDashboardRoute,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
