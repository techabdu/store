import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import ImpersonationBanner from './components/superadmin/ImpersonationBanner';
import LoadingSpinner from './components/LoadingSpinner'; // Import LoadingSpinner
import DocsLayout from './components/DocsLayout';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import './index.css';
import './styles/wizard.css';
import './styles/notifications.css';
import './styles/error-boundary.css';

// Lazy load components
const Login = lazy(() => import('./pages/shared/Login'));
const Register = lazy(() => import('./pages/shared/Register'));
const ForgotPassword = lazy(() => import('./pages/shared/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/shared/ResetPassword'));
const VerifyStatus = lazy(() => import('./pages/shared/VerifyStatus'));
const AccessDenied = lazy(() => import('./pages/shared/AccessDenied'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const UserManagement = lazy(() => import('./pages/superadmin/UserManagement'));
const TenantManagement = lazy(() => import('./pages/superadmin/TenantManagement'));
const SystemInsights = lazy(() => import('./pages/superadmin/SystemInsights'));
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('./pages/admin/AdminUserManagement'));
const BranchManagement = lazy(() => import('./pages/admin/BranchManagement'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const Inventory = lazy(() => import('./pages/user/Inventory'));
const POS = lazy(() => import('./pages/user/POS'));
const Receipt = lazy(() => import('./pages/user/Receipt'));
const SalesHistory = lazy(() => import('./pages/user/SalesHistory'));
const AdminReceipt = lazy(() => import('./pages/admin/Receipt'));
const AdminSalesHistory = lazy(() => import('./pages/admin/SalesHistory'));
const Expenses = lazy(() => import('./pages/shared/Expenses'));
const UserActivity = lazy(() => import('./pages/user/UserActivity'));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const Report = lazy(() => import('./pages/admin/Report'));
const StockLevels = lazy(() => import('./pages/admin/StockLevels'));
const CustomerInsights = lazy(() => import('./pages/admin/CustomerInsights'));
const ABCAnalysis = lazy(() => import('./pages/admin/ABCAnalysis'));
const BranchComparison = lazy(() => import('./pages/admin/BranchComparison'));
const CashFlowReport = lazy(() => import('./pages/admin/CashFlowReport'));
const Budgeting = lazy(() => import('./pages/admin/Budgeting'));
const Docs = lazy(() => import('./pages/public/Docs'));
const MarketplaceDashboard = lazy(() => import('./pages/marketplace/MarketplaceDashboard'));
const MarketplaceListings = lazy(() => import('./pages/marketplace/MarketplaceListings'));
const MarketplaceBuying = lazy(() => import('./pages/marketplace/MarketplaceBuying'));
const MarketplaceSelling = lazy(() => import('./pages/marketplace/MarketplaceSelling'));
const MarketplaceProductDetails = lazy(() => import('./pages/marketplace/MarketplaceProductDetails'));
const MarketplaceWallet = lazy(() => import('./pages/marketplace/MarketplaceWallet'));
const MarketplaceMessages = lazy(() => import('./pages/marketplace/MarketplaceMessages'));
const MarketplaceOrders = lazy(() => import('./pages/marketplace/MarketplaceOrders'));
const MarketplaceProfile = lazy(() => import('./pages/marketplace/MarketplaceProfile'));
const MarketplaceCreateListing = lazy(() => import('./pages/marketplace/MarketplaceCreateListing'));
const MarketplaceVerification = lazy(() => import('./pages/marketplace/MarketplaceVerification'));
const MarketplaceEditListing = lazy(() => import('./pages/marketplace/MarketplaceEditListing'));
const MarketplaceOrderDetails = lazy(() => import('./pages/marketplace/MarketplaceOrderDetails'));
const MarketplaceSellerProfile = lazy(() => import('./pages/marketplace/MarketplaceSellerProfile'));
const MarketplaceReceipt = lazy(() => import('./pages/marketplace/MarketplaceReceipt'));
const MyPurchases = lazy(() => import('./pages/marketplace/MyPurchases'));
const MySales = lazy(() => import('./pages/marketplace/MySales'));
const Debts = lazy(() => import('./pages/shared/Debts'));
const OverviewDashboard = lazy(() => import('./pages/superadmin/OverviewDashboard'));
const TenantDetail = lazy(() => import('./pages/superadmin/TenantDetail'));
const TenantDetailPage = lazy(() => import('./pages/superadmin/TenantDetailPage'));
const SystemHealth = lazy(() => import('./pages/superadmin/SystemHealth'));
const ErrorHealth = lazy(() => import('./pages/superadmin/ErrorHealth'));
const BusinessHealth = lazy(() => import('./pages/superadmin/BusinessHealth'));
const UserHealth = lazy(() => import('./pages/superadmin/UserHealth'));
const SupportDashboard = lazy(() => import('./pages/superadmin/SupportDashboard'));
const MyTickets = lazy(() => import('./pages/Support/MyTickets'));
const TicketDetail = lazy(() => import('./pages/Support/TicketDetail'));
const Subscribe = lazy(() => import('./pages/shared/Subscribe'));

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <NotificationProvider>
                    <AuthProvider>
                        <SubscriptionProvider>
                            <ErrorBoundary>
                                <ImpersonationBanner />
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Routes>
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/register" element={<Register />} />
                                        <Route path="/forgot-password" element={<ForgotPassword />} />
                                        <Route path="/reset-password" element={<ResetPassword />} />
                                        <Route path="/verify-status" element={<VerifyStatus />} />
                                        <Route path="/access-denied" element={<AccessDenied />} />
                                        <Route path="/subscribe" element={<Subscribe />} />

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
                                            path="/superadmin/overview"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <OverviewDashboard />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/superadmin/tenant/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <TenantDetail />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/superadmin/system-health"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <SystemHealth />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/superadmin/error-health"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <ErrorHealth />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/superadmin/business-health"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <BusinessHealth />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/superadmin/user-health"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <UserHealth />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/superadmin/tenants/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <TenantDetailPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/superadmin/support"
                                            element={
                                                <ProtectedRoute allowedRoles={['superadmin']}>
                                                    <SupportDashboard />
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
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="branches">
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
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="customers">
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
                                            path="/admin/customer-insights"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="customer-insights">
                                                    <CustomerInsights />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/abc-analysis"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="abc-analysis">
                                                    <ABCAnalysis />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/branch-comparison"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="branch-comparison">
                                                    <BranchComparison />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/cash-flow"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="cash-flow">
                                                    <CashFlowReport />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/budgeting"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="budgeting">
                                                    <Budgeting />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/debts"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']}>
                                                    <Debts />
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
                                            path="/user/debts"
                                            element={
                                                <ProtectedRoute allowedRoles={['user']}>
                                                    <Debts />
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
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceDashboard />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/listings"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceListings />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/create-listing"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceCreateListing />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/buying"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceBuying />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/selling"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceSelling />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/edit-listing/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceEditListing />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/listing/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceProductDetails />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/wallet"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceWallet />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/messages"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceMessages />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/orders"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceOrders />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/order/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceOrderDetails />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/profile"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceProfile />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/verify"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceVerification />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/seller/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceSellerProfile />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/receipt/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MarketplaceReceipt />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/my-purchases"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MyPurchases />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/marketplace/my-sales"
                                            element={
                                                <ProtectedRoute allowedRoles={['admin']} requiredFeature="marketplace">
                                                    <MySales />
                                                </ProtectedRoute>
                                            }
                                        />

                                        <Route
                                            path="/support/tickets"
                                            element={
                                                <ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']}>
                                                    <MyTickets />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/support/ticket/:id"
                                            element={
                                                <ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']}>
                                                    <TicketDetail />
                                                </ProtectedRoute>
                                            }
                                        />


                                        <Route path="/" element={<LandingPage />} />
                                    </Routes>
                                </Suspense>
                            </ErrorBoundary>
                        </SubscriptionProvider>
                    </AuthProvider>
                </NotificationProvider>
            </ThemeProvider>
        </BrowserRouter >
    );
}

export default App;
