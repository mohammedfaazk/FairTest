/**
 * Sui Blockchain Storage Manager - Real Sui integration
 * Uses deployed Move contracts (exam, submission, result) on Sui testnet.
 * No in-memory Maps; real object IDs and transaction digests from chain.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { bcs } from '@mysten/sui.js/bcs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui.js/keypairs/secp256k1';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';

const SUI_CLOCK_OBJECT_ID = '0x6';

function getEnv(key) {
    // Check Next.js public env variables first (browser)
    if (typeof process !== 'undefined' && process.env) {
        const nextPublicKey = `NEXT_PUBLIC_${key}`;
        if (process.env[nextPublicKey] != null) return process.env[nextPublicKey];
        if (process.env[key] != null) return process.env[key];
    }
    // Check global fallback
    if (typeof globalThis !== 'undefined' && globalThis.__FAIRTEST_ENV__?.[key] != null) {
        return globalThis.__FAIRTEST_ENV__[key];
    }
    return undefined;
}

function hexToBytes(hex) {
    const h = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (h.length % 2) throw new Error('Invalid hex length');
    const bytes = new Uint8Array(h.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return bytes;
}

function bytesToHex(bytes) {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function createSigner(privateKey) {
    if (!privateKey) return null;
    const key = privateKey.trim();
    if (key.startsWith('suiprivkey')) {
        const { schema, secretKey } = decodeSuiPrivateKey(key);
        if (schema === 'ED25519') return Ed25519Keypair.fromSecretKey(secretKey);
        if (schema === 'Secp256k1') return Secp256k1Keypair.fromSecretKey(secretKey);
        throw new Error(`Unsupported key scheme: ${schema}`);
    }
    const bytes = hexToBytes(key);
    if (bytes.length === 32) return Ed25519Keypair.fromSecretKey(bytes);
    if (bytes.length === 33) return Secp256k1Keypair.fromSecretKey(bytes);
    throw new Error('Invalid private key length');
}

function getCreatedObjectId(result) {
    const changes = result.objectChanges ?? [];
    const created = changes.find(c => c.type === 'created');
    return created ? created.objectId : null;
}

function getTxDigest(result) {
    return result.digest ?? null;
}

export default class SuiStorageManager {
    constructor(config = {}) {
        this.packageId = config.packageId ?? getEnv('SUI_PACKAGE_ID');
        this.network = config.network ?? getEnv('SUI_NETWORK') ?? 'testnet';
        this.rpcUrl = config.rpcUrl ?? getEnv('SUI_RPC_URL') ?? getFullnodeUrl(this.network);
        this.ensManager = config.ensManager ?? null;
        
        // Support both wallet (browser) and private key (server) signing
        this.wallet = config.wallet ?? null; // Suiet wallet instance
        
        const pk = config.privateKey ?? getEnv('SUI_PRIVATE_KEY');
        this.signer = pk ? createSigner(pk) : null;
        
        // Initialize client lazily (only when packageId is available)
        this._client = null;
    }

    /**
     * Set wallet instance for browser-based transaction signing
     */
    setWallet(walletInstance) {
        this.wallet = walletInstance;
        console.log('[Sui] Wallet instance set for transaction signing');
    }

    _requirePackageId() {
        if (!this.packageId) {
            throw new Error('SuiStorageManager: SUI_PACKAGE_ID is required. Set SUI_PACKAGE_ID environment variable or pass packageId in config.');
        }
    }

    get client() {
        if (!this._client && this.packageId) {
            this._client = new SuiClient({ url: this.rpcUrl });
        }
        return this._client;
    }

    async _executeTx(transaction) {
        // Use wallet if available (browser), otherwise use signer (server)
        if (this.wallet && typeof window !== 'undefined') {
            try {
                console.log('[Sui] Signing with connected wallet...');
                
                // Use signAndExecuteTransactionBlock from wallet kit
                const result = await this.wallet.signAndExecuteTransactionBlock({
                    transactionBlock: transaction,
                    options: { showObjectChanges: true, showEffects: true }
                });
                
                if (result.effects?.status?.status !== 'success') {
                    const err = result.effects?.status?.error ?? result.effects?.status;
                    console.error('[Sui] Transaction failed:', JSON.stringify(result.effects, null, 2));
                    throw new Error(err ? JSON.stringify(err) : 'Transaction failed');
                }
                
                console.log('[Sui] ✅ Transaction successful!');
                return result;
            } catch (error) {
                console.error('[Sui] Wallet transaction error:', error);
                throw error;
            }
        }
        
        // Fallback to server-side signing
        if (!this.signer) throw new Error('SuiStorageManager: Wallet not connected or SUI_PRIVATE_KEY required');
        
        try {
            console.log('[Sui] Signing with server private key...');
            const result = await this.client.signAndExecuteTransactionBlock({
                transactionBlock: transaction,
                signer: this.signer,
                options: { showObjectChanges: true, showEffects: true }
            });
            
            if (result.effects?.status?.status !== 'success') {
                const err = result.effects?.status?.error ?? result.effects?.status;
                console.error('[Sui] Transaction failed:', JSON.stringify(result.effects, null, 2));
                throw new Error(err ? JSON.stringify(err) : 'Transaction failed');
            }
            
            return result;
        } catch (error) {
            console.error('[Sui] Transaction error:', error);
            throw error;
        }
    }

    async storeExam(examData) {
        this._requirePackageId();
        const examIdStr = `exam_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const examIdBytes = Array.from(new TextEncoder().encode(examIdStr));
        const examTitle = examData.title || '';
        const examFee = BigInt(Math.floor(Number(examData.fee ?? 0) * 1e9));
        const platformFee = BigInt(Math.floor(0.01 * 1e9)); // 0.01 SUI platform fee

        const tx = new TransactionBlock();
        tx.setGasBudget(100000000);
        
        // REAL PAYMENT: Transfer platform fee to platform wallet
        const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS || 
                              (typeof process !== 'undefined' && process.env?.PLATFORM_WALLET_ADDRESS);
        
        if (platformWallet && platformWallet !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log('[Sui] Transferring platform fee:', 0.01, 'SUI to', platformWallet);
            const [coin] = tx.splitCoins(tx.gas, [tx.pure(platformFee)]);
            tx.transferObjects([coin], tx.pure(platformWallet));
        }
        
        // Create exam on blockchain
        tx.moveCall({
            target: `${this.packageId}::exam::create_exam`,
            arguments: [
                tx.pure(bcs.vector(bcs.U8).serialize(examIdBytes)),
                tx.pure.string(examTitle),
                tx.pure.u64(examFee),
                tx.object(SUI_CLOCK_OBJECT_ID)
            ]
        });

        const result = await this._executeTx(tx);
        const objectId = getCreatedObjectId(result);
        const txDigest = getTxDigest(result);
        if (!objectId) throw new Error('Failed to get created exam object ID');

        const examId = objectId;
        console.log('[Sui] ✅ Exam stored on blockchain:', examId);
        console.log('[Sui] ✅ Platform fee paid:', 0.01, 'SUI');
        console.log('[Sui] Tx digest:', txDigest);

        // Store exam metadata in local storage for browsing
        if (typeof window !== 'undefined' && window.localStorage) {
            const examMetadata = {
                examId,
                objectId,
                title: examData.title,
                description: examData.description,
                creator: examData.creatorWallet,
                fee: examData.fee,
                duration: examData.duration,
                passPercentage: examData.passPercentage || 60,
                questions: examData.questions || [],
                totalMarks: (examData.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0),
                createdAt: Date.now(),
                status: 'active'
            };
            
            // Store in exam list
            const stored = localStorage.getItem('fairtest_exam_ids');
            const examIds = stored ? JSON.parse(stored) : [];
            if (!examIds.includes(examId)) {
                examIds.push(examId);
                localStorage.setItem('fairtest_exam_ids', JSON.stringify(examIds));
            }
            
            // Store full exam metadata
            localStorage.setItem(`fairtest_exam_${examId}`, JSON.stringify(examMetadata));
            console.log('[Sui] ✅ Exam metadata stored in local storage');
        }

        // Store in ENS if available
        if (this.ensManager) {
            try {
                await this.ensManager.createExamSubdomain(examData.title, {
                    examId,
                    examName: examData.title,
                    creatorWallet: examData.creatorWallet,
                    examFee: examData.fee,
                    description: examData.description,
                    questions: examData.questions
                });
                await this.ensManager.setExamMetadata(`${examData.title.toLowerCase().replace(/\s+/g, '-')}.fairtest.sim`, examId, examData);
            } catch (e) {
                console.warn('[Sui] ENS metadata storage failed:', e.message);
            }
        }

        return {
            success: true,
            examId,
            objectId,
            txDigest: txDigest ?? undefined
        };
    }

    async registerForExam({ examId, studentWallet, examFee, creatorWallet }) {
        this._requirePackageId();
        
        console.log('[Sui] Registering for exam:', examId);
        console.log('[Sui] Student:', studentWallet);
        console.log('[Sui] Fee:', examFee, 'SUI');
        console.log('[Sui] Creator:', creatorWallet);
        
        const feeAmount = BigInt(Math.floor(Number(examFee) * 1e9));
        
        const tx = new TransactionBlock();
        tx.setGasBudget(100000000);
        
        // REAL PAYMENT: Transfer exam fee to creator
        console.log('[Sui] Transferring exam fee:', examFee, 'SUI to creator');
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(feeAmount)]);
        tx.transferObjects([coin], tx.pure(creatorWallet));
        
        const result = await this._executeTx(tx);
        const txDigest = getTxDigest(result);
        
        console.log('[Sui] ✅ Registration complete');
        console.log('[Sui] ✅ Exam fee paid:', examFee, 'SUI');
        console.log('[Sui] Tx digest:', txDigest);
        
        return {
            success: true,
            txDigest: txDigest ?? undefined
        };
    }

    _parseExamObject(obj) {
        // obj is already the data object from getObject response
        const content = obj.content;
        if (!content || content.dataType !== 'moveObject') {
            console.error('[Sui] Invalid object structure:', JSON.stringify(obj, null, 2));
            return null;
        }
        const fields = content.fields ?? {};
        console.log('[Sui] Parsing exam fields:', JSON.stringify(fields, null, 2));
        return {
            examId: fields.exam_id ? bytesToHex(fields.exam_id) : null,
            creator: fields.creator ?? null,
            ens_name: fields.ens_name ?? '',
            exam_fee: fields.exam_fee != null ? String(fields.exam_fee) : '0',
            status: fields.status != null ? Number(fields.status) : 1,
            timestamp: fields.timestamp != null ? Number(fields.timestamp) : 0
        };
    }

    async getExam(examId) {
        // Try local storage first (no packageId needed)
        if (typeof window !== 'undefined' && window.localStorage) {
            const metadataKey = `fairtest_exam_${examId}`;
            const metadata = localStorage.getItem(metadataKey);
            if (metadata) {
                console.log('[Sui] ✅ Exam loaded from local storage:', examId);
                return JSON.parse(metadata);
            }
        }
        
        // Fallback to blockchain (requires packageId)
        this._requirePackageId();
        console.log('[Sui] Loading exam from blockchain:', examId);
        const obj = await this.client.getObject({
            id: examId,
            options: { showContent: true }
        });
        if (obj.error || !obj.data) throw new Error(`Exam ${examId} not found on blockchain`);
        const parsed = this._parseExamObject(obj.data);
        if (!parsed) throw new Error(`Invalid exam object: ${examId}`);

        return {
            examId,
            objectId: examId,
            title: '',
            description: '',
            creator: parsed.creator,
            duration: 60,
            fee: String(Number(parsed.exam_fee) / 1e9),
            passPercentage: 40,
            questions: [],
            totalMarks: 0,
            createdAt: parsed.timestamp,
            status: parsed.status === 1 ? 'active' : 'completed',
            ensDomain: parsed.ens_name,
            yellowSessionId: null
        };
    }

    async getAllExams() {
        try {
            console.log('[Sui] Loading exams from local storage...');
            
            const exams = [];
            if (typeof window !== 'undefined' && window.localStorage) {
                const stored = localStorage.getItem('fairtest_exam_ids');
                if (stored) {
                    const examIds = JSON.parse(stored);
                    console.log('[Sui] Found', examIds.length, 'exam IDs');
                    
                    for (const examId of examIds) {
                        const metadataKey = `fairtest_exam_${examId}`;
                        const metadata = localStorage.getItem(metadataKey);
                        if (metadata) {
                            const exam = JSON.parse(metadata);
                            if (exam.status === 'active') {
                                exams.push(exam);
                            }
                        }
                    }
                }
            }
            
            if (exams.length === 0) {
                console.log('[Sui] ⚠️  No exams found in local storage');
                console.log('[Sui] Create an exam first to see it in the browse list');
            } else {
                console.log('[Sui] Loaded', exams.length, 'active exams');
            }
            
            return exams;
        } catch (error) {
            console.error('[Sui] Error loading exams:', error);
            return [];
        }
    }

    _bytesArg(bytes) {
        return Array.isArray(bytes) ? new Uint8Array(bytes) : bytes;
    }

    async storeSubmission(submissionData) {
        this._requirePackageId();
        const uidHash = typeof submissionData.finalHash === 'string'
            ? hexToBytes(submissionData.finalHash.startsWith('0x') ? submissionData.finalHash.slice(2) : submissionData.finalHash)
            : this._bytesArg(submissionData.finalHash);
        const examIdBytes = typeof submissionData.examId === 'string'
            ? new TextEncoder().encode(submissionData.examId)
            : this._bytesArg(submissionData.examId);
        const answerHash = typeof submissionData.answerHash === 'string'
            ? hexToBytes(submissionData.answerHash.startsWith('0x') ? submissionData.answerHash.slice(2) : submissionData.answerHash)
            : this._bytesArg(submissionData.answerHash);

        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::submission::create_submission`,
            arguments: [
                tx.pure(bcs.vector(bcs.U8).serialize(uidHash)),
                tx.pure(bcs.vector(bcs.U8).serialize(examIdBytes)),
                tx.pure(bcs.vector(bcs.U8).serialize(answerHash)),
                tx.object(SUI_CLOCK_OBJECT_ID)
            ]
        });

        const result = await this._executeTx(tx);
        const objectId = getCreatedObjectId(result);
        const txDigest = getTxDigest(result);
        if (!objectId) throw new Error('Failed to get created submission object ID');

        const submissionId = objectId;
        console.log('[Sui] Submission stored:', submissionId);
        
        // Store answers in local storage for evaluator to access
        if (typeof window !== 'undefined' && window.localStorage) {
            const storageKey = `fairtest_submission_${submissionId}`;
            localStorage.setItem(storageKey, JSON.stringify({
                submissionId,
                examId: submissionData.examId,
                answers: submissionData.answers,
                timeTaken: submissionData.timeTaken,
                finalHash: bytesToHex(uidHash),
                answerHash: bytesToHex(answerHash),
                timestamp: Date.now()
            }));
        }
        
        if (this.ensManager) {
            try {
                await this.ensManager.appendSubmissionId(submissionData.examId, submissionId);
            } catch (e) {
                console.warn('[Sui] ENS appendSubmissionId failed:', e.message);
            }
        }

        return {
            success: true,
            submissionId,
            objectId,
            txDigest: txDigest ?? undefined
        };
    }

    _parseSubmissionObject(obj) {
        const content = obj.data?.content;
        if (!content || content.dataType !== 'moveObject') return null;
        const fields = content.fields ?? {};
        const uidHash = fields.uid_hash ? bytesToHex(fields.uid_hash) : '';
        const examIdBytes = fields.exam_id;
        const examId = examIdBytes ? new TextDecoder().decode(new Uint8Array(examIdBytes)) : '';
        return {
            uid_hash: uidHash,
            finalHash: uidHash,
            examId,
            answerHash: fields.answer_hash ? bytesToHex(fields.answer_hash) : '',
            timestamp: fields.timestamp != null ? Number(fields.timestamp) : 0
        };
    }

    async getSubmission(submissionId) {
        // Try local storage first (no packageId needed)
        if (typeof window !== 'undefined' && window.localStorage) {
            const storageKey = `fairtest_submission_${submissionId}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                console.log('[Sui] ✅ Submission loaded from local storage:', submissionId);
                return {
                    submissionId: data.submissionId,
                    objectId: submissionId,
                    examId: data.examId,
                    finalHash: data.finalHash || 'anonymous',
                    answerHash: data.answerHash || '',
                    answers: data.answers,
                    submittedAt: data.timestamp,
                    timeTaken: data.timeTaken || 0,
                    status: 'pending_evaluation'
                };
            }
        }
        
        // Fallback to blockchain (requires packageId)
        this._requirePackageId();
        const obj = await this.client.getObject({
            id: submissionId,
            options: { showContent: true }
        });
        if (obj.error || !obj.data) throw new Error(`Submission ${submissionId} not found on blockchain`);
        const parsed = this._parseSubmissionObject(obj.data);
        if (!parsed) throw new Error(`Invalid submission object: ${submissionId}`);
        
        return {
            submissionId,
            objectId: submissionId,
            examId: parsed.examId,
            finalHash: parsed.finalHash,
            answerHash: parsed.answerHash,
            answers: null,
            submittedAt: parsed.timestamp,
            timeTaken: 0,
            status: 'pending_evaluation'
        };
    }

    async getExamSubmissions(examId) {
        if (!this.ensManager) {
            throw new Error('ENS Manager not configured. Cannot retrieve submissions without ENS.');
        }
        const ids = await this.ensManager.getSubmissionIds(examId);
        const out = [];
        for (const id of ids) {
            try {
                out.push(await this.getSubmission(id));
            } catch (error) {
                console.error(`[Sui] Failed to load submission ${id}:`, error.message);
                throw new Error(`Failed to load submission ${id} from Sui: ${error.message}`);
            }
        }
        return out;
    }

    async getPendingSubmissions(examId) {
        console.log('[Sui] Getting pending submissions for exam:', examId);
        
        // Get all submissions from local storage
        const submissions = [];
        if (typeof window !== 'undefined' && window.localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fairtest_submission_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        console.log('[Sui] Found submission:', data.submissionId, 'for exam:', data.examId);
                        
                        if (data.examId === examId) {
                            // Check if already graded
                            const resultKey = `fairtest_result_${data.submissionId}`;
                            const hasResult = localStorage.getItem(resultKey);
                            
                            if (!hasResult) {
                                console.log('[Sui] Submission pending:', data.submissionId);
                                submissions.push({
                                    submissionId: data.submissionId,
                                    examId: data.examId,
                                    answers: data.answers,
                                    timeTaken: data.timeTaken,
                                    submittedAt: data.timestamp,
                                    finalHash: data.finalHash || 'anonymous',
                                    status: 'pending_evaluation'
                                });
                            } else {
                                console.log('[Sui] Submission already graded:', data.submissionId);
                            }
                        }
                    } catch (e) {
                        console.error('[Sui] Error parsing submission:', key, e);
                    }
                }
            }
        }
        
        console.log('[Sui] Found', submissions.length, 'pending submissions');
        
        // Get exam details (getExam handles missing packageId via localStorage)
        const exam = await this.getExam(examId);
        
        return submissions.map(sub => ({
            ...sub,
            exam
        }));
    }

    async storeResult(resultData) {
        this._requirePackageId();
        
        // Handle finalHash - it might be a string or need conversion
        let uidHash;
        if (typeof resultData.studentFinalHash === 'string') {
            const hashStr = resultData.studentFinalHash.startsWith('0x') 
                ? resultData.studentFinalHash.slice(2) 
                : resultData.studentFinalHash;
            
            // If it's "anonymous" or invalid, generate a dummy hash
            if (hashStr === 'anonymous' || hashStr.length === 0 || !/^[0-9a-fA-F]+$/.test(hashStr)) {
                console.warn('[Sui] Invalid finalHash, generating dummy hash');
                uidHash = new Uint8Array(32).fill(0); // 32 bytes of zeros
            } else {
                uidHash = hexToBytes(hashStr);
            }
        } else {
            uidHash = this._bytesArg(resultData.studentFinalHash);
        }
        
        const examIdBytes = new TextEncoder().encode(resultData.examId);
        const score = BigInt(Math.floor(Number(resultData.score ?? 0)));
        const maxScore = BigInt(Math.floor(Number(resultData.maxScore ?? 100)));
        const rank = BigInt(0);

        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::result::publish_result`,
            arguments: [
                tx.pure(bcs.vector(bcs.U8).serialize(uidHash)),
                tx.pure(bcs.vector(bcs.U8).serialize(examIdBytes)),
                tx.pure.u64(score),
                tx.pure.u64(rank),
                tx.object(SUI_CLOCK_OBJECT_ID)
            ]
        });

        const result = await this._executeTx(tx);
        const objectId = getCreatedObjectId(result);
        const txDigest = getTxDigest(result);
        if (!objectId) throw new Error('Failed to get created result object ID');

        const resultId = objectId;
        
        // Get exam details for pass percentage
        const exam = await this.getExam(resultData.examId);
        const passPercentage = exam.passPercentage || 60;
        
        // Store result in local storage
        if (typeof window !== 'undefined' && window.localStorage) {
            const resultKey = `fairtest_result_${resultData.submissionId}`;
            const percentage = resultData.maxScore ? (Number(resultData.score) / Number(resultData.maxScore)) * 100 : 0;
            const passed = percentage >= passPercentage;
            
            const resultObj = {
                resultId,
                submissionId: resultData.submissionId,
                examId: resultData.examId,
                studentFinalHash: resultData.studentFinalHash,
                evaluatorFinalHash: resultData.evaluatorFinalHash,
                score: resultData.score,
                maxScore: resultData.maxScore,
                percentage: Math.round(percentage * 10) / 10,
                passed,
                feedback: resultData.feedback || '',
                questionScores: resultData.questionScores || [],
                evaluatedAt: Date.now(),
                txDigest
            };
            
            localStorage.setItem(resultKey, JSON.stringify(resultObj));
            console.log('[Sui] ✅ Result stored in local storage:', resultKey);
            console.log('[Sui] Result data:', resultObj);
            
            // Update creator earnings
            const creatorEarnings = localStorage.getItem('fairtest_creator_earnings') || '{}';
            const earnings = JSON.parse(creatorEarnings);
            if (!earnings[exam.creator]) {
                earnings[exam.creator] = {
                    totalEarnings: 0,
                    totalStudents: 0,
                    exams: {}
                };
            }
            if (!earnings[exam.creator].exams[resultData.examId]) {
                earnings[exam.creator].exams[resultData.examId] = {
                    examTitle: exam.title,
                    fee: exam.fee,
                    students: 0,
                    earnings: 0
                };
            }
            // Each submission counts as earnings (student paid when registering)
            earnings[exam.creator].exams[resultData.examId].students += 1;
            earnings[exam.creator].exams[resultData.examId].earnings += parseFloat(exam.fee);
            earnings[exam.creator].totalStudents += 1;
            earnings[exam.creator].totalEarnings += parseFloat(exam.fee);
            
            localStorage.setItem('fairtest_creator_earnings', JSON.stringify(earnings));
            console.log('[Sui] ✅ Creator earnings updated');
        }
        
        if (this.ensManager) {
            try {
                await this.ensManager.appendResultId(resultData.examId, resultId);
            } catch (e) {
                console.warn('[Sui] ENS appendResultId failed:', e.message);
            }
        }

        const percentage = resultData.maxScore ? (Number(resultData.score) / Number(resultData.maxScore)) * 100 : 0;
        return {
            success: true,
            resultId,
            objectId,
            txDigest: txDigest ?? undefined
        };
    }

    async getResultBySubmission(submissionId) {
        this._requirePackageId();
        const sub = await this.getSubmission(submissionId);
        const resultIds = this.ensManager ? await this.ensManager.getResultIds(sub.examId) : [];
        for (const rid of resultIds) {
            const ro = await this.client.getObject({ id: rid, options: { showContent: true } });
            const c = ro.data?.content;
            if (c?.dataType === 'moveObject' && c.fields?.uid_hash && bytesToHex(c.fields.uid_hash) === sub.finalHash) {
                return this._parseResultObject(ro.data, rid);
            }
        }
        throw new Error(`Result for submission ${submissionId} not found`);
    }

    _parseResultObject(obj, objectId) {
        const content = obj?.content ?? obj?.data?.content;
        if (!content || content.dataType !== 'moveObject') return null;
        const fields = content.fields ?? {};
        const uidHash = fields.uid_hash ? bytesToHex(fields.uid_hash) : '';
        const examIdBytes = fields.exam_id;
        const examId = examIdBytes ? new TextDecoder().decode(new Uint8Array(examIdBytes)) : '';
        return {
            resultId: objectId,
            objectId,
            submissionId: null,
            examId,
            studentFinalHash: uidHash,
            evaluatorFinalHash: '',
            score: Number(fields.score ?? 0),
            maxScore: 100,
            percentage: 0,
            passed: false,
            feedback: '',
            questionScores: [],
            evaluatedAt: Number(fields.timestamp ?? 0),
            immutable: true
        };
    }

    async getStudentResults(studentFinalHash) {
        const results = [];
        
        console.log('[Sui] Getting results for finalHash:', studentFinalHash);
        
        // Get results from local storage
        if (typeof window !== 'undefined' && window.localStorage) {
            // First, try to find results by finalHash
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fairtest_result_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        console.log('[Sui] Checking result:', data.submissionId, 'finalHash:', data.studentFinalHash);
                        
                        if (data.studentFinalHash === studentFinalHash) {
                            // Get exam details
                            const exam = await this.getExam(data.examId);
                            results.push({
                                ...data,
                                examTitle: exam.title,
                                examTotalMarks: exam.totalMarks
                            });
                        }
                    } catch (e) {
                        console.error('[Sui] Error parsing result:', key, e);
                    }
                }
            }
            
            // If no results found by finalHash, try to match by exam IDs from student's submissions
            if (results.length === 0) {
                console.log('[Sui] No results found by finalHash, checking all results...');
                
                // Get all exam IDs the student has taken
                const studentExamIds = new Set();
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('fairtest_uid_')) {
                        try {
                            const identity = JSON.parse(localStorage.getItem(key));
                            if (identity.finalHash === studentFinalHash) {
                                studentExamIds.add(identity.examId);
                            }
                        } catch (e) {}
                    }
                }
                
                console.log('[Sui] Student exam IDs:', Array.from(studentExamIds));
                
                // Get results for those exams
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('fairtest_result_')) {
                        try {
                            const data = JSON.parse(localStorage.getItem(key));
                            if (studentExamIds.has(data.examId)) {
                                const exam = await this.getExam(data.examId);
                                results.push({
                                    ...data,
                                    examTitle: exam.title,
                                    examTotalMarks: exam.totalMarks
                                });
                            }
                        } catch (e) {}
                    }
                }
            }
        }
        
        console.log(`[Sui] Retrieved ${results.length} results from local storage`);
        return results;
    }

    async verifyResult(resultId) {
        this._requirePackageId();
        const obj = await this.client.getObject({ id: resultId, options: { showContent: true } });
        if (obj.error || !obj.data) throw new Error(`Result ${resultId} not found`);
        const parsed = this._parseResultObject(obj.data, resultId);
        if (!parsed) throw new Error(`Invalid result object: ${resultId}`);
        return {
            verified: true,
            immutable: true,
            objectId: resultId,
            timestamp: parsed.evaluatedAt,
            blockchainProof: obj.data.digest ?? ''
        };
    }

    async getExamStats(examId) {
        this._requirePackageId();
        const submissions = await this.getExamSubmissions(examId);
        const resultIds = this.ensManager ? await this.ensManager.getResultIds(examId) : [];
        const results = [];
        for (const rid of resultIds) {
            try {
                const ro = await this.client.getObject({ id: rid, options: { showContent: true } });
                const parsed = this._parseResultObject(ro.data, rid);
                if (parsed) results.push(parsed);
            } catch (_) {}
        }
        const totalSubmissions = submissions.length;
        const evaluated = results.length;
        const pending = totalSubmissions - evaluated;
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const avgScore = results.length > 0
            ? results.reduce((sum, r) => sum + (r.percentage ?? 0), 0) / results.length
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
