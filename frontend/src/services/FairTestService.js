/**
 * FairTest Service - Sui-only implementation
 * Payments, storage, and identity all on Sui blockchain
 */

import SuiStorageManager from '../../../packages/sui-integration/SuiStorageManager.js';
import AnonymousIDManager from '../../../packages/identity/AnonymousIDManager.js';
import ENSManager from '../../../packages/ens-integration/ENSManager.js';

class FairTestService {
    constructor() {
        console.log('[FairTest] ✅ Sui-only mode');
        console.log('[FairTest] Payments via Slush wallet');
        
        // Initialize ENS Manager (mock/simulated)
        this.ens = new ENSManager();
        
        // Ensure packageId is set from environment
        const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || process.env.SUI_PACKAGE_ID;
        console.log('[FairTest] SUI_PACKAGE_ID:', packageId);
        
        this.sui = new SuiStorageManager({ 
            packageId: packageId,
            network: process.env.NEXT_PUBLIC_SUI_NETWORK || process.env.SUI_NETWORK || 'testnet',
            rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || process.env.SUI_RPC_URL,
            privateKey: process.env.NEXT_PUBLIC_SUI_PRIVATE_KEY || process.env.SUI_PRIVATE_KEY,
            ensManager: this.ens // Pass ENS to Sui manager
        });
        this.identity = new AnonymousIDManager();
        
        // Current user context
        this.currentWallet = null;
        this.currentWalletInstance = null; // Store wallet instance for signing
        this.currentUID = null;
    }

    /**
     * Connect wallet (Slush for payments AND identity)
     * LAYER 1: Payment Identity (Sui wallet) - for payments
     * LAYER 2: Exam Identity (FINAL_HASH) - for submissions/evaluation
     */
    async connectWallet(walletAddress, walletInstance = null) {
        this.currentWallet = walletAddress;
        this.currentWalletInstance = walletInstance;
        
        // Update SuiStorageManager with wallet instance for signing
        if (walletInstance) {
            this.sui.wallet = walletInstance;
            console.log('[FairTest] ✅ Wallet instance connected for transaction signing');
            console.log('[FairTest] Wallet address:', walletAddress);
            console.log('[FairTest] Wallet instance:', walletInstance);
        } else {
            console.log('[FairTest] ⚠️  Wallet disconnected or instance not provided');
        }
        
        console.log('[FairTest] Slush connected (Payment Identity):', walletAddress);
        console.log('[FairTest] ⚠️  Wallet used for payments, NEVER for evaluation');
        console.log('[FairTest] currentWallet set to:', this.currentWallet);
        
        return {
            wallet: this.currentWallet
        };
    }

    /**
     * Generate exam identity when student starts exam
     * Creates: UID → UID_HASH → FINAL_HASH
     */
    async generateExamIdentity(examId) {
        if (!this.currentWallet) throw new Error('Wallet not connected');
        
        const identity = await this.identity.generateExamIdentity(this.currentWallet, examId);
        
        // Store locally for result retrieval
        this.identity.storeUIDLocally(identity);
        
        // Store current identity
        this.currentIdentity = identity;
        
        console.log('[FairTest] Exam Identity Generated');
        console.log('  FINAL_HASH (blockchain):', identity.finalHash.substring(0, 16) + '...');
        console.log('  ✅ Identity separation: Payment ≠ Exam');
        
        return identity;
    }

    /**
     * Get stored exam identity (for Take page after Instructions)
     */
    getExamIdentity(examId) {
        const recovered = this.identity.recoverUID(examId);
        if (recovered) return recovered;
        if (this.currentIdentity && this.currentIdentity.examId === examId) return this.currentIdentity;
        return null;
    }

