import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Multi-branch shop state
    const [currentShop, setCurrentShop] = useState(null);
    const [shops, setShops] = useState([]);
    const [isOwner, setIsOwner] = useState(false);

    // Global Shop Settings
    const [shopSettings, setShopSettings] = useState(null);

    // Fetch shop settings
    const fetchShopSettings = useCallback(async () => {
        try {
            const response = await api.get('/shop_settings.php');
            if (response.data.success) {
                setShopSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Failed to fetch shop settings:', error);
        }
    }, []);

    // Check session on mount
    useEffect(() => {
        const controller = new AbortController();

        const checkSession = async () => {
            try {
                const response = await api.get('/auth/check-session.php', {
                    signal: controller.signal
                });
                if (response.data.success) {
                    setUser(response.data.user);
                    setIsAuthenticated(true);

                    // Fetch global shop settings
                    fetchShopSettings();

                    // Set shop context from session
                    if (response.data.shop_context) {
                        const ctx = response.data.shop_context;
                        setCurrentShop(ctx.current_shop);
                        setShops(ctx.shops || []);
                        setIsOwner(ctx.is_owner || false);
                    }
                }
            } catch (error) {
                // Ignore abort errors (component unmounted)
                if (error.name === 'CanceledError' || error.name === 'AbortError') {
                    return;
                }

                // Session invalid or expired
                setUser(null);
                setIsAuthenticated(false);
                setCurrentShop(null);
                setShops([]);
                setIsOwner(false);
                setShopSettings(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();

        // Cleanup: abort pending request if component unmounts
        return () => controller.abort();
    }, [fetchShopSettings]);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login.php', { username, password });
            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);

                // Fetch settings after login
                fetchShopSettings();

                // Set shop context from login response
                if (response.data.shop_context) {
                    const ctx = response.data.shop_context;
                    setCurrentShop(ctx.current_shop);
                    setShops(ctx.shops || []);
                    setIsOwner(ctx.is_owner || false);
                }

                return { success: true, shopContext: response.data.shop_context };
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
            setCurrentShop(null);
            setShops([]);
            setIsOwner(false);
            setShopSettings(null);
        }
    };

    const updateUser = (userData) => {
        setUser(prevUser => ({
            ...prevUser,
            ...userData
        }));
    };

    const updateShopSettings = (newSettings) => {
        setShopSettings(prev => ({
            ...prev,
            ...newSettings
        }));
    };

    // Switch current shop (for owners only)
    const switchShop = useCallback(async (shopId) => {
        if (!isOwner) {
            console.error('Only owners can switch shops');
            return { success: false, error: 'Only owners can switch shops' };
        }

        try {
            const response = await api.post('/shops/switch.php', { shop_id: shopId });
            if (response.data.success) {
                setCurrentShop(response.data.shop);
                return { success: true, shop: response.data.shop };
            }
            return { success: false, error: response.data.error };
        } catch (error) {
            console.error('Failed to switch shop:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to switch shop'
            };
        }
    }, [isOwner]);

    // Refresh shops list (after creating/deleting branches)
    const refreshShops = useCallback(async () => {
        if (!isAuthenticated || !isOwner) return;

        try {
            const response = await api.get('/shops/list.php');
            if (response.data.success) {
                setShops(response.data.shops || []);
            }
        } catch (error) {
            console.error('Failed to refresh shops:', error);
        }
    }, [isAuthenticated, isOwner]);

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
                updateUser,
                getDashboardRoute,
                // Multi-branch shop context
                currentShop,
                shops,
                isOwner,
                switchShop,
                refreshShops,
                // Global settings
                shopSettings,
                updateShopSettings,
                fetchShopSettings
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
