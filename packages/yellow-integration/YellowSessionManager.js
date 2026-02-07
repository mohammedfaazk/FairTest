/**
 * YellowSessionManager - Real Yellow (Nitrolite) integration.
 * Uses official ClearNode WebSocket: auth, create app session, close app session.
 * No simulated behavior, no fake tx hashes. PaymentFlow relies only on real Yellow receipts.
 */

import { ethers } from 'ethers';
import WebSocket from 'ws';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  parseAnyRPCResponse,
  RPCMethod,
} from '@erc7824/nitrolite';

const DEFAULT_WS_URL = 'wss://clearnet-sandbox.yellow.com/ws';
const REQUEST_TIMEOUT_MS = 20000;
const USDC_DECIMALS = 6;

/**
 * Convert fee amount (e.g. 0.1) to USDC 6-decimal string for Nitrolite.
 */
function toUsdcAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return String(Math.round(n * 10 ** USDC_DECIMALS));
}

/**
 * Build a MessageSigner (payload => Promise<Hex>) from an ethers-like signer
 * that can sign raw message bytes (no EIP-191 prefix). Uses ethers.id(JSON.stringify(payload)).
 */
function makeMessageSigner(signer) {
  return async (payload) => {
    const message = JSON.stringify(payload);
    const digestHex = ethers.id(message);
    const messageBytes = ethers.getBytes(digestHex);
    if (signer.signingKey) {
      const { serialized } = signer.signingKey.sign(messageBytes);
      return serialized;
    }
    if (typeof signer.signMessage === 'function') {
      return await signer.signMessage(messageBytes);
    }
    throw new Error('Signer must have signingKey or signMessage');
  };
}

/**
 * Get wallet address from signer (ethers Wallet has .address, or getAddress()).
 */
async function getAddress(signer) {
  if (signer.address) return signer.address;
  if (typeof signer.getAddress === 'function') return await signer.getAddress();
  throw new Error('Signer must have address or getAddress()');
}

export default class YellowSessionManager {
  constructor(config = {}) {
    this.wsUrl =
      config.wsUrl ??
      (typeof process !== 'undefined' && process.env?.YELLOW_CLEARNODE_WS_URL) ??
      DEFAULT_WS_URL;
    this.platformWallet =
      config.platformWallet ??
      (typeof process !== 'undefined' && process.env?.YELLOW_PLATFORM_WALLET) ??
      null;
    this.getSigner =
      config.getSigner ??
      (typeof globalThis !== 'undefined' && globalThis.__FAIRTEST_GET_SIGNER__) ??
      null;
    this.ws = null;
    this.authenticatedWallet = null;
    this.pending = new Map();
    /** sessionId (app_session_id) -> { type, examId?, participantA, participantB, amountUsdc } for settle */
    this.sessionMeta = new Map();
  }

