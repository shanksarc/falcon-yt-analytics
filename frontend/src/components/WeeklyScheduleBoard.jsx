import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, AlertTriangle, 
  ChevronRight, GripVertical, Check, Plus, ArrowRight, Layers,
  CalendarDays, Grid, Maximize2, X, ExternalLink, Zap
} from 'lucide-react';

// Helper to get ISO week string: "YYYY-Www"
function getIsoWeek(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Derive month "YYYY-MM" from ISO week string "YYYY-Www"
function deriveMonthFromWeek(weekStr) {
  if (!weekStr || !weekStr.includes('-W')) return null;
  try {
    const [yearStr, wNumStr] = weekStr.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(wNumStr, 10);
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const mondayWeek1 = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
    const targetMonday = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
    const m = targetMonday.getMonth() + 1;
    return `${targetMonday.getFullYear()}-${String(m).padStart(2, '0')}`;
  } catch (e) {
    return null;
  }
}

// Generate the rolling 4 weeks from today (Tier 2 Fine Allocation)
function getRolling4Weeks() {
  const weeks = [];
  const now = new Date();
  
  // Current week's Monday
  const currMonday = new Date(now);
  const day = currMonday.getDay();
  const diff = currMonday.getDate() - day + (day === 0 ? -6 : 1);
  currMonday.setDate(diff);
  currMonday.setHours(0, 0, 0, 0);

  const currentWeekIso = getIsoWeek(now);

  for (let i = 0; i < 4; i++) {
    const wStart = new Date(currMonday.getTime() + i * 7 * 86400000);
    const wEnd = new Date(wStart.getTime() + 6 * 86400000);
    const weekIso = getIsoWeek(wStart);
    const isCurrent = weekIso === currentWeekIso;

    const startMonth = wStart.toLocaleString('default', { month: 'short' });
    const endMonth = wEnd.toLocaleString('default', { month: 'short' });
    const dateRange = startMonth === endMonth 
      ? `${startMonth} ${wStart.getDate()} - ${wEnd.getDate()}`
      : `${startMonth} ${wStart.getDate()} - ${endMonth} ${wEnd.getDate()}`;

    const weekNum = weekIso.split('-W')[1];

    let label = `Week ${weekNum}`;
    if (i === 0) label = `This Week (W${weekNum})`;
    else if (i === 1) label = `Next Week (W${weekNum})`;

    weeks.push({
      weekId: weekIso,
      weekNumber: weekNum,
      label,
      dateRange,
      startDate: wStart,
      endDate: wEnd,
      isCurrent
    });
  }

  return weeks;
}

// Generate the rolling 12 calendar months from current month (Tier 1 Coarse Allocation)
function getRolling12Months() {
  const months = [];
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth(); // 0-indexed

  for (let i = 0; i < 12; i++) {
    const d = new Date(curYear, curMonth + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;
    const name = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const shortName = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    const isCurrent = i === 0;

    months.push({
      monthKey,
      name,
      shortName,
      monthIndex: m - 1,
      year: y,
      isCurrent
    });
  }
  return months;
}

// Generate all ISO weeks that fall within a given calendar month
function getWeeksForMonth(year, monthIndex) {
  const weeks = [];
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  let current = new Date(firstDay);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);

  const seenWeeks = new Set();

  while (current <= lastDay || current.getMonth() === monthIndex) {
    const weekIso = getIsoWeek(current);
    if (!seenWeeks.has(weekIso)) {
      seenWeeks.add(weekIso);
      const wStart = new Date(current);
      const wEnd = new Date(current.getTime() + 6 * 86400000);
      const startM = wStart.toLocaleString('default', { month: 'short' });
      const endM = wEnd.toLocaleString('default', { month: 'short' });
      const dateRange = startM === endM
        ? `${startM} ${wStart.getDate()} - ${endM} ${wEnd.getDate()}`
        : `${startM} ${wStart.getDate()} - ${endM} ${wEnd.getDate()}`;

      weeks.push({
        weekId: weekIso,
        weekNumber: weekIso.split('-W')[1],
        label: `Week ${weekIso.split('-W')[1]}`,
        dateRange,
        startDate: wStart,
        endDate: wEnd
      });
    }
    current = new Date(current.getTime() + 7 * 86400000);
    if (current.getFullYear() > year && current.getMonth() > 0) break;
  }

  return weeks;
}

export default function WeeklyScheduleBoard({ 
  session, 
  plannedVideos = [], 
  onUpdateVideo, 
  onRefresh,
  onOpenPlanModal 
}) {
  // Two-Tier Architecture View: '12month' (Coarse) | '4week' (Fine)
  const [scheduleTier, setScheduleTier] = useState('12month'); // '12month' | '4week'
  const [contentTypeFilter, setContentTypeFilter] = useState('ALL'); // 'ALL' | 'video' | 'short'
  const [focusedMonth, setFocusedMonth] = useState(null); // month object for Month Drill-Down Modal
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null); // { pv, x, y }

  const currentWeekIso = useMemo(() => getIsoWeek(new Date()), []);
  const rolling4Weeks = useMemo(() => getRolling4Weeks(), []);
  const rolling12Months = useMemo(() => getRolling12Months(), []);

  // Filter planned videos by content type
  const filteredPlannedVideos = useMemo(() => {
    if (contentTypeFilter === 'ALL') return plannedVideos;
    if (contentTypeFilter === 'short') return plannedVideos.filter(pv => pv.content_type === 'short');
    return plannedVideos.filter(pv => pv.content_type !== 'short');
  }, [plannedVideos, contentTypeFilter]);

  // Split planned videos into Backlog (Pending), Month Allocations, and Week Allocations
  const { backlog, overdue, monthMap, weekMap } = useMemo(() => {
    const b = [];
    const o = [];
    const mm = {};
    const wm = {};

    rolling12Months.forEach(m => {
      mm[m.monthKey] = [];
    });

    rolling4Weeks.forEach(w => {
      wm[w.weekId] = { due: [], completed: [] };
    });

    filteredPlannedVideos.forEach(pv => {
      const isUploaded = pv.status === 'Uploaded';
      const w = pv.assigned_week;
      const m = pv.assigned_month || deriveMonthFromWeek(w);

      // Check overdue (scheduled in a past week and not uploaded)
      if (w && w < currentWeekIso && !isUploaded) {
        o.push(pv);
      }

      // Check rolling 4-week match
      if (w && wm[w]) {
        if (isUploaded) wm[w].completed.push(pv);
        else wm[w].due.push(pv);
      }

      // Check 12-month match
      if (m && mm[m]) {
        mm[m].push(pv);
      }

      // Unscheduled backlog: not assigned to any month or week
      if (!w && !pv.assigned_month) {
        if (!isUploaded) b.push(pv);
      }
    });

    return { backlog: b, overdue: o, monthMap: mm, weekMap: wm };
  }, [plannedVideos, rolling12Months, rolling4Weeks, currentWeekIso]);

  // Drag & Drop Handlers
  const handleDragStart = (e, pv) => {
    e.dataTransfer.setData('text/plain', pv.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  // Drop targets can be:
  // - 'backlog': { assigned_month: null, assigned_week: null }
  // - 'month:YYYY-MM': { assigned_month: 'YYYY-MM', assigned_week: null }
  // - 'week:YYYY-Www': { assigned_week: 'YYYY-Www', assigned_month: deriveMonthFromWeek('YYYY-Www') }
  // - 'month-backlog:YYYY-MM': { assigned_month: 'YYYY-MM', assigned_week: null }
  const handleDrop = async (e, dropTarget) => {
    e.preventDefault();
    setDragOverTarget(null);
    const pvId = e.dataTransfer.getData('text/plain');
    if (!pvId || !onUpdateVideo) return;

    if (dropTarget === 'backlog') {
      await onUpdateVideo(pvId, { assigned_month: null, assigned_week: null });
    } else if (dropTarget.startsWith('month:')) {
      const monthKey = dropTarget.replace('month:', '');
      await onUpdateVideo(pvId, { assigned_month: monthKey, assigned_week: null });
    } else if (dropTarget.startsWith('week:')) {
      const weekId = dropTarget.replace('week:', '');
      const derivedM = deriveMonthFromWeek(weekId);
      await onUpdateVideo(pvId, { assigned_week: weekId, assigned_month: derivedM });
    } else if (dropTarget.startsWith('month-backlog:')) {
      const monthKey = dropTarget.replace('month-backlog:', '');
      await onUpdateVideo(pvId, { assigned_month: monthKey, assigned_week: null });
    }
  };

  const handleToggleStatus = async (pv, e) => {
    if (e) e.stopPropagation();
    const nextStatus = pv.status === 'Uploaded' ? 'Planned' : 'Uploaded';
    if (onUpdateVideo) {
      await onUpdateVideo(pv.id, { status: nextStatus });
    }
  };

  // Minimized High-Density Card Component (Truncated title + status dot)
  const renderCompactCard = (pv, isOverdue = false, isDrilldown = false) => {
    const isUploaded = pv.status === 'Uploaded';
    const courseName = pv.lists?.find(l => l.is_course || ['list_cfa_l1', 'list_cfa_l2', 'list_frm_p1'].includes(l.id))?.name || pv.lists?.[0]?.name;
    const subjectName = pv.lists?.find(l => l.name !== courseName)?.name;

    const statusDotColor = isOverdue 
      ? '#FF0000' 
      : (isUploaded ? '#3EA65E' : (pv.status === 'In Progress' ? '#E8A33D' : '#5A5A5A'));

    return (
      <div 
        key={pv.id}
        draggable
        onDragStart={(e) => handleDragStart(e, pv)}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoveredCard({ pv, x: rect.right + 10, y: rect.top - 5, courseName, subjectName });
        }}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.4rem',
          background: isOverdue ? 'rgba(255, 0, 0, 0.06)' : (isUploaded ? 'rgba(62, 166, 94, 0.05)' : 'var(--bg-surface-elevated)'),
          border: isOverdue ? '1px solid rgba(255, 0, 0, 0.4)' : (isUploaded ? '1px solid rgba(62, 166, 94, 0.25)' : '1px solid var(--border-subtle)'),
          borderLeft: `3.5px solid ${statusDotColor}`,
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 0.55rem',
          cursor: 'grab',
          userSelect: 'none',
          marginBottom: '0.35rem',
          fontSize: '0.78rem',
          transition: 'transform 0.1s ease, border-color 0.1s ease'
        }}
        className="compact-schedule-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1 }}>
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: statusDotColor, 
              flexShrink: 0 
            }} 
          />
          {pv.content_type === 'short' && (
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: '3px',
              background: 'rgba(232, 163, 61, 0.2)',
              color: '#E8A33D',
              flexShrink: 0
            }}>
              ⚡ Short
            </span>
          )}
          <span 
            style={{ 
              fontWeight: 500, 
              color: isUploaded ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isUploaded ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={pv.title}
          >
            {pv.title}
          </span>
        </div>

        <button 
          type="button"
          className="btn-ghost"
          style={{ 
            padding: '1px', 
            color: isUploaded ? '#3EA65E' : 'var(--text-muted)',
            borderRadius: '50%',
            flexShrink: 0
          }}
          onClick={(e) => handleToggleStatus(pv, e)}
          title={isUploaded ? "Mark as Planned" : "Mark as Uploaded"}
        >
          {isUploaded ? (
            <CheckCircle2 size={13} color="#3EA65E" />
          ) : (
            <div style={{ width: 11, height: 11, borderRadius: '50%', border: '1.2px solid var(--border-hairline)' }} />
          )}
        </button>
      </div>
    );
  };

  // Weeks for Month Focus modal
  const focusedMonthWeeks = useMemo(() => {
    if (!focusedMonth) return [];
    return getWeeksForMonth(focusedMonth.year, focusedMonth.monthIndex);
  }, [focusedMonth]);

  // Planned videos in focused month split by Month Backlog vs Specific Weeks
  const { monthBacklogVideos, monthWeekMap } = useMemo(() => {
    if (!focusedMonth) return { monthBacklogVideos: [], monthWeekMap: {} };
    const mKey = focusedMonth.monthKey;
    const allInMonth = monthMap[mKey] || [];

    const mb = [];
    const mwm = {};
    focusedMonthWeeks.forEach(w => {
      mwm[w.weekId] = [];
    });

    allInMonth.forEach(pv => {
      if (pv.assigned_week && mwm[pv.assigned_week]) {
        mwm[pv.assigned_week].push(pv);
      } else {
        mb.push(pv);
      }
    });

    return { monthBacklogVideos: mb, monthWeekMap: mwm };
  }, [focusedMonth, monthMap, focusedMonthWeeks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ------------------------------------------------------------- */}
      {/* Header & Two-Tier View Switcher                                */}
      {/* ------------------------------------------------------------- */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '0.75rem' 
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
            Upload Schedule Board
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {scheduleTier === '12month' 
              ? 'Coarse planning: Drag videos from backlog into target months. Click any month box to distribute into weeks.' 
              : 'Near-term precision: Allocate videos into the rolling 4-week window. Overdue items roll over automatically.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Segmented Tier Switcher */}
          <div style={{ 
            display: 'inline-flex', 
            background: 'var(--bg-surface-elevated)', 
            padding: '2px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <button
              type="button"
              onClick={() => setScheduleTier('12month')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: scheduleTier === '12month' ? 600 : 500,
                color: scheduleTier === '12month' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: scheduleTier === '12month' ? 'var(--bg-surface)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxShadow: scheduleTier === '12month' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
              id="btn-tier-12month"
            >
              <Grid size={13} />
              <span>12-Month Grid (Coarse)</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleTier('4week')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: scheduleTier === '4week' ? 600 : 500,
                color: scheduleTier === '4week' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: scheduleTier === '4week' ? 'var(--bg-surface)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxShadow: scheduleTier === '4week' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
              id="btn-tier-4week"
            >
              <CalendarDays size={13} />
              <span>Rolling 4-Week (Fine)</span>
            </button>
          </div>

          {/* Content Type Filter Switcher */}
          <div style={{ 
            display: 'inline-flex', 
            background: 'var(--bg-surface-elevated)', 
            padding: '2px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <button
              type="button"
              onClick={() => setContentTypeFilter('ALL')}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: contentTypeFilter === 'ALL' ? 600 : 500,
                color: contentTypeFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: contentTypeFilter === 'ALL' ? 'var(--bg-surface)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxShadow: contentTypeFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              All Content
            </button>
            <button
              type="button"
              onClick={() => setContentTypeFilter('video')}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: contentTypeFilter === 'video' ? 600 : 500,
                color: contentTypeFilter === 'video' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: contentTypeFilter === 'video' ? 'var(--bg-surface)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxShadow: contentTypeFilter === 'video' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Lectures
            </button>
            <button
              type="button"
              onClick={() => setContentTypeFilter('short')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: contentTypeFilter === 'short' ? 600 : 500,
                color: contentTypeFilter === 'short' ? '#E8A33D' : 'var(--text-muted)',
                background: contentTypeFilter === 'short' ? 'var(--bg-surface)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxShadow: contentTypeFilter === 'short' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={12} fill={contentTypeFilter === 'short' ? '#E8A33D' : 'none'} />
              <span>Shorts</span>
            </button>
          </div>

          <button 
            className="btn-ghost"
            style={{ fontSize: '0.76rem' }}
            onClick={() => setIsBacklogCollapsed(!isBacklogCollapsed)}
          >
            {isBacklogCollapsed ? `Show Backlog (${backlog.length})` : `Hide Backlog (${backlog.length})`}
          </button>
          <button 
            className="btn-primary" 
            style={{ fontSize: '0.76rem', padding: '0.32rem 0.7rem' }}
            onClick={onOpenPlanModal}
          >
            <Plus size={13} />
            <span>Plan Video</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Workspace: Shared Backlog Panel + Tier Surface            */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
        {/* Unscheduled Backlog Panel (Pending videos without month/week) */}
        {!isBacklogCollapsed && (
          <div 
            onDragOver={(e) => handleDragOver(e, 'backlog')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'backlog')}
            style={{ 
              width: '240px', 
              flexShrink: 0,
              background: dragOverTarget === 'backlog' ? 'rgba(255,255,255,0.06)' : 'var(--bg-surface)',
              border: dragOverTarget === 'backlog' ? '1.5px dashed var(--text-secondary)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '620px',
              transition: 'background 0.15s ease, border-color 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.82rem' }}>
                <Layers size={14} color="var(--text-secondary)" />
                <span>Pending Backlog</span>
              </div>
              <span className="badge" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                {backlog.length}
              </span>
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              paddingRight: '2px',
              minHeight: '120px'
            }}>
              {backlog.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2.5rem 0.8rem', 
                  color: 'var(--text-muted)', 
                  fontSize: '0.75rem',
                  border: '1px dashed var(--border-hairline)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  No unassigned backlog items. Drag videos here to unallocate.
                </div>
              ) : (
                backlog.map(pv => renderCompactCard(pv, false))
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* Tier 1: 12-Month Allocation Grid                            */}
        {/* ----------------------------------------------------------- */}
        {scheduleTier === '12month' && (
          <div style={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '0.85rem',
            alignContent: 'start',
            minWidth: 0
          }}>
            {rolling12Months.map((m) => {
              const videosInMonth = monthMap[m.monthKey] || [];
              const uploadedCount = videosInMonth.filter(v => v.status === 'Uploaded').length;
              const plannedCount = videosInMonth.length;
              const isTarget = dragOverTarget === `month:${m.monthKey}`;

              return (
                <div
                  key={m.monthKey}
                  onDragOver={(e) => handleDragOver(e, `month:${m.monthKey}`)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, `month:${m.monthKey}`)}
                  onClick={() => setFocusedMonth(m)}
                  style={{
                    background: isTarget ? 'rgba(255,255,255,0.06)' : 'var(--bg-surface)',
                    border: isTarget 
                      ? '1.5px dashed var(--text-secondary)' 
                      : (m.isCurrent ? '1px solid var(--text-secondary)' : '1px solid var(--border-subtle)'),
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '140px',
                    transition: 'all 0.15s ease'
                  }}
                  className="month-grid-box"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: m.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {m.name}
                      </span>
                      {m.isCurrent && (
                        <span style={{ 
                          fontSize: '0.62rem', 
                          background: 'rgba(62, 166, 94, 0.15)', 
                          color: '#3EA65E', 
                          fontWeight: 700, 
                          padding: '1px 4px', 
                          borderRadius: '3px' 
                        }}>
                          NOW
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span className="badge" style={{ fontSize: '0.7rem' }}>
                        {plannedCount} {plannedCount === 1 ? 'vid' : 'vids'}
                      </span>
                      <Maximize2 size={12} color="var(--text-muted)" />
                    </div>
                  </div>

                  {/* Lightweight count & status bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>{uploadedCount} uploaded</span>
                    <span>•</span>
                    <span>{plannedCount - uploadedCount} pending</span>
                  </div>

                  {/* High-density preview chips */}
                  <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {videosInMonth.length === 0 ? (
                      <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--text-muted)', 
                        fontSize: '0.72rem',
                        border: '1px dashed var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        Drop videos here
                      </div>
                    ) : (
                      <>
                        {videosInMonth.slice(0, 3).map(pv => renderCompactCard(pv, false))}
                        {videosInMonth.length > 3 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '2px' }}>
                            + {videosInMonth.length - 3} more (click to view all)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* Tier 2: Rolling 4-Week View                                 */}
        {/* ----------------------------------------------------------- */}
        {scheduleTier === '4week' && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            gap: '0.85rem', 
            overflowX: 'auto', 
            paddingBottom: '0.5rem',
            minWidth: 0
          }}>
            {rolling4Weeks.map((w) => {
              const isTarget = dragOverTarget === `week:${w.weekId}`;
              const weekData = weekMap[w.weekId] || { due: [], completed: [] };
              const isCur = w.isCurrent;
              const totalInWeek = weekData.due.length + weekData.completed.length + (isCur ? overdue.length : 0);

              return (
                <div 
                  key={w.weekId}
                  onDragOver={(e) => handleDragOver(e, `week:${w.weekId}`)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, `week:${w.weekId}`)}
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    background: isTarget ? 'rgba(255,255,255,0.06)' : 'var(--bg-surface)',
                    border: isTarget 
                      ? '1.5px dashed var(--text-secondary)' 
                      : (isCur ? '1px solid var(--text-secondary)' : '1px solid var(--border-subtle)'),
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '620px',
                    transition: 'background 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  {/* Column Header */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.5rem',
                    marginBottom: '0.65rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: isCur ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {w.label}
                        </span>
                        {isCur && (
                          <span style={{ 
                            fontSize: '0.62rem', 
                            background: 'rgba(62, 166, 94, 0.15)', 
                            color: '#3EA65E', 
                            fontWeight: 700, 
                            padding: '1px 5px', 
                            borderRadius: '3px' 
                          }}>
                            NOW
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {w.dateRange}
                      </div>
                    </div>

                    <span className="badge" style={{ fontSize: '0.7rem' }}>
                      {totalInWeek}
                    </span>
                  </div>

                  {/* Column Body */}
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
                    {/* Overdue / Rolled over into current week in red */}
                    {isCur && overdue.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          color: '#FF0000', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <AlertCircle size={12} color="#FF0000" />
                          <span>Overdue ({overdue.length})</span>
                        </div>
                        {overdue.map(pv => renderCompactCard(pv, true))}
                      </div>
                    )}

                    {/* Due this week */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ 
                        fontSize: '0.68rem', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '0.35rem'
                      }}>
                        Due ({weekData.due.length})
                      </div>
                      {weekData.due.length === 0 && (!isCur || overdue.length === 0) ? (
                        <div style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-muted)', 
                          fontSize: '0.72rem',
                          border: '1px dashed var(--border-hairline)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '0.5rem'
                        }}>
                          Drop videos here
                        </div>
                      ) : (
                        weekData.due.map(pv => renderCompactCard(pv, false))
                      )}
                    </div>

                    {/* Completed this week */}
                    {weekData.completed.length > 0 && (
                      <div>
                        <div style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 600, 
                          color: '#3EA65E', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <Check size={12} color="#3EA65E" />
                          <span>Completed ({weekData.completed.length})</span>
                        </div>
                        {weekData.completed.map(pv => renderCompactCard(pv, false))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Month Focus Drill-Down Modal (Tier 1 -> Weekly Breakdown)      */}
      {/* ------------------------------------------------------------- */}
      {focusedMonth && (
        <div className="modal-overlay" onClick={() => setFocusedMonth(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '960px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: 'var(--radius-md)', 
                  background: 'rgba(62, 166, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <Calendar size={18} color="#3EA65E" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.1rem' }}>
                    {focusedMonth.name} Schedule Breakdown
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                    Distribute videos from the month-level pool into specific weeks. Unassigned videos stay at the month level.
                  </p>
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setFocusedMonth(null)} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Month Backlog (Left) + Month Weeks (Right) */}
            <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden', minHeight: '380px' }}>
              {/* Month-Level Pool Panel */}
              <div 
                onDragOver={(e) => handleDragOver(e, `month-backlog:${focusedMonth.monthKey}`)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, `month-backlog:${focusedMonth.monthKey}`)}
                style={{ 
                  width: '230px', 
                  flexShrink: 0,
                  background: dragOverTarget === `month-backlog:${focusedMonth.monthKey}` ? 'rgba(255,255,255,0.06)' : 'var(--bg-surface)',
                  border: dragOverTarget === `month-backlog:${focusedMonth.monthKey}` ? '1.5px dashed var(--text-secondary)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Month-Level Pool</span>
                  <span className="badge" style={{ fontSize: '0.68rem' }}>
                    {monthBacklogVideos.length}
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {monthBacklogVideos.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2.5rem 0.5rem', 
                      color: 'var(--text-muted)', 
                      fontSize: '0.72rem',
                      border: '1px dashed var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      All videos for this month are assigned to specific weeks, or none planned yet.
                    </div>
                  ) : (
                    monthBacklogVideos.map(pv => renderCompactCard(pv, false, true))
                  )}
                </div>
              </div>

              {/* Month Week Columns */}
              <div style={{ flex: 1, display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {focusedMonthWeeks.map(w => {
                  const weekVids = monthWeekMap[w.weekId] || [];
                  const isTarget = dragOverTarget === `week:${w.weekId}`;

                  return (
                    <div
                      key={w.weekId}
                      onDragOver={(e) => handleDragOver(e, `week:${w.weekId}`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, `week:${w.weekId}`)}
                      style={{
                        flex: 1,
                        minWidth: '150px',
                        background: isTarget ? 'rgba(255,255,255,0.06)' : 'var(--bg-surface)',
                        border: isTarget ? '1.5px dashed var(--text-secondary)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ 
                        borderBottom: '1px solid var(--border-subtle)', 
                        paddingBottom: '0.4rem', 
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{w.label}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{w.dateRange}</div>
                        </div>
                        <span className="badge" style={{ fontSize: '0.65rem' }}>
                          {weekVids.length}
                        </span>
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        {weekVids.length === 0 ? (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '1.5rem 0.3rem', 
                            color: 'var(--text-muted)', 
                            fontSize: '0.7rem',
                            border: '1px dashed var(--border-hairline)',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            Drop here
                          </div>
                        ) : (
                          weekVids.map(pv => renderCompactCard(pv, false, true))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem' }}>
              <button className="btn-primary" onClick={() => setFocusedMonth(null)} style={{ fontSize: '0.82rem' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Floating Card Details Popover on Hover                         */}
      {/* ------------------------------------------------------------- */}
      {hoveredCard && (
        <div 
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 270, hoveredCard.x)}px`,
            top: `${Math.min(window.innerHeight - 180, hoveredCard.y)}px`,
            width: '250px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            {hoveredCard.courseName && (
              <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--bg-surface)', fontWeight: 600 }}>
                {hoveredCard.courseName}
              </span>
            )}
            {hoveredCard.subjectName && (
              <span className="badge" style={{ fontSize: '0.65rem' }}>
                {hoveredCard.subjectName}
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '0.4rem' }}>
            {hoveredCard.pv.title}
          </div>

          {hoveredCard.pv.hook && (
            <div style={{ fontSize: '0.72rem', color: '#E8A33D', margin: '0.35rem 0', fontStyle: 'italic', background: 'rgba(232, 163, 61, 0.08)', padding: '4px 6px', borderRadius: '4px' }}>
              ⚡ &ldquo;{hoveredCard.pv.hook}&rdquo;
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>Status: <strong style={{ color: hoveredCard.pv.status === 'Uploaded' ? '#3EA65E' : 'var(--text-secondary)' }}>{hoveredCard.pv.status}</strong></span>
            <span>{hoveredCard.pv.assigned_week || (hoveredCard.pv.assigned_month ? `Month: ${hoveredCard.pv.assigned_month}` : 'Backlog')}</span>
          </div>

          {hoveredCard.pv.notes && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem' }}>
              {hoveredCard.pv.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
