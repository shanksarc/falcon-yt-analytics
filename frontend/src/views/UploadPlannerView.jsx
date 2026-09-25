import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Plus, Target, CheckCircle2, Clock, AlertCircle, AlertTriangle,
  ChevronRight, ArrowLeft, RefreshCw, Check, X, Link, Layers, Edit3, Trash2,
  UploadCloud, BarChart2, BarChart3, List, ListVideo, Settings, Sliders,
  SlidersHorizontal, BookOpen, Search, Zap, Bell, Sparkles, PlaySquare, Eye,
  ArrowRight, Link2, ChevronDown, ChevronUp, Info, Video, MoreHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import CreateSessionModal from '../components/CreateSessionModal';
import CourseModal from '../components/CourseModal';
import SubjectModal from '../components/SubjectModal';
import PlannedVideoModal from '../components/PlannedVideoModal';
import BulkImportModal from '../components/BulkImportModal';
import TargetManagementModal from '../components/TargetManagementModal';
import WeeklyScheduleBoard from '../components/WeeklyScheduleBoard';
import ProgressSection from '../components/ProgressSection';
import ShortsPlannerHub from '../components/ShortsPlannerHub';
import PlanShortModal from '../components/PlanShortModal';
import BulkShortsModal from '../components/BulkShortsModal';
import FullVideoListView from '../components/FullVideoListView';
import LinkYouTubeModal from '../components/LinkYouTubeModal';
import ErrorBoundary from '../components/ErrorBoundary';

