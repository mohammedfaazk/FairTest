'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import fairTestService from '../../services/FairTestService';

function GradeExam({ examId }) {
    const [exam, setExam] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [questionScores, setQuestionScores] = useState({});
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState(null);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fairTestService.getExam(examId)
            .then((data) => {
                if (cancelled) return;
                setExam(data);
            })
            .catch((err) => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, [examId]);

    useEffect(() => {
        if (!examId) return;
        let cancelled = false;
        setLoading(true);
        fairTestService.getPendingSubmissions(examId)
            .then((list) => { if (!cancelled) setSubmissions(list); })
            .catch((err) => { if (!cancelled) setError(err.message); setSubmissions([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [examId]);

    const handleSelectSubmission = (sub) => {
        setSelected(sub);
        // Initialize scores for each question
        const scores = {};
        if (exam && exam.questions) {
            exam.questions.forEach((q, idx) => {
                scores[idx] = 0;
            });
        }
        setQuestionScores(scores);
        setFeedback('');
    };

    const handleScoreChange = (questionIndex, value) => {
        const numValue = parseInt(value, 10) || 0;
        const maxMarks = exam.questions[questionIndex]?.marks || 0;
        const clampedValue = Math.max(0, Math.min(numValue, maxMarks));
        setQuestionScores(prev => ({
            ...prev,
            [questionIndex]: clampedValue
        }));
    };

    const calculateTotalScore = () => {
        return Object.values(questionScores).reduce((sum, score) => sum + score, 0);
    };

    const handleGrade = async () => {
        if (!selected) return;
        if (!fairTestService.currentWallet) {
            setError('Please connect your wallet first.');
            return;
        }
        
        const totalScore = calculateTotalScore();
        const maxScore = exam?.totalMarks || 100;
        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        
        setError(null);
        setPublishing(true);
        try {
            const questionScoresArray = exam.questions.map((q, idx) => ({
                questionIndex: idx,
                score: questionScores[idx] || 0,
                maxScore: q.marks
            }));
            
            await fairTestService.submitEvaluation(selected.submissionId, {
                score: totalScore,
                maxScore,
                percentage,
                passed: percentage >= (exam.passPercentage || 60),
                feedback,
                questionScores: questionScoresArray
            });
            
            setSubmissions((prev) => prev.filter((s) => s.submissionId !== selected.submissionId));
            setSelected(null);
            setQuestionScores({});
            setFeedback('');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to publish result.');
        } finally {
            setPublishing(false);
        }
    };

    const displayHash = (sub) => (sub.finalHash || '').substring(0, 12) + '...';

    if (error && !exam) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>
                <Link href="/evaluator" className="btn-secondary">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="grade-exam">
            <div style={{ marginBottom: '1.5rem' }}>
                <Link href="/evaluator" style={{ color: 'var(--primary)', textDecoration: 'none' }}>← Back to Evaluator Dashboard</Link>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Grade Exam</h1>
            <p style={{ color: '#000', marginBottom: '2rem' }}>
                {exam ? exam.title : examId} — Review submissions blindly. You only see anonymous candidate IDs.
            </p>

            {error && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: 'var(--error)' }}>{error}</div>
            )}

            {loading ? (
                <p style={{ color: '#000' }}>Loading submissions...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 450px' : '1fr', gap: '2rem' }}>
                    <div>
                        <div className="glass-card" style={{ padding: '0', marginBottom: '2rem', background: 'white', border: '4px solid #000', color: '#000' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem', color: '#000' }}>Anonymous ID</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', color: '#000' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map((sub) => (
                                        <tr key={sub.submissionId} style={{ borderBottom: '1px solid #000' }}>
                                            <td style={{ padding: '1rem' }}><code style={{ color: '#000' }}>{displayHash(sub)}</code></td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleSelectSubmission(sub)}
                                                    className="btn-secondary"
                                                    style={{ padding: '0.5rem 1rem', color: '#000' }}
                                                >
                                                    Grade Submission
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {submissions.length === 0 && !loading && (
                                <p style={{ padding: '2rem', color: '#000', textAlign: 'center' }}>No pending submissions for this exam.</p>
                            )}
                        </div>
                        
                        {selected && exam && exam.questions && (
                            <div className="glass-card" style={{ background: 'white', border: '4px solid #000', color: '#000' }}>
                                <h3 style={{ marginBottom: '1.5rem', color: '#000' }}>Student Answers</h3>
                                {exam.questions.map((question, idx) => (
                                    <div key={idx} style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: idx < exam.questions.length - 1 ? '1px solid #000' : 'none' }}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <strong style={{ color: '#000' }}>Question {idx + 1}</strong>
                                                <span style={{ color: '#000', fontSize: '0.875rem' }}>Max: {question.marks} marks</span>
                                            </div>
                                            <p style={{ color: '#000' }}>{question.question}</p>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.06)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                            <p style={{ fontSize: '0.875rem', color: '#000', marginBottom: '0.5rem' }}>Student Answer:</p>
                                            <p style={{ color: '#000' }}>{selected.answers?.[idx] || 'No answer provided'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selected && exam && (
                        <div className="glass-card" style={{ position: 'sticky', top: '100px', height: 'fit-content', background: 'white', border: '4px solid #000', color: '#000' }}>
                            <h3 style={{ marginBottom: '1.5rem', color: '#000' }}>Grade Submission</h3>
                            <div style={{ background: 'rgba(0,0,0,0.06)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', fontSize: '0.875rem', color: '#000' }}>
                                <p style={{ color: '#000', marginBottom: '0.5rem' }}>Anonymous ID:</p>
                                <code style={{ color: '#000' }}>{displayHash(selected)}</code>
                            </div>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#000' }}>Assign Marks</h4>
                                {exam.questions && exam.questions.map((question, idx) => (
                                    <div key={idx} style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#000' }}>
                                            Q{idx + 1} (Max: {question.marks})
                                        </label>
                                        <input
                                            type="number"
                                            value={questionScores[idx] || 0}
                                            onChange={(e) => handleScoreChange(idx, e.target.value)}
                                            min={0}
                                            max={question.marks}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'white', border: '2px solid #000', color: '#000' }}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.06)', borderRadius: '0.5rem', color: '#000' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Total Score:</span>
                                    <strong style={{ color: '#000' }}>{calculateTotalScore()} / {exam.totalMarks}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Percentage:</span>
                                    <strong>{exam.totalMarks > 0 ? Math.round((calculateTotalScore() / exam.totalMarks) * 100) : 0}%</strong>
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Feedback (Optional)</label>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    rows={4}
                                    placeholder="Add feedback for the student..."
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', resize: 'vertical' }}
                                />
                            </div>
                            
                            <button
                                onClick={handleGrade}
                                className="btn-primary"
                                style={{ width: '100%' }}
                                disabled={publishing}
                            >
                                {publishing ? 'Publishing...' : 'Publish Result to Blockchain'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default GradeExam;
