import React, { useState, useEffect, useMemo } from 'react';
import {
  PlaySquare,
  Eye,
  Clock,
  ThumbsUp,
  ThumbsDown,
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
  CalendarDays,
  Trash2,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Film,
  Percent,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { getLocalPlannedVideos, mergePlannedVideos, removeLocalPlannedVideo } from '../utils/plannerStorage';

function formatCompactNum(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function getPublishYear(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/\b(20\d\d|19\d\d)\b/);
  return match ? match[1] : (dateStr.length >= 4 ? dateStr.substring(0, 4) : null);
}

function formatSyncTime(timestamp) {
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
}

export default function RightSidebarDock({
  activeTab = 'planner',
  status,
  selectedItem,
  onClearSelectedItem,
  onUpdateItemStatus,
  onSelectItem,
  onOpenLinkModal,
  onDeleteItem,
  onLogChangeForVideo,
  onEditCategoryForVideo,
  onEditListsForVideo,
  onNavigateTab,
  onSyncChannel,
  isSyncing = false,
  isOpen = false,
  onClose
}) {
  // Navigation within the non-selected dock view: 'radar' | 'pulse'
  const [hubTab, setHubTab] = useState('radar');

  const [youtubeStats, setYoutubeStats] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [plannedVideos, setPlannedVideos] = useState([]);
  const [lowCtrVideos, setLowCtrVideos] = useState([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);

  // Sync local status when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      setLocalStatus(selectedItem.status || (selectedItem.privacy_status === 'public' ? 'Published' : 'Planned'));
    } else {
      setLocalStatus(null);
    }
  }, [selectedItem]);

  // Fetch initial data
  useEffect(() => {
    fetchYouTubeImpact();
    fetchPlannedVideos();
    fetchLowCTRAlerts();
  }, [status?.last_youtube_sync, selectedItem?.status, selectedItem?.is_urgent]);

  // Listen to planner updates
  useEffect(() => {
    const handlePlannerEvent = () => {
      const localVideos = getLocalPlannedVideos();
      setPlannedVideos(prev => mergePlannedVideos(prev, localVideos));
      fetchYouTubeImpact();
      fetchLowCTRAlerts();
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

  const fetchLowCTRAlerts = async () => {
    try {
      const res = await fetch('/api/low-ctr');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLowCtrVideos(data.slice(0, 4));
        }
      }
    } catch (err) {
      console.debug('Failed to fetch low CTR for right dock:', err);
    }
  };

  // Toggle Urgent status for any planned video
  const handleToggleUrgent = async (video) => {
    if (!video || !video.id) return;
    const currentUrgent = Boolean(video.is_urgent);
    const newUrgentVal = currentUrgent ? 0 : 1;

    setPlannedVideos(prev =>
      prev.map(v => (v.id === video.id ? { ...v, is_urgent: newUrgentVal } : v))
    );

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
      fetchYouTubeImpact();
    } catch (err) {
      console.error('Failed to update status from inspector:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem || !selectedItem.id || isDeletingItem) return;
    const title = selectedItem.title || selectedItem.name || 'this entry';
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    setIsDeletingItem(true);
    try {
      if (onDeleteItem) {
        await onDeleteItem(selectedItem);
      } else {
        const res = await fetch(`/api/planner/videos/${selectedItem.id}`, { method: 'DELETE' });
        if (res.ok) {
          removeLocalPlannedVideo(selectedItem.id);
          if (onClearSelectedItem) onClearSelectedItem();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to delete: ${err.detail || 'Server error'}`);
        }
      }
      fetchPlannedVideos();
    } catch (err) {
      console.error('Delete item error:', err);
      alert('Failed to delete: ' + err.message);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Filter urgent & upcoming
  const urgentVideos = useMemo(() => {
    return plannedVideos.filter(v => Boolean(v.is_urgent) && v.status !== 'Uploaded');
  }, [plannedVideos]);

  const upcomingWeekVideos = useMemo(() => {
    return plannedVideos.filter(v => v.status !== 'Uploaded' && !v.is_urgent).slice(0, 4);
  }, [plannedVideos]);

  // Derived item details if selectedItem is present
  const itemMeta = useMemo(() => {
    if (!selectedItem) return null;
    const title = selectedItem.title || selectedItem.name || selectedItem.topic_name || 'Untitled Video';
    const course = selectedItem.course_name || selectedItem.course || selectedItem.course_code || null;
    const subject = selectedItem.subject_name || selectedItem.subject || selectedItem.topic || null;
    const isShort = Boolean(selectedItem.content_type === 'short' || selectedItem.is_short || selectedItem.format?.toLowerCase()?.includes('short'));
    const isPlanned = Boolean(selectedItem.status && ['planned', 'scheduled', 'uploaded', 'in progress', 'review'].includes(selectedItem.status.toLowerCase()));
    
    // Determine YouTube URL
    let youtubeUrl = selectedItem.youtube_url || null;
    if (!youtubeUrl && selectedItem.youtube_video_id) {
      youtubeUrl = `https://www.youtube.com/watch?v=${selectedItem.youtube_video_id}`;
    } else if (!youtubeUrl && selectedItem.id && !selectedItem.id.startsWith('pv_') && !selectedItem.id.startsWith('topic_') && !selectedItem.id.startsWith('list_')) {
      youtubeUrl = `https://www.youtube.com/watch?v=${selectedItem.id}`;
    }

    const views = selectedItem.views !== undefined ? selectedItem.views : null;
    const watchHours = selectedItem.watch_time_hours !== undefined ? selectedItem.watch_time_hours : (selectedItem.watch_time || null);
    const ctr = selectedItem.ctr !== undefined ? Number(selectedItem.ctr) : null;
    const likes = selectedItem.likes !== undefined ? selectedItem.likes : null;
    const dislikes = selectedItem.dislikes !== undefined ? selectedItem.dislikes : null;
    const comments = selectedItem.comments_count !== undefined ? selectedItem.comments_count : (selectedItem.comments || null);
    const publishYear = getPublishYear(selectedItem.published_at || selectedItem.publish_date || selectedItem.created_at);

    // Calculate like ratio
    let likeRatio = null;
    if (likes !== null && likes > 0) {
      const totalVotes = likes + (dislikes || 0);
      likeRatio = totalVotes > 0 ? Math.round((likes / totalVotes) * 100) : 100;
    }

    return {
      title,
      course,
      subject,
      isShort,
      isPlanned,
      youtubeUrl,
      views,
      watchHours,
      ctr,
      likes,
      dislikes,
      likeRatio,
      comments,
      publishYear,
      isUrgent: Boolean(selectedItem.is_urgent),
      isFlaggedCTR: Boolean((ctr !== null && ctr < 4.0) || selectedItem.is_flagged)
    };
  }, [selectedItem]);

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          id="right-dock-backdrop"
          className="xl:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 75
          }}
        />
      )}

      <aside
        id="right-sidebar-dock"
        className={`right-sidebar-dock-responsive ${isOpen ? 'open' : ''}`}
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CASE A: DEDICATED ITEM INSPECTOR (Active when item is selected)  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {selectedItem && itemMeta ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* 1. Header with Breadcrumb Back & Urgent Action */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={onClearSelectedItem}
                  id="btn-inspector-back-radar"
                  title="Return to Channel Radar"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Radar</span>
                </button>

                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: itemMeta.isPlanned ? 'rgba(47, 101, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: itemMeta.isPlanned ? '#2563EB' : '#059669'
                  }}
                >
                  {itemMeta.isShort ? 'Short' : (itemMeta.isPlanned ? 'Planned' : 'Live Video')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Urgent Toggle Button */}
                {selectedItem.id && (
                  <button
                    type="button"
                    onClick={() => handleToggleUrgent(selectedItem)}
                    id="btn-inspector-toggle-urgent"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 9px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: itemMeta.isUrgent ? 'rgba(234, 88, 12, 0.15)' : '#F1F5F9',
                      color: itemMeta.isUrgent ? '#EA580C' : '#64748B',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      transition: 'all 0.15s ease'
                    }}
                    title={itemMeta.isUrgent ? "Urgent Priority Active (Click to remove)" : "Click to prioritize as Urgent"}
                  >
                    <Flame size={13} fill={itemMeta.isUrgent ? "#EA580C" : "none"} color={itemMeta.isUrgent ? "#EA580C" : "#64748B"} />
                    <span>{itemMeta.isUrgent ? 'Urgent' : 'Prioritize'}</span>
                  </button>
                )}

                {/* Close Drawer Button */}
                <button
                  onClick={() => {
                    if (onClearSelectedItem) onClearSelectedItem();
                    if (onClose) onClose();
                  }}
                  id="btn-inspector-close"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Close Inspector"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* 2. Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Title & Metadata Header */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.45 }}>
                  {itemMeta.title}
                </h3>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {itemMeta.course && (
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#1E40AF', background: '#DBEAFE', padding: '2px 8px', borderRadius: '6px' }}>
                      {itemMeta.course}
                    </span>
                  )}
                  {itemMeta.subject && (
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', background: '#E2E8F0', padding: '2px 8px', borderRadius: '6px' }}>
                      {itemMeta.subject}
                    </span>
                  )}
                  {itemMeta.publishYear && (
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#059669', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={11} /> {itemMeta.publishYear}
                    </span>
                  )}
                </div>

                {(selectedItem.session_name || selectedItem.assigned_week) && (
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarDays size={13} color="#94A3B8" />
                    <span>{selectedItem.session_name || 'Standard Session'}</span>
                    <span>·</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{selectedItem.assigned_week || 'Backlog'}</span>
                  </div>
                )}
              </div>

              {/* Status Stepper Workflow (if Planned) */}
              {itemMeta.isPlanned && (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Production Workflow
                    </span>
                    {localStatus === 'Uploaded' && (
                      <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Live on YouTube
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '9px' }}>
                    {['Planned', 'Scheduled', 'Uploaded', 'Review'].map((st) => {
                      const isActive = (localStatus || '').toLowerCase() === st.toLowerCase();
                      return (
                        <button
                          key={st}
                          onClick={() => handleStatusToggle(st)}
                          disabled={isUpdatingStatus}
                          style={{
                            padding: '6px 2px',
                            fontSize: '10px',
                            fontWeight: isActive ? 700 : 500,
                            borderRadius: '6px',
                            border: 'none',
                            background: isActive ? '#2563EB' : 'transparent',
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
              )}

              {/* Low CTR Intervention Alert Banner */}
              {itemMeta.isFlaggedCTR && (
                <div
                  style={{
                    background: '#FFF1F2',
                    border: '1px solid #FECDD3',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E11D48', fontWeight: 700, fontSize: '12px' }}>
                    <AlertTriangle size={15} />
                    <span>Low CTR Alert ({itemMeta.ctr ? `${itemMeta.ctr.toFixed(1)}%` : '< 4.0%'})</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#9F1239', lineHeight: 1.4 }}>
                    This video is underperforming against the 4.0% benchmark. Improving the thumbnail contrast and title urgency can significantly recover impression velocity.
                  </p>
                  {onLogChangeForVideo && (
                    <button
                      onClick={() => onLogChangeForVideo(selectedItem)}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '6px 12px',
                        background: '#E11D48',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Sparkles size={12} />
                      <span>Log Strategy Optimization</span>
                    </button>
                  )}
                </div>
              )}

              {/* Telemetry Snapshot Cards */}
              {(itemMeta.views !== null || itemMeta.watchHours !== null || itemMeta.ctr !== null) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Performance Telemetry
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* Views */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <Eye size={12} color="#2563EB" /> Views
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: '#1D4ED8', marginTop: '6px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {formatCompactNum(itemMeta.views)}
                      </div>
                    </div>

                    {/* Watch Time */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <Clock size={12} color="#059669" /> Watch Time
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: '#047857', marginTop: '6px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {formatCompactNum(itemMeta.watchHours)}<span style={{ fontSize: '18px', fontWeight: 700 }}>h</span>
                      </div>
                    </div>

                    {/* CTR */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <Percent size={12} color={itemMeta.isFlaggedCTR ? "#E11D48" : "#2563EB"} /> CTR
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: itemMeta.isFlaggedCTR ? "#E11D48" : "#0F172A", marginTop: '6px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {itemMeta.ctr !== null ? `${itemMeta.ctr.toFixed(1)}%` : '—'}
                      </div>
                    </div>

                    {/* Like Ratio */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <ThumbsUp size={12} color="#D97706" /> Likes
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: '#B45309', marginTop: '6px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {formatCompactNum(itemMeta.likes)}
                        {itemMeta.likeRatio !== null && (
                          <span style={{ fontSize: '13px', color: '#059669', fontWeight: 800, marginLeft: '4px' }}>
                            ({itemMeta.likeRatio}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube Link Integration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  YouTube Link
                </span>

                {itemMeta.youtubeUrl ? (
                  <a
                    href={itemMeta.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#FFF1F2',
                      border: '1px solid #FFE4E6',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: '#E11D48',
                      fontWeight: 700,
                      fontSize: '12px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PlaySquare size={16} color="#FF0000" />
                      <span>Watch Video on YouTube</span>
                    </div>
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <button
                    onClick={() => onOpenLinkModal && onOpenLinkModal(selectedItem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      background: '#F1F5F9',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '10px',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Link2 size={14} />
                    <span>Link with YouTube Video</span>
                  </button>
                )}
              </div>

              {/* Contextual Action Utilities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Actions
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {onLogChangeForVideo && !itemMeta.isFlaggedCTR && (
                    <button
                      onClick={() => onLogChangeForVideo(selectedItem)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 12px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      <Sparkles size={13} color="#2563EB" />
                      <span>Log Strategy / Thumbnail Change</span>
                    </button>
                  )}

                  {onEditCategoryForVideo && (
                    <button
                      onClick={() => onEditCategoryForVideo(selectedItem)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 12px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      <Tag size={13} color="#059669" />
                      <span>Edit Course & Topic Classification</span>
                    </button>
                  )}

                  {onEditListsForVideo && (
                    <button
                      onClick={() => onEditListsForVideo(selectedItem)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 12px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      <Layers size={13} color="#7C3AED" />
                      <span>Manage Custom Video Lists</span>
                    </button>
                  )}

                  {/* Delete Planned Video */}
                  {itemMeta.isPlanned && selectedItem.id && (
                    <button
                      type="button"
                      onClick={handleDeleteItem}
                      disabled={isDeletingItem}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#E11D48',
                        cursor: isDeletingItem ? 'not-allowed' : 'pointer',
                        marginTop: '4px'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>{isDeletingItem ? 'Deleting...' : 'Delete Planned Video'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════ */
          /* CASE B: CHANNEL ACTION RADAR & INTEL HUB (When no item selected) */
          /* ═══════════════════════════════════════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* 1. Brand Header & Collapse */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}
                >
                  <Sparkles size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                    Channel Radar
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>
                    Falcon Intelligence Hub
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 700,
                    background: status?.has_api_key ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                    color: status?.has_api_key ? '#059669' : '#EA580C'
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: status?.has_api_key ? '#059669' : '#EA580C'
                    }}
                  />
                  {status?.has_api_key ? 'Live' : 'Demo'}
                </span>

                {/* Close Button */}
                {onClose && (
                  <button
                    onClick={onClose}
                    id="btn-radar-close-dock"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Collapse Panel"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Mode Segmented Switcher */}
            <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
                <button
                  onClick={() => setHubTab('radar')}
                  id="tab-radar-action"
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: hubTab === 'radar' ? 700 : 500,
                    background: hubTab === 'radar' ? '#FFFFFF' : 'transparent',
                    color: hubTab === 'radar' ? '#0F172A' : '#64748B',
                    boxShadow: hubTab === 'radar' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Flame size={12} color={hubTab === 'radar' ? '#EA580C' : '#64748B'} />
                  <span>Action Radar</span>
                  {urgentVideos.length > 0 && (
                    <span style={{ fontSize: '9px', padding: '0 5px', borderRadius: '9999px', background: '#EA580C', color: '#FFF', fontWeight: 800 }}>
                      {urgentVideos.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setHubTab('pulse')}
                  id="tab-radar-pulse"
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: hubTab === 'pulse' ? 700 : 500,
                    background: hubTab === 'pulse' ? '#FFFFFF' : 'transparent',
                    color: hubTab === 'pulse' ? '#0F172A' : '#64748B',
                    boxShadow: hubTab === 'pulse' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <BarChart3 size={12} color={hubTab === 'pulse' ? '#2563EB' : '#64748B'} />
                  <span>Channel Pulse</span>
                </button>
              </div>
            </div>

            {/* 3. Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ─── HERO UPLOAD IMPACT BLOCKS (BIG NUMBERS) ─── */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        background: '#FFF1F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <PlaySquare size={15} color="#E11D48" />
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                        Upload Plan Impact
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #DBEAFE'
                    }}
                  >
                    {youtubeStats?.uploaded_count || uploadedCount} Live Uploads
                  </span>
                </div>

                {/* 2x2 Big Metric Blocks */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Block 1: Views Generated */}
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '88px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Eye size={13} color="#2563EB" />
                      <span>Plan Views</span>
                    </div>
                    <div
                      style={{
                        fontSize: '30px',
                        fontWeight: 900,
                        color: '#1D4ED8',
                        lineHeight: 1.1,
                        marginTop: '6px',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.03em'
                      }}
                    >
                      {formatCompactNum(youtubeStats?.total_views || 0)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                      {youtubeStats?.uploaded_count || uploadedCount} videos live
                    </div>
                  </div>

                  {/* Block 2: Watch Hours */}
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '88px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Clock size={13} color="#059669" />
                      <span>Watch Time</span>
                    </div>
                    <div
                      style={{
                        fontSize: '30px',
                        fontWeight: 900,
                        color: '#047857',
                        lineHeight: 1.1,
                        marginTop: '6px',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.03em'
                      }}
                    >
                      {formatCompactNum(youtubeStats?.total_watch_time_hours || 0)}<span style={{ fontSize: '18px', fontWeight: 700 }}>h</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                      Total learner hours
                    </div>
                  </div>

                  {/* Block 3: Upload Velocity Ratio */}
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '88px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <CheckCircle2 size={13} color="#7C3AED" />
                      <span>Live Progress</span>
                    </div>
                    <div
                      style={{
                        fontSize: '30px',
                        fontWeight: 900,
                        color: '#6D28D9',
                        lineHeight: 1.1,
                        marginTop: '6px',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.03em'
                      }}
                    >
                      {youtubeStats?.uploaded_count || uploadedCount}
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#94A3B8', marginLeft: '3px' }}>
                        / {plannedVideos.length || 0}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                      {Math.max(0, (plannedVideos.length || 0) - (youtubeStats?.uploaded_count || uploadedCount))} left to upload
                    </div>
                  </div>

                  {/* Block 4: Total Likes */}
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '88px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <ThumbsUp size={13} color="#D97706" />
                      <span>Total Likes</span>
                    </div>
                    <div
                      style={{
                        fontSize: '30px',
                        fontWeight: 900,
                        color: '#B45309',
                        lineHeight: 1.1,
                        marginTop: '6px',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.03em'
                      }}
                    >
                      {formatCompactNum(youtubeStats?.total_likes || 0)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                      {(youtubeStats?.total_comments || 0).toLocaleString()} comments
                    </div>
                  </div>
                </div>

                {/* Top Upload Performer Snippet */}
                {youtubeStats?.top_videos?.length > 0 && (
                  <div
                    onClick={() => onSelectItem && onSelectItem(youtubeStats.top_videos[0])}
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      borderRadius: '9px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: '#1E40AF',
                      transition: 'all 0.15s ease'
                    }}
                    title="Click to inspect top performing upload"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Sparkles size={13} color="#2563EB" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Top Video: <strong>{youtubeStats.top_videos[0].title}</strong>
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#2563EB', flexShrink: 0 }}>
                      {formatCompactNum(youtubeStats.top_videos[0].views)} views
                    </span>
                  </div>
                )}
              </div>

              {hubTab === 'radar' ? (
                <>
                  {/* Section A: Urgent Pipeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Flame size={13} fill="#EA580C" /> Urgent Pipeline ({urgentVideos.length})
                      </span>
                    </div>

                    {urgentVideos.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {urgentVideos.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => onSelectItem && onSelectItem(v)}
                            style={{
                              background: '#FFF7ED',
                              border: '1px solid #FFEDD5',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#9A3412', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {v.title}
                                </div>
                                <div style={{ fontSize: '10px', color: '#C2410C', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{v.assigned_week || 'Immediate'}</span>
                                  {v.course_name && (
                                    <span style={{ background: '#FED7AA', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                      {v.course_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={14} color="#EA580C" style={{ flexShrink: 0, marginTop: '2px' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: '11px', color: '#64748B' }}>
                        No urgent videos pending. All exam milestone content is on schedule.
                      </div>
                    )}
                  </div>

                  {/* Section B: CTR Interventions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertTriangle size={13} /> CTR Triage Alerts
                      </span>
                      {onNavigateTab && (
                        <button
                          onClick={() => onNavigateTab('low-ctr')}
                          style={{ background: 'transparent', border: 'none', color: '#E11D48', fontSize: '10.5px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          View all →
                        </button>
                      )}
                    </div>

                    {lowCtrVideos.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {lowCtrVideos.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => onSelectItem && onSelectItem(v)}
                            style={{
                              background: '#FFF1F2',
                              border: '1px solid #FFE4E6',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#9F1239', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {v.title}
                              </div>
                              <div style={{ fontSize: '10px', color: '#E11D48', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                <span>{v.ctr ? `${v.ctr.toFixed(1)}% CTR` : '< 4% CTR'}</span>
                                {v.views && <span>· {formatCompactNum(v.views)} views</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#E11D48', color: '#FFF', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>
                              Inspect
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: '11px', color: '#64748B' }}>
                        All tracked videos meet or exceed CTR benchmarks.
                      </div>
                    )}
                  </div>

                  {/* Section C: Upcoming Week Queue */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} color="#64748B" /> Upcoming Week ({upcomingWeekVideos.length})
                      </span>
                    </div>

                    {upcomingWeekVideos.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {upcomingWeekVideos.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => onSelectItem && onSelectItem(v)}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {v.title}
                              </div>
                              <div style={{ fontSize: '9.5px', color: '#64748B', marginTop: '2px' }}>
                                {v.assigned_week || 'Upcoming'} · {v.course_name || 'Course'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleUrgent(v);
                              }}
                              title="Mark as Urgent"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8' }}
                            >
                              <Flame size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: '11px', color: '#64748B' }}>
                        No videos queued for the upcoming week.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Tab B: Channel Pulse */
                <>
                  {/* Channel Connection Box */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          {status?.channel_name || 'Falcon Edufin'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {(status?.summary?.total_videos || 188).toLocaleString()} published videos
                        </div>
                      </div>

                      {onSyncChannel && (
                        <button
                          onClick={onSyncChannel}
                          disabled={isSyncing}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: isSyncing ? 'wait' : 'pointer'
                          }}
                        >
                          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '10px', color: '#94A3B8', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                      Last synchronized {formatSyncTime(status?.last_youtube_sync)}
                    </div>
                  </div>

                  {/* Exam Target Countdowns */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active Exam Windows
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>CFA May Window</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '2px 6px', borderRadius: '9999px' }}>
                            On Track
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#15803D', marginTop: '4px' }}>
                          Lectures on pace · Formula revision prioritized
                        </div>
                      </div>

                      <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>FRM May Window</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB', background: '#DBEAFE', padding: '2px 6px', borderRadius: '9999px' }}>
                            Active Pacing
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#1D4ED8', marginTop: '4px' }}>
                          Target: 4 key readings before marathon session
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lifetime Channel Telemetry */}
                  {status?.summary && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Channel Lifetime Telemetry
                      </span>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Lifetime Views</div>
                          <div style={{ fontSize: '26px', fontWeight: 900, color: '#1D4ED8', marginTop: '4px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                            {formatCompactNum(status.summary.total_views)}
                          </div>
                        </div>

                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Watch Time</div>
                          <div style={{ fontSize: '26px', fontWeight: 900, color: '#047857', marginTop: '4px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                            {formatCompactNum(status.summary.total_watch_time)}h
                          </div>
                        </div>

                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Subscribers</div>
                          <div style={{ fontSize: '26px', fontWeight: 900, color: '#7C3AED', marginTop: '4px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                            {formatCompactNum(status.summary.total_subscribers)}
                          </div>
                        </div>

                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Avg CTR</div>
                          <div style={{ fontSize: '26px', fontWeight: 900, color: '#D97706', marginTop: '4px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                            {status.summary.avg_ctr ? `${status.summary.avg_ctr.toFixed(1)}%` : '5.2%'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
