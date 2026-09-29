import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Link2,
  FileText,
  Tag,
  Radio,
  Check,
  Flame,
  ArrowUpRight
} from 'lucide-react';

/**
 * RightSidebarDock - Static & Contextual Rail (w-80 / 320px)
 * 
 * Implements 3-column workspace architecture:
 * - Block 1: Channel Sync & Health Card
 * - Block 2: Seasonality Calendar & Exam Countdown
 * - Block 3: Contextual Inspector / Selected Item Drawer
 */
export default function RightSidebarDock({
  status,
  onSyncChannel,
  isSyncing,
  selectedItem,
  onClearSelectedItem,
  onUpdateItemStatus,
  onOpenLinkModal
}) {
  const [plannerOverview, setPlannerOverview] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);

  // Sync local status when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      setLocalStatus(selectedItem.status || 'Planned');
    } else {
      setLocalStatus(null);
    }
  }, [selectedItem]);

  // Fetch planner overview for seasonality countdown & pacing
  useEffect(() => {
    fetchPlannerOverview();
  }, []);

  const fetchPlannerOverview = async () => {
    try {
      const res = await fetch('/api/planner/overview');
      if (res.ok) {
        const data = await res.json();
        setPlannerOverview(data);
      }
    } catch (err) {
      console.debug('Failed to load planner overview for right dock:', err);
    }
  };

  // Find nearest active session for countdown badge
  const activeSession = React.useMemo(() => {
    if (!plannerOverview?.sessions || plannerOverview.sessions.length === 0) {
      return null;
    }
    // Return first active session with end_date in future or nearest
    const now = new Date();
    const sorted = [...plannerOverview.sessions].filter(s => s.is_active);
    if (sorted.length === 0) return plannerOverview.sessions[0];
    
    // Sort by end_date
    return sorted.sort((a, b) => new Date(a.end_date) - new Date(b.end_date))[0];
  }, [plannerOverview]);

  // Calculate days left to exam window
  const countdownDays = React.useMemo(() => {
    if (!activeSession?.end_date) return 42; // default fallback per spec
    const targetDate = new Date(activeSession.end_date);
    const today = new Date();
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [activeSession]);

  // Target pacing velocity
  const pacingVelocity = React.useMemo(() => {
    if (activeSession?.pacing?.pace_needed) {
      return Number(activeSession.pacing.pace_needed).toFixed(1);
    }
    return '2.0';
  }, [activeSession]);

  const pacingStatus = activeSession?.pacing?.status || 'ON_TRACK';
  const pacePercentage = Math.min(100, Math.max(10, Math.round(((activeSession?.uploaded || 0) / (activeSession?.target || 1)) * 100)));

  // Handle status toggle in Block 3 Inspector
  const handleStatusToggle = async (newStatus) => {
    if (!selectedItem || !selectedItem.id || isUpdatingStatus) return;
    setLocalStatus(newStatus);
    setIsUpdatingStatus(true);
    try {
      if (onUpdateItemStatus) {
        await onUpdateItemStatus(selectedItem, newStatus);
      } else {
        // Direct API update fallback for planned videos
        await fetch(`/api/planner/videos/${selectedItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }
    } catch (err) {
      console.error('Failed to update status from inspector:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Format relative sync time
  const formatSyncTime = (timestamp) => {
    if (!timestamp) return 'Today';
    try {
      const date = new Date(timestamp);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.round(diffHours / 24)}d ago`;
    } catch {
      return 'Today';
    }
  };

  return (
    <aside
      id="right-sidebar-dock"
      style={{
        width: '320px',
        minWidth: '320px',
        height: '100%',
        background: '#EBEEF2',
        borderLeft: '1px solid rgba(166, 175, 195, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px 16px',
        overflowY: 'auto',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* BLOCK 1: Channel Sync & Health Card                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="soft-raised" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em', color: '#64748B', textTransform: 'uppercase' }}>
            Channel Health
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '10.5px',
              fontWeight: 600,
              background: status?.has_api_key ? 'rgba(13, 148, 136, 0.12)' : 'rgba(234, 88, 12, 0.12)',
              color: status?.has_api_key ? '#0D9488' : '#EA580C'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: status?.has_api_key ? '#0D9488' : '#EA580C'
              }}
            />
            {status?.demo_mode ? 'Demo Mode' : (status?.has_api_key ? 'Live Channel' : 'Offline')}
          </span>
        </div>

        {/* Channel Identity */}
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.01em' }}>
            {status?.channel_name || 'Falcon Edufin'}
          </h4>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            CFA & FRM Curriculum Analytics
          </span>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div className="soft-inset" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
              {(status?.summary?.total_videos || 188).toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', marginTop: '3px', textTransform: 'uppercase' }}>
              Indexed Videos
            </div>
          </div>

          <div className="soft-inset" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', lineHeight: 1.4 }}>
              {formatSyncTime(status?.last_youtube_sync)}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', marginTop: '3px', textTransform: 'uppercase' }}>
              Last Sync
            </div>
          </div>
        </div>

        {/* Primary Sync CTA Button */}
        <button
          onClick={onSyncChannel}
          disabled={isSyncing}
          className="soft-button-primary"
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          title="Sync YouTube channel metrics and run auto-matcher"
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Syncing Channel...' : 'Sync Channel'}</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BLOCK 2: Seasonality Calendar & Exam Countdown                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="soft-raised" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em', color: '#64748B', textTransform: 'uppercase' }}>
            Seasonality & Pacing
          </span>
          <Calendar size={14} color="#2F65F6" />
        </div>

        {/* Exam Window Badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(47, 101, 246, 0.08) 0%, rgba(32, 84, 226, 0.12) 100%)',
            border: '1px solid rgba(47, 101, 246, 0.25)',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#2F65F6',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={15} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeSession?.name ? activeSession.name.replace('Exam Window', 'Window') : 'Nov CFA/FRM Window'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2F65F6' }}>
              {countdownDays} Days Left
            </div>
          </div>
        </div>

        {/* Velocity & Pacing Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#1E293B' }}>
              Weekly Velocity
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#2F65F6' }}>
              {pacingVelocity} videos / wk
            </span>
          </div>

          {/* Soft-Inset Pacing Gauge */}
          <div
            className="soft-inset"
            style={{
              height: '8px',
              borderRadius: '9999px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.max(8, pacePercentage)}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #3A72F8 0%, #2054E2 100%)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
            <span>Target: {activeSession?.target || 42} vids</span>
            <span>{activeSession?.uploaded || 2} uploaded</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BLOCK 3: Contextual Inspector / Selected Item Drawer          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="soft-raised"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          minHeight: '260px'
        }}
      >
        {selectedItem ? (
          /* Populated Selected Item Drawer */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            {/* Header with Type Badge and Dismiss Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(47, 101, 246, 0.1)',
                  color: '#2F65F6',
                  textTransform: 'uppercase'
                }}
              >
                {selectedItem.item_type || (selectedItem.formats ? 'Syllabus Topic' : 'Planned Video')}
              </span>
              <button
                onClick={onClearSelectedItem}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close Inspector"
              >
                <X size={15} />
              </button>
            </div>

            {/* Title */}
            <div>
              <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#1E293B', lineHeight: 1.35 }}>
                {selectedItem.title || selectedItem.name || 'Untitled Entry'}
              </h4>
              {(selectedItem.session_name || selectedItem.assigned_week) && (
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                  {selectedItem.session_name || 'Evergreen'} · {selectedItem.assigned_week || 'Backlog'}
                </span>
              )}
            </div>

            {/* Course & Subject Tags */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {selectedItem.lists?.map((l) => (
                <span
                  key={l.id}
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#E6EAF0',
                    color: '#475569'
                  }}
                >
                  {l.name}
                </span>
              ))}
              {selectedItem.course_name && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#E6EAF0',
                    color: '#475569'
                  }}
                >
                  {selectedItem.course_name}
                </span>
              )}
              {selectedItem.subject_name && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#E6EAF0',
                    color: '#475569'
                  }}
                >
                  {selectedItem.subject_name}
                </span>
              )}
            </div>

            {/* Status Segmented Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Status
              </span>
              <div
                className="soft-inset"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '3px',
                  borderRadius: '12px'
                }}
              >
                {['Planned', 'In Progress', 'Uploaded'].map((st) => {
                  const isActive = localStatus === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusToggle(st)}
                      style={{
                        padding: '6px 4px',
                        border: 'none',
                        borderRadius: '9px',
                        fontSize: '10.5px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isActive ? '#2F65F6' : 'transparent',
                        color: isActive ? '#FFFFFF' : '#64748B',
                        boxShadow: isActive ? '0 2px 6px rgba(47, 101, 246, 0.35)' : 'none'
                      }}
                    >
                      {st === 'In Progress' ? 'In Progress' : st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video URL Link */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                YouTube Link
              </span>
              {selectedItem.linked_video_id ? (
                <a
                  href={`https://www.youtube.com/watch?v=${selectedItem.linked_video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="soft-inset"
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    gap: '6px'
                  }}
                  title={selectedItem.linked_video_title || 'View video on YouTube'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <CheckCircle2 size={13} color="#0D9488" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedItem.linked_video_title || `Video ${selectedItem.linked_video_id}`}
                    </span>
                  </div>
                  <ExternalLink size={12} color="#64748B" style={{ flexShrink: 0 }} />
                </a>
              ) : (
                <button
                  onClick={() => onOpenLinkModal && onOpenLinkModal(selectedItem)}
                  className="soft-inset"
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#2F65F6',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  <Link2 size={12} />
                  <span>+ Link YouTube Video</span>
                </button>
              )}
            </div>

            {/* Notes / Strategy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Production Notes
              </span>
              <div
                className="soft-inset"
                style={{
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: selectedItem.notes ? '#334155' : '#94A3B8',
                  fontStyle: selectedItem.notes ? 'normal' : 'italic',
                  lineHeight: 1.4,
                  flex: 1,
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}
              >
                {selectedItem.notes || selectedItem.hook || 'No notes added for this item.'}
              </div>
            </div>
          </div>
        ) : (
          /* Clean Empty State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '10px',
              padding: '24px 12px',
              height: '100%',
              color: '#64748B'
            }}
          >
            <div
              className="soft-inset"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B'
              }}
            >
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                Contextual Inspector
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.45, color: '#64748B', maxWidth: '220px', margin: '0 auto' }}>
                Click any row in Upload Planner or Syllabus Matcher to inspect metadata, tags, and quick-action toggles.
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
