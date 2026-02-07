/**
 * ENS Manager - Real ENS on Sepolia (or configurable network)
 * Uses ethers.js with an ENS-enabled provider. Creates subdomains under a root domain
 * (e.g. fairtest.eth), writes exam metadata as ENS text records, and discovers exams
 * by reading those records. No in-memory maps.
 */

import { ethers } from 'ethers';

const TEXT_KEYS = {
    EXAM_NAME: 'com.fairtest.examName',
    CREATOR_WALLET: 'com.fairtest.creatorWallet',
    EXAM_FEE: 'com.fairtest.examFee',
    SUI_OBJECT_ID: 'com.fairtest.suiObjectID',
    EXAM_ID: 'com.fairtest.examId',
    SUBDOMAINS_INDEX: 'com.fairtest.exam_subdomains',
    SUBMISSION_IDS: 'com.fairtest.submission_ids',
    RESULT_IDS: 'com.fairtest.result_ids',
    DESCRIPTION: 'com.fairtest.description',
    QUESTIONS: 'com.fairtest.questions'
};

const REGISTRY_ABI = [
    'function owner(bytes32 node) view returns (address)',
    'function resolver(bytes32 node) view returns (address)',
    'function setSubnodeOwner(bytes32 node, bytes32 label, address owner)',
    'function setResolver(bytes32 node, address resolver)'
];

const RESOLVER_ABI = [
    'function setText(bytes32 node, string key, string value)',
    'function text(bytes32 node, string key) view returns (string)'
];

