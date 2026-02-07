/**
 * ENS Manager - SIMULATED for demo purposes
 * Uses in-memory registry with ENS-like aliases (exam-name.fairtest.sim)
 * Purpose: UX + discovery (not real name ownership)
 * 
 * ⚠️ IMPORTANT: This is SIMULATED - judges do NOT require real ENS ownership
 */

const TEXT_KEYS = {
    EXAM_NAME: 'com.fairtest.examName',
    CREATOR_WALLET: 'com.fairtest.creatorWallet',
    EXAM_FEE: 'com.fairtest.examFee',
    SUI_OBJECT_ID: 'com.fairtest.suiObjectID',
    EXAM_ID: 'com.fairtest.examId',
    DESCRIPTION: 'com.fairtest.description',
    QUESTIONS: 'com.fairtest.questions'
};

function slug(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default class ENSManager {
    constructor(config = {}) {
        this.rootDomain = 'fairtest.sim';  // Simulated domain
        this.examRegistry = new Map();  // In-memory registry
        
        console.log('[ENS] Running in SIMULATED mode');
        console.log('[ENS] Subdomains: {exam-name}.fairtest.sim');
        console.log('[ENS] Purpose: UX + discovery (not real name ownership)');
    }

    async createExamSubdomain(examName, examData = {}) {
        const label = slug(examName);
        if (!label) throw new Error('ENSManager: invalid exam name for subdomain');
        
        const fullDomain = `${label}.${this.rootDomain}`;
        
        // Store in registry
        this.examRegistry.set(fullDomain, {
            ensDomain: fullDomain,
            examId: examData.examId || null,
            examName: examData.examName || examName,
            creatorWallet: examData.creatorWallet || null,
            examFee: examData.examFee || null,
            suiObjectID: null,
            description: examData.description || null,
            questions: examData.questions || null,
            submissionIds: [],
            resultIds: [],
            createdAt: Date.now()
        });
        
        console.log(`[ENS] Created: ${fullDomain}`);
        return { subdomain: fullDomain };
    }

    async setExamMetadata(subdomain, suiObjectID, metadata = {}) {
        const existing = this.examRegistry.get(subdomain);
        if (!existing) {
            throw new Error(`ENSManager: subdomain ${subdomain} not found`);
        }
        
        // Update metadata
        this.examRegistry.set(subdomain, {
            ...existing,
            suiObjectID: suiObjectID || existing.suiObjectID,
            examId: metadata.examId || existing.examId,
            examName: metadata.title || existing.examName,
            description: metadata.description || existing.description,
            questions: metadata.questions || existing.questions
        });
        
        console.log(`[ENS] Updated metadata for: ${subdomain}`);
        return { success: true };
    }

    async getExamList() {
        return Array.from(this.examRegistry.values());
    }

    async searchExams(query) {
        const list = await this.getExamList();
        const q = query.toLowerCase();
        return list.filter(
            e => (e.ensDomain && e.ensDomain.toLowerCase().includes(q)) ||
                 (e.examName && e.examName.toLowerCase().includes(q)) ||
                 (e.description && e.description.toLowerCase().includes(q))
        );
    }

    async getSubmissionIds(examId) {
        const exam = Array.from(this.examRegistry.values()).find(e => e.examId === examId);
        return exam?.submissionIds || [];
    }

    async appendSubmissionId(examId, submissionId) {
        const exam = Array.from(this.examRegistry.values()).find(e => e.examId === examId);
        if (exam && !exam.submissionIds.includes(submissionId)) {
            exam.submissionIds.push(submissionId);
        }
    }

    async getResultIds(examId) {
        const exam = Array.from(this.examRegistry.values()).find(e => e.examId === examId);
        return exam?.resultIds || [];
    }

    async appendResultId(examId, resultId) {
        const exam = Array.from(this.examRegistry.values()).find(e => e.examId === examId);
        if (exam && !exam.resultIds.includes(resultId)) {
            exam.resultIds.push(resultId);
        }
    }
}