// Status Icon system strictly adhering to planner system color scheme:
// - Checkmark (green #3EA65E) — target met / on track
// - Warning triangle (amber #E8A33D) — at risk
// - Filled dot (red #FF0000) — critical/overdue
// - Outline dot (gray #5A5A5A) — no target set
function PlannerStatusIcon({ status, color, size = 14 }) {
  if (status === 'TARGET_MET' || status === 'ON_TRACK') {
    return <Check size={size} style={{ color: color || '#3EA65E', strokeWidth: 2.5, flexShrink: 0 }} />;
  }
  if (status === 'AT_RISK') {
    return <AlertTriangle size={size} style={{ color: color || '#E8A33D', strokeWidth: 2.2, flexShrink: 0 }} />;
  }
  if (status === 'CRITICAL' || status === 'OVERDUE') {
    return (
      <span
        style={{
          width: `${Math.max(6, size - 5)}px`,
          height: `${Math.max(6, size - 5)}px`,
          borderRadius: '50%',
          backgroundColor: color || '#FF0000',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
    );
  }
  // NO_TARGET
  return (
    <span
      style={{
        width: `${Math.max(6, size - 5)}px`,
        height: `${Math.max(6, size - 5)}px`,
        borderRadius: '50%',
        border: `1.5px solid ${color || '#5A5A5A'}`,
        display: 'inline-block',
        flexShrink: 0
      }}
    />
  );
}

function getStatusColor(pacing) {
  if (!pacing) return '#5A5A5A';
  if (pacing.color) return pacing.color;
  switch (pacing.status) {
    case 'TARGET_MET':
    case 'ON_TRACK':
      return '#3EA65E';
    case 'AT_RISK':
      return '#E8A33D';
    case 'CRITICAL':
    case 'OVERDUE':
      return '#FF0000';
    case 'NO_TARGET':
    default:
      return '#5A5A5A';
  }
}

export default function UploadPlannerView() {
  const [overview, setOverview] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    return localStorage.getItem('falcon_planner_active_session') || null;
  });
  const [sessionDetail, setSessionDetail] = useState(null);
  const [allLists, setAllLists] = useState([]);
  const [plannedVideos, setPlannedVideos] = useState([]);
  const [allPlannedVideos, setAllPlannedVideos] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [dismissedNotification, setDismissedNotification] = useState(false);
  const [isReviewBannerExpanded, setIsReviewBannerExpanded] = useState(true);
  const [showSeasonalityInfo, setShowSeasonalityInfo] = useState(false);
  const [showSeasonalityBanner, setShowSeasonalityBanner] = useState(true);
  const [loading, setLoading] = useState(true);

  // Consolidated 4-Card KPI Metric Section stats
  const kpiStats = useMemo(() => {
    // Lecture videos (long-form content)
    const lectureVideos = allPlannedVideos.filter(v => v.content_type !== 'short');
    const lecturesTotal = lectureVideos.length;
    const lecturesUploaded = lectureVideos.filter(v => v.status === 'Uploaded').length;
    const lecturesScheduled = lectureVideos.filter(v => v.status === 'Scheduled').length;
    const lecturesBacklog = lectureVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const lecturesPct = lecturesTotal > 0 ? Math.round((lecturesUploaded / lecturesTotal) * 100) : 0;

    // Shorts (vertical short-form content <60s)
    const shortsVideos = allPlannedVideos.filter(v => v.content_type === 'short');
    const shortsTotal = shortsVideos.length;
    const shortsUploaded = shortsVideos.filter(v => v.status === 'Uploaded').length;
    const shortsScheduled = shortsVideos.filter(v => v.status === 'Scheduled').length;
    const shortsIdeas = shortsVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const shortsPct = shortsTotal > 0 ? Math.round((shortsUploaded / shortsTotal) * 100) : 0;

    // Pipeline Backlog
    const inProdCount = allPlannedVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const schedCount = allPlannedVideos.filter(v => v.status === 'Scheduled').length;
    const totalBacklog = inProdCount + schedCount;

    // Velocity & Target
    const totalVideos = allPlannedVideos.length;
    const totalUploaded = allPlannedVideos.filter(v => v.status === 'Uploaded').length;
    const velocityPct = totalVideos > 0 ? Math.round((totalUploaded / totalVideos) * 100) : 0;
    const activeSession = overview?.sessions?.find(s => s.id === selectedSessionId) || overview?.sessions?.[0];
    const sessionName = activeSession?.name || 'Nov Exam Run';
    const pacingStatus = velocityPct >= 50 ? 'Pacing OK' : (velocityPct > 0 ? 'Pacing OK' : 'Nov Exam Run');

    return {
      lecturesTotal,
      lecturesUploaded,
      lecturesScheduled,
      lecturesBacklog,
      lecturesPct,
      shortsTotal,
      shortsUploaded,
      shortsScheduled,
      shortsIdeas,
      shortsPct,
      inProdCount,
      schedCount,
      totalBacklog,
      totalVideos,
      totalUploaded,
      velocityPct,
      sessionName,
      pacingStatus
    };
  }, [allPlannedVideos, overview, selectedSessionId]);

  // Filters for planned entries table in Manage Plan
  const [filterList, setFilterList] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Course & list grouping
  const courseLists = useMemo(() => {
    return allLists.filter(l => l.is_course || ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2'].includes(l.id));
  }, [allLists]);

  const specialLists = useMemo(() => {
    return allLists.filter(l => !l.is_course && (!l.parent_id || !courseLists.some(c => c.id === l.parent_id)));
  }, [allLists, courseLists]);

  // Manage Plan Sub-navigation: 'backlog' | 'windows' | 'curriculum'
  const [manageSubTab, setManageSubTab] = useState('backlog');

  // Modals & Navigation
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showPlannedModal, setShowPlannedModal] = useState(false);
  const [editingPlannedVideo, setEditingPlannedVideo] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showPlanShortModal, setShowPlanShortModal] = useState(false);
  const [showBulkShortsModal, setShowBulkShortsModal] = useState(false);
  const [editingShort, setEditingShort] = useState(null);
  const [shortsCount, setShortsCount] = useState(0);
  const [linkingVideo, setLinkingVideo] = useState(null);

  // Course and Subject Modal State
  const [structure, setStructure] = useState({ courses: [], sessions: [] });
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectParentCourseId, setSubjectParentCourseId] = useState(null);

  // Information Architecture Default: 'progress' loads immediately on entry!
  const [activeViewTab, setActiveViewTab] = useState('progress'); // 'progress' | 'videos' | 'schedule' | 'shorts' | 'manage'

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
    } else {
      fetchPlannedVideos();
    }
  }, [selectedSessionId, filterList, filterStatus]);

  const handleSelectSession = (sessId) => {
    setSelectedSessionId(sessId);
    try {
      localStorage.setItem('falcon_planner_active_session', sessId);
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ovRes, listsRes, qRes, structRes, shortsRes, allPvsRes] = await Promise.all([
        fetch('/api/planner/overview'),
        fetch('/api/lists'),
        fetch('/api/planner/review-queue'),
        fetch('/api/planner/structure'),
        fetch('/api/planner/shorts/overview'),
        fetch('/api/planner/videos')
      ]);

      const ovJson = await ovRes.json();
      const listsJson = await listsRes.json();
      const qJson = await qRes.json();
      const structJson = await structRes.json();
      const shortsJson = await shortsRes.json();
      const allPvsJson = await allPvsRes.json();

      setOverview(ovJson);
      setAllLists(listsJson.all_lists || []);
      setReviewQueue(qJson);
      setStructure(structJson || { courses: [], sessions: [] });
      setShortsCount(shortsJson.planned_total || 0);
      setAllPlannedVideos(allPvsJson || []);

      // Select active session: prefer saved in localStorage, or active with target, or first session
      const savedSession = localStorage.getItem('falcon_planner_active_session');
      if (savedSession && ovJson.sessions?.some(s => s.id === savedSession)) {
        setSelectedSessionId(savedSession);
      } else if (ovJson.sessions && ovJson.sessions.length > 0) {
        const activeWithTarget = ovJson.sessions.find(s => s.is_active && s.target > 0);
        const preferred = activeWithTarget || ovJson.sessions.find(s => s.is_active) || ovJson.sessions[0];
        setSelectedSessionId(preferred.id);
        localStorage.setItem('falcon_planner_active_session', preferred.id);
      }
    } catch (err) {
      console.error("Failed to load upload planner overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`Are you sure you want to delete the course "${courseName}" and all its linked subjects?`)) return;
    try {
      const res = await fetch(`/api/planner/courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error("Failed to delete course:", err);
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete the subject "${subjectName}"?`)) return;
    try {
      const res = await fetch(`/api/planner/subjects/${subjectId}`, { method: 'DELETE' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error("Failed to delete subject:", err);
    }
  };

  const handleDeleteSession = async (sessionId, sessionName) => {
    if (!window.confirm(`Are you sure you want to delete the exam window "${sessionName}"?`)) return;
    try {
      const res = await fetch(`/api/planner/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
          localStorage.removeItem('falcon_planner_active_session');
        }
        refreshAll();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const fetchSessionDetail = async (sessId) => {
    try {
      const res = await fetch(`/api/planner/sessions/${sessId}`);
      if (res.ok) {
        const json = await res.json();
        setSessionDetail(json);
      }
    } catch (err) {
      console.error("Failed to load session details:", err);
    }
  };

  const fetchPlannedVideos = async () => {
    try {
      let url = `/api/planner/videos?`;
      if (selectedSessionId) url += `session_id=${selectedSessionId}&`;
      if (filterList !== 'ALL') url += `list_id=${filterList}&`;
      if (filterStatus !== 'ALL') url += `status=${filterStatus}&`;

      const res = await fetch(url);
      const json = await res.json();
      setPlannedVideos(json);
    } catch (err) {
      console.error("Failed to load planned videos:", err);
    }
  };

  const refreshAll = () => {
    fetchInitialData();
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
    }
  };

  const handleSaveTarget = async (listId, newTarget) => {
    try {
      await fetch('/api/planner/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSessionId,
          list_id: listId,
          target_count: parseInt(newTarget, 10) || 0
        })
      });
      setEditingTargetForList(null);
      refreshAll();
    } catch (err) {
      console.error("Failed to save target:", err);
    }
  };

  const handleConfirmReviewMatch = async (queueId) => {
    // Optimistically remove from UI
    setReviewQueue(prev => prev.filter(item => item.queue_id !== queueId));
    try {
      const res = await fetch(`/api/planner/review-queue/${queueId}/confirm`, { method: 'POST' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error("Failed to confirm match:", err);
      refreshAll();
    }
  };

  const handleRejectReviewMatch = async (queueId) => {
    // Optimistically remove from UI immediately
    setReviewQueue(prev => prev.filter(item => item.queue_id !== queueId));
    try {
      const res = await fetch(`/api/planner/review-queue/${queueId}/reject`, { method: 'POST' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error("Failed to reject match:", err);
      refreshAll();
    }
  };

  const handleOpenLinkDifferent = (item) => {
    const pv = allPlannedVideos.find(p => p.id === item.planned_id) || {
      id: item.planned_id,
      title: item.planned_title,
      session_name: item.session_name,
      session_id: item.session_id,
      status: item.planned_status || 'Planned'
    };
    const searchWords = (item.planned_title || '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 4)
      .join(' ');

    setLinkingVideo({
      ...pv,
      initialSearchQuery: searchWords || item.planned_title
    });
  };

  const handleTriggerAutoMatch = async () => {
    try {
      await fetch('/api/planner/auto-match', { method: 'POST' });
      refreshAll();
    } catch (err) {
      console.error("Failed to run auto-match:", err);
    }
  };

  const handleDeletePlanned = async (pvId) => {
    if (!window.confirm("Delete this planned video entry?")) return;
    try {
      await fetch(`/api/planner/videos/${pvId}`, { method: 'DELETE' });
      refreshAll();
    } catch (err) {
      console.error("Failed to delete planned video:", err);
    }
  };

  const handleStatusChange = async (pvId, newStatus) => {
    try {
      await fetch(`/api/planner/videos/${pvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      refreshAll();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleUpdateVideo = async (pvId, updateFields) => {
    try {
      // Optimistically update state
      setSessionDetail(prev => {
        if (!prev || !prev.planned_videos) return prev;
        return {
          ...prev,
          planned_videos: prev.planned_videos.map(pv =>
            pv.id === pvId ? { ...pv, ...updateFields } : pv
          )
        };
      });
      setPlannedVideos(prev =>
        prev.map(pv => pv.id === pvId ? { ...pv, ...updateFields } : pv)
      );

      await fetch(`/api/planner/videos/${pvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateFields)
      });
      refreshAll();
    } catch (err) {
      console.error("Failed to update video:", err);
      refreshAll();
    }
  };

  if (loading && !overview) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Upload Planner...
      </div>
    );
  }

  const activeSession = overview?.sessions?.find(s => s.id === selectedSessionId) || overview?.sessions?.[0] || null;
  const currentListBlocks = sessionDetail?.list_blocks || [];
  const currentPlannedVideos = sessionDetail ? sessionDetail.planned_videos : plannedVideos;

  // Filter planned videos for Manage Plan table
  const displayPlannedVideos = (currentPlannedVideos || []).filter(pv => {
    if (filterList !== 'ALL' && !pv.lists?.some(l => l.id === filterList)) return false;
    if (filterStatus !== 'ALL' && pv.status !== filterStatus) return false;
    if (searchTerm.trim() && !pv.title?.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
    return true;
  });

  // Reusable Compact Session Switcher Component
  const renderCompactSessionSwitcher = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem',
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      padding: '0.75rem 1.25rem',
      marginBottom: '1.25rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.72rem',
          color: '#64748B',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Exam Session:
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {overview?.sessions?.map((sess) => {
            const isSelected = sess.id === selectedSessionId;
            const pacing = sess.pacing || {};
            const statusColor = getStatusColor(pacing);

            return (
              <button
                key={sess.id}
                type="button"
                onClick={() => handleSelectSession(sess.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 600 : 500,
                  background: isSelected ? '#F3EEFF' : '#FFFFFF',
                  border: isSelected ? '1.5px solid #7C3AED' : '1px solid #E2E8F0',
                  color: isSelected ? '#7C3AED' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 3px rgba(124, 58, 237, 0.15)' : 'none'
                }}
              >
                <PlannerStatusIcon status={pacing.status} color={statusColor} size={13} />
                <span>{sess.name}</span>
                {sess.target > 0 && (
                  <span style={{
                    fontSize: '0.7rem',
                    color: statusColor,
                    fontWeight: 700,
                    background: `${statusColor}18`,
                    padding: '1px 6px',
                    borderRadius: '9999px'
                  }}>
                    {sess.completion_pct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeSession && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>Ends: <strong style={{ color: 'var(--text-secondary)' }}>{activeSession.end_date}</strong></span>
          <span>Target: <strong style={{ color: 'var(--text-secondary)' }}>{activeSession.uploaded} / {activeSession.target > 0 ? activeSession.target : '—'}</strong></span>
          {activeSession.pacing && (
            <span style={{
              color: getStatusColor(activeSession.pacing),
              fontWeight: 600
            }}>
              {activeSession.pacing.display_text}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="upload-planner-container text-slate-800" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Optional Dismissible Seasonality Notice - Soft Amber Pill */}
      {showSeasonalityBanner && (
        <div className="planner-seasonality-notice flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-900 shadow-xs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="notice-content flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info className="w-4 h-4 text-amber-600 shrink-0" style={{ width: '16px', height: '16px', color: '#D97706', flexShrink: 0 }} />
            <span>
              <strong className="text-amber-950 font-semibold" style={{ color: '#78350F' }}>Exam Seasonality:</strong> CFA (Feb · May · Aug · Nov) · FRM (May · Nov) — Prioritize marathon/revision content 30–60 days out.
            </span>
          </div>
          <button 
            onClick={() => setShowSeasonalityBanner(false)}
            className="dismiss-btn p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100/80 rounded-full transition"
            title="Dismiss notice"
            style={{ background: 'transparent', border: 'none', color: '#B45309', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
          >
            <X className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      {/* 2. Top Bar: Header & Consolidated Actions */}
      <div className="planner-top-bar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800" style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>Upload Planner</h1>
          <p className="text-sm text-slate-500" style={{ fontSize: '0.875rem', color: '#64748B', margin: '4px 0 0' }}>Track pacing toward exam targets, allocate uploads, and manage lecture pipeline.</p>
        </div>

        {/* Action Controls - Floating Capsule Style */}
        <div className="planner-action-controls flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Secondary Actions Group */}
          <div className="planner-secondary-actions flex items-center bg-white border border-slate-200/80 rounded-full shadow-xs p-0.5" style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '9999px', padding: '2px' }}>
            <button 
              onClick={handleTriggerAutoMatch}
              id="btn-trigger-auto-match"
              title="Run title similarity matcher against channel uploads"
              className="planner-secondary-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-full transition"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.75rem', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '9999px' }}
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" style={{ width: '14px', height: '14px' }} />
              <span>Scan</span>
            </button>
            <button 
              onClick={() => setShowBulkImport(true)}
              id="btn-bulk-import-top"
              title="Bulk import planned videos via CSV / text"
              className="planner-secondary-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-full transition"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.75rem', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '9999px' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" style={{ width: '14px', height: '14px' }} />
              <span>Bulk Import</span>
            </button>
            <button 
              onClick={() => setShowTargetModal(true)}
              id="btn-target-management-top"
              title="Set and reconcile total, program, course, and subject targets"
              className="planner-secondary-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-full transition"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.75rem', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '9999px' }}
            >
              <Target className="w-3.5 h-3.5 text-slate-500" style={{ width: '14px', height: '14px' }} />
              <span>Targets</span>
            </button>
          </div>

          {/* Primary Action Button Group */}
          <button 
            onClick={() => {
              setEditingPlannedVideo(null);
              setShowPlannedModal(true);
            }}
            id="btn-plan-video-top"
            className="planner-btn-plan-video flex items-center gap-1.5 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-full shadow-sm transition"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#7C3AED', color: '#fff', fontSize: '0.75rem', fontWeight: 600, borderRadius: '9999px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px -1px rgba(124, 58, 237, 0.35)' }}
          >
            <Plus className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
            <span>Plan Video</span>
          </button>

          <button 
            onClick={() => {
              setEditingShort(null);
              setShowPlanShortModal(true);
            }}
            id="btn-plan-short-top"
            className="planner-btn-plan-short flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-full border border-slate-200/80 shadow-xs transition"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#FFFFFF', color: '#334155', fontSize: '0.75rem', fontWeight: 500, borderRadius: '9999px', border: '1px solid #E2E8F0', cursor: 'pointer' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
            <span>Plan Short</span>
          </button>
        </div>
      </div>

      {/* 3. Sub-Navigation: Floating Capsule Tabs */}
      <div className="planner-subnav-strip flex border-b border-slate-200/80" style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', width: '100%', paddingBottom: '4px' }}>
        <nav className="flex space-x-1" aria-label="Tabs" style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveViewTab('progress')}
            id="tab-progress-analytics"
            className={`planner-subnav-tab flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full transition ${
              activeViewTab === 'progress' || activeViewTab === 'analytics'
                ? 'active bg-[#F3EEFF] text-[#7C3AED] border border-purple-200/60 font-semibold shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              fontSize: '0.78rem',
              borderRadius: '9999px',
              border: (activeViewTab === 'progress' || activeViewTab === 'analytics') ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid transparent',
              background: (activeViewTab === 'progress' || activeViewTab === 'analytics') ? '#F3EEFF' : 'transparent',
              color: (activeViewTab === 'progress' || activeViewTab === 'analytics') ? '#7C3AED' : '#64748B',
              fontWeight: (activeViewTab === 'progress' || activeViewTab === 'analytics') ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            <BarChart3 className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
            <span>Progress & Analytics</span>
          </button>
          <button
            onClick={() => setActiveViewTab('videos')}
            id="tab-full-video-list"
            className={`planner-subnav-tab flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full transition ${
              activeViewTab === 'videos'
                ? 'active bg-[#F3EEFF] text-[#7C3AED] border border-purple-200/60 font-semibold shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              fontSize: '0.78rem',
              borderRadius: '9999px',
              border: activeViewTab === 'videos' ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid transparent',
              background: activeViewTab === 'videos' ? '#F3EEFF' : 'transparent',
              color: activeViewTab === 'videos' ? '#7C3AED' : '#64748B',
              fontWeight: activeViewTab === 'videos' ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            <ListVideo className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
            <span>Full Video List</span>
            <span className="planner-tab-counter px-1.5 py-0.5 rounded-full text-[10px]" style={{ padding: '2px 7px', background: activeViewTab === 'videos' ? 'rgba(124, 58, 237, 0.18)' : '#F1F5F9', color: activeViewTab === 'videos' ? '#7C3AED' : '#64748B', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}>
              {allPlannedVideos.length}
            </span>
          </button>
          <button
            onClick={() => setActiveViewTab('schedule')}
            id="tab-weekly-schedule"
            className={`planner-subnav-tab flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full transition ${
              activeViewTab === 'schedule'
                ? 'active bg-[#F3EEFF] text-[#7C3AED] border border-purple-200/60 font-semibold shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              fontSize: '0.78rem',
              borderRadius: '9999px',
              border: activeViewTab === 'schedule' ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid transparent',
              background: activeViewTab === 'schedule' ? '#F3EEFF' : 'transparent',
              color: activeViewTab === 'schedule' ? '#7C3AED' : '#64748B',
              fontWeight: activeViewTab === 'schedule' ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            <Calendar className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
            <span>Weekly Schedule</span>
          </button>
          <button
            onClick={() => setActiveViewTab('shorts')}
            id="tab-shorts-hub"
            className={`planner-subnav-tab flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full transition ${
              activeViewTab === 'shorts'
                ? 'active bg-[#F3EEFF] text-[#7C3AED] border border-purple-200/60 font-semibold shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              fontSize: '0.78rem',
              borderRadius: '9999px',
              border: activeViewTab === 'shorts' ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid transparent',
              background: activeViewTab === 'shorts' ? '#F3EEFF' : 'transparent',
              color: activeViewTab === 'shorts' ? '#7C3AED' : '#64748B',
              fontWeight: activeViewTab === 'shorts' ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
            <span>Shorts Hub</span>
            <span className="planner-tab-counter px-1.5 py-0.5 rounded-full text-[10px]" style={{ padding: '2px 7px', background: activeViewTab === 'shorts' ? 'rgba(124, 58, 237, 0.18)' : '#F1F5F9', color: activeViewTab === 'shorts' ? '#7C3AED' : '#64748B', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}>
              {shortsCount}
            </span>
          </button>
          <button
            onClick={() => setActiveViewTab('manage')}
            id="tab-manage-plan"
            className={`planner-subnav-tab flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full transition ${
              activeViewTab === 'manage'
                ? 'active bg-[#F3EEFF] text-[#7C3AED] border border-purple-200/60 font-semibold shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              fontSize: '0.78rem',
              borderRadius: '9999px',
              border: activeViewTab === 'manage' ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid transparent',
              background: activeViewTab === 'manage' ? '#F3EEFF' : 'transparent',
              color: activeViewTab === 'manage' ? '#7C3AED' : '#64748B',
              fontWeight: activeViewTab === 'manage' ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
            <span>Manage Plan</span>
            {reviewQueue.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300/60 rounded-full text-[10px] font-semibold" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                {reviewQueue.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* 4. Consolidated KPI Metrics Grid (Pastel Accent Tile System) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', width: '100%' }}>
        
        {/* Tile 1: Soft Mint - Lectures Progress */}
        <div 
          onClick={() => setActiveViewTab('videos')}
          title="View Lecture videos"
          style={{
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 2px 12px -3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#EBFBF7',
            gap: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video style={{ width: '14px', height: '14px', color: '#0D9488' }} /> Lectures
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(13, 148, 136, 0.12)', color: '#0D9488', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
              {kpiStats.lecturesPct}%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '4px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B' }}>
              {kpiStats.lecturesUploaded} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748B' }}>/ {kpiStats.lecturesTotal} Live</span>
            </div>
            <div style={{ width: '100%', background: 'rgba(13, 148, 136, 0.15)', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
              <div style={{ background: '#0D9488', height: '6px', borderRadius: '9999px', transition: 'width 0.3s ease', width: `${Math.max(0, Math.min(100, kpiStats.lecturesPct))}%` }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748B', paddingTop: '8px', borderTop: '1px solid rgba(13, 148, 136, 0.15)' }}>
            <span style={{ color: '#0D9488', fontWeight: 600 }}>{kpiStats.lecturesUploaded} Live</span>
            <span>·</span>
            <span>{kpiStats.lecturesScheduled} Sched</span>
            <span>·</span>
            <span>{kpiStats.lecturesBacklog} Backlog</span>
          </div>
        </div>

        {/* Tile 2: Soft Peach - Shorts Progress */}
        <div 
          onClick={() => setActiveViewTab('shorts')}
          title="View Shorts Hub"
          style={{
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 2px 12px -3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#FFF5ED',
            gap: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: '14px', height: '14px', color: '#EA580C' }} /> Shorts
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(234, 88, 12, 0.12)', color: '#EA580C', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
              {kpiStats.shortsPct}%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '4px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B' }}>
              {kpiStats.shortsUploaded} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748B' }}>/ {kpiStats.shortsTotal} Live</span>
            </div>
            <div style={{ width: '100%', background: 'rgba(234, 88, 12, 0.15)', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
              <div style={{ background: '#EA580C', height: '6px', borderRadius: '9999px', transition: 'width 0.3s ease', width: `${Math.max(0, Math.min(100, kpiStats.shortsPct))}%` }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748B', paddingTop: '8px', borderTop: '1px solid rgba(234, 88, 12, 0.15)' }}>
            <span style={{ color: '#EA580C', fontWeight: 600 }}>{kpiStats.shortsUploaded} Live</span>
            <span>·</span>
            <span>{kpiStats.shortsScheduled} Ready</span>
            <span>·</span>
            <span>{kpiStats.shortsIdeas} Ideas</span>
          </div>
        </div>

        {/* Tile 3: Soft Lilac - Pipeline Backlog */}
        <div 
          onClick={() => setActiveViewTab('videos')}
          title="View Pipeline Backlog"
          style={{
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 2px 12px -3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#F3EEFF',
            gap: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline Backlog</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
              In Production
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '4px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B' }}>
              {kpiStats.totalBacklog} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748B' }}>Items</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>Pending editor review & release scheduling</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748B', paddingTop: '8px', borderTop: '1px solid rgba(124, 58, 237, 0.15)' }}>
            <span style={{ color: '#7C3AED', fontWeight: 600 }}>{kpiStats.inProdCount} in production</span>
            <span>·</span>
            <span>{kpiStats.schedCount} scheduled</span>
          </div>
        </div>

        {/* Tile 4: Soft Rose - Upload Velocity */}
        <div 
          style={{
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 2px 12px -3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#FFF0F2',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upload Velocity</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(225, 29, 72, 0.12)', color: '#E11D48', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
              {kpiStats.pacingStatus}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '4px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B' }}>
              {kpiStats.velocityPct}% <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748B' }}>({kpiStats.totalUploaded} of {kpiStats.totalVideos} Total)</span>
            </div>
            <div style={{ width: '100%', background: 'rgba(225, 29, 72, 0.15)', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
              <div style={{ background: '#E11D48', height: '6px', borderRadius: '9999px', transition: 'width 0.3s ease', width: `${Math.max(0, Math.min(100, kpiStats.velocityPct))}%` }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', paddingTop: '8px', borderTop: '1px solid rgba(225, 29, 72, 0.15)' }}>
            <span>Exam target window</span>
            <span style={{ color: '#E11D48', fontWeight: 600 }}>{kpiStats.sessionName}</span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* Global YouTube Matches Notification Banner (Visible across tabs) */}
      {/* ------------------------------------------------------------- */}
      {reviewQueue.length > 0 && !dismissedNotification && (
        <div style={{
          marginBottom: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(232, 163, 61, 0.45)',
          background: 'linear-gradient(135deg, rgba(232, 163, 61, 0.12) 0%, rgba(232, 163, 61, 0.03) 100%)',
          boxShadow: '0 4px 20px -4px rgba(232, 163, 61, 0.15)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: isReviewBannerExpanded ? '1px solid rgba(232, 163, 61, 0.2)' : 'none',
            background: 'rgba(232, 163, 61, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                position: 'relative',
                background: 'rgba(232, 163, 61, 0.2)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E8A33D'
              }}>
                <Sparkles size={17} />
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#3EA65E',
                  boxShadow: '0 0 0 2px var(--bg-surface)'
                }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    YouTube Upload Matches Detected
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: '#E8A33D',
                    color: '#000',
                    padding: '1px 7px',
                    borderRadius: '10px'
                  }}>
                    {reviewQueue.length} {reviewQueue.length === 1 ? 'match needs confirmation' : 'matches need confirmation'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Potential YouTube videos matched your planned entries. Please confirm to link metrics, or link a different one.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn-ghost"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                onClick={() => setIsReviewBannerExpanded(!isReviewBannerExpanded)}
                title={isReviewBannerExpanded ? "Collapse matches" : "Expand matches"}
              >
                {isReviewBannerExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                className="btn-ghost"
                style={{ padding: '0.3rem', color: 'var(--text-muted)' }}
                onClick={() => setDismissedNotification(true)}
                title="Dismiss banner"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Matches List */}
          {isReviewBannerExpanded && (
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {reviewQueue.map(item => {
                const confidencePct = Math.round((item.confidence || 0) * 100);
                const confColor = confidencePct >= 80 ? '#3EA65E' : confidencePct >= 60 ? '#E8A33D' : '#3B82F6';

                return (
                  <div
                    key={item.queue_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Planned Entry Info */}
                    <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--text-muted)',
                          fontWeight: 700
                        }}>
                          Planned Entry
                        </span>
                        {item.session_name && (
                          <span className="badge badge-cfa" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            {item.session_name}
                          </span>
                        )}
                        {item.planned_status && (
                          <span className="badge" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            Status: {item.planned_status}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {item.planned_title}
                      </div>
                    </div>

                    {/* Confidence Score Pill */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '0 0.5rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: confColor,
                        background: `${confColor}18`,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${confColor}40`,
                        whiteSpace: 'nowrap'
                      }}>
                        {confidencePct}% Match
                      </span>
                      <ArrowRight size={14} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                    </div>

                    {/* Matched YouTube Video Info */}
                    <div style={{
                      flex: '1 1 300px',
                      minWidth: '240px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'var(--bg-surface-elevated)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-hairline)'
                    }}>
                      {item.video_thumbnail ? (
                        <img
                          src={item.video_thumbnail}
                          alt="Thumbnail"
                          style={{
                            width: '56px',
                            height: '34px',
                            borderRadius: '4px',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '56px',
                          height: '34px',
                          borderRadius: '4px',
                          background: 'var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <PlaySquare size={16} color="var(--text-muted)" />
                        </div>
                      )}
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={item.video_title}>
                          {item.video_title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#3B82F6', fontWeight: 600 }}>
                            <Eye size={11} />
                            {(item.video_views || 0).toLocaleString()} views
                          </span>
                          {item.video_watch_time_hours > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} />
                              {item.video_watch_time_hours} hrs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Confirm, Link Different, Reject */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                      <button
                        className="btn-primary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#3EA65E',
                          borderColor: '#3EA65E',
                          color: '#fff'
                        }}
                        onClick={() => handleConfirmReviewMatch(item.queue_id)}
                        title="Confirm and link this YouTube video"
                      >
                        <Check size={13} strokeWidth={2.5} />
                        <span>Confirm Match</span>
                      </button>

                      <button
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        onClick={() => handleOpenLinkDifferent(item)}
                        title="Pick or search for a different YouTube video"
                      >
                        <Link2 size={13} />
                        <span>Link Different</span>
                      </button>

                      <button
                        className="btn-ghost"
                        style={{
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)'
                        }}
                        onClick={() => handleRejectReviewMatch(item.queue_id)}
                        title="Dismiss this match suggestion"
                      >
                        <X size={14} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* View 1: Progress & Analytics (DEFAULT LANDING VIEW)           */}
      {/* ------------------------------------------------------------- */}
      {activeViewTab === 'progress' && (
        <div>
          {/* Progress Section: Dial, Burnup, Velocity, Donut, Course Grid & Drill-down */}
          <ProgressSection />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* View: Full Video List & Catalog (Bulk Actions & Manual Link)  */}
      {/* ------------------------------------------------------------- */}
      {activeViewTab === 'videos' && (
        <ErrorBoundary title="Full Video List">
          <FullVideoListView
            plannedVideos={allPlannedVideos}
            sessions={overview?.sessions || []}
            lists={allLists}
            onRefresh={refreshAll}
            onEditVideo={(pv) => {
              setEditingPlannedVideo(pv);
              setShowPlannedModal(true);
            }}
            onOpenPlanVideo={() => {
              setEditingPlannedVideo(null);
              setShowPlannedModal(true);
            }}
            onOpenLinkModal={(pv) => setLinkingVideo(pv)}
            onOpenBulkImport={() => setShowBulkImport(true)}
          />
        </ErrorBoundary>
      )}

      {/* ------------------------------------------------------------- */}
      {/* View 2: Weekly Schedule Board (ONE CLICK AWAY, WEEKLY USE)     */}
      {/* ------------------------------------------------------------- */}
      {activeViewTab === 'schedule' && (
        <div>
          {/* Compact Session Switcher Bar */}
          {renderCompactSessionSwitcher()}

          <div className="content-card" style={{ padding: '1.25rem' }}>
            <WeeklyScheduleBoard
              session={activeSession}
              plannedVideos={currentPlannedVideos}
              onUpdateVideo={handleUpdateVideo}
              onRefresh={refreshAll}
              onOpenPlanModal={() => {
                setEditingPlannedVideo(null);
                setShowPlannedModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* View 3: Shorts Hub (DEDICATED FIRST-CLASS SHORTS WORKSPACE)   */}
      {/* ------------------------------------------------------------- */}
      {activeViewTab === 'shorts' && (
        <ErrorBoundary title="Shorts Planner Hub">
          <ShortsPlannerHub
            activeSessionId={selectedSessionId}
            allLists={allLists}
            onOpenPlanShortModal={() => {
              setEditingShort(null);
              setShowPlanShortModal(true);
            }}
            onOpenBulkShortsModal={() => {
              setShowBulkShortsModal(true);
            }}
            onEditShort={(sh) => {
              setEditingShort(sh);
              setShowPlanShortModal(true);
            }}
            onRefreshAll={refreshAll}
          />
        </ErrorBoundary>
      )}

      {/* ------------------------------------------------------------- */}
      {/* View 3: Manage Plan (ONE CLICK AWAY, OCCASIONAL SETUP WORK)    */}
      {/* ------------------------------------------------------------- */}
      {activeViewTab === 'manage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Match Review Queue Banner if pending */}
          {reviewQueue.length > 0 && (
            <div style={{
              background: 'rgba(232, 163, 61, 0.08)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              border: '1px solid rgba(232, 163, 61, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#E8A33D' }}>
                  <AlertTriangle size={16} color="#E8A33D" />
                  <span>Match review queue ({reviewQueue.length} uncertain {reviewQueue.length === 1 ? 'match' : 'matches'} needing confirmation)</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {reviewQueue.map(item => (
                  <div
                    key={item.queue_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Planned:</div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.planned_title}</div>
                    </div>

                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Matched Upload ({Math.round(item.confidence * 100)}% similarity):</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{item.video_title}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#3EA65E', borderColor: '#3EA65E' }}
                        onClick={() => handleConfirmReviewMatch(item.queue_id)}
                      >
                        <Check size={12} /> Confirm match
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleOpenLinkDifferent(item)}
                      >
                        <Link2 size={12} /> Link different
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', color: 'var(--danger-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleRejectReviewMatch(item.queue_id)}
                        title="Reject and never automatch this video pair again"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Navigation for Manage Plan */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '16px',
            border: '1px solid #E8ECF1',
            boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)'
          }}>
            <div className="planner-segmented-control" role="tablist" style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              gap: '4px'
            }}>
              <button 
                type="button"
                className={`planner-segmented-item ${manageSubTab === 'backlog' ? 'active' : ''}`}
                onClick={() => setManageSubTab('backlog')}
                id="subtab-video-backlog"
                role="tab"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 16px',
                  fontSize: '0.82rem',
                  fontWeight: manageSubTab === 'backlog' ? 600 : 500,
                  borderRadius: '9px',
                  border: 'none',
                  background: manageSubTab === 'backlog' ? '#FFFFFF' : 'transparent',
                  color: manageSubTab === 'backlog' ? '#7C3AED' : '#64748B',
                  boxShadow: manageSubTab === 'backlog' ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <List size={14} style={{ color: manageSubTab === 'backlog' ? '#7C3AED' : '#64748B' }} />
                <span>Video Backlog</span>
                <span className="planner-tab-badge" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  lineHeight: 1,
                  background: manageSubTab === 'backlog' ? 'rgba(124, 58, 237, 0.12)' : '#E2E8F0',
                  color: manageSubTab === 'backlog' ? '#7C3AED' : '#64748B'
                }}>
                  {displayPlannedVideos.length}
                </span>
              </button>

              <button 
                type="button"
                className={`planner-segmented-item ${manageSubTab === 'windows' ? 'active' : ''}`}
                onClick={() => setManageSubTab('windows')}
                id="subtab-exam-windows"
                role="tab"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 16px',
                  fontSize: '0.82rem',
                  fontWeight: manageSubTab === 'windows' ? 600 : 500,
                  borderRadius: '9px',
                  border: 'none',
                  background: manageSubTab === 'windows' ? '#FFFFFF' : 'transparent',
                  color: manageSubTab === 'windows' ? '#7C3AED' : '#64748B',
                  boxShadow: manageSubTab === 'windows' ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Calendar size={14} style={{ color: manageSubTab === 'windows' ? '#7C3AED' : '#64748B' }} />
                <span>Exam Windows</span>
                <span className="planner-tab-badge" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  lineHeight: 1,
                  background: manageSubTab === 'windows' ? 'rgba(124, 58, 237, 0.12)' : '#E2E8F0',
                  color: manageSubTab === 'windows' ? '#7C3AED' : '#64748B'
                }}>
                  {(structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])).length}
                </span>
              </button>

              <button 
                type="button"
                className={`planner-segmented-item ${manageSubTab === 'curriculum' ? 'active' : ''}`}
                onClick={() => setManageSubTab('curriculum')}
                id="subtab-courses-subjects"
                role="tab"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 16px',
                  fontSize: '0.82rem',
                  fontWeight: manageSubTab === 'curriculum' ? 600 : 500,
                  borderRadius: '9px',
                  border: 'none',
                  background: manageSubTab === 'curriculum' ? '#FFFFFF' : 'transparent',
                  color: manageSubTab === 'curriculum' ? '#7C3AED' : '#64748B',
                  boxShadow: manageSubTab === 'curriculum' ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <BookOpen size={14} style={{ color: manageSubTab === 'curriculum' ? '#7C3AED' : '#64748B' }} />
                <span>Courses & Subjects</span>
                <span className="planner-tab-badge" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  lineHeight: 1,
                  background: manageSubTab === 'curriculum' ? 'rgba(124, 58, 237, 0.12)' : '#E2E8F0',
                  color: manageSubTab === 'curriculum' ? '#7C3AED' : '#64748B'
                }}>
                  {structure.courses?.length || 0}
                </span>
              </button>
            </div>

            {/* Contextual Action Buttons */}
            <div>
              {manageSubTab === 'backlog' && (
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <button
                    className="btn-ghost"
                    onClick={() => setShowBulkImport(true)}
                    id="btn-bulk-import-manage"
                    style={{
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <UploadCloud size={14} />
                    <span>Bulk import</span>
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setEditingPlannedVideo(null);
                      setShowPlannedModal(true);
                    }}
                    id="btn-add-planned-video-manage"
                    style={{
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '7px 16px',
                      borderRadius: '9999px',
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} />
                    <span>Plan video</span>
                  </button>
                </div>
              )}

              {manageSubTab === 'windows' && (
                <button
                  className="btn-primary"
                  onClick={() => { setEditingSession(null); setShowCreateSession(true); }}
                  id="btn-create-session"
                  style={{
                    background: '#7C3AED',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  <span>New Exam Window</span>
                </button>
              )}

              {manageSubTab === 'curriculum' && (
                <button
                  className="btn-primary"
                  onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
                  id="btn-create-course"
                  style={{
                    background: '#7C3AED',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  <span>New Course</span>
                </button>
              )}
            </div>
          </div>

          {/* SubTab 1: Video Backlog */}
          {manageSubTab === 'backlog' && (
            <div className="content-card">
              <div className="content-card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="card-title-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', padding: '6px', borderRadius: '8px', display: 'inline-flex' }}>
                      <List size={16} color="#7C3AED" />
                    </div>
                    <div>
                      <h2>Planned Video Backlog ({displayPlannedVideos.length})</h2>
                      <p>Draft ideas, track production stages, and link to published videos.</p>
                    </div>
                  </div>
                </div>

                <div className="controls-bar" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
                  {/* Search input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8FAFC', borderRadius: '8px', padding: '0.4rem 0.8rem', border: '1px solid #E2E8F0' }}>
                    <Search size={14} style={{ color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search video topic..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: '#1E293B', fontSize: '0.82rem', outline: 'none', width: '170px' }}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="btn-ghost"
                        style={{ padding: '0 2px', color: '#94A3B8', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>List:</span>
                    <select
                      className="control-select"
                      value={filterList}
                      onChange={(e) => setFilterList(e.target.value)}
                    >
                      <option value="ALL">All lists</option>

                      <optgroup label="📚 Programs & Courses">
                        {courseLists.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>

                      {courseLists.map(course => {
                        const subjects = allLists.filter(l => !l.is_course && l.parent_id === course.id);
                        if (subjects.length === 0) return null;
                        return (
                          <optgroup key={course.id} label={`📖 ${course.name} Subjects`}>
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </optgroup>
                        );
                      })}

                      {specialLists.length > 0 && (
                        <optgroup label="🎯 Special & Other Lists">
                          {specialLists.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
                    <select
                      className="control-select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="ALL">All statuses</option>
                      <option value="Planned">Planned</option>
                      <option value="In Progress">In progress</option>
                      <option value="Uploaded">Uploaded</option>
                    </select>
                  </div>
                </div>
              </div>

              {displayPlannedVideos.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    No planned video entries found
                  </div>
                  <div style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                    {searchTerm || filterList !== 'ALL' || filterStatus !== 'ALL'
                      ? 'Try clearing the active filters or search term above.'
                      : 'Sketch out ideas, assign them to courses or subjects, and track production stages.'}
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setEditingPlannedVideo(null);
                      setShowPlannedModal(true);
                    }}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                  >
                    <Plus size={14} /> Plan your first video
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '280px' }}>Video title / topic</th>
                        <th>Assigned lists</th>
                        <th>Session</th>
                        <th>Scheduled Week</th>
                        <th>Status</th>
                        <th>Linked upload</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPlannedVideos.map((pv) => {
                        return (
                          <tr key={pv.id}>
                            <td>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{pv.title}</div>
                              {pv.notes && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {pv.notes}
                                </div>
                              )}
                            </td>

                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                {pv.lists?.map(l => (
                                  <span key={l.id} className="badge">
                                    {l.name}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {pv.session_name || 'Evergreen'}
                            </td>

                            <td style={{ fontSize: '0.78rem', color: pv.assigned_week ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {pv.assigned_week || 'Backlog'}
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span
                                  style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    backgroundColor: pv.status === 'Uploaded' ? '#3EA65E' : (pv.status === 'In Progress' ? '#E8A33D' : '#5A5A5A'),
                                    display: 'inline-block',
                                    flexShrink: 0
                                  }}
                                />
                                <select
                                  className="control-select"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                  value={pv.status}
                                  onChange={(e) => handleStatusChange(pv.id, e.target.value)}
                                >
                                  <option value="Planned">Planned</option>
                                  <option value="In Progress">In progress</option>
                                  <option value="Uploaded">Uploaded</option>
                                </select>
                              </div>
                            </td>

                            <td>
                              {pv.linked_video_id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <CheckCircle2 size={13} color="var(--success-green)" />
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }} title={pv.linked_video_title}>
                                    {pv.linked_video_title?.substring(0, 28)}...
                                  </span>
                                  <button
                                    className="btn-ghost"
                                    style={{ padding: '1px 5px', fontSize: '0.65rem' }}
                                    onClick={() => setLinkingVideo(pv)}
                                    title="Edit link"
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn-ghost"
                                  style={{ padding: '2px 6px', fontSize: '0.72rem', color: 'var(--brand-cfa, #3EA65E)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  onClick={() => setLinkingVideo(pv)}
                                  title="Manually link YouTube video"
                                >
                                  <Link size={11} />
                                  <span>+ Link YT</span>
                                </button>
                              )}
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  className="btn-ghost"
                                  style={{ padding: '3px' }}
                                  onClick={() => setLinkingVideo(pv)}
                                  title={pv.linked_video_id ? "Change YouTube link" : "Link YouTube video"}
                                >
                                  <Link size={13} color={pv.linked_video_id ? "var(--success-green)" : "var(--text-muted)"} />
                                </button>
                                <button
                                  className="btn-ghost"
                                  style={{ padding: '3px' }}
                                  onClick={() => {
                                    setEditingPlannedVideo(pv);
                                    setShowPlannedModal(true);
                                  }}
                                  title="Edit planned video"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  className="btn-ghost"
                                  style={{ padding: '3px', color: 'var(--danger-red)' }}
                                  onClick={() => handleDeletePlanned(pv.id)}
                                  title="Delete entry"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: Exam Windows */}
          {manageSubTab === 'windows' && (
            <div className="content-card">
              <div className="content-card-header">
                <div className="card-title-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', padding: '6px', borderRadius: '8px', display: 'inline-flex' }}>
                      <Calendar size={16} color="#7C3AED" />
                    </div>
                    <div>
                      <h2>Exam Windows ({(structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])).length})</h2>
                      <p>Standalone exam periods. Click Edit on any window to customize dates and select participating courses & targets.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {(structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])).map((sess) => {
                  const isSelected = sess.id === selectedSessionId;
                  const pacing = sess.pacing || {};
                  const statusColor = getStatusColor(pacing);
                  const targetCount = sess.total_target || sess.target || 0;
                  const uploadedCount = sess.uploaded || 0;
                  const completionPct = targetCount > 0 ? Math.round((uploadedCount / targetCount) * 100) : 0;

                  return (
                    <div
                      key={sess.id}
                      className="overview-block-card"
                      style={{
                        border: isSelected ? '1.5px solid var(--text-secondary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        padding: '1.25rem'
                      }}
                      onClick={() => handleSelectSession(sess.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <PlannerStatusIcon status={pacing.status || (targetCount > 0 ? 'ON_TRACK' : 'NO_TARGET')} color={statusColor} size={15} />
                          <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                              {sess.name}
                            </h3>
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {sess.start_date} → {sess.end_date}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-ghost"
                            style={{ padding: '4px', color: 'var(--text-muted)' }}
                            onClick={() => {
                              setEditingSession(sess);
                              setShowCreateSession(true);
                            }}
                            title="Edit window and course targets"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ padding: '4px', color: 'var(--danger-red)' }}
                            onClick={() => handleDeleteSession(sess.id, sess.name)}
                            title="Delete exam window"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Progress row */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', margin: '0.5rem 0' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-sans)', color: statusColor, lineHeight: 1 }}>
                          {uploadedCount}
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {' / '}{targetCount > 0 ? targetCount : '—'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {targetCount > 0 ? `${completionPct}% uploaded` : 'No target set'} ({sess.planned || 0} planned)
                        </span>
                      </div>

                      {/* Progress bar */}
                      {targetCount > 0 && (
                        <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, completionPct)}%`,
                            background: statusColor,
                            borderRadius: '2px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      )}

                      {/* Participating Courses Badges */}
                      <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '0.6rem', marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                          Targeted Courses:
                        </div>
                        {sess.course_targets && sess.course_targets.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {sess.course_targets.map(ct => (
                              <span
                                key={ct.course_id}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  background: 'var(--bg-surface-elevated)',
                                  border: '1px solid var(--border-hairline)',
                                  color: 'var(--text-primary)',
                                  fontWeight: 500
                                }}
                              >
                                {ct.course_name}: <strong>{ct.target_count}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            No courses linked. Click edit to assign courses.
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                        <span>{pacing.display_text || 'Ready'}</span>
                        <span style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
                          {isSelected ? '● Active Selection' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SubTab 3: Courses & Subjects Curriculum Grid */}
          {manageSubTab === 'curriculum' && (
            <div className="content-card">
              <div className="content-card-header">
                <div className="card-title-group">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={18} color="#3B82F6" />
                    <span>Courses & Subjects ({structure.courses?.length || 0})</span>
                  </h2>
                  <p>Curriculum hierarchy. Add courses and link subjects. Changes apply instantly across all planner views.</p>
                </div>
              </div>

              {structure.courses.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
                  No courses configured. Click "New Course" to add your first course.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {structure.courses.map((course) => (
                    <div
                      key={course.id}
                      className="overview-block-card"
                      style={{
                        background: 'var(--bg-surface)',
                        padding: '1.25rem',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem'
                      }}
                    >
                      {/* Course Header Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', padding: '6px', borderRadius: '6px' }}>
                            <BookOpen size={16} color="#3B82F6" />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                {course.name}
                              </h3>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {course.subjects?.length || 0} subjects · {course.planned_count || 0} planned vids
                              </span>
                            </div>
                            {course.description && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {course.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Course Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '3px 8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => {
                              setSubjectParentCourseId(course.id);
                              setEditingSubject(null);
                              setShowSubjectModal(true);
                            }}
                            title="Add a subject to this course"
                          >
                            <Plus size={12} />
                            <span>Add Subject</span>
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ padding: '4px', color: 'var(--text-muted)' }}
                            onClick={() => {
                              setEditingCourse(course);
                              setShowCourseModal(true);
                            }}
                            title="Edit course"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ padding: '4px', color: 'var(--danger-red)' }}
                            onClick={() => handleDeleteCourse(course.id, course.name)}
                            title="Delete course"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Linked Subjects Chips List */}
                      <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.45rem' }}>
                          Subjects / Chapters:
                        </div>
                        {course.subjects && course.subjects.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                            {course.subjects.map(sub => (
                              <div
                                key={sub.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: 'var(--bg-surface-elevated)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '3px 8px',
                                  fontSize: '0.78rem',
                                  color: 'var(--text-primary)'
                                }}
                              >
                                <span>{sub.name}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({sub.planned_count || 0})</span>
                                <button
                                  className="btn-ghost"
                                  style={{ padding: '1px', color: 'var(--text-muted)', marginLeft: '2px' }}
                                  onClick={() => {
                                    setSubjectParentCourseId(course.id);
                                    setEditingSubject(sub);
                                    setShowSubjectModal(true);
                                  }}
                                  title="Edit subject"
                                >
                                  <Edit3 size={10} />
                                </button>
                                <button
                                  className="btn-ghost"
                                  style={{ padding: '1px', color: 'var(--danger-red)' }}
                                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                                  title="Delete subject"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No subjects added yet. Click "+ Add Subject" to link chapters or units to this course.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modals                                                        */}
      {/* ------------------------------------------------------------- */}
      {showCreateSession && (
        <CreateSessionModal
          initialData={editingSession}
          courses={structure.courses}
          onClose={() => { setShowCreateSession(false); setEditingSession(null); }}
          onSuccess={() => {
            setShowCreateSession(false);
            setEditingSession(null);
            refreshAll();
          }}
          onDelete={async (sessId) => {
            await fetch(`/api/planner/sessions/${sessId}`, { method: 'DELETE' });
            if (selectedSessionId === sessId) {
              setSelectedSessionId(null);
              localStorage.removeItem('falcon_planner_active_session');
            }
          }}
        />
      )}

      {showCourseModal && (
        <CourseModal
          initialData={editingCourse}
          onClose={() => { setShowCourseModal(false); setEditingCourse(null); }}
          onSuccess={() => {
            setShowCourseModal(false);
            setEditingCourse(null);
            refreshAll();
          }}
        />
      )}

      {showSubjectModal && (
        <SubjectModal
          courses={structure.courses}
          defaultCourseId={subjectParentCourseId}
          initialData={editingSubject}
          onClose={() => { setShowSubjectModal(false); setEditingSubject(null); setSubjectParentCourseId(null); }}
          onSuccess={() => {
            setShowSubjectModal(false);
            setEditingSubject(null);
            setSubjectParentCourseId(null);
            refreshAll();
          }}
        />
      )}

      {showPlannedModal && (
        <PlannedVideoModal
          initialData={editingPlannedVideo}
          availableLists={allLists}
          availableSessions={overview?.sessions || []}
          defaultSessionId={selectedSessionId}
          defaultListId={filterList !== 'ALL' ? filterList : null}
          onClose={() => { setShowPlannedModal(false); setEditingPlannedVideo(null); }}
          onSuccess={() => {
            setShowPlannedModal(false);
            setEditingPlannedVideo(null);
            refreshAll();
          }}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          availableLists={allLists}
          availableSessions={overview?.sessions || []}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false);
            refreshAll();
          }}
        />
      )}

      {showTargetModal && (
        <TargetManagementModal
          onClose={() => setShowTargetModal(false)}
          onSuccess={() => {
            setShowTargetModal(false);
            refreshAll();
          }}
        />
      )}

      {/* Plan Short Modal */}
      {showPlanShortModal && (
        <PlanShortModal
          availableLists={allLists}
          availableSessions={structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])}
          initialData={editingShort}
          defaultSessionId={selectedSessionId}
          onClose={() => {
            setShowPlanShortModal(false);
            setEditingShort(null);
          }}
          onSuccess={() => {
            setShowPlanShortModal(false);
            setEditingShort(null);
            refreshAll();
          }}
        />
      )}

      {/* Bulk Shorts Idea Studio Modal */}
      {showBulkShortsModal && (
        <BulkShortsModal
          availableLists={allLists}
          availableSessions={structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])}
          defaultSessionId={selectedSessionId}
          onClose={() => setShowBulkShortsModal(false)}
          onSuccess={() => {
            setShowBulkShortsModal(false);
            refreshAll();
          }}
        />
      )}

      {/* Manual YouTube Link Modal */}
      {linkingVideo && (
        <LinkYouTubeModal
          plannedVideo={linkingVideo}
          onClose={() => setLinkingVideo(null)}
          onSuccess={() => {
            setLinkingVideo(null);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}
