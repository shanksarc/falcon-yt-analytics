import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, BarChart2, PieChart, Target, AlertTriangle, 
  Check, RefreshCw, Calendar, ArrowLeft,
  ChevronRight, ChevronLeft, BookOpen, Layers, Globe, Clock, CheckCircle2,
  Filter, Eye, ThumbsUp, MessageSquare, PlaySquare, Search,
  Table as TableIcon, LayoutGrid, ArrowUpDown, X
} from 'lucide-react';
import TargetManagementModal from './TargetManagementModal';
import { getLocalPlannedVideos } from '../utils/plannerStorage';

function StatusIcon({ status, color, size = 13 }) {
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

function StatusBadge({ status, displayText }) {
  if (status === 'TARGET_MET') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        background: 'rgba(62, 166, 94, 0.12)',
        color: '#2E7D32',
        border: '1px solid rgba(62, 166, 94, 0.3)'
      }}>
        <Check size={11} strokeWidth={3} />
        <span>Target Met</span>
      </span>
    );
  }
  if (status === 'ON_TRACK') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        background: 'rgba(62, 166, 94, 0.1)',
        color: '#3EA65E',
        border: '1px solid rgba(62, 166, 94, 0.25)'
      }}>
        <Check size={11} strokeWidth={2.5} />
        <span>On Track</span>
      </span>
    );
  }
  if (status === 'AT_RISK') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        background: 'rgba(232, 163, 61, 0.12)',
        color: '#D97706',
        border: '1px solid rgba(232, 163, 61, 0.3)'
      }}>
        <AlertTriangle size={11} strokeWidth={2.2} />
        <span>At Risk</span>
      </span>
    );
  }
  if (status === 'CRITICAL' || status === 'OVERDUE') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        background: 'rgba(239, 68, 68, 0.12)',
        color: '#DC2626',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <AlertTriangle size={11} strokeWidth={2.2} />
        <span>Behind</span>
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.72rem',
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: '12px',
      background: 'rgba(148, 163, 184, 0.12)',
      color: '#64748B',
      border: '1px solid rgba(148, 163, 184, 0.25)'
    }}>
      <Clock size={11} />
      <span>{displayText || 'No Target'}</span>
    </span>
  );
}

function PipelineMiniBar({ uploaded = 0, scheduled = 0, backlog = 0, height = 6 }) {
  const total = uploaded + scheduled + backlog;
  if (total === 0) {
    return (
      <div 
        style={{ 
          height: `${height}px`, 
          background: 'var(--bg-surface-elevated)', 
          borderRadius: `${height / 2}px`, 
          width: '100%',
          minWidth: '60px'
        }} 
        title="No videos planned yet"
      />
    );
  }
  const uPct = (uploaded / total) * 100;
  const sPct = (scheduled / total) * 100;
  const bPct = (backlog / total) * 100;

  return (
    <div 
      style={{ 
        display: 'flex', 
        height: `${height}px`, 
        borderRadius: `${height / 2}px`, 
        overflow: 'hidden', 
        background: 'var(--bg-surface-elevated)',
        width: '100%',
        minWidth: '70px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
      }}
      title={`Total: ${total} · Uploaded: ${uploaded} (${Math.round(uPct)}%) · Scheduled: ${scheduled} (${Math.round(sPct)}%) · Backlog: ${backlog} (${Math.round(bPct)}%)`}
    >
      {uPct > 0 && <div style={{ width: `${uPct}%`, background: '#3EA65E', transition: 'width 0.3s ease' }} />}
      {sPct > 0 && <div style={{ width: `${sPct}%`, background: '#3B82F6', transition: 'width 0.3s ease' }} />}
      {bPct > 0 && <div style={{ width: `${bPct}%`, background: '#94A3B8', transition: 'width 0.3s ease' }} />}
    </div>
  );
}

