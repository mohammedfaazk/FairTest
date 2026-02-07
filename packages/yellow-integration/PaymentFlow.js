import YellowSessionManager from './YellowSessionManager.js';

class PaymentFlow {
    constructor(yellowManager) {
        this.yellow = yellowManager;
        this.mockMode = !yellowManager;
        
        // Get student registration wallet from env or use a default
        this.studentRegistrationWallet = 
            (typeof process !== 'undefined' && process.env?.STUDENT_REGISTRATION_WALLET) ||
            (typeof process !== 'undefined' && process.env?.PLATFORM_WALLET_ADDRESS) ||
            null;
            
        if (this.mockMode) {
            console.warn('[PaymentFlow] ⚠️  Yellow Network not initialized');
            console.warn('[PaymentFlow] Install MetaMask and refresh to enable payments');
        } else {
            console.log('[PaymentFlow] ✅ Yellow Network ready for payments');
        }
    }

    async processListingPayment({ creatorWallet, listingFee, examMetadata }) {
        if (this.mockMode) {
            throw new Error('Yellow Network not available. Please connect MetaMask to enable payments.');
        }
        
        console.log('[PaymentFlow] Processing listing payment:', listingFee, 'ETH');
        
        // NO MOCK DATA - Real Yellow Network only
        const session = await this.yellow.createExamListingSession(creatorWallet, listingFee, examMetadata);
        return { success: true, sessionId: session.sessionId };
    }

    async processRegistrationPayment({ studentWallet, examId, examFee, creatorWallet }) {
        if (this.mockMode) {
            throw new Error('Yellow Network not available. Please connect MetaMask to enable payments.');
        }
        
        // Use student registration wallet if configured, otherwise fall back to creator wallet
        const recipientWallet = this.studentRegistrationWallet || creatorWallet;
        console.log('[PaymentFlow] Processing registration payment:', examFee, 'ETH');
        console.log('[PaymentFlow] Recipient:', recipientWallet);
        
        // NO MOCK DATA - Real Yellow Network only
        const session = await this.yellow.createStudentRegistrationSession(studentWallet, examFee, examId, recipientWallet);
        return { success: true, sessionId: session.sessionId };
    }

    async recordExamEvent(sessionId, eventType, eventData = {}) {
        if (this.mockMode) {
            throw new Error('Yellow Network not available. Cannot record events without active session.');
        }
        
        return await this.yellow.recordSessionEvent(sessionId, eventType, eventData);
    }
}

export default PaymentFlow;
