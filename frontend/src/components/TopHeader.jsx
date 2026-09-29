import React from 'react';
import { Search, Bell, RefreshCw, Menu, Sparkles, SlidersHorizontal, Lock, LogOut } from 'lucide-react';
import InstallDesktopAppButton from './InstallDesktopAppButton';
import { logoutAdmin } from './AdminAuthGate';

export default function TopHeader({
  activeTab,
  status,
  onOpenSettings,
  onSyncChannel,
  isSyncing,
  onToggleCollapse
}) {
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'overview':
        return 'Performance Overview';
      case 'planner':
        return 'Upload Planner';
      case 'syllabus':
        return 'Syllabus Matcher';
      case 'leaderboard':
        return 'Monthly Leaderboard';
      case 'low-ctr':
        return 'Low-CTR Triage';
      case 'change-log':
        return 'Change Log & Impact';
      case 'competitors':
        return 'Competitor Benchmarking';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header style={{
      height: '64px',
      background: '#EBEEF2',
      borderBottom: '1px solid rgba(166, 175, 195, 0.35)',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Left: Breadcrumb & Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              display: 'none', /* hidden on desktop, show via media query if needed */
              padding: '6px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
            }}
            title="Toggle Menu"
          >
            <Menu size={18} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94A3B8' }}>
          <span>Falcon</span>
          <span>/</span>
          <span style={{ fontWeight: 600, color: '#1E293B' }}>{getTabBreadcrumb()}</span>
        </div>

        {/* Floating Capsule Search Bar - Soft Inset */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#E6EAF0',
          border: 'none',
          borderRadius: '9999px',
          padding: '7px 16px',
          fontSize: '13px',
          color: '#64748B',
          boxShadow: 'inset 2px 2px 5px rgba(166, 175, 195, 0.55), inset -2px -2px 5px rgba(255, 255, 255, 0.85)',
        }}>
          <Search size={14} style={{ color: '#64748B', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search videos, topics, playlists..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              color: '#1E293B',
              width: '210px',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Desktop App Install Button */}
        <InstallDesktopAppButton />


        {/* Notification Bell */}
        <button
          id="topheader-btn-bell"
          title="Notifications"
          style={{
            position: 'relative',
            padding: '8px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#2F65F6',
            boxShadow: '0 0 0 2px #EBEEF2',
          }} />
        </button>

        {/* User Avatar */}
        <button
          onClick={onOpenSettings}
          id="topheader-btn-avatar"
          title="Settings & Profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 4px',
            borderRadius: '9999px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: '#F3E8FF',
            color: '#7C3AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '12px',
            boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.15)',
          }}>
            F
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Falcon EduFin</span>
        </button>

        {/* Lock Admin Session Button */}
        <button
          onClick={() => {
            if (window.confirm('Lock Admin Session? You can unlock it again with your passcode.')) {
              logoutAdmin();
            }
          }}
          id="topheader-btn-lock"
          title="Lock Admin Session (Require Passcode)"
          style={{
            padding: '8px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#EF4444';
            e.currentTarget.style.background = '#FEF2F2';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Lock size={15} />
        </button>
      </div>
    </header>
  );
}
