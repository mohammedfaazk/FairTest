import React from 'react';
import './TopBar.css';

const TopBar = ({ title, role, onRoleChange }) => {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{title}</h1>
      </div>
      
      <div className="topbar-right">
        <select 
          className="role-switch"
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
        >
          <option value="student">👨‍🎓 Student</option>
          <option value="creator">👨‍🏫 Creator</option>
          <option value="evaluator">👩‍🏫 Evaluator</option>
        </select>
        
        <button className="notification-btn">
          🔔
          <span className="notification-badge">3</span>
        </button>
        
        <button className="btn btn-primary wallet-btn">
          <span>🔗</span>
          <span>Connect Wallet</span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
