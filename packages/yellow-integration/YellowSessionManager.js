import { ethers } from 'ethers';

class YellowSessionManager {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || (typeof process !== 'undefined' && process.env?.YELLOW_NETWORK_API_URL);
    this.apiKey = config.apiKey || (typeof process !== 'undefined' && process.env?.YELLOW_NETWORK_API_KEY);
    this.sessions = new Map();
    this.sessionCounter = 0;
  }

  async createExamListingSession(creatorWallet, listingFee, examMetadata = {}) {
    const sessionId = `listing_${this.sessionCounter++}_${Date.now()}`;
    const session = {
      sessionId,
      type: 'EXAM_LISTING',
      creator: creatorWallet,
      amount: ethers.parseEther(listingFee.toString()),
      amountFormatted: listingFee,
      status: 'FUNDED', // Auto-funded for demo
      offChainTxns: [],
      settled: false
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async createStudentRegistrationSession(studentWallet, examFee, examId, creatorWallet) {
    const sessionId = `registration_${examId}_${this.sessionCounter++}_${Date.now()}`;
    const session = {
      sessionId,
      type: 'STUDENT_REGISTRATION',
      student: studentWallet,
      creator: creatorWallet,
      examId,
      amount: ethers.parseEther(examFee.toString()),
      amountFormatted: examFee,
      status: 'FUNDED', // Auto-funded for demo
      offChainTxns: [],
      settled: false
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async recordSessionEvent(sessionId, eventType, eventData = {}) {
    console.log(`[Yellow] Recorded off-chain: ${eventType}`);
    return { success: true };
  }

  async settleSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.settled = true;
    session.status = 'SETTLED';
    
    // Log settlement details for transparency
    if (session.type === 'EXAM_LISTING') {
      console.log(`[Yellow Settlement] Listing fee (${session.amountFormatted} SUI) → Platform Wallet`);
    } else if (session.type === 'STUDENT_REGISTRATION') {
      console.log(`[Yellow Settlement] Exam fee (${session.amountFormatted} SUI) → Creator ${session.creator}`);
    }
    
    return { 
      success: true, 
      txHash: '0x' + Math.random().toString(16).substr(2, 64),
      recipient: session.type === 'EXAM_LISTING' ? 'platform' : session.creator,
      amount: session.amountFormatted
    };
  }
  
  async settleAllSessionsForExam(examId) {
    const examSessions = Array.from(this.sessions.values())
      .filter(s => s.examId === examId && !s.settled);
    
    console.log(`[Yellow] Settling ${examSessions.length} sessions for exam ${examId}`);
    
    const settlements = [];
    for (const session of examSessions) {
      const result = await this.settleSession(session.sessionId);
      settlements.push(result);
    }
    
    return {
      success: true,
      totalSettlements: settlements.length,
      settlements
    };
  }
}

export default YellowSessionManager;
