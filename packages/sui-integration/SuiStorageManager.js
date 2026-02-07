/**
 * Sui Blockchain Storage Manager - Real Sui integration
 * Uses deployed Move contracts (exam, submission, result) on Sui testnet.
 * No in-memory Maps; real object IDs and transaction digests from chain.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const SUI_CLOCK_OBJECT_ID = '0x6';

function getEnv(key) {
    if (typeof process !== 'undefined' && process.env && process.env[key] != null) return process.env[key];
    if (typeof globalThis !== 'undefined' && globalThis.__FAIRTEST_ENV__?.[key] != null) return globalThis.__FAIRTEST_ENV__[key];
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
        const pk = config.privateKey ?? getEnv('SUI_PRIVATE_KEY');
        this.signer = pk ? createSigner(pk) : null;
        
        // Initialize client lazily (only when packageId is available)
        this._client = null;
    }

    _requirePackageId() {
        if (!this.packageId) {
            throw new Error('SuiStorageManager: SUI_PACKAGE_ID is required. Set SUI_PACKAGE_ID environment variable or pass packageId in config.');
        }
    }

    get client() {
        if (!this._client) {
            this._requirePackageId();
            this._client = new SuiClient({ url: this.rpcUrl });
        }
        return this._client;
    }

    async _executeTx(transaction) {
        if (!this.signer) throw new Error('SuiStorageManager: SUI_PRIVATE_KEY required for writes');
        const result = await this.client.signAndExecuteTransaction({
            transaction,
            signer: this.signer,
            options: { showObjectChanges: true }
        });
        if (result.effects?.status?.status !== 'success') {
            const err = result.effects?.status?.error ?? result.effects?.status;
            throw new Error(err ? JSON.stringify(err) : 'Transaction failed');
        }
        return result;
    }

    async storeExam(examData) {
        this._requirePackageId();
        const examIdStr = `exam_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const examIdBytes = Array.from(new TextEncoder().encode(examIdStr));
        const ensName = examData.ensDomain ?? '';
        const examFee = BigInt(Math.floor(Number(examData.fee ?? 0) * 1e9));

        const tx = new Transaction();
        tx.moveCall({
            target: `${this.packageId}::exam::create_exam`,
            arguments: [
                tx.pure(bcs.vector(bcs.U8).serialize(examIdBytes)),
                tx.pure.string(ensName),
                tx.pure.u64(examFee),
                tx.object(SUI_CLOCK_OBJECT_ID)
            ]
        });

        const result = await this._executeTx(tx);
        const objectId = getCreatedObjectId(result);
        const txDigest = getTxDigest(result);
        if (!objectId) throw new Error('Failed to get created exam object ID');

        const examId = objectId;
        console.log('[Sui] Exam stored on blockchain:', examId);
        console.log('[Sui] Tx digest:', txDigest);

        return {
            success: true,
            examId,
            objectId,
            txDigest: txDigest ?? undefined
        };
    }

    _parseExamObject(obj) {
        const content = obj.data?.content;
        if (!content || content.dataType !== 'moveObject') return null;
        const fields = content.fields ?? {};
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
        this._requirePackageId();
        const obj = await this.client.getObject({
            id: examId,
            options: { showContent: true }
        });
        if (obj.error || !obj.data) throw new Error(`Exam ${examId} not found on blockchain`);
        const parsed = this._parseExamObject(obj.data);
        if (!parsed) throw new Error(`Invalid exam object: ${examId}`);

        let title = '';
        let description = '';
        let questions = [];
        let totalMarks = 0;
        if (this.ensManager) {
            try {
                const list = await this.ensManager.getExamList();
                const meta = list.find(e => e.examId === examId);
                if (meta) {
                    title = meta.examName ?? meta.title ?? '';
                    description = meta.description ?? '';
                    questions = Array.isArray(meta.questions) ? meta.questions : [];
                    totalMarks = questions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
                }
            } catch (e) {
                console.warn('[Sui] ENS metadata lookup failed:', e.message);
            }
        }

        return {
            examId,
            objectId: examId,
            title,
            description,
            creator: parsed.creator,
            duration: 60,
            fee: String(Number(parsed.exam_fee) / 1e9),
            passPercentage: 40,
            questions,
            totalMarks,
            createdAt: parsed.timestamp,
            status: parsed.status === 1 ? 'active' : 'completed',
            ensDomain: parsed.ens_name,
            yellowSessionId: null
        };
    }

    async getAllExams() {
        if (!this.ensManager) return [];
        const list = await this.ensManager.getExamList();
        const exams = [];
        for (const e of list) {
            if (!e.examId) continue;
            try {
                const exam = await this.getExam(e.examId);
                if (exam.status === 'active') exams.push(exam);
            } catch (_) {}
        }
        return exams;
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

        const tx = new Transaction();
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
            submittedAt: parsed.timestamp,
            timeTaken: 0,
            status: 'pending_evaluation'
        };
    }

    async getExamSubmissions(examId) {
        if (!this.ensManager) return [];
        const ids = await this.ensManager.getSubmissionIds(examId);
        const out = [];
        for (const id of ids) {
            try {
                out.push(await this.getSubmission(id));
            } catch (_) {}
        }
        return out;
    }

    async getPendingSubmissions(examId) {
        this._requirePackageId();
        const resultIds = this.ensManager ? await this.ensManager.getResultIds(examId) : [];
        const resultUidHashes = new Set();
        for (const rid of resultIds) {
            try {
                const ro = await this.client.getObject({ id: rid, options: { showContent: true } });
                const c = ro.data?.content;
                if (c?.dataType === 'moveObject' && c.fields?.uid_hash) {
                    resultUidHashes.add(bytesToHex(c.fields.uid_hash));
                }
            } catch (_) {}
        }
        const submissions = await this.getExamSubmissions(examId);
        return submissions.filter(s => !resultUidHashes.has(s.finalHash));
    }

    async storeResult(resultData) {
        this._requirePackageId();
        const uidHash = typeof resultData.studentFinalHash === 'string'
            ? hexToBytes(resultData.studentFinalHash.startsWith('0x') ? resultData.studentFinalHash.slice(2) : resultData.studentFinalHash)
            : this._bytesArg(resultData.studentFinalHash);
        const examIdBytes = new TextEncoder().encode(resultData.examId);
        const score = BigInt(Math.floor(Number(resultData.score ?? 0)));
        const maxScore = BigInt(Math.floor(Number(resultData.maxScore ?? 100)));
        const rank = BigInt(0);

        const tx = new Transaction();
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
        this._requirePackageId();
        const hashHex = studentFinalHash.startsWith('0x') ? studentFinalHash : `0x${studentFinalHash}`;
        const results = [];
        if (!this.ensManager) return results;
        const list = await this.ensManager.getExamList();
        for (const e of list) {
            if (!e.examId) continue;
            const resultIds = await this.ensManager.getResultIds(e.examId);
            for (const rid of resultIds) {
                try {
                    const ro = await this.client.getObject({ id: rid, options: { showContent: true } });
                    const c = ro.data?.content;
                    if (c?.dataType === 'moveObject' && c.fields?.uid_hash && bytesToHex(c.fields.uid_hash) === hashHex) {
                        const parsed = this._parseResultObject(ro.data, rid);
                        if (parsed) {
                            parsed.submissionId = null;
                            parsed.maxScore = parsed.score;
                            parsed.percentage = parsed.score;
                            parsed.passed = parsed.score >= 40;
                            results.push(parsed);
                        }
                    }
                } catch (_) {}
            }
        }
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
