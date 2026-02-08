'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import fairTestService from '../../services/FairTestService';
import QuestionBuilder from '../../components/QuestionBuilder';

function CreateExam() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: metadata, 2: questions, 3: preview, 4: processing
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        examFee: '0.05',
        duration: 60,
        attemptsAllowed: 1,
        instructions: ''
    });
    const [questions, setQuestions] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);

    const validateExam = () => {
        const errors = [];
        
        if (!formData.name.trim()) errors.push('Exam name is required');
        if (formData.duration < 1) errors.push('Duration must be at least 1 minute');
        if (questions.length === 0) errors.push('Add at least one question');
        
        questions.forEach((q, index) => {
            if (!q.text.trim()) errors.push(`Question ${index + 1}: Question text is required`);
            if (q.marks <= 0) errors.push(`Question ${index + 1}: Marks must be greater than 0`);
            
            if (q.type === 'mcq' && q.options.some(opt => !opt.trim())) {
                errors.push(`Question ${index + 1}: All options must be filled`);
            }
            if (q.type === 'multiple_correct' && q.correctAnswers.length === 0) {
                errors.push(`Question ${index + 1}: Select at least one correct answer`);
            }
        });
        
        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleNext = () => {
        if (step === 1) {
            if (!formData.name.trim()) {
                setValidationErrors(['Exam name is required']);
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (validateExam()) {
                setStep(3);
            }
        }
    };

    const handlePublish = async () => {
        if (!validateExam()) return;
        
        console.log('[CreateExam] Checking wallet...');
        console.log('[CreateExam] fairTestService.currentWallet:', fairTestService.currentWallet);
        console.log('[CreateExam] fairTestService.currentWalletInstance:', fairTestService.currentWalletInstance);
        
        if (!fairTestService.currentWallet) {
            setValidationErrors(['Please connect your wallet first. Click "Connect Wallet" in the top-right corner.']);
            console.error('[CreateExam] ❌ Wallet not connected!');
            return;
        }

        console.log('[CreateExam] ✅ Wallet connected, proceeding...');
        setStep(4);
        setIsProcessing(true);
        setValidationErrors([]);

        try {
            setPaymentStatus('Processing Yellow payment...');
            const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
            const result = await fairTestService.createExam({
                title: formData.name,
                description: formData.description,
                fee: formData.examFee,
                duration: formData.duration,
                passPercentage: 60,
                instructions: formData.instructions || 'Read all questions carefully. Timer will auto-submit when time expires.',
                questions
            });

            // Show transaction details
            console.log('✅ Exam Created Successfully!');
            console.log('📦 Exam ID:', result.examId);
            console.log('🔗 Transaction:', result.txDigest);
            console.log('🌐 View on Sui Explorer:', `https://suiscan.xyz/testnet/tx/${result.txDigest}`);
            
            setPaymentStatus(`Success! Exam created on Sui blockchain. Tx: ${result.txDigest?.substring(0, 10)}...`);
            
            // Wait a moment to show the success message
            setTimeout(() => {
                router.push('/creator');
            }, 2000);
        } catch (error) {
            console.error(error);
            setIsProcessing(false);
            setValidationErrors([error.message || 'Failed to create exam.']);
        }
    };

    return (
        <div className="create-exam" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Create New Exam</h1>

            {/* Progress Steps */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem', gap: '1rem' }}>
                {['Metadata', 'Questions', 'Preview', 'Publish'].map((label, index) => {
                    const isActiveOrComplete = step >= index + 1;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '2rem',
                                height: '2rem',
                                borderRadius: '50%',
                                background: isActiveOrComplete ? 'var(--orange-primary)' : 'rgba(0,0,0,0.1)',
                                color: isActiveOrComplete ? '#fff' : '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '600'
                            }}>
                                {index + 1}
                            </div>
                            <span style={{ fontSize: '0.875rem', opacity: isActiveOrComplete ? 1 : 0.5 }}>{label}</span>
                            {index < 3 && <span style={{ opacity: 0.3 }}>→</span>}
                        </div>
                    );
                })}
            </div>

            {validationErrors.length > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--error)' }}>Please fix the following errors:</h4>
                    <ul style={{ marginLeft: '1.5rem' }}>
                        {validationErrors.map((error, i) => (
                            <li key={i} style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="glass-card" style={{ background: 'white', border: '4px solid #000', color: '#000' }}>
                {step === 1 && (
                    <div>
                        <h2 style={{ marginBottom: '2rem', color: '#000' }}>Exam Metadata</h2>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#000' }}>Exam Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Advanced NEET Physics"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'white', border: '2px solid #000', color: '#000' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#000' }}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the exam"
                                style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '0.5rem', background: 'white', border: '2px solid #000', color: '#000', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#000' }}>Duration (minutes) *</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    min="1"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'white', border: '2px solid #000', color: '#000' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#000' }}>Registration Fee (SUI) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.examFee}
                                    onChange={e => setFormData({ ...formData, examFee: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'white', border: '2px solid #000', color: '#000' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#000' }}>Attempts Allowed</label>
                                <input
                                    type="number"
                                    value={formData.attemptsAllowed}
                                    onChange={e => setFormData({ ...formData, attemptsAllowed: parseInt(e.target.value) })}
                                    min="1"
                                    max="5"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'white', border: '2px solid #000', color: '#000' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#000' }}>Instructions</label>
                            <textarea
                                value={formData.instructions}
                                onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                                placeholder="Instructions for students taking this exam"
                                style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '0.5rem', background: 'white', border: '2px solid #000', color: '#000', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => navigate('/creator')} className="btn-secondary">Cancel</button>
                            <button onClick={handleNext} className="btn-primary">Next: Add Questions</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <QuestionBuilder questions={questions} setQuestions={setQuestions} />
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #000' }}>
                            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                            <button onClick={handleNext} className="btn-primary">Preview Exam</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h2 style={{ marginBottom: '2rem', color: '#000' }}>Preview & Publish</h2>
                        
                        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.06)', borderRadius: '0.5rem', color: '#000' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#000' }}>{formData.name}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.875rem', color: '#000' }}>
                                <div>
                                    <span style={{ color: '#000' }}>Duration:</span>
                                    <div style={{ fontWeight: '600', color: '#000' }}>{formData.duration} minutes</div>
                                </div>
                                <div>
                                    <span style={{ color: '#000' }}>Questions:</span>
                                    <div style={{ fontWeight: '600', color: '#000' }}>{questions.length}</div>
                                </div>
                                <div>
                                    <span style={{ color: '#000' }}>Total Marks:</span>
                                    <div style={{ fontWeight: '600', color: '#000' }}>{questions.reduce((sum, q) => sum + q.marks, 0)}</div>
                                </div>
                                <div>
                                    <span style={{ color: '#000' }}>Fee:</span>
                                    <div style={{ fontWeight: '600', color: '#000' }}>{formData.examFee} SUI</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: '#000' }}>Questions Summary</h4>
                            {questions.map((q, index) => (
                                <div key={q.id} style={{ padding: '1rem', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.06)', borderRadius: '0.5rem', color: '#000' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#000' }}>Q{index + 1}. {q.text.substring(0, 60)}{q.text.length > 60 ? '...' : ''}</span>
                                        <span style={{ fontSize: '0.875rem', color: '#000' }}>
                                            {q.type.replace('_', ' ').toUpperCase()} • {q.marks} marks
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.06)', border: '2px solid #000', borderRadius: '0.5rem', marginBottom: '2rem', color: '#000' }}>
                            <h4 style={{ marginBottom: '0.5rem', color: '#000' }}>Publishing Fee</h4>
                            <p style={{ fontSize: '0.875rem', color: '#000' }}>
                                A listing fee of <strong>0.1 SUI</strong> will be charged via Yellow Network for off-chain verification and ENS renewal.
                                This fee goes to the FairTest platform.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setStep(2)} className="btn-secondary">Back to Questions</button>
                            <button onClick={handlePublish} className="btn-primary">Pay Listing Fee & Publish</button>
                        </div>
                    </div>
                )}

                {step === 4 && isProcessing && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#000' }}>
                        <div style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600', color: '#000' }}>{paymentStatus}</div>
                        <p style={{ color: '#000' }}>Please wait while we interact with Yellow, ENS, and Sui.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateExam;
