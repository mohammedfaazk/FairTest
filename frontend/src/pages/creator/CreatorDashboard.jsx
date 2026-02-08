'use client';

import React, { useState } from 'react';
import Link from 'next/link';

function CreatorDashboard() {
    const [exams] = useState([
        { id: 'exam-1', name: 'NEET Practice 2024', status: 'ACTIVE', registrationCount: 154, fee: '0.05 SUI', ens: 'neet-demo.fairtest.eth' },
        { id: 'exam-2', name: 'Web3 Security Quiz', status: 'COMPLETED', registrationCount: 89, fee: 'Free', ens: 'security.fairtest.eth' }
    ]);

    return (
        <div className="creator-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Faculty Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your decentralized exams and track payments.</p>
                </div>
                <Link href="/creator/create" className="btn-primary">+ Create New Exam</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Revenue</p>
                    <h2 style={{ fontSize: '1.75rem' }}>7.7 SUI</h2>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Students</p>
                    <h2 style={{ fontSize: '1.75rem' }}>243</h2>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Active Exams</p>
                    <h2 style={{ fontSize: '1.75rem' }}>1</h2>
                </div>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Your Exams</h2>
            <div className="glass-card" style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem' }}>Exam Name</th>
                            <th style={{ padding: '1rem' }}>ENS Domain</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}>Students</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exams.map(exam => (
                            <tr key={exam.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: '600' }}>{exam.name}</td>
                                <td style={{ padding: '1rem', color: 'var(--primary)', fontSize: '0.875rem' }}>{exam.ens}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span className={`badge ${exam.status === 'ACTIVE' ? 'badge-success' : ''}`} style={{ backgroundColor: exam.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: exam.status === 'ACTIVE' ? 'var(--success)' : 'var(--text-muted)' }}>
                                        {exam.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>{exam.registrationCount}</td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>View Stats</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CreatorDashboard;
