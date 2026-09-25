import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  BarChart3,
  AlertCircle,
  Users2,
  Settings,
  ChevronDown,
  Sparkles,
  TrendingUp
} from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'planner', label: 'Upload Planner', icon: CalendarDays },
  { id: 'syllabus', label: 'Syllabus Matcher', icon: BookOpen },
  { id: 'leaderboard', label: 'Monthly Leaderboard', icon: BarChart3 },
  { id: 'low-ctr', label: 'Low-CTR Triage', icon: AlertCircle, hasBadge: true },
  { id: 'competitors', label: 'Competitor Benchmarking', icon: Users2 },
];

const examTracks = [
  { name: 'CFA Level 1 & 2', color: '#8B5CF6' },
  { name: 'FRM Part 1 & 2', color: '#3B82F6' },
  { name: 'YouTube Shorts', color: '#2DD4BF' },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  status,
  lowCtrCount = 0,
  plannerQueueCount = 0,
  syllabusQueueCount = 0,
  onOpenSettings
}) {
  const displayLowCtrCount = lowCtrCount > 0 ? lowCtrCount : 16;

  /* ── Inline style objects to guarantee rendering regardless of CSS resets ── */
  const sidebarStyle = {
    width: '256px',
    minWidth: '256px',
    height: '100%',
    background: '#FFFFFF',
    borderRight: '1px solid #E8ECF1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px 16px',
    overflowY: 'auto',
    flexShrink: 0,
  };

  const profileCardStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderRadius: '16px',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginBottom: '8px',
  };

  const avatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
    color: '#4F46E5',
    fontWeight: 700,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #C7D2FE',
    position: 'relative',
    flexShrink: 0,
  };

  const onlineDotStyle = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#10B981',
    border: '2px solid #FFFFFF',
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
  };

  const sectionLabelStyle = {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94A3B8',
    padding: '0 12px',
    marginTop: '24px',
    marginBottom: '8px',
  };

  const getNavBtnStyle = (isActive) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#7C3AED' : '#475569',
    background: isActive ? '#F5F3FF' : 'transparent',
    border: isActive ? '1px solid rgba(124, 58, 237, 0.15)' : '1px solid transparent',
    boxShadow: isActive ? '0 1px 3px rgba(124, 58, 237, 0.08)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    fontFamily: 'inherit',
  });

  const badgeStyle = {
    marginLeft: 'auto',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '10px',
    fontWeight: 700,
    background: '#FFF1F2',
    color: '#E11D48',
    border: '1px solid rgba(225, 29, 72, 0.15)',
  };

  const trackItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px',
    fontSize: '12px',
    color: '#64748B',
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.15s ease',
  };

  const settingsBtnStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748B',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    fontFamily: 'inherit',
  };

  const promoCardStyle = {
    borderRadius: '16px',
    padding: '18px',
    background: 'linear-gradient(135deg, #5D5FEF 0%, #818CF8 100%)',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px -2px rgba(93, 95, 239, 0.3)',
  };

  const promoButtonStyle = {
    width: '100%',
    padding: '8px 0',
    background: '#FFFFFF',
    color: '#4F46E5',
    fontWeight: 700,
    fontSize: '12px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.15s ease',
    marginTop: '10px',
    fontFamily: 'inherit',
  };

  return (
    <aside style={sidebarStyle}>
      {/* ═══════ TOP SECTION ═══════ */}
      <div>
        {/* Profile Card */}
        <div
          style={profileCardStyle}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={avatarStyle}>
              FE
              <span style={onlineDotStyle} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
                Falcon Edufin
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Live Channel
              </div>
            </div>
          </div>
          <ChevronDown size={14} color="#94A3B8" />
        </div>

        {/* Section Label */}
        <div style={sectionLabelStyle}>Navigation</div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                style={getNavBtnStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#F1F5F9';
                    e.currentTarget.style.color = '#1E293B';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {item.hasBadge && (
                  <span style={badgeStyle}>{displayLowCtrCount}</span>
                )}
                {item.id === 'planner' && plannerQueueCount > 0 && (
                  <span style={{ ...badgeStyle, background: '#FEF3C7', color: '#B45309', borderColor: 'rgba(180, 83, 9, 0.15)' }}>
                    {plannerQueueCount}
                  </span>
                )}
                {item.id === 'syllabus' && syllabusQueueCount > 0 && (
                  <span style={{ ...badgeStyle, background: '#FFF5ED', color: '#EA580C', borderColor: 'rgba(234, 88, 12, 0.2)' }}>
                    {syllabusQueueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Exam Tracks Section */}
        <div style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
              Exam Tracks
            </span>
            <button
              style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {examTracks.map((track) => (
              <div
                key={track.name}
                style={trackItemStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#1E293B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: track.color, flexShrink: 0 }} />
                <span>{track.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ BOTTOM SECTION ═══════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', marginTop: '16px' }}>
        {/* Settings */}
        <button
          style={settingsBtnStyle}
          onClick={onOpenSettings}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#1E293B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
        >
          <Settings size={18} strokeWidth={1.8} />
          <span>Settings</span>
        </button>

        {/* Promo / Seasonality Card */}
        <div style={promoCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
            <Sparkles size={14} />
            <span>Seasonality Alert</span>
          </div>
          <p style={{ fontSize: '11px', color: '#C7D2FE', lineHeight: 1.5, margin: 0 }}>
            Prioritize marathon &amp; revision lectures 30–60 days before exam windows.
          </p>
          <button
            style={promoButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
          >
            Sync Channel
          </button>
        </div>
      </div>
    </aside>
  );
}
