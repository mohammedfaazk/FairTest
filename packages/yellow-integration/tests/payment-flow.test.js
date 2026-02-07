import { describe, it } from 'node:test';
import assert from 'node:assert';
import PaymentFlow from '../PaymentFlow.js';
import YellowSessionManager from '../YellowSessionManager.js';

const hasYellowConfig = () => {
    const getSigner =
        typeof globalThis !== 'undefined' && globalThis.__FAIRTEST_GET_SIGNER__;
    return !!getSigner;
};

describe('Yellow Network Payment Flow', () => {
    it('should create listing payment session', { skip: !hasYellowConfig() }, async () => {
        const yellow = new YellowSessionManager({ getSigner: globalThis.__FAIRTEST_GET_SIGNER__ });
        const payment = new PaymentFlow(yellow);
        const result = await payment.processListingPayment({
            creatorWallet: '0x123abc',
            listingFee: 0.1,
            examMetadata: { name: 'Test Exam' }
        });

        assert.ok(result.success);
        assert.ok(result.sessionId);
        console.log('✓ Listing payment session created:', result.sessionId);
    });

    it('should create registration payment session', { skip: !hasYellowConfig() }, async () => {
        const yellow = new YellowSessionManager({ getSigner: globalThis.__FAIRTEST_GET_SIGNER__ });
        const payment = new PaymentFlow(yellow);
        const result = await payment.processRegistrationPayment({
            studentWallet: '0xdef456',
            examId: 'exam-1',
            examFee: 0.05,
            creatorWallet: '0x123abc'
        });

        assert.ok(result.success);
        assert.ok(result.sessionId);
        console.log('✓ Registration payment session created:', result.sessionId);
    });

    it('should settle session', { skip: !hasYellowConfig() }, async () => {
        const yellow = new YellowSessionManager({ getSigner: globalThis.__FAIRTEST_GET_SIGNER__ });
        const session = await yellow.createExamListingSession('0x123', 0.1);
        const result = await yellow.settleSession(session.sessionId);

        assert.ok(result.success);
        assert.ok(result.txHash);
        assert.ok(typeof result.txHash === 'string' && (result.txHash.startsWith('0x') || result.txHash.length > 0));
        console.log('✓ Session settled with receipt:', result.txHash);
    });
});
