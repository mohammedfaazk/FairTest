'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectButton, useWallet } from '@suiet/wallet-kit';
import fairTestService from '../../services/FairTestService';
import './TopBar.css';

const TopBar = ({ title, role, onRoleChange }) => {
  const router = useRouter();
  const walletKit = useWallet();
  const { address, connected, account } = walletKit;

  useEffect(() => {
    console.log('[TopBar] Wallet state:', { address, connected, account, walletKit });
    
    if (address && connected) {
      // Pass wallet kit instance for transaction signing
      fairTestService.connectWallet(address, walletKit);
      console.log('[TopBar] ✅ Wallet connected:', address);
    } else {
      fairTestService.connectWallet(null, null);
      console.log('[TopBar] ❌ Wallet disconnected');
    }
  }, [address, connected, account, walletKit]);

  const handleRoleChange = (newRole) => {
    onRoleChange(newRole);
    if (newRole === 'student') router.push('/student');
    else if (newRole === 'creator') router.push('/creator');
    else if (newRole === 'evaluator') router.push('/evaluator');
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{title}</h1>
      </div>
      
      <div className="topbar-right">
        <select 
          className="role-switch"
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
        >
          <option value="student">👨‍🎓 Student</option>
          <option value="creator">👨‍🏫 Creator</option>
          <option value="evaluator">👩‍🏫 Evaluator</option>
        </select>
        
        <button className="notification-btn">
          🔔
          <span className="notification-badge">3</span>
        </button>
        
        <div className="wallet-connect-wrapper">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
};

export default TopBar;