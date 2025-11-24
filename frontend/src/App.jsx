import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AccessDenied from './components/AccessDenied';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import UserManagement from './pages/UserManagement';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

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
                            path="/user/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['user']}>
                                    <UserDashboard />
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
