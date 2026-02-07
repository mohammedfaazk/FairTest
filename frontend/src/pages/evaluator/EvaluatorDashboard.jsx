'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import fairTestService from '../../services/FairTestService';
import AutoEvaluator from '../../../../packages/core/AutoEvaluator';

function EvaluatorDashboard() {
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [examData, setExamData] = useState(null);
    const [autoEvalResult, setAutoEvalResult] = useState(null);
    const [manualScores, setManualScores] = useState({});
    const [error, setError] = useState(null);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fairTestService.browseExams()
            .then((list) => {
                if (cancelled) return;
                setExams(list);
                if (list.length > 0 && !selectedExamId) setSelectedExamId(list[0].examId);
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!selectedExamId) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            fairTestService.getPendingSubmissions(selectedExamId),
            fairTestService.getExam(selectedExamId)
        ])
            .then(([subs, exam]) => {
                if (!cancelled) {
                    setSubmissions(subs);
                    setExamData(exam);
                }
            })
            .catch((err) => { if (!cancelled) { setError(err.message); setSubmissions([]); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [selectedExamId]);

    const handleSelectSubmission = async (sub) => {
        setSelected(sub);
        setAutoEvalResult(null);
        setManualScores({});
        setError(null);

        // Auto-evaluate if possible
        if (examData && examData.questions && sub.answers) {
            try {
                const evaluator = new AutoEvaluator();
                const result = evaluator.evaluateExam(examData.questions, sub.answers);
                setAutoEvalResult(result);
                console.log('[Evaluator] Auto-evaluation complete:', result);
            } catch (err) {
                console.error('[Evaluator] Auto-evaluation failed:', err);
                setError('Auto-evaluation failed: ' + err.message);
            }
        }
    };

    const handleManualScoreChange = (questionId, score) => {
        setManualScores(prev => ({ ...prev, [questionId]: parseFloat(score) || 0 }));
    };

    const handlePublishResult = async () => {
        if (!selected || !autoEvalResult) return;
        if (!fairTestService.currentWallet) {
            setError('Please connect your wallet first.');
            return;
        }

        setError(null);
        setPublishing(true);

        try {
            // Merge auto and manual scores
            const evaluator = new AutoEvaluator();
            const finalResult = evaluator.mergeFinalScore(autoEvalResult, manualScores);

            await fairTestService.submitEvaluation(selected.submissionId, {
                score: finalResult.totalScore,
                maxScore: finalResult.maxScore,
                percentage: finalResult.percentage,
                passed: finalResult.percentage >= (examData.passPercentage || 40),
                feedback: '',
                questionScores: finalResult.questionScores
            });

            setSubmissions((prev) => prev.filter((s) => s.submissionId !== selected.submissionId));
            setSelected(null);
            setAutoEvalResult(null);
            setManualScores({});
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to publish result.');
        } finally {
            setPublishing(false);
        }
    };

    const displayHash = (sub) => (sub.finalHash || '').substring(0, 12) + '...';

    return (
        <div className="evaluator-dashboard">
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Evaluator Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>Review submissions blindly. You only see anonymous FINAL_HASH.</p>

            {error && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: 'var(--error)' }}>{error}</div>
            )}

            {exams.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Exam</label>
                    <select
                        value={selectedExamId || ''}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', minWidth: '200px' }}
                    >
                        {exams.map((ex) => (
                            <option key={ex.examId} value={ex.examId}>{ex.title}</option>
                        ))}
                    </select>
                    {selectedExamId && (
                        <Link href={`/evaluator/exam/${selectedExamId}/grade`} style={{ marginLeft: '1rem', color: 'var(--primary)', fontWeight: 600 }}>Open grade page →</Link>
                    )}
                </div>
            )}

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading submissions...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 600px' : '1fr', gap: '2rem' }}>
                    <div className="glass-card" style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>FINAL_HASH (Anonymous)</th>
                                    <th style={{ padding: '1rem' }}>Exam</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((sub) => (
                                    <tr key={sub.submissionId} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem' }}><code style={{ color: 'var(--primary)' }}>{displayHash(sub)}</code></td>
                                        <td style={{ padding: '1rem' }}>{sub.exam?.title || selectedExamId}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleSelectSubmission(sub)}
                                                style={{ color: 'var(--primary)' }}
                                            >
                                                Grade Submission
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {submissions.length === 0 && !loading && (
                            <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>No pending submissions for this exam.</p>
                        )}
                    </div>

                    {selected && (
                        <div className="glass-card" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Grading {displayHash(selected)}</h3>
                            
                            {autoEvalResult && (
                                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Auto-Evaluation Complete</h4>
                                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>
                                        {autoEvalResult.totalScore} / {autoEvalResult.maxScore}
                                    </div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        {autoEvalResult.autoGraded.length} auto-graded, {autoEvalResult.manualGrading.length} need manual grading
                                    </p>
                                </div>
                            )}

                            {examData && examData.questions && selected.answers && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ marginBottom: '1rem' }}>Questions & Answers</h4>
                                    {examData.questions.map((q, index) => {
                                        const studentAnswer = selected.answers[q.id];
                                        const questionResult = autoEvalResult?.questionScores.find(qs => qs.questionId === q.id);
                                        
                                        return (
                                            <div key={q.id} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                                                <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
                                                    Q{index + 1}. {q.text}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                    Type: {q.type} • Marks: {q.marks}
                                                </div>
                                                
                                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.25rem' }}>
                                                    <strong>Student Answer:</strong> {JSON.stringify(studentAnswer)}
                                                </div>

                                                {questionResult && (
                                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: questionResult.correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '0.25rem' }}>
                                                        <strong>Score:</strong> {questionResult.score} / {questionResult.maxMarks}
                                                        {questionResult.autoGraded && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>(Auto-graded)</span>}
                                                    </div>
                                                )}

                                                {questionResult && !questionResult.autoGraded && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Manual Score (0-{q.marks})</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={q.marks}
                                                            step={0.5}
                                                            value={manualScores[q.id] || 0}
                                                            onChange={(e) => handleManualScoreChange(q.id, e.target.value)}
                                                            style={{ width: '100px', padding: '0.5rem', borderRadius: '0.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <button
                                onClick={handlePublishResult}
                                className="btn-primary"
                                style={{ width: '100%' }}
                                disabled={publishing || !autoEvalResult}
                            >
                                {publishing ? 'Publishing...' : 'Publish Result to Sui'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default EvaluatorDashboard;
