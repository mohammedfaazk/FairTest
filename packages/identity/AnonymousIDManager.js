/**
 * Anonymous Identity Manager for FairTest Protocol
 * Implements TWO-LAYER IDENTITY SYSTEM
 * 
 * LAYER 1 - PAYMENT IDENTITY (Wallet Address)
 * Used ONLY for payments, NEVER for evaluation
 * 
 * LAYER 2 - EXAM IDENTITY (UID → UID_HASH → FINAL_HASH)
 * Used for submissions and evaluation
 * Only FINAL_HASH stored on blockchain
 */

async function getRandomBytes(length) {
    const arr = new Uint8Array(length);
    const c = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues)
        ? globalThis.crypto
        : (typeof crypto !== 'undefined' && crypto.getRandomValues)
            ? crypto
            : null;
    if (c) {
        c.getRandomValues(arr);
    } else {
        const nodeCrypto = await import('node:crypto');
        const buf = nodeCrypto.randomBytes(length);
        arr.set(buf);
    }
    return arr;
}

class AnonymousIDManager {
    /**
     * Generate anonymous exam identity
     * Process: Random UID → SHA256 → UID_HASH → SHA256 → FINAL_HASH
     * Only FINAL_HASH goes on blockchain
     */
    async generateExamIdentity(walletAddress, examId) {
        // Step 1: Generate random UID (NOT derived from wallet)
        const randomBytes = await getRandomBytes(32);
        const timestamp = Date.now();
        const saltArr = await getRandomBytes(16);
        const salt = Array.from(saltArr)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        // UID is purely random
        const uidInput = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('') + timestamp.toString() + salt;
        
        const uid = await this._sha256(uidInput);
        
        // Step 2: UID → SHA256 → UID_HASH
        const uidHash = await this._sha256(uid);
        
        // Step 3: UID_HASH → SHA256 → FINAL_HASH
        const finalHash = await this._sha256(uidHash);
        
        console.log('[Identity] Two-Layer Identity Generated:');
        console.log('  UID (local only):', uid.substring(0, 16) + '...');
        console.log('  UID_HASH (local only):', uidHash.substring(0, 16) + '...');
        console.log('  FINAL_HASH (blockchain):', finalHash.substring(0, 16) + '...');
        console.log('  ⚠️  Wallet address NEVER stored on blockchain');
        
        return {
            // Local storage only (for result retrieval)
            uid,
            uidHash,
            
            // Blockchain storage (evaluators see this)
            finalHash,
            
            // Metadata (local only)
            examId,
            walletAddress, // Stored locally ONLY for payment identity
            timestamp,
            salt
        };
    }

    /**
     * SHA-256 hash using Web Crypto API
     */
    async _sha256(message) {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            // Fallback for Node.js environment
            return this._simpleSha256(message);
        }
    }

    /**
     * Simple hash fallback (for Node.js testing)
     */
    _simpleSha256(message) {
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    /**
     * Store UID locally for result retrieval
     * NEVER send to blockchain
     */
    storeUIDLocally(identityData) {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storageKey = `fairtest_uid_${identityData.examId}`;
            
            // Store only what's needed for result retrieval
            const localData = {
                uid: identityData.uid,
                uidHash: identityData.uidHash,
                finalHash: identityData.finalHash,
                examId: identityData.examId,
                timestamp: identityData.timestamp
                // NOTE: walletAddress NOT stored (payment identity separate)
            };
            
            localStorage.setItem(storageKey, JSON.stringify(localData));
            console.log('[Identity] UID stored locally for result retrieval');
            return true;
        }
        return false;
    }

    /**
     * Recover UID from local storage to retrieve results
     */
    recoverUID(examId) {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storageKey = `fairtest_uid_${examId}`;
            const data = localStorage.getItem(storageKey);
            
            if (data) {
                const parsed = JSON.parse(data);
                console.log('[Identity] UID recovered from local storage');
                console.log('  FINAL_HASH:', parsed.finalHash.substring(0, 16) + '...');
                return parsed;
            }
        }
        return null;
    }

    /**
     * Create submission payload for blockchain
     * Only FINAL_HASH included, never wallet address
     */
    createSubmissionPayload(identityData, examId, answers) {
        if (!identityData || typeof identityData !== 'object' || !identityData.finalHash) {
            throw new Error('createSubmissionPayload requires full identity object from generateExamIdentity (with .finalHash)');
        }
        const answerHash = this._simpleSha256(JSON.stringify(answers));
        
        const payload = {
            // Blockchain data (anonymous)
            finalHash: identityData.finalHash,
            examId,
            answerHash,
            timestamp: Date.now()
            // NO wallet address
            // NO uid
            // NO uidHash
        };
        
        console.log('[Identity] Submission payload created (anonymous)');
        console.log('  FINAL_HASH:', payload.finalHash.substring(0, 16) + '...');
        console.log('  ✅ No wallet address in payload');
        
        return payload;
    }

    /**
     * Audit privacy - ensure no wallet address in blockchain data
     */
    auditPrivacy(blockchainData, walletAddress) {
        const dataStr = JSON.stringify(blockchainData).toLowerCase();
        const walletLower = walletAddress.toLowerCase();
        
        const passed = !dataStr.includes(walletLower);
        
        if (passed) {
            console.log('[Privacy Audit] ✅ PASSED - No wallet address in blockchain data');
        } else {
            console.error('[Privacy Audit] ❌ FAILED - Wallet address found in blockchain data!');
        }
        
        return {
            passed,
            walletAddress: walletLower,
            foundInData: !passed
        };
    }

    /**
     * Verify identity separation
     * Payment identity (wallet) should NEVER mix with exam identity (finalHash)
     */
    verifyIdentitySeparation(paymentData, examData) {
        const paymentStr = JSON.stringify(paymentData);
        const examStr = JSON.stringify(examData);
        
        // Payment data should have wallet
        const paymentHasWallet = paymentStr.includes('wallet') || paymentStr.includes('0x');
        
        // Exam data should NOT have wallet
        const examHasWallet = examStr.toLowerCase().includes(paymentData.wallet?.toLowerCase() || 'xxxxx');
        
        const separated = paymentHasWallet && !examHasWallet;
        
        console.log('[Identity Separation] Payment has wallet:', paymentHasWallet);
        console.log('[Identity Separation] Exam has wallet:', examHasWallet);
        console.log('[Identity Separation] Properly separated:', separated ? '✅' : '❌');
        
        return {
            separated,
            paymentHasWallet,
            examHasWallet
        };
    }
}

export default AnonymousIDManager;
