import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AccessDenied from './components/AccessDenied';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/access-denied" element={<AccessDenied />} />

                    {/* Protected Routes */}
                    <Route
                        path="/superadmin/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <div style={{ padding: '20px' }}><h1>SuperAdmin Dashboard</h1></div>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <div style={{ padding: '20px' }}><h1>Admin Dashboard</h1></div>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/user/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['user']}>
                                <div style={{ padding: '20px' }}><h1>User Dashboard</h1></div>
                            </ProtectedRoute>
                        }
                    />

                    <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
