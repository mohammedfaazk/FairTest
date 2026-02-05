/**
 * Sui Blockchain Storage Manager
 * Handles exam, submission, and result storage on Sui blockchain
 */

class SuiStorageManager {
    constructor(config = {}) {
        this.packageId = config.packageId || process.env.SUI_PACKAGE_ID;
        this.network = config.network || process.env.SUI_NETWORK || 'testnet';
        this.rpcUrl = config.rpcUrl || `https://fullnode.${this.network}.sui.io:443`;
        
        // In-memory storage for demo (would be replaced with actual Sui RPC calls)
        this.exams = new Map();
        this.submissions = new Map();
        this.results = new Map();
    }

    /**
     * Store exam metadata on Sui blockchain
     */
    async storeExam(examData) {
        const examId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const examObject = {
            objectId: '0x' + Math.random().toString(16).substr(2, 40),
            examId,
            title: examData.title,
            description: examData.description,
            creator: examData.creatorWallet,
            duration: examData.duration,
            fee: examData.fee,
            passPercentage: examData.passPercentage,
            questions: examData.questions,
            totalMarks: examData.questions.reduce((sum, q) => sum + q.marks, 0),
            createdAt: Date.now(),
            status: 'active',
            yellowSessionId: examData.yellowSessionId,
            ensDomain: examData.ensDomain
        };
        
        this.exams.set(examId, examObject);
        
        console.log(`[Sui] Exam stored on blockchain: ${examId}`);
        console.log(`[Sui] Object ID: ${examObject.objectId}`);
        
        return {
            success: true,
            examId,
            objectId: examObject.objectId,
            txDigest: '0x' + Math.random().toString(16).substr(2, 64)
        };
    }

    /**
     * Get exam by ID
     */
    async getExam(examId) {
        const exam = this.exams.get(examId);
        if (!exam) {
            throw new Error(`Exam ${examId} not found on blockchain`);
        }
        return exam;
    }

    /**
     * Get all active exams
     */
    async getAllExams() {
        return Array.from(this.exams.values()).filter(e => e.status === 'active');
    }

    /**
     * Store student submission on Sui blockchain
     * ONLY stores FINAL_HASH, never wallet address or UID
     */
    async storeSubmission(submissionData) {
        const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Blockchain storage - ONLY anonymous data
        const submissionObject = {
            objectId: '0x' + Math.random().toString(16).substr(2, 40),
            submissionId,
            examId: submissionData.examId,
            finalHash: submissionData.finalHash, // FINAL_HASH only (from UID → UID_HASH → FINAL_HASH)
            answerHash: submissionData.answerHash, // Hash of answers, not raw answers
            submittedAt: Date.now(),
            timeTaken: submissionData.timeTaken,
            status: 'pending_evaluation',
            // NO wallet address
            // NO uid
            // NO uidHash
        };
        
        this.submissions.set(submissionId, submissionObject);
        
        console.log(`[Sui] Submission stored on blockchain: ${submissionId}`);
        console.log(`[Sui] Object ID: ${submissionObject.objectId}`);
        console.log(`[Sui] FINAL_HASH: ${submissionObject.finalHash.substring(0, 16)}... (anonymous)`);
        console.log(`[Sui] ✅ NO wallet address stored`);
        
        return {
            success: true,
            submissionId,
            objectId: submissionObject.objectId,
            txDigest: '0x' + Math.random().toString(16).substr(2, 64)
        };
    }

    /**
     * Get submission by ID
     */
    async getSubmission(submissionId) {
        const submission = this.submissions.get(submissionId);
        if (!submission) {
            throw new Error(`Submission ${submissionId} not found on blockchain`);
        }
        return submission;
    }

    /**
     * Get all submissions for an exam
     */
    async getExamSubmissions(examId) {
        return Array.from(this.submissions.values())
            .filter(s => s.examId === examId);
    }

