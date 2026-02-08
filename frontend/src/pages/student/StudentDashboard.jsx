'use client';

import React from 'react';
import Link from 'next/link';
import './StudentDashboard.css';

function StudentDashboard() {
  return (
    <div className="student-dashboard">
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '3rem' }}>Student Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <Link href="/student/browse" className="glass-card student-home-tile">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Find Exams</h3>
          <p>Browse available exams via ENS discovery and register using Yellow Network.</p>
        </Link>
        <Link href="/student/results" className="glass-card student-home-tile">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>My Results</h3>
          <p>View and verify your anonymous scores and global rankings stored on Sui.</p>
        </Link>
      </div>
    </div>
  );
}

export default StudentDashboard;
