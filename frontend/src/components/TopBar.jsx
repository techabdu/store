import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Settings, User, Moon, Sun, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './TopBar.css';

const TopBar = ({ toggleSidebar, user }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Get role badge color
  const getRoleBadgeClass = () => {
    switch (user?.role) {
      case 'superadmin':
        return 'role-badge-superadmin';
      case 'admin':
        return 'role-badge-admin';
      case 'user':
        return 'role-badge-user';
      default:
        return '';
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.username) return 'U';
    const names = user.username.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Handle profile settings
  const handleProfileSettings = () => {
    setIsDropdownOpen(false);
    // Navigate to profile settings page based on role
    const basePath = user?.role === 'superadmin' ? '/superadmin' : user?.role === 'admin' ? '/admin' : '/user';
    navigate(`${basePath}/profile`);
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

        <div className="user-profile-container" ref={dropdownRef}>
          <div className="user-profile" onClick={toggleDropdown}>
            <div className="avatar">
              <span className="avatar-text">{getUserInitials()}</span>
            </div>
            <span className="username">{user?.username || 'Admin'}</span>
            <ChevronDown size={16} className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </div>

          {isDropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="avatar-large">
                  <span className="avatar-text-large">{getUserInitials()}</span>
                </div>
                <div className="user-info">
                  <div className="user-name">{user?.username || 'Admin'}</div>
                  <div className={`role-badge ${getRoleBadgeClass()}`}>
                    {getRoleDisplay()}
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleProfileSettings}>
                  <Settings size={18} />
                  <span>Profile Settings</span>
                </button>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