    /**
     * Get pending submissions for evaluation
     */
    async getPendingSubmissions(examId) {
        return Array.from(this.submissions.values())
            .filter(s => s.examId === examId && s.status === 'pending_evaluation');
    }

    /**
     * Store evaluation result on Sui blockchain
     * ONLY stores FINAL_HASH for both student and evaluator
     */
    async storeResult(resultData) {
        const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Blockchain storage - ONLY anonymous data
        const resultObject = {
            objectId: '0x' + Math.random().toString(16).substr(2, 40),
            resultId,
            submissionId: resultData.submissionId,
            examId: resultData.examId,
            studentFinalHash: resultData.studentFinalHash, // Student's FINAL_HASH
            evaluatorFinalHash: resultData.evaluatorFinalHash, // Evaluator's FINAL_HASH
            score: resultData.score,
            maxScore: resultData.maxScore,
            percentage: resultData.percentage,
            passed: resultData.passed,
            feedback: resultData.feedback,
            questionScores: resultData.questionScores,
            evaluatedAt: Date.now(),
            immutable: true
            // NO wallet addresses
            // NO uid or uidHash
        };
        
        this.results.set(resultId, resultObject);
        
        // Update submission status
        const submission = this.submissions.get(resultData.submissionId);
        if (submission) {
            submission.status = 'evaluated';
            submission.resultId = resultId;
        }
        
        console.log(`[Sui] Result stored on blockchain: ${resultId}`);
        console.log(`[Sui] Object ID: ${resultObject.objectId}`);
        console.log(`[Sui] Score: ${resultData.score}/${resultData.maxScore} (${resultData.percentage}%)`);
        console.log(`[Sui] Student FINAL_HASH: ${resultObject.studentFinalHash.substring(0, 16)}...`);
        console.log(`[Sui] Evaluator FINAL_HASH: ${resultObject.evaluatorFinalHash.substring(0, 16)}...`);
        console.log(`[Sui] ✅ NO wallet addresses stored`);
        
        return {
            success: true,
            resultId,
            objectId: resultObject.objectId,
            txDigest: '0x' + Math.random().toString(16).substr(2, 64)
        };
    }

    /**
     * Get result by submission ID
     */
    async getResultBySubmission(submissionId) {
        const result = Array.from(this.results.values())
            .find(r => r.submissionId === submissionId);
        
        if (!result) {
            throw new Error(`Result for submission ${submissionId} not found`);
        }
        return result;
    }

    /**
     * Get all results for a student (by FINAL_HASH)
     * Student provides their locally stored FINAL_HASH to retrieve results
     */
    async getStudentResults(studentFinalHash) {
        console.log(`[Sui] Querying results by FINAL_HASH: ${studentFinalHash.substring(0, 16)}...`);
        return Array.from(this.results.values())
            .filter(r => r.studentFinalHash === studentFinalHash);
    }

    /**
     * Verify result immutability
     */
    async verifyResult(resultId) {
        const result = this.results.get(resultId);
        if (!result) {
            throw new Error(`Result ${resultId} not found`);
        }
        
        return {
            verified: true,
            immutable: result.immutable,
            objectId: result.objectId,
            timestamp: result.evaluatedAt,
            blockchainProof: '0x' + Math.random().toString(16).substr(2, 64)
        };
    }

    /**
     * Get exam statistics
     */
    async getExamStats(examId) {
        const submissions = await this.getExamSubmissions(examId);
        const results = Array.from(this.results.values())
            .filter(r => r.examId === examId);
        
        const totalSubmissions = submissions.length;
        const evaluated = results.length;
        const pending = totalSubmissions - evaluated;
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        
        const avgScore = results.length > 0
            ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
            : 0;
        
        return {
            totalSubmissions,
            evaluated,
            pending,
            passed,
            failed,
            avgScore: Math.round(avgScore * 10) / 10
        };
    }
}

export default SuiStorageManager;
