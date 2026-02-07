'use client';

import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DemoBanner from '../DemoBanner';
import './MainLayout.css';

const MainLayout = ({ children, title, role, onRoleChange }) => {
  return (
    <div className="main-layout">
      <Sidebar role={role} />
      <div className="main-content">
        <DemoBanner />
        <TopBar title={title} role={role} onRoleChange={onRoleChange} />
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
