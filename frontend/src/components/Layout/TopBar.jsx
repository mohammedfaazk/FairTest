'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import * as SuietKit from '@suiet/wallet-kit';
import fairTestService from '../../services/FairTestService';
import './TopBar.css';

const { ConnectButton, useWallet } = SuietKit;

const MENU_ITEMS = {
  creator: [
    { path: '/creator', icon: '📊', label: 'Dashboard' },
    { path: '/creator/create', icon: '✏️', label: 'Create Exam' },
    { path: '/creator/exams', icon: '📝', label: 'My Exams' },
    { path: '/creator/analytics', icon: '📈', label: 'Analytics' },
  ],
  student: [
    { path: '/student', icon: '🏠', label: 'Dashboard' },
    { path: '/student/browse', icon: '🔍', label: 'Browse Exams' },
    { path: '/student/registered', icon: '📚', label: 'My Exams' },
    { path: '/student/results', icon: '🎯', label: 'Results' },
  ],
  evaluator: [
    { path: '/evaluator', icon: '📊', label: 'Dashboard' },
    { path: '/evaluator/pending', icon: '⏳', label: 'Pending Grading' },
    { path: '/evaluator/completed', icon: '✅', label: 'Completed' },
  ],
};

const PROFILES = [
  { id: 'student', avatar: '👨‍🎓', label: 'Student' },
  { id: 'creator', avatar: '👨‍🏫', label: 'Faculty' },
  { id: 'evaluator', avatar: '👩‍🏫', label: 'Evaluator' },
];

const TopBar = ({ title, role, onRoleChange }) => {
  const router = useRouter();
  const pathname = usePathname();
  const walletKit = useWallet();
  const { address, connected, account } = walletKit;
  const navItems = MENU_ITEMS[role] || MENU_ITEMS.student;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const currentProfile = PROFILES.find((p) => p.id === role) || PROFILES[0];

  useEffect(() => {
    if (address && connected) {
      fairTestService.connectWallet(address, walletKit);
    } else {
      fairTestService.connectWallet(null, null);
    }
  }, [address, connected, account, walletKit]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [profileMenuOpen]);

  const handleRoleChange = (newRole) => {
    onRoleChange(newRole);
    setProfileMenuOpen(false);
    if (newRole === 'student') router.push('/student');
    else if (newRole === 'creator') router.push('/creator');
    else if (newRole === 'evaluator') router.push('/evaluator');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link href={role === 'creator' ? '/creator' : role === 'evaluator' ? '/evaluator' : '/student'} className="topbar-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">FairTest</span>
        </Link>
        <nav className="topbar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`topbar-nav-item ${pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="topbar-center">
        <h1 className="page-title">{title}</h1>
      </div>
      
      <div className="topbar-right">
        <div className="profile-switcher" ref={profileMenuRef}>
          <button
            type="button"
            className="profile-trigger"
            onClick={() => setProfileMenuOpen((o) => !o)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="true"
            aria-label="Switch profile"
          >
            <span className="profile-trigger-avatar">{currentProfile.avatar}</span>
            <span className="profile-trigger-label">{currentProfile.label}</span>
          </button>
          {profileMenuOpen && (
            <div className="profile-menu">
              <div className="profile-menu-title">Who&apos;s using FairTest?</div>
              <div className="profile-menu-list">
                {PROFILES.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    className={`profile-menu-item ${role === profile.id ? 'active' : ''}`}
                    onClick={() => handleRoleChange(profile.id)}
                  >
                    <span className="profile-avatar">{profile.avatar}</span>
                    <span className="profile-name">{profile.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="wallet-connect-wrapper">
          {ConnectButton ? <ConnectButton /> : <span className="wallet-connect-placeholder">Connect wallet</span>}
        </div>
      </div>
    </header>
  );
};

export default TopBar;