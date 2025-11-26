import React from 'react';
import { NavLink } from 'react-router-dom';
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
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, isMobile, closeSidebar }) => {
  const { logout, user } = useAuth();

  // Define navigation items based on user role
  const getNavItems = () => {
    switch (user?.role) {
      case 'superadmin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin/dashboard' },
          { icon: Users, label: 'User Management', path: '/superadmin/users' },
          { icon: Settings, label: 'Shop Settings', path: '/superadmin/settings' },
          { icon: BarChart2, label: 'System Insights', path: '/superadmin/insights' },
          { icon: FileText, label: 'Activity Logs', path: '/superadmin/logs' },
          { icon: Activity, label: 'System Health', path: '/superadmin/health' },
        ];
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
          { icon: Users, label: 'User Management', path: '/admin/users' },
          { icon: Package, label: 'Inventory', path: '/admin/inventory' },
          { icon: ShoppingCart, label: 'POS', path: '/admin/pos' },
          { icon: FileText, label: 'Products', path: '/admin/products' },
          { icon: FileText, label: 'Sales History', path: '/admin/sales-history' },
          { icon: DollarSign, label: 'Expenses', path: '/expenses' },
          { icon: Users, label: 'Customers', path: '/admin/customers' },
          { icon: Activity, label: 'Orders', path: '/admin/orders' },
          { icon: BarChart2, label: 'Reports', path: '/admin/reports' },
          { icon: Settings, label: 'Settings', path: '/admin/settings' },
        ];
      case 'user':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
          { icon: Package, label: 'Inventory', path: '/user/inventory' },
          { icon: ShoppingCart, label: 'POS', path: '/user/pos' },
          { icon: FileText, label: 'Sales History', path: '/sales-history' },
          { icon: DollarSign, label: 'Expenses', path: '/expenses' },
          { icon: Settings, label: 'Profile', path: '/user/profile' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'} ${isMobile ? 'mobile' : ''}`}>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                onClick={isMobile ? closeSidebar : undefined}
                title={!isOpen && !isMobile ? item.label : ''}
              >
                <item.icon size={20} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="sidebar-nav" style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              onClick={logout}
              className="nav-item logout-button"
              title={!isOpen && !isMobile ? 'Logout' : ''}
            >
              <LogOut size={20} className="nav-icon" />
              <span className="nav-label">Logout</span>
            </button>
          </div>

          <div className="sidebar-footer">
            <span className="version-text">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
