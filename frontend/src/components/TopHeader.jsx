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
  onToggleCollapse,
  onToggleRightDock,
  isRightDockOpen,
  hasSelectedItem
}) {
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'overview':
        return 'Performance Overview';
      case 'planner':
        return 'Upload Planner';
      case 'shorts':
        return 'Shorts Planner';
      case 'manage':
        return 'Manage Plan';
      case 'syllabus':
        return 'Syllabus Matcher';
      case 'leaderboard':
        return 'Monthly Leaderboard';
      case 'low-ctr':
        return 'Low-CTR Triage';
      case 'change-log':
        return 'Change Log & Impact';
      case 'competitors':
        return 'Competitors';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header 
      id="top-header"
      style={{
        height: '60px',
        background: '#EBEEF2',
        borderBottom: '1px solid rgba(166, 175, 195, 0.35)',
        padding: '0 clamp(12px, 2.5vw, 28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 20,
        gap: '10px'
      }}
    >
      {/* Left: Hamburger (Mobile) + Breadcrumb + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 16px)', minWidth: 0 }}>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            id="topheader-btn-menu-toggle"
            className="md:hidden"
            style={{
              padding: '6px 8px',
              borderRadius: '9px',
              background: '#F0F3F7',
              border: '1px solid rgba(166, 175, 195, 0.4)',
              color: '#1E293B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '1px 1px 3px rgba(166, 175, 195, 0.25)'
            }}
            title="Open Menu"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94A3B8', minWidth: 0 }}>
          <span className="hidden sm:inline">Falcon</span>
          <span className="hidden sm:inline">/</span>
          <span style={{ fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getTabBreadcrumb()}
          </span>
        </div>

        {/* Floating Capsule Search Bar - Soft Inset (hidden on small phone screens) */}
        <div 
          className="hidden sm:flex"
          style={{
            alignItems: 'center',
            gap: '8px',
            background: '#E6EAF0',
            border: 'none',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '13px',
            color: '#64748B',
            boxShadow: 'inset 2px 2px 5px rgba(166, 175, 195, 0.55), inset -2px -2px 5px rgba(255, 255, 255, 0.85)',
          }}
        >
          <Search size={14} style={{ color: '#64748B', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search videos, topics..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '12px',
              color: '#1E293B',
              width: 'clamp(110px, 14vw, 210px)',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1vw, 10px)', flexShrink: 0 }}>
        {/* Desktop App Install Button (desktop only) */}
        <div className="hidden lg:block">
          <InstallDesktopAppButton />
        </div>

        {/* Right Dock / Inspector Drawer Toggle (visible on tablet / iPad Air & phone) */}
        {onToggleRightDock && (
          <button
            onClick={onToggleRightDock}
            id="topheader-btn-toggle-rightdock"
            title="Open YouTube Impact & Video Inspector"
            style={{
              position: 'relative',
              padding: '7px',
              borderRadius: '10px',
              background: isRightDockOpen ? 'rgba(47, 101, 246, 0.12)' : 'transparent',
              border: isRightDockOpen ? '1px solid rgba(47, 101, 246, 0.3)' : '1px solid transparent',
              color: isRightDockOpen ? '#2F65F6' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <SlidersHorizontal size={16} />
            {hasSelectedItem && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#EA580C',
                boxShadow: '0 0 0 2px #EBEEF2',
              }} />
            )}
          </button>
        )}

        {/* Notification Bell */}
        <button
          id="topheader-btn-bell"
          title="Notifications"
          style={{
            position: 'relative',
            padding: '7px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#2F65F6',
            boxShadow: '0 0 0 2px #EBEEF2',
          }} />
        </button>

        {/* User Avatar (compact on mobile) */}
        <button
          onClick={onOpenSettings}
          id="topheader-btn-avatar"
          title="Settings & Profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '3px 8px 3px 3px',
            borderRadius: '9999px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#F3E8FF',
            color: '#7C3AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '11px',
            boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.15)',
          }}>
            F
          </div>
          <span className="hidden md:inline" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
            Falcon EduFin
          </span>
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
            padding: '7px',
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
