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
  Sparkles
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
  isSyncing = false
}) {
  const displayLowCtrCount = lowCtrCount > 0 ? lowCtrCount : 16;

  return (
    <aside
      id="app-left-sidebar"
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
  );
}
