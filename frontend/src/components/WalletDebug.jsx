'use client';

import { useWallet } from '@suiet/wallet-kit';
import { useEffect } from 'react';

export default function WalletDebug() {
  const wallet = useWallet();

  useEffect(() => {
    console.log('=== WALLET DEBUG ===');
    console.log('Wallet object:', wallet);
    console.log('Connected:', wallet.connected);
    console.log('Address:', wallet.address);
    console.log('Wallet instance:', wallet.wallet);
    console.log('Status:', wallet.status);
    console.log('Chain:', wallet.chain);
    console.log('===================');
  }, [wallet.connected, wallet.address, wallet.status]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '300px',
      zIndex: 9999,
      border: '2px solid #333'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#4ade80' }}>
        🔍 Wallet Debug
      </div>
      <div>Status: <span style={{ color: wallet.connected ? '#4ade80' : '#f87171' }}>
        {wallet.status || 'disconnected'}
      </span></div>
      <div>Connected: {wallet.connected ? '✅' : '❌'}</div>
      <div>Address: {wallet.address ? `${wallet.address.slice(0, 8)}...` : 'None'}</div>
      <div>Wallet: {wallet.wallet?.name || 'None'}</div>
      <div>Chain: {wallet.chain?.name || 'Unknown'}</div>
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#888' }}>
        Check console for full details
      </div>
    </div>
  );
}
