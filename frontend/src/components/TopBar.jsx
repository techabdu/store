import React from 'react';
import { Menu, Search, Bell, Settings, User, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './TopBar.css';

const TopBar = ({ toggleSidebar, user }) => {
  const { theme, toggleTheme } = useTheme();

  // Get role display name
  const getRoleDisplay = () => {
    switch (user?.role) {
      case 'superadmin':
        return 'SuperAdmin';
      case 'admin':
        return 'Admin';
      case 'user':
        return 'User';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button className="icon-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <div className="logo">
          <span className="logo-text">Phone Retailer</span>
        </div>
        <div className="breadcrumbs">
          <span>Dashboard</span> / <span>{getRoleDisplay()}</span>
        </div>
      </div>

      <div className="top-bar-center">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input type="text" placeholder="Search..." />
        </div>
      </div>

      <div className="top-bar-right">
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <span className="username">{user?.username || 'Admin'}</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
