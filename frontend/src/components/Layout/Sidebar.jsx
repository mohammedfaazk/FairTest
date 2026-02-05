import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const location = useLocation();
  
  const menuItems = {
    creator: [
      { path: '/creator', icon: '📊', label: 'Dashboard' },
      { path: '/creator/create', icon: '✏️', label: 'Create Exam' },
      { path: '/creator/exams', icon: '📝', label: 'My Exams' },
      { path: '/creator/analytics', icon: '📈', label: 'Analytics' },
    ],
    student: [
      { path: '/student', icon: '🏠', label: 'Dashboard' },
      { path: '/student/browse', icon: '🔍', label: 'Browse Exams' },
      { path: '/student/registered', icon: '📚', label: 'My Exams' },
      { path: '/student/results', icon: '🎯', label: 'Results' },
    ],
    evaluator: [
      { path: '/evaluator', icon: '📊', label: 'Dashboard' },
      { path: '/evaluator/pending', icon: '⏳', label: 'Pending Grading' },
      { path: '/evaluator/completed', icon: '✅', label: 'Completed' },
    ],
  };

  const items = menuItems[role] || menuItems.student;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">FairTest</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {role === 'creator' ? '👨‍🏫' : role === 'evaluator' ? '👩‍🏫' : '👨‍🎓'}
          </div>
          <div className="user-info">
            <div className="user-name">{role.charAt(0).toUpperCase() + role.slice(1)}</div>
            <div className="user-wallet">0x1234...5678</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
