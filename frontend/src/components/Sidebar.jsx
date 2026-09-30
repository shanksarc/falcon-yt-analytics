import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Zap,
  SlidersHorizontal,
  BookOpen,
  BarChart3,
  AlertCircle,
  Users2,
  Settings,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'planner', label: 'Upload Planner', icon: CalendarDays },
  { id: 'shorts', label: 'Shorts Planner', icon: Zap },
  { id: 'manage', label: 'Manage Plan', icon: SlidersHorizontal },
  { id: 'syllabus', label: 'Syllabus Matcher', icon: BookOpen },
  { id: 'leaderboard', label: 'Monthly Leaderboard', icon: BarChart3 },
  { id: 'low-ctr', label: 'Low-CTR Triage', icon: AlertCircle, hasBadge: true },
  { id: 'competitors', label: 'Competitors', icon: Users2 },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  status,
  lowCtrCount = 0,
  plannerQueueCount = 0,
  syllabusQueueCount = 0,
  onOpenSettings,
  onSyncChannel,
  isSyncing = false,
  isMobileOpen = false,
  onCloseMobile
}) {
  const displayLowCtrCount = lowCtrCount > 0 ? lowCtrCount : 16;

  const handleNavClick = (id) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* ─── DESKTOP & TABLET (iPad Air) ICON BAR (>= 768px) ─── */}
      <aside
        id="app-left-sidebar"
        className="app-left-sidebar-desktop"
        style={{
          width: '68px',
          minWidth: '68px',
          height: '100%',
          background: '#EBEEF2',
          borderRight: '1px solid rgba(166, 175, 195, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 8px',
          flexShrink: 0,
          boxSizing: 'border-box',
          zIndex: 30
        }}
      >
      {/* ─── TOP SECTION: Brand Logo & Sync Button ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
        
        {/* Falcon Brand Icon */}
        <div
          title="Falcon YT Analytics"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #3A72F8 0%, #2054E2 100%)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(47, 101, 246, 0.35)',
            cursor: 'default',
            position: 'relative',
            userSelect: 'none'
          }}
        >
          F
          <span
            title={status?.demo_mode ? 'Demo Mode' : 'Live Channel'}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: status?.has_api_key ? '#0D9488' : '#EA580C',
              border: '2px solid #EBEEF2',
              position: 'absolute',
              bottom: '-2px',
              right: '-2px'
            }}
          />
        </div>

        {/* Sync Button (Shifted from Right Sidebar per Fix 2) */}
        <button
          onClick={onSyncChannel}
          disabled={isSyncing}
          title={isSyncing ? "Syncing Channel..." : "Sync Channel (Shifted to Left Bar)"}
          id="btn-sidebar-sync"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isSyncing ? '#2F65F6' : '#F0F3F7',
            color: isSyncing ? '#FFFFFF' : '#2F65F6',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: isSyncing
              ? '0 0 12px rgba(47, 101, 246, 0.6)'
              : '4px 4px 8px rgba(166, 175, 195, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)',
            cursor: isSyncing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            if (!isSyncing) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '5px 5px 10px rgba(166, 175, 195, 0.5), -5px -5px 10px rgba(255, 255, 255, 0.9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSyncing) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '4px 4px 8px rgba(166, 175, 195, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)';
            }
          }}
        >
          <RefreshCw size={17} className={isSyncing ? 'animate-spin' : ''} />
        </button>

        <div style={{ width: '32px', height: '1px', background: 'rgba(166, 175, 195, 0.35)', margin: '2px 0' }} />

        {/* ─── Navigation Icon List ─── */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                style={{
                  position: 'relative',
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? '#E2E7EE' : 'transparent',
                  color: isActive ? '#2F65F6' : '#64748B',
                  boxShadow: isActive
                    ? 'inset 2px 2px 4px rgba(166, 175, 195, 0.65), inset -2px -2px 4px rgba(255, 255, 255, 0.95)'
                    : 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#F0F3F7';
                    e.currentTarget.style.color = '#1E293B';
                    e.currentTarget.style.boxShadow = '3px 3px 6px rgba(166, 175, 195, 0.35), -3px -3px 6px rgba(255, 255, 255, 0.7)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#64748B';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.9} />

                {/* Notification Badge Dot for Low-CTR */}
                {item.id === 'low-ctr' && displayLowCtrCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#E11D48',
                      boxShadow: '0 0 4px rgba(225, 29, 72, 0.5)'
                    }}
                  />
                )}

                {/* Queue badge dot for Planner */}
                {item.id === 'planner' && plannerQueueCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#EA580C',
                      boxShadow: '0 0 4px rgba(234, 88, 12, 0.5)'
                    }}
                  />
                )}

                {/* Queue badge dot for Syllabus */}
                {item.id === 'syllabus' && syllabusQueueCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#3B82F6',
                      boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── BOTTOM SECTION: Settings & Online Status ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
        <button
          onClick={onOpenSettings}
          title="Settings"
          id="sidebar-btn-settings"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: '#64748B',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F0F3F7';
            e.currentTarget.style.color = '#1E293B';
            e.currentTarget.style.boxShadow = '3px 3px 6px rgba(166, 175, 195, 0.35), -3px -3px 6px rgba(255, 255, 255, 0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748B';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Settings size={19} strokeWidth={1.8} />
        </button>

        {/* Live Channel Status Dot */}
        <div
          title={status?.demo_mode ? 'Demo Mode' : 'Connected to YouTube Channel'}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: status?.has_api_key ? '#0D9488' : '#EA580C',
            boxShadow: `0 0 6px ${status?.has_api_key ? 'rgba(13, 148, 136, 0.6)' : 'rgba(234, 88, 12, 0.6)'}`
          }}
        />
      </div>
    </aside>

    {/* ─── MOBILE SLIDE-IN NAVIGATION DRAWER (iPhone 17 & Small Screens) ─── */}
    {isMobileOpen && (
      <div 
        id="mobile-nav-drawer-wrapper"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex'
        }}
      >
        {/* Backdrop Overlay */}
        <div
          onClick={onCloseMobile}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
          }}
        />

        {/* Drawer Menu Surface */}
        <aside
          style={{
            position: 'relative',
            width: 'min(290px, 82vw)',
            height: '100%',
            background: '#EBEEF2',
            boxShadow: '6px 0 28px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px 16px',
            boxSizing: 'border-box',
            zIndex: 1,
            overflowY: 'auto'
          }}
        >
          {/* Drawer Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #3A72F8 0%, #2054E2 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(47, 101, 246, 0.35)'
                  }}
                >
                  F
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>Falcon YT</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Analytics Platform</div>
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer'
                }}
                title="Close Navigation"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sync & Quick Action Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onSyncChannel}
                disabled={isSyncing}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#F0F3F7',
                  border: '1px solid rgba(166, 175, 195, 0.4)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1E293B',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Channel'}</span>
              </button>
            </div>

            {/* Navigation List */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                let badgeVal = 0;
                if (item.id === 'low-ctr') badgeVal = displayLowCtrCount;
                if (item.id === 'planner') badgeVal = plannerQueueCount;
                if (item.id === 'syllabus') badgeVal = syllabusQueueCount;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isActive ? '#2F65F6' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#334155',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComponent size={18} />
                      <span>{item.label}</span>
                    </div>

                    {badgeVal > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          background: isActive ? 'rgba(255, 255, 255, 0.25)' : (item.id === 'low-ctr' ? '#EF4444' : '#2F65F6'),
                          color: '#FFFFFF'
                        }}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Drawer Footer: Settings */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(166, 175, 195, 0.3)' }}>
            <button
              onClick={() => {
                onOpenSettings();
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Settings size={18} />
              <span>Settings & Preferences</span>
            </button>
          </div>
        </aside>
      </div>
    )}
  </>
  );
}
