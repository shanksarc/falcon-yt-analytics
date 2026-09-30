import React, { useState, useEffect } from 'react';
import {
  PlaySquare,
  Eye,
  Clock,
  ThumbsUp,
  MessageSquare,
  AlertTriangle,
  X,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Link2,
  FileText,
  Tag,
  Check,
  Flame,
  ArrowUpRight,
  ExternalLink,
  Calendar,
  BookOpen,
  Zap,
  BarChart3,
  Users2,
  AlertCircle,
  LayoutDashboard,
  CalendarDays
} from 'lucide-react';
import { getVideoTrackInfo } from './FullVideoListView';
import { getLocalPlannedVideos, mergePlannedVideos } from '../utils/plannerStorage';

function formatCompactNum(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

/**
 * RightSidebarDock - Static & Page-Contextual Split Architecture
 */
export default function RightSidebarDock({
  activeTab = 'planner',
  status,
  selectedItem,
  onClearSelectedItem,
  onUpdateItemStatus,
  onSelectItem,
  onOpenLinkModal
}) {
  const [youtubeStats, setYoutubeStats] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [plannedVideos, setPlannedVideos] = useState([]);
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

  // Fetch YouTube Impact stats & Planned videos for the static area
  useEffect(() => {
    fetchYouTubeImpact();
    fetchPlannedVideos();
  }, [status?.last_youtube_sync, selectedItem?.status, selectedItem?.is_urgent]);

  useEffect(() => {
    const handlePlannerEvent = () => {
      const localVideos = getLocalPlannedVideos();
      setPlannedVideos(prev => mergePlannedVideos(prev, localVideos));
      fetchYouTubeImpact();
    };
    window.addEventListener('falcon_planner_updated', handlePlannerEvent);
    return () => window.removeEventListener('falcon_planner_updated', handlePlannerEvent);
  }, []);

  const fetchYouTubeImpact = async () => {
    try {
      const res = await fetch('/api/planner/progress-analytics');
      if (res.ok) {
        const data = await res.json();
        if (data.youtube_stats) {
          setYoutubeStats(data.youtube_stats);
        }
        if (data.uploaded !== undefined) {
          setUploadedCount(data.uploaded);
        }
      }
    } catch (err) {
      console.debug('Failed to fetch YouTube impact for right dock:', err);
    }
  };

  const fetchPlannedVideos = async () => {
    try {
      const res = await fetch('/api/planner/videos?status=ALL');
      if (res.ok) {
        const data = await res.json();
        const serverList = Array.isArray(data) ? data : [];
        const localList = getLocalPlannedVideos();
        setPlannedVideos(mergePlannedVideos(serverList, localList));
      }
    } catch (err) {
      console.debug('Failed to fetch planned videos for right dock:', err);
      const localList = getLocalPlannedVideos();
      if (localList.length > 0) setPlannedVideos(localList);
    }
  };

  // Toggle Urgent status for any planned video (Fix 2)
  const handleToggleUrgent = async (video) => {
    if (!video || !video.id) return;
    const currentUrgent = Boolean(video.is_urgent);
    const newUrgentVal = currentUrgent ? 0 : 1;

    // Optimistically update plannedVideos list
    setPlannedVideos(prev =>
      prev.map(v => (v.id === video.id ? { ...v, is_urgent: newUrgentVal } : v))
    );

    // If currently selected in inspector, update selected item
    if (selectedItem && selectedItem.id === video.id && onSelectItem) {
      onSelectItem({ ...selectedItem, is_urgent: newUrgentVal });
    }

    try {
      await fetch(`/api/planner/videos/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_urgent: newUrgentVal })
      });
    } catch (err) {
      console.error('Failed to toggle urgent:', err);
      // Revert on error
      fetchPlannedVideos();
    }
  };

  // Handle status toggle in Dynamic Inspector
  const handleStatusToggle = async (newStatus) => {
    if (!selectedItem || !selectedItem.id || isUpdatingStatus) return;
    setLocalStatus(newStatus);
    setIsUpdatingStatus(true);
    try {
      if (onUpdateItemStatus) {
        await onUpdateItemStatus(selectedItem, newStatus);
      } else {
        await fetch(`/api/planner/videos/${selectedItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }
      fetchPlannedVideos();
    } catch (err) {
      console.error('Failed to update status from inspector:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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

  // Urgent videos (Fix 1 & 2)
  const urgentVideos = plannedVideos.filter(v => Boolean(v.is_urgent) && v.status !== 'Uploaded');

  // Upcoming week planned videos (up to 4 non-urgent videos)
  const upcomingWeekVideos = plannedVideos
    .filter(v => v.status !== 'Uploaded' && !v.is_urgent)
    .slice(0, 4);

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
        overflow: 'hidden',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 (STATIC PART): YouTube Impact + Planned Videos Queue */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        id="right-dock-static-section"
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderBottom: '1px solid rgba(166, 175, 195, 0.35)',
          flexShrink: 0,
          background: 'rgba(235, 238, 242, 0.95)',
          maxHeight: '62vh',
          overflowY: 'auto'
        }}
      >
        {/* Header & Channel Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'rgba(255, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PlaySquare size={14} color="#FF0000" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.01em' }}>
              YouTube Impact
            </span>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              background: status?.has_api_key ? 'rgba(13, 148, 136, 0.12)' : 'rgba(234, 88, 12, 0.12)',
              color: status?.has_api_key ? '#0D9488' : '#EA580C'
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: status?.has_api_key ? '#0D9488' : '#EA580C'
              }}
            />
            {status?.demo_mode ? 'Demo Mode' : (status?.has_api_key ? 'Live Channel' : 'Offline')}
          </span>
        </div>

        {/* 1. YouTube Impact Card */}
        <div
          className="soft-raised"
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            borderRadius: '16px',
            background: '#F0F3F7',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)'
          }}
        >
          {/* Subtitle & Upload count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
              Uploaded Planned Videos
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '6px',
                background: '#E6EAF0',
                color: '#475569',
                fontWeight: 700
              }}
            >
              {youtubeStats?.uploaded_count || uploadedCount} uploaded
            </span>
          </div>

          {/* 2x2 Impact Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Views */}
            <div
              className="soft-inset"
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                background: '#E6EAF0',
                boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                <Eye size={11} color="#2F65F6" />
                <span>Views</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#2F65F6', lineHeight: 1, marginTop: '4px' }}>
                {formatCompactNum(youtubeStats?.total_views || 0)}
              </div>
            </div>

            {/* Watch Time */}
            <div
              className="soft-inset"
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                background: '#E6EAF0',
                boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                <Clock size={11} color="#10B981" />
                <span>Watch Time</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#10B981', lineHeight: 1, marginTop: '4px' }}>
                {formatCompactNum(youtubeStats?.total_watch_time_hours || 0)}h
              </div>
            </div>

            {/* Likes */}
            <div
              className="soft-inset"
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                background: '#E6EAF0',
                boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                <ThumbsUp size={11} color="#F59E0B" />
                <span>Likes</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', lineHeight: 1, marginTop: '4px' }}>
                {formatCompactNum(youtubeStats?.total_likes || 0)}
              </div>
            </div>

            {/* Comments */}
            <div
              className="soft-inset"
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                background: '#E6EAF0',
                boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                <MessageSquare size={11} color="#8B5CF6" />
                <span>Comments</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', lineHeight: 1, marginTop: '4px' }}>
                {(youtubeStats?.total_comments || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Top Video Snippet (if available) */}
          {youtubeStats?.top_videos?.length > 0 && (
            <div
              style={{
                fontSize: '10.5px',
                color: '#64748B',
                borderTop: '1px solid rgba(166, 175, 195, 0.3)',
                paddingTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                Top: <strong style={{ color: '#1E293B' }}>{youtubeStats.top_videos[0].title}</strong>
              </span>
              <span style={{ color: '#2F65F6', fontWeight: 700, flexShrink: 0 }}>
                {youtubeStats.top_videos[0].views.toLocaleString()} v
              </span>
            </div>
          )}

          {/* Unlinked Notice */}
          {uploadedCount > (youtubeStats?.uploaded_count || 0) && (
            <div
              style={{
                padding: '6px 8px',
                background: 'rgba(234, 88, 12, 0.1)',
                border: '1px solid rgba(234, 88, 12, 0.25)',
                borderRadius: '8px',
                fontSize: '10px',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <AlertTriangle size={12} style={{ flexShrink: 0 }} />
              <span>
                {uploadedCount - (youtubeStats?.uploaded_count || 0)} uploads awaiting YouTube confirmation
              </span>
            </div>
          )}
        </div>

        {/* 2. Static Card: Planned Videos (Fix 1: Urgent Priority + Upcoming Week 4 Videos) */}
        <div
          className="soft-raised"
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            borderRadius: '16px',
            background: '#F0F3F7',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  background: 'rgba(234, 88, 12, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Flame size={13} color="#EA580C" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.01em' }}>
                Planned Queue
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {urgentVideos.length > 0 && (
                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background: 'rgba(234, 88, 12, 0.15)',
                    color: '#EA580C',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Flame size={10} fill="#EA580C" /> {urgentVideos.length} Urgent
                </span>
              )}
              <span
                style={{
                  fontSize: '9.5px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: '#E6EAF0',
                  color: '#64748B',
                  fontWeight: 600
                }}
              >
                {plannedVideos.filter(v => v.status !== 'Uploaded').length} queue
              </span>
            </div>
          </div>

          {/* Sub-Section A: Urgent Videos (Fix 1 & Fix 2) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#EA580C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={11} fill="#EA580C" /> Urgent Priority
              </span>
            </div>

            {urgentVideos.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {urgentVideos.map((v) => {
                  const isSelected = selectedItem?.id === v.id;
                  const track = getVideoTrackInfo(v);
                  return (
                    <div
                      key={v.id}
                      onClick={() => onSelectItem && onSelectItem(v)}
                      className="soft-inset"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '9px',
                        background: isSelected ? 'rgba(234, 88, 12, 0.12)' : '#E6EAF0',
                        border: isSelected ? '1px solid rgba(234, 88, 12, 0.4)' : 'none',
                        borderLeft: track.isCFA ? '3px solid #16A34A' : (track.isFRM ? '3px solid #2563EB' : 'none'),
                        boxShadow: 'inset 1.5px 1.5px 3px rgba(166, 175, 195, 0.45), inset -1.5px -1.5px 3px rgba(255, 255, 255, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Urgency Toggle Button (Fix 2) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleUrgent(v);
                        }}
                        title="Urgent Priority (Click to unmark)"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#EA580C',
                          flexShrink: 0
                        }}
                      >
                        <Flame size={14} fill="#EA580C" color="#EA580C" />
                      </button>

                      {/* Video Title & Meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.title}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <span>{v.assigned_week || v.session_name || 'Immediate'}</span>
                          {track.levelCode && (
                            <span style={{
                              background: track.isCFA ? '#DCFCE7' : (track.isFRM ? '#DBEAFE' : '#F1F5F9'),
                              color: track.isCFA ? '#15803D' : (track.isFRM ? '#1D4ED8' : '#475569'),
                              padding: '0.5px 4px',
                              borderRadius: '3px',
                              fontWeight: 800,
                              fontSize: '8px'
                            }} title={track.courseFullName || (track.isCFA ? `CFA Level ${track.levelCode}` : `FRM Part ${track.levelCode}`)}>
                              {track.levelCode}
                            </span>
                          )}
                          {track.subjectCode && (
                            <span style={{
                              background: track.isCFA ? '#F0FDF4' : (track.isFRM ? '#EFF6FF' : '#F8FAFC'),
                              color: track.isCFA ? '#166534' : (track.isFRM ? '#1E40AF' : '#64748B'),
                              padding: '0.5px 4px',
                              borderRadius: '3px',
                              fontWeight: 700,
                              fontSize: '8px'
                            }} title={track.subjectFullName}>
                              {track.subjectCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Pill (only show non-planned status, e.g. Scheduled) */}
                      {v.status && v.status !== 'Planned' && (
                        <span
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: v.status === 'Scheduled' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 88, 12, 0.15)',
                            color: v.status === 'Scheduled' ? '#2563EB' : '#EA580C',
                            flexShrink: 0
                          }}
                        >
                          {v.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: '#94A3B8', padding: '6px 8px', background: '#E6EAF0', borderRadius: '8px', textAlign: 'center' }}>
                No urgent videos. Click 🔥 on any video to prioritize.
              </div>
            )}
          </div>

          {/* Sub-Section B: Planned for Upcoming Week (4 Videos) (Fix 1) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} color="#64748B" /> Upcoming Week ({upcomingWeekVideos.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {upcomingWeekVideos.length > 0 ? (
                upcomingWeekVideos.map((v) => {
                  const isSelected = selectedItem?.id === v.id;
                  const track = getVideoTrackInfo(v);
                  return (
                    <div
                      key={v.id}
                      onClick={() => onSelectItem && onSelectItem(v)}
                      className="soft-inset"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '9px',
                        background: isSelected ? 'rgba(47, 101, 246, 0.1)' : '#E6EAF0',
                        border: isSelected ? '1px solid rgba(47, 101, 246, 0.3)' : 'none',
                        borderLeft: track.isCFA ? '3px solid #16A34A' : (track.isFRM ? '3px solid #2563EB' : 'none'),
                        boxShadow: 'inset 1.5px 1.5px 3px rgba(166, 175, 195, 0.45), inset -1.5px -1.5px 3px rgba(255, 255, 255, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Urgency Toggle Button (Fix 2) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleUrgent(v);
                        }}
                        title="Click to mark as Urgent"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8',
                          flexShrink: 0
                        }}
                      >
                        <Flame size={14} color="#94A3B8" />
                      </button>

                      {/* Video Title & Meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.title}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <span>{v.assigned_week || 'Upcoming'}</span>
                          {track.levelCode && (
                            <span style={{
                              background: track.isCFA ? '#DCFCE7' : (track.isFRM ? '#DBEAFE' : '#F1F5F9'),
                              color: track.isCFA ? '#15803D' : (track.isFRM ? '#1D4ED8' : '#475569'),
                              padding: '0.5px 4px',
                              borderRadius: '3px',
                              fontWeight: 800,
                              fontSize: '8px'
                            }} title={track.courseFullName || (track.isCFA ? `CFA Level ${track.levelCode}` : `FRM Part ${track.levelCode}`)}>
                              {track.levelCode}
                            </span>
                          )}
                          {track.subjectCode && (
                            <span style={{
                              background: track.isCFA ? '#F0FDF4' : (track.isFRM ? '#EFF6FF' : '#F8FAFC'),
                              color: track.isCFA ? '#166534' : (track.isFRM ? '#1E40AF' : '#64748B'),
                              padding: '0.5px 4px',
                              borderRadius: '3px',
                              fontWeight: 700,
                              fontSize: '8px'
                            }} title={track.subjectFullName}>
                              {track.subjectCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Pill (only show non-planned status, e.g. Scheduled) */}
                      {v.status && v.status !== 'Planned' && (
                        <span
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: v.status === 'Scheduled' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                            color: v.status === 'Scheduled' ? '#2563EB' : '#475569',
                            flexShrink: 0
                          }}
                        >
                          {v.status}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: '10px', color: '#94A3B8', padding: '6px 8px', background: '#E6EAF0', borderRadius: '8px', textAlign: 'center' }}>
                  No upcoming planned videos in queue.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channel Metadata Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', fontSize: '10.5px', color: '#64748B' }}>
          <span>{status?.channel_name || 'Falcon Edufin'} · {(status?.summary?.total_videos || 188).toLocaleString()} videos</span>
          <span>Synced {formatSyncTime(status?.last_youtube_sync)}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 (DYNAMIC AREA): Directly Below the Static Area        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        id="right-dock-dynamic-section"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box'
        }}
      >
        {/* Contextual Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {selectedItem ? (
              <>
                <FileText size={13} color="#2F65F6" />
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>
                  Item Inspector
                </span>
              </>
            ) : (
              <>
                {activeTab === 'syllabus' && <BookOpen size={13} color="#7C3AED" />}
                {activeTab === 'planner' && <CalendarDays size={13} color="#2F65F6" />}
                {activeTab === 'shorts' && <Zap size={13} color="#EA580C" />}
                {activeTab === 'manage' && <SlidersHorizontal size={13} color="#7C3AED" />}
                {activeTab === 'overview' && <LayoutDashboard size={13} color="#2F65F6" />}
                {activeTab === 'leaderboard' && <BarChart3 size={13} color="#10B981" />}
                {activeTab === 'low-ctr' && <AlertCircle size={13} color="#EF4444" />}
                {activeTab === 'competitors' && <Users2 size={13} color="#6366F1" />}
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>
                  {activeTab === 'syllabus' && 'Syllabus Matcher'}
                  {activeTab === 'planner' && 'Upload Planner'}
                  {activeTab === 'shorts' && 'Shorts Pipeline'}
                  {activeTab === 'manage' && 'Plan Management'}
                  {activeTab === 'overview' && 'Channel Overview'}
                  {activeTab === 'leaderboard' && 'Leaderboard'}
                  {activeTab === 'low-ctr' && 'CTR Triage'}
                  {activeTab === 'competitors' && 'Competitor Intel'}
                </span>
              </>
            )}
          </div>
          {selectedItem && (
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
                alignItems: 'center'
              }}
              title="Close item inspector"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {selectedItem ? (
          /* Populated Contextual Item Inspector */
          <div
            className="soft-raised"
            style={{
              padding: '14px',
              borderRadius: '16px',
              background: '#F0F3F7',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Header Badge & Urgent Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '9.5px',
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

              {/* Urgency Toggle Button in Inspector */}
              <button
                type="button"
                onClick={() => handleToggleUrgent(selectedItem)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: selectedItem.is_urgent ? 'rgba(234, 88, 12, 0.15)' : '#E6EAF0',
                  color: selectedItem.is_urgent ? '#EA580C' : '#64748B',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: 700,
                  transition: 'all 0.15s ease'
                }}
                title={selectedItem.is_urgent ? "Marked as Urgent priority (Click to unmark)" : "Click to mark as Urgent"}
              >
                <Flame size={12} fill={selectedItem.is_urgent ? "#EA580C" : "none"} color={selectedItem.is_urgent ? "#EA580C" : "#64748B"} />
                <span>{selectedItem.is_urgent ? 'Urgent' : 'Mark Urgent'}</span>
              </button>
            </div>

            {/* Title */}
            <div>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B', lineHeight: 1.35 }}>
                {selectedItem.title || selectedItem.name || 'Untitled Entry'}
              </h4>
              {(selectedItem.session_name || selectedItem.assigned_week) && (
                <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                  {selectedItem.session_name || 'Evergreen'} · {selectedItem.assigned_week || 'Backlog'}
                </span>
              )}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {selectedItem.course_name && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
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
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Status
              </span>
              <div
                className="soft-inset"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '3px',
                  padding: '3px',
                  borderRadius: '10px',
                  background: '#E6EAF0'
                }}
              >
                {['Planned', 'Scheduled', 'Uploaded', 'Review'].map((st) => {
                  const isActive = (localStatus || '').toLowerCase() === st.toLowerCase();
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusToggle(st)}
                      disabled={isUpdatingStatus}
                      style={{
                        padding: '5px 2px',
                        fontSize: '9.5px',
                        fontWeight: isActive ? 700 : 500,
                        borderRadius: '7px',
                        border: 'none',
                        background: isActive ? '#2F65F6' : 'transparent',
                        color: isActive ? '#FFFFFF' : '#64748B',
                        cursor: isUpdatingStatus ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* YouTube Link */}
            {selectedItem.youtube_url ? (
              <a
                href={selectedItem.youtube_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2F65F6',
                  textDecoration: 'none',
                  padding: '6px 10px',
                  background: 'rgba(47, 101, 246, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(47, 101, 246, 0.2)'
                }}
              >
                <ExternalLink size={12} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Watch on YouTube
                </span>
              </a>
            ) : (
              <button
                onClick={() => onOpenLinkModal && onOpenLinkModal(selectedItem)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  padding: '6px 10px',
                  background: '#E6EAF0',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Link2 size={12} />
                <span>Link to YouTube Video</span>
              </button>
            )}
          </div>
        ) : (
          /* Page-Specific Contextual Card (Fix 1) */
          <div
            className="soft-raised"
            style={{
              padding: '14px',
              borderRadius: '16px',
              background: '#F0F3F7',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {activeTab === 'syllabus' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>Curriculum Coverage</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', background: 'rgba(124, 58, 237, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    Matrix Mode
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Formats</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }}>4 Types</div>
                  </div>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Coverage</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>Active</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35, borderTop: '1px solid rgba(166, 175, 195, 0.25)', paddingTop: '8px' }}>
                  Click any reading cell in the matrix to view linked YouTube videos or plan missing formats.
                </div>
              </>
            )}

            {activeTab === 'planner' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>Upload Milestones</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#2F65F6', background: 'rgba(47, 101, 246, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    Pacing OK
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Cadence</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#2F65F6', marginTop: '2px' }}>Weekly</div>
                  </div>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Target Mode</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>Exam Run</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35, borderTop: '1px solid rgba(166, 175, 195, 0.25)', paddingTop: '8px' }}>
                  Click any planned video in Full Video List or Weekly Schedule to inspect details or assign YouTube links.
                </div>
              </>
            )}

            {activeTab === 'shorts' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>Shorts Pipeline</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#EA580C', background: 'rgba(234, 88, 12, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    60s Bites
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Focus</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#EA580C', marginTop: '2px' }}>TI BA II+</div>
                  </div>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Series</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#475569', marginTop: '2px' }}>Hacks</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35, borderTop: '1px solid rgba(166, 175, 195, 0.25)', paddingTop: '8px' }}>
                  Vertical shorts under 60 seconds with formula and calculator hacks drive top subscriber discovery.
                </div>
              </>
            )}

            {activeTab === 'manage' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>Curriculum Setup</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', background: 'rgba(124, 58, 237, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    Structure
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Tracks</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }}>CFA & FRM</div>
                  </div>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Windows</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>Active</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35, borderTop: '1px solid rgba(166, 175, 195, 0.25)', paddingTop: '8px' }}>
                  Configure course subjects, set exam session targets, and reconcile automatic video matches.
                </div>
              </>
            )}

            {activeTab === 'overview' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>Channel Health</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    Healthy
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Retention</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#2F65F6', marginTop: '2px' }}>Strong</div>
                  </div>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>YoY Trend</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>Positive</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35, borderTop: '1px solid rgba(166, 175, 195, 0.25)', paddingTop: '8px' }}>
                  Click any course performance block in the overview to drill into subject-level telemetry.
                </div>
              </>
            )}

            {activeTab === 'low-ctr' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>CTR Interventions</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    Action Required
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Threshold</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>&lt; 4.0%</div>
                  </div>
                  <div className="soft-inset" style={{ padding: '8px 10px', borderRadius: '10px', background: '#E6EAF0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Goal</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>&gt; 6.0%</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35, borderTop: '1px solid rgba(166, 175, 195, 0.25)', paddingTop: '8px' }}>
                  Audit thumbnails and titles for videos below the 4% CTR benchmark to recover view velocity.
                </div>
              </>
            )}

            {activeTab === 'leaderboard' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>Rankings</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    Monthly
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35 }}>
                  Videos ranked by current calendar month watch time, views, and viewer acquisition.
                </div>
              </>
            )}

            {activeTab === 'competitors' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>Benchmark</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#6366F1', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 7px', borderRadius: '9999px' }}>
                    Tracked
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.35 }}>
                  Comparative growth and upload pace relative to finance education peer channels.
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
