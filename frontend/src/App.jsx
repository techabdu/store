import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/shared/Login';
import Register from './pages/shared/Register';
import ForgotPassword from './pages/shared/ForgotPassword';
import ResetPassword from './pages/shared/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AccessDenied from './pages/shared/AccessDenied';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import UserManagement from './pages/superadmin/UserManagement';
import TenantManagement from './pages/superadmin/TenantManagement';
import SystemInsights from './pages/superadmin/SystemInsights';
import LandingPage from './pages/public/LandingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import BranchManagement from './pages/admin/BranchManagement';
import UserDashboard from './pages/user/UserDashboard';
import UserProfile from './pages/user/UserProfile';
import Inventory from './pages/user/Inventory';
import POS from './pages/user/POS';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Receipt from './pages/user/Receipt';
import SalesHistory from './pages/user/SalesHistory';
import AdminReceipt from './pages/admin/Receipt';
import AdminSalesHistory from './pages/admin/SalesHistory';
import Expenses from './pages/shared/Expenses';
import UserActivity from './pages/user/UserActivity';
import AdminActivity from './pages/admin/AdminActivity';
import Customers from './pages/admin/Customers';
import AdminSettings from './pages/admin/AdminSettings';
import Report from './pages/admin/Report';
import StockLevels from './pages/admin/StockLevels';
import DocsLayout from './components/DocsLayout';
import Docs from './pages/public/Docs';
import MarketplaceDashboard from './pages/marketplace/MarketplaceDashboard';
import MarketplaceListings from './pages/marketplace/MarketplaceListings';
import MarketplaceBuying from './pages/marketplace/MarketplaceBuying';
import MarketplaceSelling from './pages/marketplace/MarketplaceSelling';
import MarketplaceProductDetails from './pages/marketplace/MarketplaceProductDetails';
import MarketplaceWallet from './pages/marketplace/MarketplaceWallet';
import MarketplaceMessages from './pages/marketplace/MarketplaceMessages';
import MarketplaceOrders from './pages/marketplace/MarketplaceOrders';
import MarketplaceProfile from './pages/marketplace/MarketplaceProfile';
import MarketplaceCreateListing from './pages/marketplace/MarketplaceCreateListing';
import MarketplaceVerification from './pages/marketplace/MarketplaceVerification';
import MarketplaceEditListing from './pages/marketplace/MarketplaceEditListing';
import MarketplaceOrderDetails from './pages/marketplace/MarketplaceOrderDetails';

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/access-denied" element={<AccessDenied />} />

                        {/* Documentation Routes */}
                        <Route path="/docs" element={<DocsLayout />}>
                            <Route path="*" element={<Docs />} />
                        </Route>

                        {/* Protected Routes */}
                        <Route
                            path="/superadmin/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/superadmin/users"
                            element={
                                <ProtectedRoute allowedRoles={['superadmin']}>
                                    <UserManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/superadmin/tenants"
                            element={
                                <ProtectedRoute allowedRoles={['superadmin']}>
                                    <TenantManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/superadmin/system-insights"
                            element={
                                <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SystemInsights />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/admin/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/users"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminUserManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/branches"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <BranchManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/inventory"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <Inventory />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/stock-levels"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <StockLevels />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/pos"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <POS />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/receipt/:id"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminReceipt />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/sales-history"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminSalesHistory />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/activity"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminActivity />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/customers"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <Customers />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/settings"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminSettings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/report"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <Report />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/user/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['user']}>
                                    <UserDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/user/profile"
                            element={
                                <ProtectedRoute allowedRoles={['user']}>
                                    <UserProfile />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/user/inventory"
                            element={
                                <ProtectedRoute allowedRoles={['user']}>
                                    <Inventory />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/user/pos"
                            element={
                                <ProtectedRoute allowedRoles={['user']}>
                                    <POS />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/user/activity"
                            element={
                                <ProtectedRoute allowedRoles={['user']}>
                                    <UserActivity />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/receipt/:id"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']}>
                                    <Receipt />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/sales-history"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']}>
                                    <SalesHistory />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/expenses"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']}>
                                    <Expenses />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/listings"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceListings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/create-listing"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceCreateListing />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/buying"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceBuying />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/selling"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceSelling />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/edit-listing/:id"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceEditListing />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/listing/:id"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceProductDetails />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/wallet"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceWallet />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/messages"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceMessages />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/orders"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceOrders />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/order/:id"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceOrderDetails />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/profile"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceProfile />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/marketplace/verify"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                    <MarketplaceVerification />
                                </ProtectedRoute>
                            }
                        />


                        <Route path="/" element={<LandingPage />} />
                    </Routes>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter >
    );
}

export default App;
