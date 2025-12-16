import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ArrowLeft,
    MessageCircle,
    ShoppingBag,
    Wallet,
    User,
    Store,
    LogOut,
    Search,
    ShoppingCart,
    Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MarketplaceSidebar.css';

const MarketplaceSidebar = ({ filters, onFilterChange, onApplyFilters, isOpen, isMobile, closeSidebar }) => {
    const { logout, user } = useAuth();
    const location = useLocation();

    const isListingsPage = location.pathname === '/marketplace/listings';

    // Marketplace navigation items
    const marketplaceNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/marketplace' },
        { icon: Store, label: 'Browse All', path: '/marketplace/listings' },
        { icon: ShoppingCart, label: 'Buying', path: '/marketplace/buying' },
        { icon: Tag, label: 'Selling', path: '/marketplace/selling' },
        { icon: MessageCircle, label: 'Inbox', path: '/marketplace/messages' },
        { icon: ShoppingBag, label: 'My Orders', path: '/marketplace/orders' },
        { icon: Wallet, label: 'My Wallet', path: '/marketplace/wallet' },
        { icon: User, label: 'My Profile', path: '/marketplace/profile' },
    ];

    // Phone condition categories
    const phoneConditions = [
        { value: '', label: 'All Conditions' },
        { value: 'New', label: 'Brand New' },
        { value: 'UK Used', label: 'UK Used' },
        { value: 'Fairly Used', label: 'Fairly Used' },
        { value: 'Refurbished', label: 'Refurbished' },
    ];

    // Popular phone brands
    const phoneBrands = [
        { value: '', label: 'All Brands' },
        { value: 'Apple', label: 'Apple' },
        { value: 'Samsung', label: 'Samsung' },
        { value: 'Huawei', label: 'Huawei' },
        { value: 'Xiaomi', label: 'Xiaomi' },
        { value: 'Oppo', label: 'Oppo' },
        { value: 'Vivo', label: 'Vivo' },
        { value: 'Tecno', label: 'Tecno' },
        { value: 'Infinix', label: 'Infinix' },
        { value: 'Google', label: 'Google' },
        { value: 'OnePlus', label: 'OnePlus' },
        { value: 'Nokia', label: 'Nokia' },
    ];

    // Determine back path based on role
    const backPath = user?.role === 'superadmin' ? '/superadmin/dashboard' :
        user?.role === 'admin' ? '/admin/dashboard' :
            '/user/dashboard';

    return (
        <>
            {/* Overlay for mobile */}
            {isMobile && isOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar}></div>
            )}

            <aside className={`marketplace-sidebar ${isOpen ? 'open' : ''} ${isMobile ? 'mobile' : ''}`}>
                <div className="marketplace-sidebar-content">
                    {/* Navigation Section */}
                    <nav className="marketplace-sidebar-nav">
                        {/* Back Button */}
                        <NavLink
                            to={backPath}
                            className="marketplace-nav-item"
                        >
                            <ArrowLeft size={20} className="marketplace-nav-icon" />
                            <span className="marketplace-nav-label">Back to System</span>
                        </NavLink>

                        {/* Navigation Items */}
                        {marketplaceNavItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/marketplace'}
                                className={({ isActive }) =>
                                    `marketplace-nav-item ${isActive ? 'active' : ''}`
                                }
                                onClick={isMobile ? closeSidebar : undefined}
                            >
                                <item.icon size={20} className="marketplace-nav-icon" />
                                <span className="marketplace-nav-label">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Filters Section - Only show on listings page */}
                    {isListingsPage && filters && (
                        <div className="marketplace-filters-section">
                            {/* Separator with padding */}
                            <div className="filters-separator"></div>

                            <div className="filters-header">
                                <h3>Filters</h3>
                            </div>

                            <form onSubmit={onApplyFilters} className="marketplace-filters-form">
                                {/* Search Input */}
                                <div className="filter-group">
                                    <label className="filter-label">Search</label>
                                    <input
                                        type="text"
                                        name="search"
                                        value={filters.search}
                                        onChange={onFilterChange}
                                        placeholder="Search phones..."
                                        className="filter-input"
                                    />
                                </div>

                                {/* Condition Filter */}
                                <div className="filter-group">
                                    <label className="filter-label">Condition</label>
                                    <select
                                        name="condition"
                                        value={filters.condition || ''}
                                        onChange={onFilterChange}
                                        className="filter-input filter-select"
                                    >
                                        {phoneConditions.map((condition) => (
                                            <option key={condition.value} value={condition.value}>
                                                {condition.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Brand Filter */}
                                <div className="filter-group">
                                    <label className="filter-label">Brand</label>
                                    <select
                                        name="brand"
                                        value={filters.brand || ''}
                                        onChange={onFilterChange}
                                        className="filter-input filter-select"
                                    >
                                        {phoneBrands.map((brand) => (
                                            <option key={brand.value} value={brand.value}>
                                                {brand.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Price Range */}
                                <div className="filter-group">
                                    <label className="filter-label">Min Price</label>
                                    <input
                                        type="number"
                                        name="min_price"
                                        value={filters.min_price}
                                        onChange={onFilterChange}
                                        placeholder="₦0"
                                        className="filter-input"
                                    />
                                </div>

                                <div className="filter-group">
                                    <label className="filter-label">Max Price</label>
                                    <input
                                        type="number"
                                        name="max_price"
                                        value={filters.max_price}
                                        onChange={onFilterChange}
                                        placeholder="₦999,999"
                                        className="filter-input"
                                    />
                                </div>

                                {/* Apply Button */}
                                <button type="submit" className="filter-apply-btn">
                                    Apply Filters
                                </button>

                                {/* Clear Filters */}
                                {(filters.search || filters.min_price || filters.max_price || filters.condition || filters.brand) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onFilterChange({ target: { name: 'search', value: '' } });
                                            onFilterChange({ target: { name: 'min_price', value: '' } });
                                            onFilterChange({ target: { name: 'max_price', value: '' } });
                                            onFilterChange({ target: { name: 'condition', value: '' } });
                                            onFilterChange({ target: { name: 'brand', value: '' } });
                                            onApplyFilters({ preventDefault: () => { } });
                                        }}
                                        className="filter-clear-btn"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </form>
                        </div>
                    )}

                    {/* Logout Button */}
                    <div className="marketplace-sidebar-footer">
                        <button
                            onClick={logout}
                            className="marketplace-nav-item logout-button"
                        >
                            <LogOut size={20} className="marketplace-nav-icon" />
                            <span className="marketplace-nav-label">Logout</span>
                        </button>

                        <div className="marketplace-version">
                            <span>v1.0.0</span>
                            <span>© techabdu 2025</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default MarketplaceSidebar;