function slug(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function labelHash(label) {
    return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function getEnv(key) {
    if (typeof process !== 'undefined' && process.env && process.env[key] != null) return process.env[key];
    if (typeof globalThis !== 'undefined' && globalThis.__FAIRTEST_ENV__?.[key] != null) return globalThis.__FAIRTEST_ENV__[key];
    return undefined;
}

export default class ENSManager {
    constructor(config = {}) {
        const rpcUrl = config.rpcUrl ?? getEnv('ENS_RPC_URL') ?? getEnv('SEPOLIA_RPC_URL');
        const privateKey = config.privateKey ?? getEnv('SEPOLIA_PRIVATE_KEY');
        const registryAddress = config.registryAddress ?? getEnv('ENS_REGISTRY_ADDRESS');
        const resolverAddress = config.resolverAddress ?? getEnv('ENS_RESOLVER_ADDRESS');
        const rootDomain = (config.rootDomain ?? getEnv('FAIRTEST_ENS_DOMAIN') ?? 'fairtest.eth').toString();

        this._configured = !!(rpcUrl && registryAddress && resolverAddress);
        this.provider = this._configured ? new ethers.JsonRpcProvider(rpcUrl) : null;
        this.signer = this._configured && privateKey ? new ethers.Wallet(privateKey, this.provider) : null;
        this.registryAddress = registryAddress || null;
        this.resolverAddress = resolverAddress || null;
        this.rootDomain = rootDomain.endsWith('.eth') ? rootDomain : `${rootDomain}.eth`;
        this.registry = this._configured ? new ethers.Contract(registryAddress, REGISTRY_ABI, this.signer || this.provider) : null;
        this.resolverContract = this._configured ? new ethers.Contract(resolverAddress, RESOLVER_ABI, this.signer || this.provider) : null;
    }

    _parentNode() {
        return ethers.namehash(this.rootDomain);
    }

    _subdomainNode(label) {
        const fullName = `${label}.${this.rootDomain}`;
        return ethers.namehash(fullName);
    }

    async createExamSubdomain(examName, examData = {}) {
        if (!this._configured) throw new Error('ENSManager: not configured (set ENS_RPC_URL, ENS_REGISTRY_ADDRESS, ENS_RESOLVER_ADDRESS)');
        if (!this.signer) throw new Error('ENSManager: signer required for createExamSubdomain (SEPOLIA_PRIVATE_KEY)');
        const label = slug(examName);
        if (!label) throw new Error('ENSManager: invalid exam name for subdomain');
        const fullDomain = `${label}.${this.rootDomain}`;
        const parentNode = this._parentNode();
        const subnode = this._subdomainNode(label);
        const labelHashBytes = labelHash(label);

        // Create subdomain: set owner then set resolver (compatible with all ENS registry deployments)
        const ownerTx = await this.registry.setSubnodeOwner(
            parentNode,
            labelHashBytes,
            await this.signer.getAddress()
        );
        await ownerTx.wait();
        const resolverTx = await this.registry.setResolver(subnode, this.resolverAddress);
        await resolverTx.wait();

        // Set text records for exam metadata
        await this._setText(subnode, TEXT_KEYS.EXAM_NAME, examData.examName ?? examName);
        if (examData.creatorWallet) await this._setText(subnode, TEXT_KEYS.CREATOR_WALLET, examData.creatorWallet);
        if (examData.examFee != null) await this._setText(subnode, TEXT_KEYS.EXAM_FEE, String(examData.examFee));

        // Append this label to the root's subdomain index for discovery
        const existing = await this._getRootSubdomainsIndex();
        if (!existing.includes(label)) {
            existing.push(label);
            await this._setRootSubdomainsIndex(existing);
        }

        return { subdomain: fullDomain };
    }

    async _getRootSubdomainsIndex() {
        const rootNode = this._parentNode();
        const resolverAddr = await this.registry.resolver(rootNode);
        if (!resolverAddr || resolverAddr === ethers.ZeroAddress) return [];
        const resolver = new ethers.Contract(resolverAddr, RESOLVER_ABI, this.provider);
        const raw = await resolver.text(rootNode, TEXT_KEYS.SUBDOMAINS_INDEX);
        if (!raw || !raw.trim()) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    async _setRootSubdomainsIndex(labels) {
        if (!this.signer) return;
        const rootNode = this._parentNode();
        const resolverAddr = await this.registry.resolver(rootNode);
        if (!resolverAddr || resolverAddr === ethers.ZeroAddress) throw new Error('ENSManager: root domain has no resolver set');
        const resolver = new ethers.Contract(resolverAddr, RESOLVER_ABI, this.signer);
        const tx = await resolver.setText(rootNode, TEXT_KEYS.SUBDOMAINS_INDEX, JSON.stringify(labels));
        await tx.wait();
    }

    async _setText(node, key, value) {
        if (!this.signer) throw new Error('ENSManager: signer required for setText');
        const tx = await this.resolverContract.setText(node, key, value);
        await tx.wait();
    }

    async setExamMetadata(subdomain, suiObjectID, metadata = {}) {
        if (!this._configured) throw new Error('ENSManager: not configured');
        if (!this.signer) throw new Error('ENSManager: signer required for setExamMetadata');
        const node = ethers.namehash(subdomain);
        if (suiObjectID) await this._setText(node, TEXT_KEYS.SUI_OBJECT_ID, suiObjectID);
        if (metadata.examId) await this._setText(node, TEXT_KEYS.EXAM_ID, metadata.examId);
        if (metadata.title != null) await this._setText(node, TEXT_KEYS.EXAM_NAME, String(metadata.title));
        if (metadata.description != null) await this._setText(node, TEXT_KEYS.DESCRIPTION, String(metadata.description));
        if (metadata.questions != null) await this._setText(node, TEXT_KEYS.QUESTIONS, JSON.stringify(metadata.questions));
        return { success: true };
    }

    async _getText(node, key) {
        const resolverAddr = await this.registry.resolver(node);
        if (!resolverAddr || resolverAddr === ethers.ZeroAddress) return null;
        const resolver = new ethers.Contract(resolverAddr, RESOLVER_ABI, this.provider);
        try {
            const value = await resolver.text(node, key);
            return value && value.trim() ? value : null;
        } catch {
            return null;
        }
    }

    async getExamList() {
        if (!this._configured) return [];
        const labels = await this._getRootSubdomainsIndex();
        const list = [];
        for (const label of labels) {
            const fullDomain = `${label}.${this.rootDomain}`;
            const node = this._subdomainNode(label);
            const examId = await this._getText(node, TEXT_KEYS.EXAM_ID);
            const examName = await this._getText(node, TEXT_KEYS.EXAM_NAME);
            const creatorWallet = await this._getText(node, TEXT_KEYS.CREATOR_WALLET);
            const examFee = await this._getText(node, TEXT_KEYS.EXAM_FEE);
            const suiObjectID = await this._getText(node, TEXT_KEYS.SUI_OBJECT_ID);
            const description = await this._getText(node, TEXT_KEYS.DESCRIPTION);
            let questions = undefined;
            try {
                const qRaw = await this._getText(node, TEXT_KEYS.QUESTIONS);
                if (qRaw) questions = JSON.parse(qRaw);
            } catch (_) {}
            list.push({
                ensDomain: fullDomain,
                examId: examId || undefined,
                examName: examName || undefined,
                creatorWallet: creatorWallet || undefined,
                examFee: examFee || undefined,
                suiObjectID: suiObjectID || undefined,
                description: description || undefined,
                questions: questions
            });
        }
        return list;
    }

    async searchExams(query) {
        const list = await this.getExamList();
        const q = query.toLowerCase();
        return list.filter(
            e => (e.ensDomain && e.ensDomain.toLowerCase().includes(q)) ||
                 (e.examName && e.examName.toLowerCase().includes(q))
        );
    }

    /** Find subdomain node for an exam ID (used by Sui index). */
    async _getNodeForExamId(examId) {
        const list = await this.getExamList();
        const e = list.find(x => x.examId === examId);
        if (!e || !e.ensDomain) return null;
        return ethers.namehash(e.ensDomain);
    }

    async getSubmissionIds(examId) {
        if (!this._configured) return [];
        const node = await this._getNodeForExamId(examId);
        if (!node) return [];
        const raw = await this._getText(node, TEXT_KEYS.SUBMISSION_IDS);
        if (!raw || !raw.trim()) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    async appendSubmissionId(examId, submissionId) {
        if (!this._configured || !this.signer) return;
        const node = await this._getNodeForExamId(examId);
        if (!node) throw new Error(`ENSManager: no subdomain found for examId ${examId}`);
        const current = await this.getSubmissionIds(examId);
        if (current.includes(submissionId)) return;
        await this._setText(node, TEXT_KEYS.SUBMISSION_IDS, JSON.stringify([...current, submissionId]));
    }

    async getResultIds(examId) {
        if (!this._configured) return [];
        const node = await this._getNodeForExamId(examId);
        if (!node) return [];
        const raw = await this._getText(node, TEXT_KEYS.RESULT_IDS);
        if (!raw || !raw.trim()) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    async appendResultId(examId, resultId) {
        if (!this._configured || !this.signer) return;
        const node = await this._getNodeForExamId(examId);
        if (!node) throw new Error(`ENSManager: no subdomain found for examId ${examId}`);
        const current = await this.getResultIds(examId);
        if (current.includes(resultId)) return;
        await this._setText(node, TEXT_KEYS.RESULT_IDS, JSON.stringify([...current, resultId]));
    }
}
