import { describe, it } from 'node:test';
import assert from 'node:assert';
import ENSManager from '../ENSManager.js';

const configured = !!(process.env.ENS_RPC_URL || process.env.SEPOLIA_RPC_URL) &&
    process.env.ENS_REGISTRY_ADDRESS &&
    process.env.ENS_RESOLVER_ADDRESS;

describe('ENS Integration', () => {
    it('should create exam subdomain (when configured)', async () => {
        const ens = new ENSManager();
        if (!ens._configured || !ens.signer) {
            console.log('⊘ Skipped: ENS not configured (set ENS_RPC_URL, ENS_REGISTRY_ADDRESS, ENS_RESOLVER_ADDRESS, SEPOLIA_PRIVATE_KEY)');
            return;
        }
        const result = await ens.createExamSubdomain('Test Exam 2024', {
            examName: 'Test Exam 2024',
            examFee: '0.05',
            creatorWallet: '0x123abc'
        });
        assert.ok(result.subdomain);
        assert.ok(result.subdomain.includes('fairtest.eth'));
        console.log('✓ Subdomain created:', result.subdomain);
    });

    it('should set exam metadata in text records (when configured)', async () => {
        const ens = new ENSManager();
        if (!ens._configured || !ens.signer) {
            console.log('⊘ Skipped: ENS not configured');
            return;
        }
        const subdomain = 'test-exam.fairtest.eth';
        const result = await ens.setExamMetadata(subdomain, '0xabc123', {
            examId: 'exam-1',
            examName: 'Test Exam'
        });
        assert.ok(result.success);
        console.log('✓ Exam metadata set in ENS text records');
    });

    it('should list all exams (real resolution when configured)', async () => {
        const ens = new ENSManager();
        const exams = await ens.getExamList();
        assert.ok(Array.isArray(exams));
        if (ens._configured && exams.length > 0) {
            assert.ok(exams[0].ensDomain);
            console.log('✓ Found', exams.length, 'exams via ENS');
        } else {
            console.log('✓ getExamList returns array (0 exams when not configured or no subdomains)');
        }
    });

    it('should search exams by query', async () => {
        const ens = new ENSManager();
        const results = await ens.searchExams('neet');
        assert.ok(Array.isArray(results));
        console.log('✓ Search found', results.length, 'matching exams');
    });
});
