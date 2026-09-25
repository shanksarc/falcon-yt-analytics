import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Plus, Target, CheckCircle2, Clock, AlertTriangle, 
  ChevronRight, ArrowRight, Eye, ThumbsUp, Filter, Search, 
  Layers, Edit3, Trash2, Sparkles, Video, Film, Check, X,
  LayoutGrid, List as ListIcon, RefreshCw, BookOpen
} from 'lucide-react';

const PRESET_SERIES = [
  "Calculator Hacks (TI BA II Plus)",
  "Formula Hacks in 60s",
  "Concept in 60s",
  "Exam Traps & Pitfalls",
  "Ethics Quick-Bite",
  "Rapid Q&A / Doubt"
];

const STAGE_ORDER = ["Idea", "Scripted", "Recorded", "Uploaded"];

const STAGE_CONFIG = {
  Idea: { label: "💡 Ideas / Concept", color: "#8E8E93", next: "Scripted" },
  Scripted: { label: "📝 Scripted / Ready", color: "#3B82F6", next: "Recorded" },
  Recorded: { label: "🎙️ Recorded", color: "#E8A33D", next: "Uploaded" },
  Uploaded: { label: "🚀 Uploaded & Published", color: "#3EA65E", next: null }
};

export default function ShortsPlannerHub({
  activeSessionId = null,
  onOpenPlanShortModal,
  onOpenBulkShortsModal,
  onEditShort,
  allLists = [],
  onRefreshAll
}) {
  const [selectedSessionId, setSelectedSessionId] = useState(activeSessionId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSeries, setFilterSeries] = useState('ALL');
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterStage, setFilterStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'table'

  // Inline Target Editing
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    fetchShortsOverview(selectedSessionId);
  }, [selectedSessionId]);

  // Keep in sync with parent activeSessionId if prop updates
  useEffect(() => {
    if (activeSessionId && activeSessionId !== selectedSessionId) {
      setSelectedSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  const fetchShortsOverview = async (sessId) => {
    setLoading(true);
    try {
      let url = '/api/planner/shorts/overview';
      if (sessId) url += `?session_id=${sessId}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setTargetInput(String(json.target || 0));
      }
    } catch (err) {
      console.error("Failed to load shorts overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTarget = async () => {
    if (!data?.active_session?.id) return;
    setSavingTarget(true);
    try {
      const res = await fetch('/api/planner/shorts/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: data.active_session.id,
          shorts_target: parseInt(targetInput, 10) || 0
        })
      });
      if (res.ok) {
        setIsEditingTarget(false);
        fetchShortsOverview(selectedSessionId);
        if (onRefreshAll) onRefreshAll();
      }
    } catch (err) {
      console.error("Failed to update shorts target:", err);
    } finally {
      setSavingTarget(false);
    }
  };

  const handleAdvanceStage = async (short, nextStage) => {
    try {
      const res = await fetch(`/api/planner/videos/${short.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_stage: nextStage,
          status: nextStage === 'Uploaded' ? 'Uploaded' : 'Planned'
        })
      });
      if (res.ok) {
        fetchShortsOverview(selectedSessionId);
        if (onRefreshAll) onRefreshAll();
      }
    } catch (err) {
      console.error("Failed to advance short stage:", err);
    }
  };

  const handleDeleteShort = async (shortId, shortTitle) => {
    if (!window.confirm(`Delete the short "${shortTitle}"?`)) return;
    try {
      const res = await fetch(`/api/planner/videos/${shortId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchShortsOverview(selectedSessionId);
        if (onRefreshAll) onRefreshAll();
      }
    } catch (err) {
      console.error("Failed to delete short:", err);
    }
  };

  // Filtered Shorts List
  const filteredShorts = useMemo(() => {
    if (!data?.shorts) return [];
    return data.shorts.filter(sh => {
      // Series filter
      if (filterSeries !== 'ALL' && (sh.series || 'General Bite') !== filterSeries) {
        return false;
      }
      // Course filter
      if (filterCourse !== 'ALL') {
        const hasCourse = sh.lists?.some(l => l.id === filterCourse || l.parent_id === filterCourse);
        if (!hasCourse) return false;
      }
      // Stage filter
      const curStage = sh.production_stage || (sh.status === 'Uploaded' ? 'Uploaded' : 'Idea');
      if (filterStage !== 'ALL' && curStage !== filterStage) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = sh.title?.toLowerCase().includes(q);
        const matchHook = sh.hook?.toLowerCase().includes(q);
        const matchNotes = sh.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchHook && !matchNotes) return false;
      }
      return true;
    });
  }, [data?.shorts, filterSeries, filterCourse, filterStage, searchQuery]);

  // Grouped by stage for Pipeline Board view
  const stageColumns = useMemo(() => {
    const cols = {
      Idea: [],
      Scripted: [],
      Recorded: [],
      Uploaded: []
    };
    filteredShorts.forEach(sh => {
      const st = sh.production_stage || (sh.status === 'Uploaded' ? 'Uploaded' : 'Idea');
      if (cols[st]) cols[st].push(sh);
      else cols.Idea.push(sh);
    });
    return cols;
  }, [filteredShorts]);

  // Extract unique courses for filter
  const courseOptions = useMemo(() => {
    const courses = allLists.filter(l => l.is_course || ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2'].includes(l.id));
    if (courses.length > 0) return courses;
    return allLists.filter(l => !l.parent_id);
  }, [allLists]);

  const targetCount = data?.target || 0;
  const uploadedCount = data?.stage_counts?.Uploaded || 0;
  const pacing = data?.pacing || {};
  const completionPct = pacing.completion_pct || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. Top Session & Window Switcher Bar                           */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.65rem 1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ 
            fontSize: '0.72rem', 
            color: 'var(--text-muted)', 
            fontWeight: 600, 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px' 
          }}>
            Exam Window:
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedSessionId(null)}
              style={{
                padding: '0.32rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: !selectedSessionId ? 600 : 500,
                background: !selectedSessionId ? 'var(--bg-surface-elevated)' : 'transparent',
                border: !selectedSessionId ? '1.5px solid #E8A33D' : '1px solid var(--border-hairline)',
                color: !selectedSessionId ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              All Windows
            </button>
            {data?.available_sessions?.map((sess) => {
              const isSelected = sess.id === selectedSessionId;
              return (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => setSelectedSessionId(sess.id)}
                  style={{
                    padding: '0.32rem 0.7rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 600 : 500,
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                    border: isSelected ? '1.5px solid #E8A33D' : '1px solid var(--border-hairline)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>{sess.name}</span>
                  {sess.shorts_target > 0 && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: '#E8A33D', 
                      fontWeight: 700,
                      background: 'rgba(232, 163, 61, 0.15)',
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}>
                      🎯 {sess.shorts_target}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedSessionId('EVERGREEN')}
              style={{
                padding: '0.32rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: selectedSessionId === 'EVERGREEN' ? 600 : 500,
                background: selectedSessionId === 'EVERGREEN' ? 'var(--bg-surface-elevated)' : 'transparent',
                border: selectedSessionId === 'EVERGREEN' ? '1.5px solid #E8A33D' : '1px solid var(--border-hairline)',
                color: selectedSessionId === 'EVERGREEN' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Evergreen Shorts (No Session)
            </button>
          </div>
        </div>

        {data?.active_session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Target Window: <strong style={{ color: 'var(--text-secondary)' }}>{data.active_session.start_date} → {data.active_session.end_date}</strong></span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Key Metrics Strip                                           */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem'
      }}>
        {/* Target Card with Inline Editor */}
        <div className="content-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Shorts Target
            </span>
            {data?.active_session && !isEditingTarget && (
              <button 
                type="button" 
                className="btn-ghost" 
                onClick={() => setIsEditingTarget(true)} 
                title="Edit Target Count"
                style={{ padding: '2px 4px', fontSize: '0.7rem', color: '#E8A33D' }}
              >
                <Edit3 size={11} /> Edit
              </button>
            )}
          </div>
          {isEditingTarget ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}>
              <input 
                type="number"
                min="0"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                style={{
                  width: '70px',
                  padding: '0.3rem 0.5rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #E8A33D',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleSaveTarget}
                disabled={savingTarget}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', background: '#E8A33D', color: '#000' }}
              >
                <Check size={12} />
              </button>
              <button 
                type="button" 
                className="btn-ghost" 
                onClick={() => setIsEditingTarget(false)}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#E8A33D' }}>
              {targetCount > 0 ? targetCount : '—'}
            </div>
          )}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {data?.active_session ? `Scoped to ${data.active_session.name}` : "Across active exam windows"}
          </span>
        </div>

        {/* Ideas & Scripted */}
        <div className="content-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Ideas & Scripted
          </span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3B82F6' }}>
            {(data?.stage_counts?.Idea || 0) + (data?.stage_counts?.Scripted || 0)}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {data?.stage_counts?.Idea || 0} Ideas • {data?.stage_counts?.Scripted || 0} Scripted
          </span>
        </div>

        {/* Recorded & Ready */}
        <div className="content-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Recorded & In Edit
          </span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#E8A33D' }}>
            {data?.stage_counts?.Recorded || 0}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Ready for cut, captions & upload
          </span>
        </div>

        {/* Uploaded & Live */}
        <div className="content-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Uploaded & Published
          </span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3EA65E' }}>
            {uploadedCount}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {targetCount > 0 ? `${completionPct}% of ${targetCount} target met` : `${uploadedCount} published`}
          </span>
        </div>

        {/* Pacing & Progress */}
        <div className="content-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Velocity / Status
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: pacing.color || (completionPct >= 100 ? '#3EA65E' : '#E8A33D'),
              background: `${pacing.color || '#E8A33D'}18`,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)'
            }}>
              {pacing.status || (uploadedCount >= targetCount && targetCount > 0 ? "TARGET_MET" : "ON_TRACK")}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {pacing.display_text || `${uploadedCount} of ${targetCount || data?.planned_total || 0} completed`}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Series Pills Bar                                            */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Series Format:
        </span>
        <button
          type="button"
          onClick={() => setFilterSeries('ALL')}
          style={{
            padding: '0.28rem 0.65rem',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: filterSeries === 'ALL' ? 600 : 500,
            background: filterSeries === 'ALL' ? '#E8A33D' : 'var(--bg-surface)',
            color: filterSeries === 'ALL' ? '#000' : 'var(--text-secondary)',
            border: filterSeries === 'ALL' ? '1px solid #E8A33D' : '1px solid var(--border-subtle)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          All Formats ({data?.planned_total || 0})
        </button>
        {PRESET_SERIES.map((ser) => {
          const count = data?.series_counts?.[ser] || 0;
          const isSel = filterSeries === ser;
          return (
            <button
              key={ser}
              type="button"
              onClick={() => setFilterSeries(ser)}
              style={{
                padding: '0.28rem 0.65rem',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: isSel ? 600 : 500,
                background: isSel ? '#E8A33D' : 'var(--bg-surface)',
                color: isSel ? '#000' : 'var(--text-secondary)',
                border: isSel ? '1px solid #E8A33D' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>{ser}</span>
              {count > 0 && (
                <span style={{ 
                  fontSize: '0.68rem', 
                  opacity: isSel ? 0.9 : 0.6,
                  fontWeight: 700 
                }}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Controls & Action Bar                                       */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'var(--bg-surface)',
        padding: '0.65rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '340px' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search hook, title, or script..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Course Filter */}
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            style={{
              padding: '0.4rem 0.7rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="ALL">All Courses</option>
            {courseOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            style={{
              padding: '0.4rem 0.7rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="ALL">All Stages</option>
            <option value="Idea">💡 Ideas</option>
            <option value="Scripted">📝 Scripted</option>
            <option value="Recorded">🎙️ Recorded</option>
            <option value="Uploaded">🚀 Uploaded</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-surface-elevated)',
            padding: '2px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              title="Pipeline Board View"
              style={{
                padding: '0.3rem 0.55rem',
                background: viewMode === 'board' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'board' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                fontWeight: viewMode === 'board' ? 600 : 500
              }}
            >
              <LayoutGrid size={13} />
              <span>Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              style={{
                padding: '0.3rem 0.55rem',
                background: viewMode === 'table' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                fontWeight: viewMode === 'table' ? 600 : 500
              }}
            >
              <ListIcon size={13} />
              <span>List ({filteredShorts.length})</span>
            </button>
          </div>

          {/* Action Buttons: Bulk Ideas & Plan Short */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenBulkShortsModal}
              id="btn-bulk-shorts-hub"
              title="Bulk upload and configure multiple Short ideas"
              style={{
                fontSize: '0.82rem',
                padding: '0.42rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'rgba(232, 163, 61, 0.45)',
                color: '#E8A33D',
                fontWeight: 600
              }}
            >
              <Sparkles size={14} />
              <span>Bulk Ideas</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={onOpenPlanShortModal}
              id="btn-plan-short-hub"
              style={{
                fontSize: '0.82rem',
                padding: '0.42rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#E8A33D',
                color: '#000',
                fontWeight: 600
              }}
            >
              <Zap size={14} fill="#000" />
              <span>Plan Short</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Content View: Pipeline Board OR Table View                  */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'board' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          {STAGE_ORDER.map((stageKey) => {
            const conf = STAGE_CONFIG[stageKey];
            const items = stageColumns[stageKey] || [];
            return (
              <div
                key={stageKey}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: '400px'
                }}
              >
                {/* Column Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: conf.color }}>
                      {conf.label}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-secondary)',
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>
                      {items.length}
                    </span>
                  </div>
                  {stageKey === 'Idea' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={onOpenBulkShortsModal}
                        title="Bulk Add Short Ideas"
                        style={{ padding: '2px 5px', color: '#E8A33D', fontSize: '0.68rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        <Sparkles size={11} />
                        <span>Bulk</span>
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={onOpenPlanShortModal}
                        title="Add Single Short Idea"
                        style={{ padding: '2px', color: '#E8A33D' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {items.length === 0 ? (
                    <div style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontStyle: 'italic'
                    }}>
                      <div>No shorts in {stageKey} stage</div>
                      {stageKey === 'Idea' && (
                        <button
                          type="button"
                          onClick={onOpenBulkShortsModal}
                          className="btn-secondary"
                          style={{
                            marginTop: '0.65rem',
                            fontSize: '0.72rem',
                            padding: '0.3rem 0.65rem',
                            color: '#E8A33D',
                            borderColor: 'rgba(232, 163, 61, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Sparkles size={11} />
                          <span>Bulk Add Ideas</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    items.map((short) => (
                      <div
                        key={short.id}
                        className="content-card"
                        style={{
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          borderLeft: `3.5px solid ${conf.color}`,
                          transition: 'transform 0.15s ease, border-color 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        {/* Hook Box */}
                        {short.hook ? (
                          <div style={{
                            background: 'rgba(232, 163, 61, 0.08)',
                            border: '1px solid rgba(232, 163, 61, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.45rem 0.6rem',
                            fontSize: '0.76rem',
                            color: 'var(--text-primary)',
                            lineHeight: 1.35
                          }}>
                            <div style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 700, 
                              color: '#E8A33D', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.5px',
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <Sparkles size={10} /> 3s Hook
                            </div>
                            &ldquo;{short.hook}&rdquo;
                          </div>
                        ) : null}

                        {/* Title */}
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {short.title}
                        </div>

                        {/* Series & Duration Tag */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                          }}>
                            {short.series || 'General Bite'}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: 'rgba(232, 163, 61, 0.12)',
                            color: '#E8A33D',
                            fontWeight: 600
                          }}>
                            {short.target_duration_sec || 60}s
                          </span>
                        </div>

                        {/* Course & Subject Hierarchy */}
                        {short.lists && short.lists.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            <BookOpen size={11} />
                            <span>{short.lists.map(l => l.name).join(' • ')}</span>
                          </div>
                        )}

                        {/* Uploaded stats if published */}
                        {stageKey === 'Uploaded' && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.35rem 0.5rem',
                            background: 'rgba(62, 166, 94, 0.08)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            color: '#3EA65E'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                              <Eye size={12} /> {short.linked_video_views?.toLocaleString() || 0} views
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <ThumbsUp size={11} /> {short.linked_video_likes?.toLocaleString() || 0}
                            </span>
                          </div>
                        )}

                        {/* Action Buttons: Advance Stage, Edit, Delete */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.4rem',
                          borderTop: '1px solid var(--border-hairline)',
                          marginTop: '2px'
                        }}>
                          {conf.next ? (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStage(short, conf.next)}
                              className="btn-ghost"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.25rem 0.5rem',
                                color: STAGE_CONFIG[conf.next].color,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title={`Advance to ${STAGE_CONFIG[conf.next].label}`}
                            >
                              <span>{conf.next}</span>
                              <ArrowRight size={11} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#3EA65E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle2 size={12} /> Published
                            </span>
                          )}

                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => onEditShort(short)}
                              title="Edit Short details"
                              style={{ padding: '0.25rem' }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleDeleteShort(short.id, short.title)}
                              title="Delete Short"
                              style={{ padding: '0.25rem', color: '#FF4D4D' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="content-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Short Title & Hook</th>
                <th style={{ padding: '0.75rem 1rem' }}>Series Format</th>
                <th style={{ padding: '0.75rem 1rem' }}>Course / Topic</th>
                <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                <th style={{ padding: '0.75rem 1rem' }}>Stage</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShorts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No matching shorts found. Click &quot;Plan Short&quot; to create one!
                  </td>
                </tr>
              ) : (
                filteredShorts.map(short => {
                  const curStage = short.production_stage || (short.status === 'Uploaded' ? 'Uploaded' : 'Idea');
                  const stageConf = STAGE_CONFIG[curStage] || STAGE_CONFIG.Idea;
                  return (
                    <tr key={short.id} style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{short.title}</div>
                        {short.hook && (
                          <div style={{ fontSize: '0.72rem', color: '#E8A33D', marginTop: '2px', fontStyle: 'italic' }}>
                            ⚡ &ldquo;{short.hook}&rdquo;
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'var(--bg-surface-elevated)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.72rem'
                        }}>
                          {short.series || 'General Bite'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                        {short.lists?.map(l => l.name).join(' • ') || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        {short.target_duration_sec || 60}s
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: `${stageConf.color}20`,
                          color: stageConf.color,
                          fontWeight: 600,
                          fontSize: '0.72rem'
                        }}>
                          {stageConf.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {stageConf.next && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleAdvanceStage(short, stageConf.next)}
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: STAGE_CONFIG[stageConf.next].color }}
                              title={`Advance to ${stageConf.next}`}
                            >
                              ➔ {stageConf.next}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => onEditShort(short)}
                            style={{ padding: '0.25rem' }}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleDeleteShort(short.id, short.title)}
                            style={{ padding: '0.25rem', color: '#FF4D4D' }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
