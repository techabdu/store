import React, { useState } from 'react';
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
  DollarSign,
  Store,
  GitBranch,
  ClipboardList,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, isMobile, closeSidebar, alertCount = 0 }) => {
  const { logout, user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  // Define navigation items based on user role
  const getNavItems = () => {
    switch (user?.role) {
      case 'superadmin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin/dashboard' },
          { icon: Users, label: 'User Management', path: '/superadmin/users' },
          { icon: Store, label: 'Tenant Management', path: '/superadmin/tenants' },
          { icon: Globe, label: 'Marketplace', path: '/marketplace' }, // Added Marketplace
          { icon: BarChart2, label: 'System Insights', path: '/superadmin/system-insights' }
        ];
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
          { icon: BarChart2, label: 'Reports', path: '/admin/report' },
          { icon: Users, label: 'User Management', path: '/admin/users' },
          { icon: GitBranch, label: 'Branches', path: '/admin/branches' },
          { icon: FileText, label: 'Sales History', path: '/admin/sales-history' },
          { icon: Package, label: 'Inventory', path: '/admin/inventory' },
          { icon: ClipboardList, label: 'Stock Levels', path: '/admin/stock-levels' },
          { icon: Globe, label: 'Marketplace', path: '/marketplace' }, // Added Marketplace
          { icon: ShoppingCart, label: 'POS', path: '/admin/pos' },
          { icon: DollarSign, label: 'Expenses', path: '/expenses' },
          { icon: Users, label: 'Customers', path: '/admin/customers' },
          { icon: Settings, label: 'Settings', path: '/admin/settings' },
        ];
      case 'user':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
          { icon: Package, label: 'Inventory', path: '/user/inventory' },
          { icon: ShoppingCart, label: 'POS', path: '/user/pos' },
          { icon: DollarSign, label: 'Expenses', path: '/expenses' },
          { icon: FileText, label: 'Sales History', path: '/sales-history' },
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
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                onClick={isMobile ? closeSidebar : undefined}
                title={!isMobile && !isOpen && !isHovered ? item.label : ''}
              >
                <item.icon size={20} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                {item.label === 'Dashboard' && alertCount > 0 && (
                  <span className="nav-badge">{alertCount}</span>
                )}
              </NavLink>
            ))}
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
