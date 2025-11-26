import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/shared/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AccessDenied from './pages/shared/AccessDenied';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import UserManagement from './pages/superadmin/UserManagement';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
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

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/access-denied" element={<AccessDenied />} />

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
                            path="/admin/inventory"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <Inventory />
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

                        <Route path="/" element={<Navigate to="/login" replace />} />
                    </Routes>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