    /**
     * CREATOR: Create and publish exam
     * Payment via Sui, storage on Sui
     */
    async createExam(examData) {
        if (!this.currentWallet) throw new Error('Wallet not connected');
        
        console.log('[FairTest] Creating exam on Sui blockchain...');
        
        // Store exam on Sui blockchain with platform fee payment
        const suiResult = await this.sui.storeExam({
            ...examData,
            creatorWallet: this.currentWallet
        });
        
        console.log('[FairTest] ✅ Exam created successfully!');
        
        return {
            examId: suiResult.examId,
            suiObjectId: suiResult.objectId,
            txDigest: suiResult.txDigest
        };
    }

    /**
     * CREATOR: Get creator dashboard stats
     */
    async getCreatorStats(creatorWallet) {
        // Get earnings from local storage
        let totalEarnings = 0;
        let totalStudents = 0;
        let platformFees = 0;
        let myExams = [];
        
        if (typeof window !== 'undefined' && window.localStorage) {
            // Get all exams created by this creator
            const stored = localStorage.getItem('fairtest_exam_ids');
            if (stored) {
                const examIds = JSON.parse(stored);
                for (const examId of examIds) {
                    const metadataKey = `fairtest_exam_${examId}`;
                    const metadata = localStorage.getItem(metadataKey);
                    if (metadata) {
                        const exam = JSON.parse(metadata);
                        if (exam.creator === creatorWallet) {
                            myExams.push(exam);
                        }
                    }
                }
            }
            
            // Get earnings data
            const earningsData = localStorage.getItem('fairtest_creator_earnings');
            if (earningsData) {
                const earnings = JSON.parse(earningsData);
                if (earnings[creatorWallet]) {
                    totalEarnings = earnings[creatorWallet].totalEarnings || 0;
                    totalStudents = earnings[creatorWallet].totalStudents || 0;
                }
            }
            
            // Platform fees: 0.01 SUI per exam created
            platformFees = myExams.length * 0.01;
        }
        
        return {
            totalEarnings: totalEarnings.toFixed(2),
            totalExams: myExams.length,
            totalStudents,
            platformFees: platformFees.toFixed(2),
            exams: myExams
        };
    }

    /**
     * STUDENT: Browse available exams
     */
    async browseExams() {
        console.log('[FairTest] Browsing exams from Sui blockchain...');
        const allExams = await this.sui.getAllExams();
        console.log('[FairTest] Found', allExams.length, 'exams');
        return allExams;
    }

    /**
     * STUDENT: Register for exam
     * Payment via Sui to creator
     */
    async registerForExam(examId) {
        if (!this.currentWallet) throw new Error('Wallet not connected');
        
        const exam = await this.sui.getExam(examId);
        
        // Register and pay exam fee on Sui
        console.log('[FairTest] Registering for exam on Sui...');
        const result = await this.sui.registerForExam({
            examId,
            studentWallet: this.currentWallet,
            examFee: parseFloat(exam.fee),
            creatorWallet: exam.creator
        });
        
        console.log('[FairTest] ✅ Registered for exam!');
        
        return {
            examId,
            registered: true,
            txDigest: result.txDigest
        };
    }

    /**
     * STUDENT: Submit exam answers
     * Uses FINAL_HASH (from UID → UID_HASH → FINAL_HASH)
     * Wallet address NEVER stored on blockchain
     */
    async submitExam(examId, answers, timeTaken) {
        if (!this.currentWallet) throw new Error('Wallet not connected');
        
        // Generate or recover exam identity
        let identity = this.identity.recoverUID(examId);
        if (!identity) {
            identity = await this.generateExamIdentity(examId);
        }
        
        // Create submission payload (only FINAL_HASH, no wallet)
        const submissionPayload = this.identity.createSubmissionPayload(identity, examId, answers);
        
        // Audit privacy before blockchain storage
        const privacyAudit = this.identity.auditPrivacy(submissionPayload, this.currentWallet);
        if (!privacyAudit.passed) {
            throw new Error('Privacy audit failed! Wallet address found in submission data');
        }
        
        // Store submission on Sui blockchain with FINAL_HASH only
        console.log('[FairTest] Submitting exam with FINAL_HASH (anonymous)...');
        const result = await this.sui.storeSubmission({
            examId,
            finalHash: identity.finalHash, // Only FINAL_HASH goes to blockchain
            answerHash: submissionPayload.answerHash,
            answers, // Store answers for evaluator (in local storage)
            timeTaken
        });
        
        console.log('[FairTest] ✅ Submission recorded on blockchain!');
        console.log('[FairTest] Submission ID:', result.submissionId);
        console.log('[FairTest] Privacy: Wallet address NOT stored ✅');
        console.log('[FairTest] Privacy: Only FINAL_HASH stored ✅');
        
        return result;
    }

