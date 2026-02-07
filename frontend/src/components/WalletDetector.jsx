'use client';

import { useEffect, useState } from 'react';

export default function WalletDetector() {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    // Check for Sui wallets in window object
    const checkWallets = () => {
      const detected = [];
      
      // Check for Suiet
      if (typeof window !== 'undefined') {
        if (window.suiet) {
          detected.push({ name: 'Suiet', found: true, obj: 'window.suiet' });
        }
        
        // Check for Sui Wallet
        if (window.suiWallet) {
          detected.push({ name: 'Sui Wallet', found: true, obj: 'window.suiWallet' });
        }
        
        // Check for Ethos
        if (window.ethos) {
          detected.push({ name: 'Ethos', found: true, obj: 'window.ethos' });
        }
        
        // Check for Martian
        if (window.martian) {
          detected.push({ name: 'Martian', found: true, obj: 'window.martian' });
        }
        
        // Check for Surf
        if (window.surf) {
          detected.push({ name: 'Surf', found: true, obj: 'window.surf' });
        }

        // Check standard wallet API
        if (window.wallet) {
          detected.push({ name: 'Generic Wallet', found: true, obj: 'window.wallet' });
        }
      }
      
      console.log('🔍 Detected Sui Wallets:', detected);
      setWallets(detected);
    };

    // Check immediately
    checkWallets();
    
    // Check again after a delay (wallets might load async)
    const timer = setTimeout(checkWallets, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
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
        🔍 Wallet Detector
      </div>
      {wallets.length === 0 ? (
        <div style={{ color: '#f87171' }}>
          ❌ No Sui wallets detected
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
            Install a Sui wallet extension:
            <br />• Suiet: suiet.app
            <br />• Sui Wallet: sui.io
          </div>
        </div>
      ) : (
        <div>
          <div style={{ color: '#4ade80', marginBottom: '5px' }}>
            ✅ Found {wallets.length} wallet(s):
          </div>
          {wallets.map((w, i) => (
            <div key={i} style={{ marginLeft: '10px', marginTop: '3px' }}>
              • {w.name}
              <div style={{ fontSize: '10px', color: '#888' }}>{w.obj}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