function formatCompactNum(num) {
  if (!num) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function formatSessionLabel(name) {
  if (!name) return '';
  let clean = name
    .replace(/\s*Exam\s*Window/gi, '')
    .replace(/\s*Exam\s*Session/gi, '')
    .replace(/^CFA\s+/i, '')
    .replace(/^FRM\s+/i, '')
    .replace(/\s*\(No\s*Session\)/gi, '')
    .replace(/Evergreen\s*(\/\s*Someday)?/gi, 'Evergreen')
    .trim();
  return clean || name;
}

function formatCourseShortName(name) {
  if (!name) return '';
  return name
    .replace(/CFA\s*Level\s*1/i, 'CFA L1')
    .replace(/CFA\s*Level\s*2/i, 'CFA L2')
    .replace(/CFA\s*Level\s*3/i, 'CFA L3')
    .replace(/FRM\s*Part\s*1/i, 'FRM P1')
    .replace(/FRM\s*Part\s*2/i, 'FRM P2');
}

export default function ProgressSection({ 
  initialSessionId = null, 
  activeSessionId: propActiveSessionId, 
  onNavigateToVideos,
  refreshTrigger = 0
}) {
  // Navigation & Scope State:
  // activeCourseId: null = Global (Full Plan), string = Course Drill-Down
  // activeSessionId: null = All Sessions, string = Filtered by Session
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(propActiveSessionId || initialSessionId);

  useEffect(() => {
    if (propActiveSessionId !== undefined && propActiveSessionId !== activeSessionId) {
      setActiveSessionId(propActiveSessionId);
    }
  }, [propActiveSessionId]);

  // In course mode, toggle between Subjects and Sessions cards
  const [courseBreakdownTab, setCourseBreakdownTab] = useState('subjects'); // 'subjects' | 'sessions'

  // Course Level View Mode: defaults to 'cards' (maintains original card structure)
  const [courseViewMode, setCourseViewMode] = useState('cards'); // 'cards' | 'table'

  // Subject Level View Mode inside Course Drilldown: defaults to 'table' (analytical tabular format)
  const [breakdownViewMode, setBreakdownViewMode] = useState('table'); // 'table' | 'cards'

  // Modal State for Curriculum Target Setting
  const [showTargetModal, setShowTargetModal] = useState(false);

  // Filtering & Sorting for Breakdown Table
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all'); // 'all' | 'with_planned' | 'with_target' | 'on_track' | 'backlog'
  const [subjectSort, setSubjectSort] = useState({ field: 'name', dir: 'asc' });

  const [courseSearch, setCourseSearch] = useState('');
  const [courseSort, setCourseSort] = useState({ field: 'name', dir: 'asc' });

  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionSort, setSessionSort] = useState({ field: 'date', dir: 'asc' });

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    fetchAnalytics(activeCourseId, activeSessionId);
  }, [activeCourseId, activeSessionId, refreshTrigger]);

  useEffect(() => {
    const handlePlannerEvent = () => {
      fetchAnalytics(activeCourseId, activeSessionId);
    };
    window.addEventListener('falcon_planner_updated', handlePlannerEvent);
    return () => window.removeEventListener('falcon_planner_updated', handlePlannerEvent);
  }, [activeCourseId, activeSessionId]);

  const fetchAnalytics = async (courseId, sessId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      if (sessId && sessId !== 'ALL') params.append('session_id', sessId);

      const url = `/api/planner/progress-analytics${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        
        // Overlay client-side custom planned videos in case serverless backend cold-started
        try {
          const localVideos = getLocalPlannedVideos();

          if (localVideos.length > 0 && json) {
            // Count matching local videos
            const matchingLocal = localVideos.filter(pv => {
              if (pv.status === 'Uploaded') return false;
              if (sessId && sessId !== 'ALL' && pv.session_id && pv.session_id !== sessId) return false;
              if (courseId) {
                return (pv.lists || []).some(l => (l.id || l) === courseId || (l.parent_id || '') === courseId);
              }
              return true;
            });

            // If we have local videos, ensure course_breakdown or subject_breakdown counts reflect them
            if (json.course_breakdown && Array.isArray(json.course_breakdown)) {
              json.course_breakdown = json.course_breakdown.map(cb => {
                const cLocal = localVideos.filter(pv => 
                  pv.status !== 'Uploaded' && (pv.lists || []).some(l => (l.id || l) === cb.id || (l.parent_id || '') === cb.id)
                );
                const extraPlanned = Math.max(0, cLocal.length - (cb.planned || 0));
                return {
                  ...cb,
                  planned: Math.max(cb.planned || 0, cLocal.length)
                };
              });
            }

            if (json.subject_breakdown && Array.isArray(json.subject_breakdown)) {
              json.subject_breakdown = json.subject_breakdown.map(sb => {
                const sLocal = localVideos.filter(pv =>
                  pv.status !== 'Uploaded' && (pv.lists || []).some(l => (l.id || l) === sb.id)
                );
                return {
                  ...sb,
                  planned: Math.max(sb.planned || 0, sLocal.length)
                };
              });
            }

            if (matchingLocal.length > (json.planned || 0)) {
              json.planned = matchingLocal.length;
            }
          }
        } catch (overlayErr) {
          console.debug('Notice overlaying local planned stats:', overlayErr);
        }

        setAnalytics(json);
      }
    } catch (err) {
      console.error("Failed to fetch progress analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = (courseId) => {
    setActiveCourseId(courseId);
    setActiveSessionId(null);
    setCourseBreakdownTab('subjects');
    // Fix One: When clicking a course, open subjects as table list. When going back, show course card style.
    if (courseId) {
      setBreakdownViewMode('table');
    } else {
      setCourseViewMode('cards');
    }
    setSubjectSearch('');
    setSubjectFilter('all');
  };

  const handleSelectSession = (sessId) => {
    setActiveSessionId(sessId === activeSessionId ? null : sessId);
  };

  if (loading && !analytics) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }} />
        <div>Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No progress data available.
      </div>
    );
  }

  const {
    mode,
    target = 0,
    uploaded = 0,
    planned = 0,
    scheduled = 0,
    backlog = 0,
    overdue = 0,
    completion_pct = 0,
    pacing,
    youtube_stats,
    burnup_chart,
    weekly_velocity,
    status_distribution,
    all_courses = [],
    courses = [],
    course,
    subjects = [],
    sessions = []
  } = analytics;

  const statusColor = pacing?.color || '#3EA65E';
  const isGlobalMode = mode === 'GLOBAL';
  const isCourseMode = mode === 'COURSE';

  const activeSessionObj = sessions.find(s => s.id === activeSessionId);
  const cleanActiveSession = activeSessionObj ? formatSessionLabel(activeSessionObj.name) : '';

  // ---------------- 1. Radial Dial Calculation ----------------
  const radius = 64;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = arcLength - (arcLength * Math.min(100, completion_pct) / 100);

  // ---------------- 2. Burnup Chart Scaling (Row 2, Card 2) ----------------
  const burnupTimeline = burnup_chart?.timeline || [];
  const maxBurnupVal = Math.max(target || 1, planned || 1, ...burnupTimeline.map(t => Math.max(t.ideal || 0, t.actual || 0)));
  const bSvgWidth = 360;
  const bSvgHeight = 175;
  const bPadX = 32;
  const bPadY = 24;
  const bPlotW = bSvgWidth - bPadX * 2;
  const bPlotH = bSvgHeight - bPadY * 2;

  const getBx = (idx) => {
    if (burnupTimeline.length <= 1) return bPadX;
    return bPadX + (idx / (burnupTimeline.length - 1)) * bPlotW;
  };
  const getBy = (val) => {
    if (maxBurnupVal <= 0) return bSvgHeight - bPadY;
    return (bSvgHeight - bPadY) - ((val / maxBurnupVal) * bPlotH);
  };

  const idealPath = burnupTimeline.length > 1 
    ? `M ${getBx(0)} ${getBy(burnupTimeline[0].ideal || 0)} ` + burnupTimeline.slice(1).map((pt, i) => `L ${getBx(i + 1)} ${getBy(pt.ideal || 0)}`).join(' ')
    : '';

  const actualPoints = burnupTimeline.map((pt, i) => ({ pt, idx: i })).filter(item => item.pt.actual !== null && item.pt.actual !== undefined);
  const actualPath = actualPoints.length > 1
    ? `M ${getBx(actualPoints[0].idx)} ${getBy(actualPoints[0].pt.actual)} ` + actualPoints.slice(1).map(item => `L ${getBx(item.idx)} ${getBy(item.pt.actual)}`).join(' ')
    : '';

  // ---------------- 3. Velocity Bar Chart Scaling (Row 2, Card 3 - Vertical Card View) ----------------
  const velocityWeeks = weekly_velocity?.weeks || [];
  const avgVelocity = weekly_velocity?.average_velocity || 0;
  const maxVelVal = Math.max(3, ...velocityWeeks.map(w => w.count || 0), avgVelocity * 1.3);
  const vSvgWidth = 340;
  const vSvgHeight = 175;
  const vPadX = 26;
  const vPadY = 24;
  const vPlotW = vSvgWidth - vPadX * 2;
  const vPlotH = vSvgHeight - vPadY * 2;
  const barWidth = Math.max(14, (vPlotW / (velocityWeeks.length || 1)) - 10);

  // ---------------- 4. Donut Chart Segments (Row 2, Card 1) ----------------
  const dist = status_distribution || { Planned: 0, Scheduled: 0, Uploaded: 0, Overdue: 0, Total: 0 };
  const donutTotal = Math.max(1, dist.Total || (dist.Planned + dist.Scheduled + dist.Uploaded + dist.Overdue));
  const segments = [
    { label: 'Uploaded', count: dist.Uploaded, color: '#3EA65E' },
    { label: 'Scheduled', count: dist.Scheduled, color: '#3B82F6' },
    { label: 'Planned Backlog', count: dist.Planned, color: '#5A5A5A' },
    { label: 'Overdue', count: dist.Overdue, color: '#FF0000' }
  ].filter(s => s.count > 0);

  const dRadius = 46;
  const dCirc = 2 * Math.PI * dRadius;
  let cumAngle = 0;
  const donutSlices = segments.map(seg => {
    const frac = seg.count / donutTotal;
    const strokeDash = `${frac * dCirc} ${dCirc}`;
    const strokeOffset = -cumAngle * dCirc;
    cumAngle += frac;
    return { ...seg, strokeDash, strokeOffset, pct: Math.round(frac * 100) };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ------------------------------------------------------------- */}
      {/* Top Scope & Session Filter Bar (Unified in one compact row)   */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.55rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isCourseMode && sessions.length > 0 ? '0.4rem' : '0'
      }}>
        {/* Row 1: Course Scope Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ 
            fontSize: '0.7rem', 
            color: 'var(--text-muted)', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginRight: '0.15rem'
          }}>
            Scope:
          </span>

          {/* Full Plan Pill */}
          <button
            type="button"
            onClick={() => handleSelectCourse(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              fontWeight: isGlobalMode ? 600 : 500,
              background: isGlobalMode ? 'var(--bg-surface-elevated)' : 'transparent',
              border: isGlobalMode ? '1.5px solid var(--text-primary)' : '1px solid var(--border-hairline)',
              color: isGlobalMode ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={12} />
            <span>Full Plan</span>
            <span style={{ 
              fontSize: '0.68rem', 
              background: isGlobalMode ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)', 
              padding: '1px 5px', 
              borderRadius: '4px',
              color: 'var(--text-primary)'
            }}>
              {isGlobalMode ? planned : all_courses.reduce((acc, c) => acc + (c.planned || 0), 0) || planned}
            </span>
          </button>

          {/* Individual Course Pills */}
          {all_courses.map((c) => {
            const isSelected = activeCourseId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCourse(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 600 : 500,
                  background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                  border: isSelected ? '1.5px solid #3B82F6' : '1px solid var(--border-hairline)',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <BookOpen size={12} style={{ color: isSelected ? '#3B82F6' : 'var(--text-muted)' }} />
                <span>{formatCourseShortName(c.name)}</span>
              </button>
            );
          })}

          {/* Curriculum-Wide Target Setting Action */}
          <button
            type="button"
            onClick={() => setShowTargetModal(true)}
            className="btn-ghost"
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(232, 163, 61, 0.1)',
              border: '1px solid rgba(232, 163, 61, 0.3)',
              color: '#E8A33D',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Set curriculum targets (Replace or Add mode with warning confirmation)"
          >
            <Target size={13} color="#E8A33D" />
            <span>Set Targets</span>
          </button>
        </div>

        {/* Row 2 (ONLY when in course mode): Session filters placed directly below course labels inside the same container */}
        {isCourseMode && sessions.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            flexWrap: 'wrap',
            paddingTop: '0.4rem',
            borderTop: '1px solid var(--border-hairline)'
          }}>
            <span style={{ 
              fontSize: '0.68rem', 
              color: 'var(--text-muted)', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              marginRight: '0.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Filter size={10} />
              <span>Sessions:</span>
            </span>

            <button
              type="button"
              onClick={() => setActiveSessionId(null)}
              style={{
                padding: '0.18rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: !activeSessionId ? 600 : 400,
                background: !activeSessionId ? 'var(--bg-surface-elevated)' : 'transparent',
                border: !activeSessionId ? '1.5px solid var(--text-secondary)' : '1px solid var(--border-hairline)',
                color: !activeSessionId ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              All ({planned})
            </button>

            {sessions.map(s => {
              const isSessSelected = activeSessionId === s.id;
              const cleanLabel = formatSessionLabel(s.name);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSession(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.28rem',
                    padding: '0.18rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: isSessSelected ? 600 : 400,
                    background: isSessSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                    border: isSessSelected ? `1.5px solid ${s.color || '#3EA65E'}` : '1px solid var(--border-hairline)',
                    color: isSessSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <StatusIcon status={s.status} color={s.color} size={9} />
                  <span>{cleanLabel}</span>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>({s.planned})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Consolidated Overview Row: Target Mini Cards (Col 1) + Status Breakdown (Col 2) + Burnup Pace (Col 3) + Velocity (Col 4) */}
      {/* ------------------------------------------------------------- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* Column 1: Full Plan Target Extruded Card with Inset Elements (Fix 3) */}
        <div 
          className="overview-block-card" 
          style={{ 
            padding: '1.25rem', 
            background: 'var(--bg-surface)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          {/* Header with Title & Targets trigger */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={15} color={statusColor} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.01em' }}>
                {isGlobalMode 
                  ? 'Full Plan Target' 
                  : activeSessionId && cleanActiveSession
                    ? `${course?.name} · ${cleanActiveSession}` 
                    : `${course?.name} Target`}
              </span>
            </div>
            <button
              onClick={() => setShowTargetModal(true)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2F65F6',
                background: 'rgba(47, 101, 246, 0.08)',
                border: '1px solid rgba(47, 101, 246, 0.2)',
                cursor: 'pointer',
                padding: '3px 8px',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
              title="Set and edit curriculum targets"
            >
              Edit Targets
            </button>
          </div>

          {/* Mini Inset Card 1: Target Count */}
          <div
            className="soft-inset"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              background: '#E6EAF0',
              boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: 'rgba(47, 101, 246, 0.12)',
                  color: '#2F65F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Target size={13} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Target Count
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
              {target > 0 ? target : '—'}
            </div>
          </div>

          {/* Mini Inset Card 2: Total Planned */}
          <div
            className="soft-inset"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              background: '#E6EAF0',
              boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#8B5CF6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Calendar size={13} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Planned
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
              {planned}
            </div>
          </div>

          {/* Mini Inset Card 3: Uploaded */}
          <div
            className="soft-inset"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              background: '#E6EAF0',
              boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircle2 size={13} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Uploaded
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>
              {uploaded}
            </div>
          </div>

          {/* Mini Inset Card 4: Scheduled */}
          <div
            className="soft-inset"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              background: '#E6EAF0',
              boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  color: '#06B6D4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={13} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Scheduled
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#06B6D4', lineHeight: 1 }}>
              {scheduled}
            </div>
          </div>

          {/* Mini Inset Card 5: Target Met & Pacing */}
          <div
            className="soft-inset"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              background: '#E6EAF0',
              boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.45), inset -2px -2px 4px rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: `${statusColor}18`,
                  color: statusColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TrendingUp size={13} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Met
                </div>
                <div style={{ fontSize: '9px', color: statusColor, fontWeight: 600 }}>
                  {pacing?.display_text || pacing?.status_label}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  padding: '2px 5px',
                  borderRadius: '5px',
                  fontSize: '9px',
                  fontWeight: 700,
                  background: `${statusColor}22`,
                  color: statusColor
                }}
              >
                {pacing?.status_label || 'Status'}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: statusColor, lineHeight: 1 }}>
                {completion_pct}%
              </span>
            </div>
          </div>

          {/* Mini Inset Card 6 (Optional): Overdue */}
          {overdue > 0 && (
            <div
              className="soft-inset"
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                boxShadow: 'inset 2px 2px 4px rgba(239, 68, 68, 0.15), inset -2px -2px 4px rgba(255, 255, 255, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '7px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AlertTriangle size={13} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Overdue
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>
                {overdue}
              </div>
            </div>
          )}
        </div>

        {/* Card 1: Status Breakdown (Moved up from bottom) */}
        <div className="overview-block-card" style={{ padding: '1.25rem', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }} title="Planned backlog, scheduled, uploaded, overdue">
              <PieChart size={15} color="var(--text-secondary)" />
              <span>Status Breakdown</span>
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1rem', flexWrap: 'wrap', flex: 1, padding: '0.5rem 0' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={dRadius} fill="none" stroke="var(--bg-surface-elevated)" strokeWidth="14" />
                {donutSlices.map((s, idx) => (
                  <circle 
                    key={idx}
                    cx="60" 
                    cy="60" 
                    r={dRadius} 
                    fill="none" 
                    stroke={s.color} 
                    strokeWidth="14"
                    strokeDasharray={s.strokeDash}
                    strokeDashoffset={s.strokeOffset}
                    transform="rotate(-90 60 60)"
                  />
                ))}
              </svg>
              <div style={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
              }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {donutTotal}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>Total Entries</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: '140px', flex: 1 }}>
              {donutSlices.map((seg, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: seg.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {seg.count} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>({seg.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Burnup Pace (Aug 2026 Horizon with Rich Actionable Context) */}
        <div className="overview-block-card" style={{ padding: '1.25rem', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Header Row: Title, Delta Status Badge & Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }} title="Ideal pace trajectory vs actual uploads starting from August 2026">
                <TrendingUp size={16} color={statusColor} />
                <span>Burnup Pace</span>
              </h4>
              {burnup_chart?.pace_delta !== undefined && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  background: burnup_chart.pace_delta < 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: burnup_chart.pace_delta < 0 ? '#EF4444' : '#10B981'
                }}>
                  {burnup_chart.pace_delta < 0 
                    ? `${Math.abs(Math.round(burnup_chart.pace_delta))} behind pace` 
                    : `+${Math.round(burnup_chart.pace_delta)} ahead of pace`}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.68rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '2px', background: '#94A3B8', borderTop: '2px dashed #94A3B8' }} />
                <span style={{ color: '#64748B' }}>Ideal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '2.5px', background: statusColor, borderRadius: '2px' }} />
                <span style={{ color: statusColor, fontWeight: 600 }}>Actual</span>
              </div>
            </div>
          </div>

          {/* Inset Pacing Context Row: Required pace, Current velocity, Time remaining */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            background: '#E6EAF0',
            padding: '6px 10px',
            borderRadius: '10px',
            marginBottom: '0.65rem',
            boxShadow: 'inset 1px 1px 3px rgba(166, 175, 195, 0.4), inset -1px -1px 3px rgba(255, 255, 255, 0.8)'
          }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Need Pace</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>
                {burnup_chart?.pace_needed ?? pacing?.pace_needed ?? 0} <span style={{ fontSize: '9px', fontWeight: 500, color: '#64748B' }}>v/wk</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Current Pace</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: statusColor }}>
                {burnup_chart?.velocity ?? pacing?.velocity ?? 0} <span style={{ fontSize: '9px', fontWeight: 500, color: '#64748B' }}>v/wk</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Time Left</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>
                {burnup_chart?.weeks_remaining ?? pacing?.weeks_remaining ?? 0} <span style={{ fontSize: '9px', fontWeight: 500, color: '#64748B' }}>wks</span>
              </div>
            </div>
          </div>

          {/* SVG Chart Area */}
          <div style={{ width: '100%', overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
            <svg viewBox={`0 0 ${bSvgWidth} ${bSvgHeight}`} style={{ width: '100%', height: 'auto', minWidth: '280px' }}>
              {[0, 0.5, 1].map((ratio, i) => {
                const y = (bSvgHeight - bPadY) - (ratio * bPlotH);
                return (
                  <g key={i}>
                    <line x1={bPadX} y1={y} x2={bSvgWidth - bPadX} y2={y} stroke="var(--border-hairline)" strokeDasharray="3 3" />
                    <text x={bPadX - 6} y={y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                      {Math.round(ratio * maxBurnupVal)}
                    </text>
                  </g>
                );
              })}

              {/* Target Line Ceiling */}
              {target > 0 && target <= maxBurnupVal && (
                <g>
                  <line
                    x1={bPadX}
                    y1={getBy(target)}
                    x2={bSvgWidth - bPadX}
                    y2={getBy(target)}
                    stroke="rgba(37, 99, 235, 0.35)"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={bSvgWidth - bPadX}
                    y={Math.max(12, getBy(target) - 3)}
                    fill="#2563EB"
                    fontSize="8.5"
                    fontWeight="700"
                    textAnchor="end"
                  >
                    Target: {target}
                  </text>
                </g>
              )}

              {/* Ideal Pace Trajectory */}
              {idealPath && (
                <path d={idealPath} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
              )}

              {/* Actual Upload Line */}
              {actualPath && (
                <path d={actualPath} fill="none" stroke={statusColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Actual Data Points with Rich Tooltip */}
              {actualPoints.map(({ pt, idx }) => {
                const cx = getBx(idx);
                const cy = getBy(pt.actual);
                const isHovered = hoveredPoint === `burnup_${idx}`;
                const ptIdeal = Math.round(pt.ideal || 0);
                const ptGap = pt.actual - ptIdeal;
                return (
                  <g key={idx} onMouseEnter={() => setHoveredPoint(`burnup_${idx}`)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={isHovered ? 6 : 4} fill={statusColor} stroke="var(--bg-surface)" strokeWidth="2" />
                    {isHovered && (
                      <g>
                        <rect x={Math.min(bSvgWidth - 92, Math.max(10, cx - 45))} y={Math.max(4, cy - 36)} width="90" height="30" rx="5" fill="#1E293B" opacity="0.95" />
                        <text x={Math.min(bSvgWidth - 47, Math.max(55, cx))} y={Math.max(18, cy - 22)} fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                          {pt.label}: {pt.actual} vids
                        </text>
                        <text x={Math.min(bSvgWidth - 47, Math.max(55, cx))} y={Math.max(28, cy - 12)} fill={ptGap < 0 ? '#F87171' : '#34D399'} fontSize="8" textAnchor="middle">
                          {ptGap < 0 ? `${Math.abs(ptGap)} behind ideal` : `+${ptGap} vs ideal`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Timeline X-Axis Dates */}
              {burnupTimeline.map((pt, i) => {
                if (i % 2 !== 0 && i !== burnupTimeline.length - 1) return null;
                const x = getBx(i);
                return (
                  <text key={i} x={x} y={bSvgHeight - 6} fill="var(--text-muted)" fontSize="8.5" textAnchor="middle">
                    {pt.label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Card 3: Weekly Velocity (Vertical Card View) */}
        <div className="overview-block-card" style={{ padding: '1.25rem', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }} title="Uploads per week (Past 8 weeks)">
                <BarChart2 size={15} color="#3EA65E" />
                <span>Weekly Velocity</span>
              </h4>
            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end',
              background: 'rgba(62, 166, 94, 0.08)',
              border: '1px solid rgba(62, 166, 94, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.2rem 0.55rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3EA65E', lineHeight: 1 }}>
                  {avgVelocity}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#3EA65E', fontWeight: 600 }}>vids/wk</span>
              </div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>8-wk average</span>
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
            <svg viewBox={`0 0 ${vSvgWidth} ${vSvgHeight}`} style={{ width: '100%', height: 'auto', minWidth: '280px' }}>
              {avgVelocity > 0 && (
                <g>
                  <line 
                    x1={vPadX} 
                    y1={(vSvgHeight - vPadY) - ((avgVelocity / maxVelVal) * vPlotH)} 
                    x2={vSvgWidth - vPadX} 
                    y2={(vSvgHeight - vPadY) - ((avgVelocity / maxVelVal) * vPlotH)} 
                    stroke="#E8A33D" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x={vSvgWidth - vPadX} 
                    y={(vSvgHeight - vPadY) - ((avgVelocity / maxVelVal) * vPlotH) - 4} 
                    fill="#E8A33D" 
                    fontSize="8.5" 
                    textAnchor="end"
                  >
                    Avg: {avgVelocity}
                  </text>
                </g>
              )}

              {velocityWeeks.map((vw, i) => {
                const barH = (vw.count / maxVelVal) * vPlotH;
                const x = vPadX + (i * (vPlotW / velocityWeeks.length)) + ((vPlotW / velocityWeeks.length - barWidth) / 2);
                const y = (vSvgHeight - vPadY) - barH;
                const isHovered = hoveredPoint === `vel_${i}`;

                return (
                  <g key={i} onMouseEnter={() => setHoveredPoint(`vel_${i}`)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'pointer' }}>
                    <rect 
                      x={x} 
                      y={y} 
                      width={barWidth} 
                      height={Math.max(2, barH)} 
                      rx="3" 
                      fill={vw.count >= avgVelocity ? '#3EA65E' : '#E8A33D'} 
                      opacity={isHovered ? 1 : 0.85}
                    />
                    <text x={x + barWidth / 2} y={y - 4} fill="var(--text-primary)" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                      {vw.count}
                    </text>
                    <text x={x + barWidth / 2} y={vSvgHeight - 6} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                      {vw.week_label.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Row 3 (Bottom): Course Breakdown (Global or Course Drilldown) */}
      {/* ------------------------------------------------------------- */}

      {/* A. GLOBAL MODE: Course Breakdown (Tabular with Infographics + Card Toggle) */}
      {isGlobalMode && (() => {
        const filteredCourses = courses.filter(c => {
          if (!courseSearch) return true;
          const q = courseSearch.toLowerCase();
          return (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
        }).sort((a, b) => {
          const dir = courseSort.dir === 'asc' ? 1 : -1;
          if (courseSort.field === 'name') return dir * (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
          if (courseSort.field === 'progress') return dir * ((a.completion_pct || 0) - (b.completion_pct || 0));
          if (courseSort.field === 'uploaded') return dir * ((a.uploaded || 0) - (b.uploaded || 0));
          if (courseSort.field === 'target') return dir * ((a.target || 0) - (b.target || 0));
          if (courseSort.field === 'planned') return dir * ((a.planned || 0) - (b.planned || 0));
          if (courseSort.field === 'backlog') return dir * ((a.backlog || 0) - (b.backlog || 0));
          return 0;
        });

        return (
          <div className="content-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header with Title and View Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }} title="Channel-level pacing across certification tracks. Click any course to view subject-wise outline.">
                  <BookOpen size={18} color="#3B82F6" />
                  <span>Course Breakdown</span>
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Search */}
                <div style={{ position: 'relative', minWidth: '180px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Search courses..."
                    style={{
                      width: '100%',
                      padding: '0.3rem 0.6rem 0.3rem 1.65rem',
                      fontSize: '0.76rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                  {courseSearch && (
                    <button
                      type="button"
                      onClick={() => setCourseSearch('')}
                      style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* View Mode Toggle: Cards (Old format default) vs Table */}
                <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setCourseViewMode('cards')}
                    title="Cards View (Old Format)"
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: courseViewMode === 'cards' ? 'var(--bg-surface)' : 'transparent',
                      color: courseViewMode === 'cards' ? '#3B82F6' : 'var(--text-muted)',
                      fontWeight: courseViewMode === 'cards' ? 600 : 500,
                      boxShadow: courseViewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem'
                    }}
                  >
                    <LayoutGrid size={13} />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseViewMode('table')}
                    title="Tabular View"
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: courseViewMode === 'table' ? 'var(--bg-surface)' : 'transparent',
                      color: courseViewMode === 'table' ? '#3B82F6' : 'var(--text-muted)',
                      fontWeight: courseViewMode === 'table' ? 600 : 500,
                      boxShadow: courseViewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem'
                    }}
                  >
                    <TableIcon size={13} />
                    <span>Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TABULAR VIEW */}
            {courseViewMode === 'table' && (
              <div className="table-responsive" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <table className="analytics-table" style={{ margin: 0, width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setCourseSort(p => ({ field: 'name', dir: p.field === 'name' && p.dir === 'asc' ? 'desc' : 'asc' }))}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Course Name</span>
                          <ArrowUpDown size={11} style={{ opacity: courseSort.field === 'name' ? 1 : 0.4 }} />
                        </div>
                      </th>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none', minWidth: '150px' }}
                        onClick={() => setCourseSort(p => ({ field: 'progress', dir: p.field === 'progress' && p.dir === 'desc' ? 'asc' : 'desc' }))}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Completion & Progress</span>
                          <ArrowUpDown size={11} style={{ opacity: courseSort.field === 'progress' ? 1 : 0.4 }} />
                        </div>
                      </th>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none', minWidth: '130px' }}
                        onClick={() => setCourseSort(p => ({ field: 'uploaded', dir: p.field === 'uploaded' && p.dir === 'desc' ? 'asc' : 'desc' }))}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Uploaded / Target</span>
                          <ArrowUpDown size={11} style={{ opacity: courseSort.field === 'uploaded' ? 1 : 0.4 }} />
                        </div>
                      </th>
                      <th style={{ minWidth: '180px' }}>
                        <span>Pipeline Breakdown</span>
                      </th>
                      <th style={{ minWidth: '140px' }}>
                        <span>Pacing & Velocity</span>
                      </th>
                      <th style={{ minWidth: '110px' }}>
                        <span>Scope</span>
                      </th>
                      <th style={{ textAlign: 'right', width: '130px' }}>
                        <span>Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                          No courses match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCourses.map((c, idx) => {
                        const cColor = c.color || '#5A5A5A';
                        return (
                          <tr 
                            key={c.id} 
                            onClick={() => handleSelectCourse(c.id)}
                            style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                          >
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                              {idx + 1}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{ width: '3.5px', height: '30px', borderRadius: '2px', background: cColor, flexShrink: 0 }} />
                                <StatusIcon status={c.status} color={cColor} size={14} />
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                    {c.name}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                    {c.description || 'Certification exam curriculum'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '170px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: cColor, padding: '1px 6px', borderRadius: '4px', background: `${cColor}18` }}>
                                    {c.completion_pct}%
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {c.uploaded} of {c.target > 0 ? c.target : c.planned}
                                  </span>
                                </div>
                                <div style={{ height: '6px', background: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden', width: '100%' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, c.completion_pct)}%`, background: `linear-gradient(90deg, ${cColor}, ${cColor}dd)`, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: cColor }}>
                                    {c.uploaded}
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                      {' / '}{c.target > 0 ? `${c.target} target` : `${c.planned} planned`}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                    {c.planned} total planned
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTargetModal(true);
                                  }}
                                  className="btn-ghost"
                                  style={{ padding: '3px', color: c.target > 0 ? 'var(--text-muted)' : '#E8A33D' }}
                                  title={c.target > 0 ? `Target: ${c.target}. Click to manage targets.` : 'No target set. Click to set target.'}
                                >
                                  <Target size={12} color={c.target > 0 ? 'var(--text-muted)' : '#E8A33D'} />
                                </button>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '190px' }}>
                                <PipelineMiniBar uploaded={c.uploaded} scheduled={c.scheduled} backlog={c.backlog} height={7} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3EA65E' }} />
                                    <span>{c.uploaded} done</span>
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }} />
                                    <span>{c.scheduled} sched</span>
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                                    <span>{c.backlog} backlog</span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.75rem', color: cColor, fontWeight: 600 }}>
                                {c.display_text}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                {c.subject_count} subjects · {c.session_count || 1} sess
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleSelectCourse(c.id); }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '0.3rem 0.65rem',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(59, 130, 246, 0.08)',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  color: '#3B82F6',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>Subject Outline</span>
                                <ChevronRight size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* CARDS VIEW (DEFAULT / OLD FORMAT) */}
            {courseViewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredCourses.map((c) => {
                  const cStatusColor = c.color || '#5A5A5A';
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCourse(c.id)}
                      className="overview-block-card"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `4px solid ${cStatusColor}`,
                        padding: '1rem 1.15rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--text-secondary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.borderLeftColor = cStatusColor;
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <StatusIcon status={c.status} color={cStatusColor} size={14} />
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            {c.name}
                          </h4>
                        </div>
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: `${cStatusColor}18`, color: cStatusColor, fontWeight: 600 }}>
                          {c.completion_pct}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '1.45rem', fontWeight: 700, color: cStatusColor }}>
                          {c.uploaded}
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {' / '}{c.target > 0 ? `${c.target} target` : `${c.planned} planned`}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ({c.planned} planned)
                        </span>
                        {c.target <= 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTargetModal(true);
                            }}
                            style={{
                              marginLeft: 'auto',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 7px',
                              fontSize: '0.68rem',
                              borderRadius: '4px',
                              background: 'rgba(232, 163, 61, 0.1)',
                              color: '#E8A33D',
                              border: '1px solid rgba(232, 163, 61, 0.25)',
                              cursor: 'pointer'
                            }}
                            title="Click to set curriculum targets"
                          >
                            <Target size={10} />
                            <span>No target set</span>
                          </button>
                        )}
                      </div>

                      <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, c.completion_pct)}%`, background: cStatusColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-hairline)', paddingTop: '0.5rem' }}>
                        <span>{c.subject_count} subjects · {c.session_count || 1} sessions</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {c.target > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTargetModal(true);
                              }}
                              className="btn-ghost"
                              style={{ padding: '2px 5px', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                              title="Edit target"
                            >
                              <Target size={10} color="#E8A33D" />
                              <span>{c.target} target</span>
                            </button>
                          )}
                          <span style={{ color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <span>Subject Outline</span>
                            <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* B. COURSE DRILLDOWN MODE: TABULAR SUBJECT-WISE & SESSION-WISE BREAKDOWN */}
      {isCourseMode && (() => {
        // Filtered & Sorted Subjects
        const filteredSubjects = subjects.filter(sub => {
          if (subjectSearch) {
            const q = subjectSearch.toLowerCase();
            if (!(sub.name || '').toLowerCase().includes(q)) return false;
          }
          if (subjectFilter === 'with_planned') return (sub.planned || 0) > 0;
          if (subjectFilter === 'with_target') return (sub.target || 0) > 0;
          if (subjectFilter === 'on_track') return sub.status === 'ON_TRACK' || sub.status === 'TARGET_MET';
          if (subjectFilter === 'backlog') return (sub.backlog || 0) > 0;
          return true;
        }).sort((a, b) => {
          const dir = subjectSort.dir === 'asc' ? 1 : -1;
          if (subjectSort.field === 'name') {
            return dir * (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
          }
          if (subjectSort.field === 'progress') {
            return dir * ((a.completion_pct || 0) - (b.completion_pct || 0));
          }
          if (subjectSort.field === 'uploaded') {
            return dir * ((a.uploaded || 0) - (b.uploaded || 0));
          }
          if (subjectSort.field === 'target') {
            return dir * ((a.target || 0) - (b.target || 0));
          }
          if (subjectSort.field === 'planned') {
            return dir * ((a.planned || 0) - (b.planned || 0));
          }
          if (subjectSort.field === 'backlog') {
            return dir * ((a.backlog || 0) - (b.backlog || 0));
          }
          return 0;
        });

        // Filtered & Sorted Sessions
        const filteredSessions = sessions.filter(sess => {
          if (!sessionSearch) return true;
          const q = sessionSearch.toLowerCase();
          const clean = formatSessionLabel(sess.name).toLowerCase();
          return clean.includes(q) || (sess.name || '').toLowerCase().includes(q);
        }).sort((a, b) => {
          const dir = sessionSort.dir === 'asc' ? 1 : -1;
          if (sessionSort.field === 'name') return dir * (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
          if (sessionSort.field === 'progress') return dir * ((a.completion_pct || 0) - (b.completion_pct || 0));
          if (sessionSort.field === 'target') return dir * ((a.target || 0) - (b.target || 0));
          if (sessionSort.field === 'planned') return dir * ((a.planned || 0) - (b.planned || 0));
          if (sessionSort.field === 'uploaded') return dir * ((a.uploaded || 0) - (b.uploaded || 0));
          if (sessionSort.field === 'date') {
            if (!a.end_date) return 1;
            if (!b.end_date) return -1;
            return dir * a.end_date.localeCompare(b.end_date);
          }
          return 0;
        });

        return (
          <div className="content-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
            {/* 1. Breadcrumb Path & Quick Back Action (Solves requirement to go back from subject level to course level) */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '0.6rem',
              borderBottom: '1px solid var(--border-hairline)',
              paddingBottom: '0.75rem'
            }}>
              {/* Breadcrumbs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => handleSelectCourse(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#3B82F6',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <ArrowLeft size={13} />
                  <span>All Courses</span>
                </button>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  {course?.name}
                </span>
                <span style={{ 
                  fontSize: '0.68rem', 
                  padding: '1px 7px', 
                  borderRadius: '10px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: '#3B82F6', 
                  fontWeight: 600 
                }}>
                  Subject Outline
                </span>
              </div>

              {/* Direct "Back to Course Level" Button */}
              <button
                type="button"
                onClick={() => handleSelectCourse(null)}
                className="btn-ghost"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.color = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Course Level</span>
              </button>
            </div>

            {/* 2. Title and Mode Controls */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '0.75rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-primary)' }}>
                  <BookOpen size={19} color="#3B82F6" />
                  <span>{course?.name} Breakdown</span>
                </h3>
              </div>

              {/* Toggle Buttons: Subjects vs Sessions & Table vs Cards */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setCourseBreakdownTab('subjects')}
                    style={{
                      fontSize: '0.76rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: courseBreakdownTab === 'subjects' ? 'var(--bg-surface)' : 'transparent',
                      color: courseBreakdownTab === 'subjects' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: courseBreakdownTab === 'subjects' ? 600 : 500,
                      boxShadow: courseBreakdownTab === 'subjects' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Layers size={13} />
                    <span>Subjects ({subjects.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseBreakdownTab('sessions')}
                    style={{
                      fontSize: '0.76rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: courseBreakdownTab === 'sessions' ? 'var(--bg-surface)' : 'transparent',
                      color: courseBreakdownTab === 'sessions' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: courseBreakdownTab === 'sessions' ? 600 : 500,
                      boxShadow: courseBreakdownTab === 'sessions' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Calendar size={13} />
                    <span>Sessions ({sessions.length})</span>
                  </button>
                </div>

                {/* Target setting trigger */}
                <button
                  type="button"
                  onClick={() => setShowTargetModal(true)}
                  className="btn-ghost"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    background: 'rgba(232, 163, 61, 0.1)',
                    border: '1px solid rgba(232, 163, 61, 0.3)',
                    color: '#E8A33D',
                    cursor: 'pointer'
                  }}
                  title="Set or update targets for courses and subjects"
                >
                  <Target size={13} color="#E8A33D" />
                  <span>Set Targets</span>
                </button>

                {/* View Switcher: Table vs Cards */}
                <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setBreakdownViewMode('table')}
                    title="Tabular View (with Infographics)"
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: breakdownViewMode === 'table' ? 'var(--bg-surface)' : 'transparent',
                      color: breakdownViewMode === 'table' ? '#3B82F6' : 'var(--text-muted)',
                      fontWeight: breakdownViewMode === 'table' ? 600 : 500,
                      boxShadow: breakdownViewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem'
                    }}
                  >
                    <TableIcon size={13} />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakdownViewMode('cards')}
                    title="Card Grid View"
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: breakdownViewMode === 'cards' ? 'var(--bg-surface)' : 'transparent',
                      color: breakdownViewMode === 'cards' ? '#3B82F6' : 'var(--text-muted)',
                      fontWeight: breakdownViewMode === 'cards' ? 600 : 500,
                      boxShadow: breakdownViewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem'
                    }}
                  >
                    <LayoutGrid size={13} />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Infographic KPI Ribbon for Easy Analysis */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              padding: '0.85rem 1.1rem',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Curriculum
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {subjects.length} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>subjects</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {subjects.filter(s => (s.planned || 0) > 0 || (s.target || 0) > 0).length} actively planned
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Course Completion
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: statusColor, marginTop: '2px' }}>
                  {completion_pct}%
                </div>
                <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px', width: '100%' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, completion_pct)}%`, background: statusColor, borderRadius: '2px' }} />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pipeline Distribution
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {uploaded} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {target > 0 ? `${target} target` : `${planned} planned`}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {scheduled} scheduled · {backlog} backlog
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pacing Health
                </span>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={pacing?.status} displayText={pacing?.display_text || 'On Track'} />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {pacing?.display_text}
                </div>
              </div>
            </div>

            {/* TAB 1: SUBJECTS BREAKDOWN */}
            {courseBreakdownTab === 'subjects' && (
              <div>
                {/* Search & Filter Bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '0.65rem',
                  marginBottom: '0.85rem'
                }}>
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: `All (${subjects.length})` },
                      { id: 'with_planned', label: `Planned (${subjects.filter(s => (s.planned || 0) > 0).length})` },
                      { id: 'with_target', label: `Targeted (${subjects.filter(s => (s.target || 0) > 0).length})` },
                      { id: 'on_track', label: `On Track (${subjects.filter(s => s.status === 'ON_TRACK' || s.status === 'TARGET_MET').length})` },
                      { id: 'backlog', label: `Backlog (${subjects.filter(s => (s.backlog || 0) > 0).length})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSubjectFilter(f.id)}
                        style={{
                          fontSize: '0.73rem',
                          padding: '0.22rem 0.65rem',
                          borderRadius: 'var(--radius-pill)',
                          border: subjectFilter === f.id ? '1px solid #3B82F6' : '1px solid var(--border-hairline)',
                          background: subjectFilter === f.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface-elevated)',
                          color: subjectFilter === f.id ? '#3B82F6' : 'var(--text-secondary)',
                          fontWeight: subjectFilter === f.id ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      placeholder="Search subjects..."
                      style={{
                        width: '100%',
                        padding: '0.32rem 0.65rem 0.32rem 1.75rem',
                        fontSize: '0.76rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                    {subjectSearch && (
                      <button
                        type="button"
                        onClick={() => setSubjectSearch('')}
                        style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* TABULAR FORMAT (WITH INFOGRAPHICS FOR EASY ANALYSIS) */}
                {breakdownViewMode === 'table' ? (
                  <div className="table-responsive" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table className="analytics-table" style={{ margin: 0, width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => setSubjectSort(p => ({ field: 'name', dir: p.field === 'name' && p.dir === 'asc' ? 'desc' : 'asc' }))}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Subject Name</span>
                              <ArrowUpDown size={11} style={{ opacity: subjectSort.field === 'name' ? 1 : 0.4 }} />
                            </div>
                          </th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none', minWidth: '150px' }}
                            onClick={() => setSubjectSort(p => ({ field: 'progress', dir: p.field === 'progress' && p.dir === 'desc' ? 'asc' : 'desc' }))}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Completion & Progress</span>
                              <ArrowUpDown size={11} style={{ opacity: subjectSort.field === 'progress' ? 1 : 0.4 }} />
                            </div>
                          </th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none', minWidth: '130px' }}
                            onClick={() => setSubjectSort(p => ({ field: 'uploaded', dir: p.field === 'uploaded' && p.dir === 'desc' ? 'asc' : 'desc' }))}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Uploaded / Target</span>
                              <ArrowUpDown size={11} style={{ opacity: subjectSort.field === 'uploaded' ? 1 : 0.4 }} />
                            </div>
                          </th>
                          <th style={{ minWidth: '180px' }}>
                            <span>Pipeline Distribution</span>
                          </th>
                          <th style={{ minWidth: '140px' }}>
                            <span>Pacing & Velocity</span>
                          </th>
                          <th style={{ textAlign: 'right', width: '110px' }}>
                            <span>Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubjects.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                              No child subjects match your current filter.
                            </td>
                          </tr>
                        ) : (
                          filteredSubjects.map((sub, idx) => {
                            const sColor = sub.color || '#5A5A5A';
                            return (
                              <tr key={sub.id} style={{ transition: 'background 0.15s ease' }}>
                                {/* Row Index */}
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                                  {idx + 1}
                                </td>

                                {/* Subject Name & Status */}
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <div style={{ width: '3.5px', height: '28px', borderRadius: '2px', background: sColor, flexShrink: 0 }} />
                                    <StatusIcon status={sub.status} color={sColor} size={14} />
                                    <div>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                                        {sub.name}
                                      </div>
                                      <div style={{ marginTop: '2px' }}>
                                        <StatusBadge status={sub.status} displayText={sub.display_text} />
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Completion % and Infographic Progress Bar */}
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '170px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ 
                                        fontSize: '0.74rem', 
                                        fontWeight: 700, 
                                        color: sColor,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: `${sColor}18`
                                      }}>
                                        {sub.completion_pct}%
                                      </span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {sub.uploaded} of {sub.target > 0 ? sub.target : sub.planned}
                                      </span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden', width: '100%' }}>
                                      <div style={{ 
                                        height: '100%', 
                                        width: `${Math.min(100, sub.completion_pct)}%`, 
                                        background: `linear-gradient(90deg, ${sColor}, ${sColor}dd)`,
                                        borderRadius: '3px',
                                        transition: 'width 0.3s ease'
                                      }} />
                                    </div>
                                  </div>
                                </td>

                                {/* Uploaded vs Target / Planned */}
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <div>
                                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: sColor }}>
                                        {sub.uploaded}
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                          {' / '}{sub.target > 0 ? `${sub.target} target` : `${sub.planned} planned`}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                        {sub.planned} total planned
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setShowTargetModal(true)}
                                      className="btn-ghost"
                                      style={{ padding: '3px', color: sub.target > 0 ? 'var(--text-muted)' : '#E8A33D' }}
                                      title={sub.target > 0 ? `Target: ${sub.target}. Click to manage targets.` : 'No target set. Click to set target.'}
                                    >
                                      <Target size={12} color={sub.target > 0 ? 'var(--text-muted)' : '#E8A33D'} />
                                    </button>
                                  </div>
                                </td>

                                {/* Pipeline Distribution Infographic */}
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '190px' }}>
                                    <PipelineMiniBar 
                                      uploaded={sub.uploaded} 
                                      scheduled={sub.scheduled} 
                                      backlog={sub.backlog} 
                                      height={7} 
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3EA65E' }} />
                                        <span>{sub.uploaded} done</span>
                                      </span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }} />
                                        <span>{sub.scheduled} sched</span>
                                      </span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                                        <span>{sub.backlog} backlog</span>
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Pacing & Velocity */}
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: sColor, fontWeight: 600 }}>
                                    {sub.display_text}
                                  </div>
                                </td>

                                {/* Action: View videos in full video list */}
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToVideos && onNavigateToVideos(sub.name)}
                                    title={`View videos for ${sub.name} in Full Video List`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'var(--bg-surface-elevated)',
                                      border: '1px solid var(--border-subtle)',
                                      color: 'var(--text-secondary)',
                                      cursor: onNavigateToVideos ? 'pointer' : 'default',
                                      transition: 'all 0.15s ease',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (onNavigateToVideos) {
                                        e.currentTarget.style.borderColor = '#3B82F6';
                                        e.currentTarget.style.color = '#3B82F6';
                                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (onNavigateToVideos) {
                                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                        e.currentTarget.style.background = 'var(--bg-surface-elevated)';
                                      }
                                    }}
                                  >
                                    <BookOpen size={11} />
                                    <span>Videos</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* CARDS VIEW (ALTERNATIVE) */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filteredSubjects.map((sub) => {
                      const sColor = sub.color || '#5A5A5A';
                      return (
                        <div
                          key={sub.id}
                          className="overview-block-card"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderLeft: `4px solid ${sColor}`,
                            padding: '1rem 1.15rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <StatusIcon status={sub.status} color={sColor} size={14} />
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                                {sub.name}
                              </h4>
                            </div>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              padding: '1px 6px', 
                              borderRadius: '4px', 
                              background: `${sColor}18`, 
                              color: sColor,
                              fontWeight: 600 
                            }}>
                              {sub.completion_pct}%
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: sColor }}>
                              {sub.uploaded}
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {' / '}{sub.target > 0 ? `${sub.target} target` : `${sub.planned} planned`}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ({sub.planned} planned)
                            </span>
                            {sub.target <= 0 && (
                              <button
                                type="button"
                                onClick={() => setShowTargetModal(true)}
                                style={{
                                  marginLeft: 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 7px',
                                  fontSize: '0.68rem',
                                  borderRadius: '4px',
                                  background: 'rgba(232, 163, 61, 0.1)',
                                  color: '#E8A33D',
                                  border: '1px solid rgba(232, 163, 61, 0.25)',
                                  cursor: 'pointer'
                                }}
                                title="Click to set target"
                              >
                                <Target size={10} />
                                <span>No target set</span>
                              </button>
                            )}
                          </div>

                          <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${Math.min(100, sub.completion_pct)}%`, 
                              background: sColor,
                              borderRadius: '2px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-hairline)', paddingTop: '0.5rem' }}>
                            <span>Scheduled: {sub.scheduled} · Backlog: {sub.backlog}</span>
                            <button
                              type="button"
                              onClick={() => setShowTargetModal(true)}
                              className="btn-ghost"
                              style={{ padding: '2px 6px', fontSize: '0.7rem', color: sub.target > 0 ? sColor : '#E8A33D', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
                              title="Click to set or adjust targets"
                            >
                              <Target size={11} />
                              <span>{sub.target > 0 ? sub.display_text : 'No target set'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SESSIONS BREAKDOWN */}
            {courseBreakdownTab === 'sessions' && (
              <div>
                {/* Search & Sort Bar for Sessions */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '0.65rem',
                  marginBottom: '0.85rem'
                }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {filteredSessions.length} session windows configured for {course?.name}
                  </span>

                  <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      placeholder="Search sessions..."
                      style={{
                        width: '100%',
                        padding: '0.32rem 0.65rem 0.32rem 1.75rem',
                        fontSize: '0.76rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                    {sessionSearch && (
                      <button
                        type="button"
                        onClick={() => setSessionSearch('')}
                        style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* TABULAR FORMAT FOR SESSIONS */}
                {breakdownViewMode === 'table' ? (
                  <div className="table-responsive" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table className="analytics-table" style={{ margin: 0, width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => setSessionSort(p => ({ field: 'name', dir: p.field === 'name' && p.dir === 'asc' ? 'desc' : 'asc' }))}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Session Window</span>
                              <ArrowUpDown size={11} style={{ opacity: sessionSort.field === 'name' ? 1 : 0.4 }} />
                            </div>
                          </th>
                          <th style={{ minWidth: '120px' }}>
                            <span>Timeline</span>
                          </th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none', minWidth: '150px' }}
                            onClick={() => setSessionSort(p => ({ field: 'progress', dir: p.field === 'progress' && p.dir === 'desc' ? 'asc' : 'desc' }))}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Completion & Progress</span>
                              <ArrowUpDown size={11} style={{ opacity: sessionSort.field === 'progress' ? 1 : 0.4 }} />
                            </div>
                          </th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none', minWidth: '130px' }}
                            onClick={() => setSessionSort(p => ({ field: 'uploaded', dir: p.field === 'uploaded' && p.dir === 'desc' ? 'asc' : 'desc' }))}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Uploaded / Target</span>
                              <ArrowUpDown size={11} style={{ opacity: sessionSort.field === 'uploaded' ? 1 : 0.4 }} />
                            </div>
                          </th>
                          <th style={{ minWidth: '180px' }}>
                            <span>Pipeline Distribution</span>
                          </th>
                          <th style={{ minWidth: '140px' }}>
                            <span>Pacing & Status</span>
                          </th>
                          <th style={{ textAlign: 'right', width: '120px' }}>
                            <span>Filter View</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                              No sessions match your search.
                            </td>
                          </tr>
                        ) : (
                          filteredSessions.map((sess, idx) => {
                            const sessColor = sess.color || '#5A5A5A';
                            const isFiltered = activeSessionId === sess.id;
                            const cleanLabel = formatSessionLabel(sess.name);

                            return (
                              <tr 
                                key={sess.id}
                                onClick={() => handleSelectSession(sess.id)}
                                style={{ 
                                  cursor: 'pointer',
                                  background: isFiltered ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                  transition: 'background 0.15s ease' 
                                }}
                              >
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                                  {idx + 1}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <div style={{ width: '3.5px', height: '28px', borderRadius: '2px', background: sessColor, flexShrink: 0 }} />
                                    <StatusIcon status={sess.status} color={sessColor} size={14} />
                                    <div>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                        {cleanLabel}
                                      </div>
                                      {isFiltered && (
                                        <span style={{ fontSize: '0.68rem', color: '#3B82F6', fontWeight: 600 }}>
                                          ● Active Filter
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={11} />
                                    <span>{sess.end_date ? `Ends ${sess.end_date}` : 'Evergreen'}</span>
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '170px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: sessColor, padding: '1px 6px', borderRadius: '4px', background: `${sessColor}18` }}>
                                        {sess.completion_pct}%
                                      </span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {sess.uploaded} of {sess.target > 0 ? sess.target : sess.planned}
                                      </span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden', width: '100%' }}>
                                      <div style={{ height: '100%', width: `${Math.min(100, sess.completion_pct)}%`, background: `linear-gradient(90deg, ${sessColor}, ${sessColor}dd)`, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: sessColor }}>
                                      {sess.uploaded}
                                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                        {' / '}{sess.target > 0 ? `${sess.target} target` : `${sess.planned} planned`}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                      {sess.planned} total planned
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '190px' }}>
                                    <PipelineMiniBar uploaded={sess.uploaded} scheduled={sess.scheduled} backlog={sess.backlog} height={7} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3EA65E' }} />
                                        <span>{sess.uploaded} done</span>
                                      </span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }} />
                                        <span>{sess.scheduled} sched</span>
                                      </span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                                        <span>{sess.backlog} backlog</span>
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.75rem', color: sessColor, fontWeight: 600 }}>
                                    {sess.display_text}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleSelectSession(sess.id); }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '0.3rem 0.65rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      borderRadius: 'var(--radius-sm)',
                                      background: isFiltered ? sessColor : 'var(--bg-surface-elevated)',
                                      border: `1px solid ${isFiltered ? sessColor : 'var(--border-subtle)'}`,
                                      color: isFiltered ? '#FFFFFF' : 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span>{isFiltered ? '● Active' : 'Filter View'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* CARDS VIEW FOR SESSIONS */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filteredSessions.map((sess) => {
                      const sessColor = sess.color || '#5A5A5A';
                      const isFiltered = activeSessionId === sess.id;
                      const cleanLabel = formatSessionLabel(sess.name);
                      return (
                        <div
                          key={sess.id}
                          onClick={() => handleSelectSession(sess.id)}
                          className="overview-block-card"
                          style={{
                            background: isFiltered ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                            border: isFiltered ? `1.5px solid ${sessColor}` : '1px solid var(--border-subtle)',
                            borderLeft: `4px solid ${sessColor}`,
                            padding: '1rem 1.15rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <StatusIcon status={sess.status} color={sessColor} size={14} />
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                                {cleanLabel}
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: `${sessColor}18`, color: sessColor, fontWeight: 600 }}>
                              {sess.completion_pct}%
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: sessColor }}>
                              {sess.uploaded}
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {' / '}{sess.target > 0 ? `${sess.target} target` : `${sess.planned} planned`}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ({sess.planned} planned)
                            </span>
                          </div>

                          <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, sess.completion_pct)}%`, background: sessColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-hairline)', paddingTop: '0.5rem' }}>
                            <span>{sess.end_date ? `Ends ${sess.end_date}` : 'Evergreen'}</span>
                            <span style={{ color: isFiltered ? sessColor : '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span>{isFiltered ? '● Active' : 'Filter charts'}</span>
                              <ChevronRight size={12} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Target Management Modal (Independent of Sessions, with Replace/Add Warning) */}
      {showTargetModal && (
        <TargetManagementModal
          onClose={() => setShowTargetModal(false)}
          onSuccess={() => {
            setShowTargetModal(false);
            fetchAnalytics(activeCourseId, activeSessionId);
          }}
        />
      )}
    </div>
  );
}
