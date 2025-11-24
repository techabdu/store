import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart2,
  FileText,
  Activity,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, isMobile, closeSidebar }) => {
  const { logout } = useAuth();
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin/dashboard' },
    { icon: Users, label: 'User Management', path: '/superadmin/users' },
    { icon: Settings, label: 'Shop Settings', path: '/superadmin/settings' },
    { icon: BarChart2, label: 'System Insights', path: '/superadmin/insights' },
    { icon: FileText, label: 'Activity Logs', path: '/superadmin/logs' },
    { icon: Activity, label: 'System Health', path: '/superadmin/health' },
  ];

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
