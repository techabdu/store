import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart2,
  FileText,
  Activity,
  LogOut,
  Package,
  ShoppingCart,
  DollarSign,
  Store,
  GitBranch,
  ClipboardList,
  Globe,
  ArrowLeft,
  MessageCircle,
  ShoppingBag,
  Wallet,
  User,
  Receipt,
  Target,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  PieChart,
  Boxes
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, isMobile, closeSidebar, alertCount = 0 }) => {
  const { logout, user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const location = useLocation();

  const isMarketplace = location.pathname.startsWith('/marketplace');

  // MARKETPLACE NAVIGATION ITEMS
  const marketplaceNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/marketplace' },
    { icon: Store, label: 'Browse Listings', path: '/marketplace/listings' },
    { icon: MessageCircle, label: 'Messages', path: '/marketplace/messages' },
    { icon: ShoppingBag, label: 'My Orders', path: '/marketplace/orders' },
    { icon: Wallet, label: 'My Wallet', path: '/marketplace/wallet' },
    { icon: User, label: 'My Profile', path: '/marketplace/profile' },
  ];

  const toggleGroup = (groupLabel) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const isGroupActive = (children) => {
    return children.some(child => location.pathname === child.path);
  };

  // STANDARD NAVIGATION ITEMS BY ROLE
  const getNavItems = () => {
    switch (user?.role) {
      case 'superadmin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin/dashboard' },
          {
            label: 'Management',
            icon: Settings,
            children: [
              { icon: Users, label: 'User Management', path: '/superadmin/users' },
              { icon: Store, label: 'Tenant Management', path: '/superadmin/tenants' },
              { icon: Activity, label: 'System Insights', path: '/superadmin/system-insights' }
            ]
          },
          { icon: Globe, label: 'Marketplace', path: '/marketplace' }
        ];
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
          {
            label: 'Core Operations',
            icon: ShoppingCart,
            children: [
              { icon: ShoppingCart, label: 'POS', path: '/admin/pos' },
              { icon: FileText, label: 'Sales History', path: '/admin/sales-history' },
              { icon: DollarSign, label: 'Expenses', path: '/expenses' },
              { icon: Receipt, label: 'Debts', path: '/admin/debts' },
              { icon: Users, label: 'Customers', path: '/admin/customers' }
            ]
          },
          {
            label: 'Inventory',
            icon: Package,
            children: [
              { icon: Package, label: 'Manage Inventory', path: '/admin/inventory' },
              { icon: ClipboardList, label: 'Stock Levels', path: '/admin/stock-levels' }
            ]
          },
          {
            label: 'Financials',
            icon: Wallet,
            children: [
              { icon: BarChart2, label: 'Performance Report', path: '/admin/report' },
              { icon: TrendingUp, label: 'Cash Flow Analysis', path: '/admin/cash-flow' },
              { icon: Target, label: 'Budgeting', path: '/admin/budgeting' }
            ]
          },
          {
            label: 'Strategic Insights',
            icon: PieChart,
            children: [
              { icon: Users, label: 'Customer Insights', path: '/admin/customer-insights' },
              { icon: Boxes, label: 'ABC Analysis', path: '/admin/abc-analysis' },
              { icon: GitBranch, label: 'Branch Comparison', path: '/admin/branch-comparison' }
            ]
          },
          {
            label: 'Administration',
            icon: Settings,
            children: [
              { icon: Users, label: 'User Management', path: '/admin/users' },
              { icon: GitBranch, label: 'Branches', path: '/admin/branches' },
              { icon: Settings, label: 'Shop Settings', path: '/admin/settings' }
            ]
          },
          { icon: Globe, label: 'Marketplace', path: '/marketplace' }
        ];
      case 'user':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
          {
            label: 'Store Operations',
            icon: Store,
            children: [
              { icon: ShoppingCart, label: 'POS', path: '/user/pos' },
              { icon: Package, label: 'Inventory', path: '/user/inventory' },
              { icon: DollarSign, label: 'Expenses', path: '/expenses' },
              { icon: Receipt, label: 'Debts', path: '/user/debts' },
              { icon: FileText, label: 'Sales History', path: '/sales-history' }
            ]
          },
          { icon: User, label: 'Profile', path: '/user/profile' },
        ];
      default:
        return [];
    }
  };

  const navItems = isMarketplace ? marketplaceNavItems : getNavItems();

  // Determine back path based on role
  const backPath = user?.role === 'superadmin' ? '/superadmin/dashboard' :
    user?.role === 'admin' ? '/admin/dashboard' :
      '/user/dashboard';

  return (
    <>
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <aside
        className={`sidebar ${isMobile
          ? (isOpen ? 'open' : 'collapsed')
          : (isOpen || isHovered ? 'open' : 'collapsed')
          } ${isMobile ? 'mobile' : ''}`}
        onMouseEnter={() => !isMobile && !isOpen && setIsHovered(true)}
        onMouseLeave={() => !isMobile && !isOpen && setIsHovered(false)}
      >
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            {/* Back Button for Marketplace Context */}
            {isMarketplace && (
              <NavLink
                to={backPath}
                className="nav-item"
                title={!isMobile && !isOpen && !isHovered ? 'Back to Dashboard' : ''}
                onClick={() => isMobile && setTimeout(closeSidebar, 150)}
              >
                <ArrowLeft size={20} className="nav-icon" />
                <span className="nav-label">Back to System</span>
              </NavLink>
            )}

            {navItems.map((item) => {
              if (item.children) {
                const hasActiveChild = isGroupActive(item.children);
                // Group is open if manually toggled OR if it has an active child (and hasn't been manually closed)
                const isGroupOpen = openGroups[item.label] !== undefined
                  ? openGroups[item.label]
                  : hasActiveChild;

                return (
                  <div key={item.label} className={`nav-group ${hasActiveChild ? 'has-active' : ''} ${isGroupOpen ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="nav-item group-header"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleGroup(item.label);
                      }}
                      title={!isMobile && !isOpen && !isHovered ? item.label : ''}
                    >
                      <item.icon size={20} className="nav-icon" />
                      <span className="nav-label">{item.label}</span>
                      {(isOpen || isHovered) && (
                        <div className="chevron-icon">
                          {isGroupOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      )}
                    </button>
                    {isGroupOpen && (isOpen || isHovered) && (
                      <div className="group-children">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `nav-item child-item ${isActive ? 'active' : ''}`
                            }
                            onClick={() => isMobile && setTimeout(closeSidebar, 150)}
                            title={!isMobile && !isOpen && !isHovered ? child.label : ''}
                          >
                            <child.icon size={18} className="nav-icon child-icon" />
                            <span className="nav-label">{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/marketplace'}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => isMobile && setTimeout(closeSidebar, 150)}
                  title={!isMobile && !isOpen && !isHovered ? item.label : ''}
                >
                  <item.icon size={20} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                  {!isMarketplace && item.label === 'Dashboard' && alertCount > 0 && (
                    <span className="nav-badge">{alertCount}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="sidebar-nav" style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              onClick={logout}
              className="nav-item logout-button"
              title={!isMobile && !isOpen && !isHovered ? 'Logout' : ''}
            >
              <LogOut size={20} className="nav-icon" />
              <span className="nav-label">Logout</span>
            </button>
          </div>

          <div className="sidebar-footer">
            <span className="version-text">v1.0.0</span> <br />
            <span className="version-text">© techabdu 2025</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
