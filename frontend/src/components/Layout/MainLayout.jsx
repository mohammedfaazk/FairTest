'use client';

import React from 'react';
import TopBar from './TopBar';
import DemoBanner from '../DemoBanner';
import './MainLayout.css';

const MainLayout = ({ children, title, role, onRoleChange }) => {
  return (
    <div className="main-layout">
      <TopBar title={title} role={role} onRoleChange={onRoleChange} />
      <DemoBanner />
      <div className="main-content">
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
