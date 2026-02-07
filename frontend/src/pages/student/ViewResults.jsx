'use client';

import React, { useState, useEffect } from 'react';
import fairTestService from '../../services/FairTestService';

function ViewResults() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fairTestService.getMyResults()
            .then((list) => { if (!cancelled) setResults(list); })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="view-results">
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Your Results</h1>

            {error && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: 'var(--error)' }}>{error}</div>
            )}

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading your anonymous results...</p>
            ) : results.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No results yet. Complete an exam to see your results here.</p>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {results.map((res) => (
                        <div key={res.resultId || res.examId} className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{res.examTitle}</h3>
                                    {res.txDigest ? (
                                        <span className="badge badge-success">Verified on Sui</span>
                                    ) : (
                                        <span className="badge" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' }}>Recorded</span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>{res.percentage ?? res.score}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Score{res.maxScore != null ? ` / ${res.maxScore}` : ''}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '3rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{res.passed ? 'Pass' : 'Fail'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ViewResults;
