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
                        <div
                            key={res.resultId || res.examId}
                            className="glass-card"
                            style={{ background: 'white', border: '4px solid #000', color: '#000' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#000' }}>{res.examTitle}</h3>
                                    {res.txDigest ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <span className="badge badge-success" style={{ color: '#000', border: '1px solid #000' }}>Verified on Sui</span>
                                            <a 
                                                href={`https://suiscan.xyz/testnet/tx/${res.txDigest}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '0.75rem', color: '#000', textDecoration: 'underline' }}
                                            >
                                                View Transaction: {res.txDigest.substring(0, 10)}...
                                            </a>
                                        </div>
                                    ) : (
                                        <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: '#000' }}>Recorded</span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', color: '#000' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>
                                        {res.score || 0}/{res.maxScore || 100}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#000' }}>{res.percentage || 0}%</div>
                                </div>
                            </div>
                            
                            {res.questionScores && res.questionScores.length > 0 && (
                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.06)', borderRadius: '0.5rem', color: '#000' }}>
                                    <h4 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#000' }}>Question Breakdown</h4>
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {res.questionScores.map((qs, idx) => {
                                            // Handle both old format (with questionId, maxMarks) and new format (with questionIndex, maxScore)
                                            const scoreVal = parseFloat(qs.score) || 0;
                                            const maxVal = parseFloat(qs.maxScore || qs.maxMarks) || 0;
                                            const questionNum = (qs.questionIndex !== undefined && qs.questionIndex !== null) ? qs.questionIndex + 1 : idx + 1;
                                            
                                            return (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#000' }}>
                                                    <span>Question {questionNum}</span>
                                                    <span style={{ fontWeight: '600' }}>{scoreVal}/{maxVal}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {res.feedback && (
                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.06)', borderRadius: '0.5rem', color: '#000' }}>
                                    <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#000' }}>Evaluator Feedback</h4>
                                    <p style={{ fontSize: '0.875rem', color: '#000' }}>{res.feedback}</p>
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '3rem', borderTop: '1px solid #000', paddingTop: '1.5rem', color: '#000' }}>
                                <div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#000' }}>
                                        {res.passed ? '✅ Pass' : '❌ Fail'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#000' }}>Status</div>
                                </div>
                                {res.evaluatedAt && (
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#000' }}>
                                            {new Date(res.evaluatedAt).toLocaleDateString()}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#000' }}>Evaluated</div>
                                    </div>
                                )}
                                {res.resultId && (
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                            <a 
                                                href={`https://suiscan.xyz/testnet/object/${res.resultId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#000', textDecoration: 'underline' }}
                                            >
                                                View on Explorer
                                            </a>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#000' }}>Blockchain Proof</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ViewResults;
