/**
 * FairTest Service - Real integration with Yellow, Sui, and ENS
 * NO DUMMY DATA - All data comes from actual integrations
 */

import YellowSessionManager from '../../../packages/yellow-integration/YellowSessionManager.js';
import PaymentFlow from '../../../packages/yellow-integration/PaymentFlow.js';
import SuiStorageManager from '../../../packages/sui-integration/SuiStorageManager.js';
import ENSManager from '../../../packages/ens-integration/ENSManager.js';
import AnonymousIDManager from '../../../packages/identity/AnonymousIDManager.js';

class FairTestService {
    constructor() {
        this.yellow = new YellowSessionManager();
        this.payment = new PaymentFlow(this.yellow);
        this.ens = new ENSManager();
        this.sui = new SuiStorageManager({ ensManager: this.ens });
        this.identity = new AnonymousIDManager();
        
        // Current user context
        this.currentWallet = null;
        this.currentUID = null;
    }

    /**
     * Connect wallet and generate anonymous exam identity
     * LAYER 1: Payment Identity (wallet) - for payments only
     * LAYER 2: Exam Identity (FINAL_HASH) - for submissions/evaluation
     */
    async connectWallet(walletAddress) {
        this.currentWallet = walletAddress;
        
        console.log('[FairTest] Wallet connected (Payment Identity):', walletAddress);
        console.log('[FairTest] ⚠️  Wallet used ONLY for payments, NEVER for evaluation');
        
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
     */
    async createExam(examData) {
        if (!this.currentWallet) throw new Error('Wallet not connected');
        
        // Step 1: Create Yellow Network payment session for listing fee
        console.log('[FairTest] Step 1: Creating Yellow payment session...');
        const listingFee = 0.1; // Platform listing fee
        const paymentResult = await this.payment.processListingPayment({
            creatorWallet: this.currentWallet,
            listingFee,
            examMetadata: { title: examData.title }
        });
        
        // Step 2: Create ENS subdomain
        console.log('[FairTest] Step 2: Creating ENS subdomain...');
        const ensResult = await this.ens.createExamSubdomain(examData.title, {
            examName: examData.title,
            creatorWallet: this.currentWallet,
            examFee: examData.fee
        });
        
        // Step 3: Store exam on Sui blockchain
        console.log('[FairTest] Step 3: Storing exam on Sui blockchain...');
        const suiResult = await this.sui.storeExam({
            ...examData,
            creatorWallet: this.currentWallet,
            yellowSessionId: paymentResult.sessionId,
            ensDomain: ensResult.subdomain
        });
        
        // Step 4: Link ENS to Sui object (metadata for getExam)
        console.log('[FairTest] Step 4: Linking ENS to Sui object...');
        await this.ens.setExamMetadata(ensResult.subdomain, suiResult.objectId, {
            suiObjectID: suiResult.objectId,
            examId: suiResult.examId,
            title: examData.title,
            description: examData.description ?? '',
            questions: examData.questions ?? []
        });
        
        // Step 5: Settle Yellow payment
        console.log('[FairTest] Step 5: Settling Yellow payment...');
        await this.yellow.settleSession(paymentResult.sessionId);
        
        console.log('[FairTest] ✅ Exam created successfully!');
        
        return {
            examId: suiResult.examId,
            ensDomain: ensResult.subdomain,
            suiObjectId: suiResult.objectId,
            yellowSessionId: paymentResult.sessionId
        };
    }

    /**
     * CREATOR: Get creator dashboard stats
     */
    async getCreatorStats(creatorWallet) {
        const allExams = await this.sui.getAllExams();
        const myExams = allExams.filter(e => e.creator === creatorWallet);
        
        let totalEarnings = 0;
        let totalStudents = 0;
        let platformFees = 0;
        
        for (const exam of myExams) {
            const stats = await this.sui.getExamStats(exam.examId);
            totalStudents += stats.totalSubmissions;
            totalEarnings += stats.totalSubmissions * parseFloat(exam.fee);
        }
        
        platformFees = myExams.length * 0.1; // 0.1 SUI per exam listing
        
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
        // Get exams from ENS discovery
        const ensExams = await this.ens.getExamList();
        
        // Enrich with Sui blockchain data
        const exams = [];
        for (const ensExam of ensExams) {
            if (ensExam.examId) {
                try {
                    const suiExam = await this.sui.getExam(ensExam.examId);
                    const stats = await this.sui.getExamStats(ensExam.examId);
                    
                    exams.push({
                        ...suiExam,
                        ensDomain: ensExam.ensDomain,
                        stats
                    });
                } catch (error) {
                    console.warn(`[FairTest] Could not load exam ${ensExam.examId}:`, error.message);
                }
            }
        }
        
        return exams;
    }

    /**
     * STUDENT: Register for exam
     */
    async registerForExam(examId) {
        if (!this.currentWallet) throw new Error('Wallet not connected');
        
        const exam = await this.sui.getExam(examId);
        
        // Create Yellow payment session for exam fee
        console.log('[FairTest] Creating Yellow payment session for registration...');
        const paymentResult = await this.payment.processRegistrationPayment({
            studentWallet: this.currentWallet,
            examId,
            examFee: parseFloat(exam.fee),
            creatorWallet: exam.creator
        });
        
        console.log('[FairTest] ✅ Registered for exam!');
        console.log('[FairTest] Yellow Session:', paymentResult.sessionId);
        
        return {
            examId,
            yellowSessionId: paymentResult.sessionId,
            registered: true
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