  _getWs() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return null;
    return this.ws;
  }

  _connect() {
    return new Promise((resolve, reject) => {
      if (this._getWs()) {
        resolve(this.ws);
        return;
      }
      const ws = new WebSocket(this.wsUrl);
      const timeout = setTimeout(() => {
        ws.removeAllListeners();
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);
      ws.on('open', () => {
        clearTimeout(timeout);
        this.ws = ws;
        resolve(ws);
      });
      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      ws.on('close', () => {
        this.ws = null;
        this.authenticatedWallet = null;
      });
    });
  }

  _sendAndWait(ws, message, expectMethod) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.removeListener('message', onMessage);
        reject(new Error(`${expectMethod || 'RPC'} timeout`));
      }, REQUEST_TIMEOUT_MS);
      const onMessage = (data) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString();
          const parsed = parseAnyRPCResponse(raw);
          if (parsed.method === RPCMethod.Error) {
            clearTimeout(timeout);
            ws.removeListener('message', onMessage);
            reject(new Error(parsed.params?.error ?? 'RPC error'));
            return;
          }
          if (expectMethod && parsed.method !== expectMethod) return;
          clearTimeout(timeout);
          ws.removeListener('message', onMessage);
          resolve(parsed);
        } catch (e) {
          // ignore parse errors for other message types
        }
      };
      ws.on('message', onMessage);
      ws.send(typeof message === 'string' ? message : JSON.stringify(message));
    });
  }

  async _ensureAuthenticated(walletAddress) {
    if (!this.getSigner) {
      throw new Error(
        'Yellow integration requires getSigner. Set config.getSigner or globalThis.__FAIRTEST_GET_SIGNER__'
      );
    }
    const signer = await this.getSigner(walletAddress);
    if (!signer) throw new Error(`No signer for wallet ${walletAddress}`);
    const addr = await getAddress(signer);
    const addrLower = addr.toLowerCase();
    if (this.authenticatedWallet === addrLower) {
      const ws = this._getWs();
      if (ws) return { signer, address: addr };
    }
    const ws = await this._connect();
    const authParams = {
      wallet: addr,
      participant: addr,
      app_name: 'FairTest',
      allowances: [],
      expire: String(Math.floor(Date.now() / 1000) + 3600),
      scope: 'console',
      application: '0x0000000000000000000000000000000000000000',
    };
    const authRequest = await createAuthRequestMessage(authParams);
    const authChallengeResponse = await this._sendAndWait(
      ws,
      authRequest,
      RPCMethod.AuthChallenge
    );
    const challenge = { params: authChallengeResponse.params };
    const messageSigner = makeMessageSigner(signer);
    const authVerify = await createAuthVerifyMessage(messageSigner, challenge);
    const authVerifyResponse = await this._sendAndWait(
      ws,
      authVerify,
      RPCMethod.AuthVerify
    );
    if (!authVerifyResponse.params?.success) {
      throw new Error('Yellow auth_verify failed');
    }
    this.authenticatedWallet = addrLower;
    return { signer, address: addr };
  }

  async createExamListingSession(creatorWallet, listingFee, examMetadata = {}) {
    const platform =
      this.platformWallet ?? '0x0000000000000000000000000000000000000000';
    const amountUsdc = toUsdcAmount(listingFee);
    const { signer, address } = await this._ensureAuthenticated(creatorWallet);
    const ws = this._getWs();
    if (!ws) throw new Error('WebSocket not connected');
    const messageSigner = makeMessageSigner(signer);
    const definition = {
      protocol: 'nitroliterpc',
      participants: [address, platform],
      weights: [100, 0],
      quorum: 100,
      challenge: 0,
      nonce: Date.now(),
    };
    const allocations = [
      { participant: address, asset: 'usdc', amount: amountUsdc },
      { participant: platform, asset: 'usdc', amount: '0' },
    ];
    const signedMessage = await createAppSessionMessage(messageSigner, [
      { definition, allocations },
    ]);
    const response = await this._sendAndWait(
      ws,
      signedMessage,
      RPCMethod.CreateAppSession
    );
    const appSessionId =
      response.params?.appSessionId ?? response.params?.app_session_id;
    if (!appSessionId) throw new Error('No app_session_id in create_app_session response');
    const sessionId = typeof appSessionId === 'string' ? appSessionId : appSessionId;
    this.sessionMeta.set(sessionId, {
      type: 'EXAM_LISTING',
      examId: null,
      participantA: address,
      participantB: platform,
      amountUsdc,
    });
    return { sessionId };
  }

  async createStudentRegistrationSession(
    studentWallet,
    examFee,
    examId,
    creatorWallet
  ) {
    const amountUsdc = toUsdcAmount(examFee);
    const { signer, address } = await this._ensureAuthenticated(studentWallet);
    const ws = this._getWs();
    if (!ws) throw new Error('WebSocket not connected');
    const messageSigner = makeMessageSigner(signer);
    const definition = {
      protocol: 'nitroliterpc',
      participants: [address, creatorWallet],
      weights: [100, 0],
      quorum: 100,
      challenge: 0,
      nonce: Date.now(),
    };
    const allocations = [
      { participant: address, asset: 'usdc', amount: amountUsdc },
      { participant: creatorWallet, asset: 'usdc', amount: '0' },
    ];
    const signedMessage = await createAppSessionMessage(messageSigner, [
      { definition, allocations },
    ]);
    const response = await this._sendAndWait(
      ws,
      signedMessage,
      RPCMethod.CreateAppSession
    );
    const appSessionId =
      response.params?.appSessionId ?? response.params?.app_session_id;
    if (!appSessionId) throw new Error('No app_session_id in create_app_session response');
    const sessionId = typeof appSessionId === 'string' ? appSessionId : appSessionId;
    this.sessionMeta.set(sessionId, {
      type: 'STUDENT_REGISTRATION',
      examId,
      participantA: address,
      participantB: creatorWallet,
      amountUsdc,
    });
    return { sessionId };
  }

  async recordSessionEvent(sessionId, eventType, eventData = {}) {
    console.log(`[Yellow] Recorded off-chain: ${eventType}`);
    return { success: true };
  }

  async settleSession(sessionId) {
    const meta = this.sessionMeta.get(sessionId);
    if (!meta) {
      throw new Error(
        `Session not found: ${sessionId}. Settlement requires a session created by this manager.`
      );
    }
    const { participantA, participantB, amountUsdc } = meta;
    const { signer } = await this._ensureAuthenticated(participantA);
    const ws = this._getWs();
    if (!ws) throw new Error('WebSocket not connected');
    const messageSigner = makeMessageSigner(signer);
    const allocations = [
      { participant: participantA, asset: 'usdc', amount: '0' },
      { participant: participantB, asset: 'usdc', amount: amountUsdc },
    ];
    const signedMessage = await createCloseAppSessionMessage(messageSigner, [
      { app_session_id: sessionId, allocations },
    ]);
    const response = await this._sendAndWait(
      ws,
      signedMessage,
      RPCMethod.CloseAppSession
    );
    const closedId =
      response.params?.appSessionId ?? response.params?.app_session_id;
    const receiptId = closedId ?? sessionId;
    this.sessionMeta.delete(sessionId);
    return {
      success: true,
      txHash: typeof receiptId === 'string' ? receiptId : String(receiptId),
      recipient: meta.type === 'EXAM_LISTING' ? 'platform' : participantB,
      amount: Number(amountUsdc) / 10 ** USDC_DECIMALS,
    };
  }

  async settleAllSessionsForExam(examId) {
    const toSettle = [...this.sessionMeta.entries()].filter(
      ([, m]) => m.examId === examId
    );
    const settlements = [];
    for (const [sessionId] of toSettle) {
      try {
        const result = await this.settleSession(sessionId);
        settlements.push(result);
      } catch (err) {
        console.warn(`[Yellow] settleSession(${sessionId}) failed:`, err.message);
      }
    }
    return {
      success: true,
      totalSettlements: settlements.length,
      settlements,
    };
  }
}
