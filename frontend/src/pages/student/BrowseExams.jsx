'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import fairTestService from '../../services/FairTestService';

function BrowseExams() {
    const router = useRouter();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fairTestService.browseExams()
            .then((list) => { if (!cancelled) setExams(list); })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleRegister = async (exam) => {
        console.log('[BrowseExams] Register clicked for exam:', exam.examId);
        console.log('[BrowseExams] Current wallet:', fairTestService.currentWallet);
        
        if (!fairTestService.currentWallet) {
            setError('Please connect your wallet to register for exams. Click "Connect Wallet" in the top-right corner.');
            return;
        }
        
        setIsProcessing(true);
        setStatus(`Registering for ${exam.title}...`);
        setError(null);

        try {
            console.log('[BrowseExams] Calling registerForExam...');
            const result = await fairTestService.registerForExam(exam.examId);
            console.log('[BrowseExams] Registration result:', result);
            setStatus('Registration successful!');
            
            // Wait a moment to show success message
            setTimeout(() => {
                router.push(`/student/exam/${exam.examId}/instructions`);
            }, 1000);
        } catch (err) {
            console.error('[BrowseExams] Registration error:', err);
            setError(err.message || 'Registration failed.');
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="browse-exams">
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Browse Exams</h1>
                <p style={{ color: 'var(--text-muted)' }}>Loading exams...</p>
            </div>
        );
    }

    if (exams.length === 0 && !error) {
        return (
            <div className="browse-exams">
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Browse Exams</h1>
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                    <h2 style={{ marginBottom: '1rem' }}>No Exams Available Yet</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        No exams have been created yet. Switch to Faculty role to create your first exam!
                    </p>
                    <button 
                        onClick={() => router.push('/creator/create')}
                        className="btn-primary"
                    >
                        Create First Exam
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="browse-exams">
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Browse Exams</h1>

            {error && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', color: 'var(--error)' }}>
                    {error}
                </div>
            )}

            {isProcessing ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>{status}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Completing registration via FairTest.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {exams.map(exam => (
                        <div
                            key={exam.examId}
                            className="glass-card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'white',
                                border: '4px solid #000',
                                color: '#000',
                            }}
                        >
                            {exam.ensDomain && (
                                <div style={{ fontSize: '0.75rem', color: '#000', fontWeight: '600', marginBottom: '0.5rem' }}>{exam.ensDomain}</div>
                            )}
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#000' }}>{exam.title}</h3>
                            <div style={{ marginTop: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#000' }}>
                                    <span>Fee:</span>
                                    <span style={{ fontWeight: '600' }}>{exam.fee} SUI</span>
                                </div>
                                <button
                                    onClick={() => handleRegister(exam)}
                                    className="btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    Register & Pay
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default BrowseExams;