    /**
     * STUDENT: Get my results (by FINAL_HASH from local storage)
     * Student's wallet never sent to blockchain
     */
    async getMyResults() {
        // Get all exam identities from local storage
        const results = [];
        
        if (typeof window !== 'undefined' && window.localStorage) {
            // Iterate through local storage to find all exam identities
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fairtest_uid_')) {
                    const identity = JSON.parse(localStorage.getItem(key));
                    
                    // Query blockchain by FINAL_HASH
                    const examResults = await this.sui.getStudentResults(identity.finalHash);
                    results.push(...examResults);
                }
            }
        }
        
        // Enrich with exam details
        const enrichedResults = [];
        for (const result of results) {
            const exam = await this.sui.getExam(result.examId);
            enrichedResults.push({
                ...result,
                examTitle: exam.title,
                examTotalMarks: exam.totalMarks
            });
        }
        
        console.log(`[FairTest] Retrieved ${enrichedResults.length} results by FINAL_HASH`);
        console.log('[FairTest] ✅ No wallet address used in query');
        
        return enrichedResults;
    }

    /**
     * EVALUATOR: Get pending submissions
     */
    async getPendingSubmissions(examId) {
        const submissions = await this.sui.getPendingSubmissions(examId);
        const exam = await this.sui.getExam(examId);
        
        return submissions.map(sub => ({
            ...sub,
            exam
        }));
    }

    /**
     * EVALUATOR: Submit evaluation
     * Uses FINAL_HASH for both student and evaluator
     * Both identities remain anonymous
     */
    async submitEvaluation(submissionId, evaluationData) {
        if (!this.currentWallet) throw new Error('Wallet not connected');
        
        // Generate anonymous evaluator identity
        const evaluatorIdentity = await this.identity.generateExamIdentity(
            this.currentWallet,
            `eval_${submissionId}`
        );
        
        const submission = await this.sui.getSubmission(submissionId);
        
        console.log('[FairTest] Evaluation data being submitted:', {
            submissionId,
            examId: submission.examId,
            studentFinalHash: submission.finalHash,
            evaluatorFinalHash: evaluatorIdentity.finalHash,
            ...evaluationData
        });
        
        // Store result on Sui blockchain with FINAL_HASH for both parties
        console.log('[FairTest] Storing evaluation on blockchain...');
        const result = await this.sui.storeResult({
            submissionId,
            examId: submission.examId,
            studentFinalHash: submission.finalHash, // Student's FINAL_HASH
            evaluatorFinalHash: evaluatorIdentity.finalHash, // Evaluator's FINAL_HASH
            ...evaluationData
        });
        
        console.log('[FairTest] ✅ Evaluation recorded on blockchain!');
        console.log('[FairTest] Result ID:', result.resultId);
        console.log('[FairTest] Privacy: Student identity hidden ✅');
        console.log('[FairTest] Privacy: Evaluator identity hidden ✅');
        console.log('[FairTest] Privacy: No wallet addresses stored ✅');
        
        return result;
    }

    /**
     * Get exam statistics
     */
    async getExamStats(examId) {
        return await this.sui.getExamStats(examId);
    }

    /**
     * Get single exam by ID (for taking exam / loading questions)
     */
    async getExam(examId) {
        return await this.sui.getExam(examId);
    }
}

// Singleton instance
const fairTestService = new FairTestService();

export default fairTestService;
