import React, { useState, useMemo } from 'react';
import { 
  X, Zap, Layers, BookOpen, Calendar, Clock, Check, 
  AlertCircle, Sparkles, FileText, ChevronDown, ChevronUp,
  Trash2, Plus, ArrowDownToLine, SlidersHorizontal, Eye,
  CheckCircle2, ListPlus
} from 'lucide-react';

const PRESET_SERIES = [
  "Calculator Hacks (TI BA II Plus)",
  "Formula Hacks in 60s",
  "Concept in 60s",
  "Exam Traps & Pitfalls",
  "Ethics Quick-Bite",
  "Rapid Q&A / Doubt",
  "General Finance Bite"
];

const STAGE_OPTIONS = [
  { value: "Idea", label: "💡 Idea / Concept" },
  { value: "Scripted", label: "📝 Scripted / Ready" },
  { value: "Recorded", label: "🎙️ Recorded" },
  { value: "Scheduled", label: "⏳ Scheduled" },
  { value: "Uploaded", label: "🚀 Uploaded & Published" }
];

export default function BulkShortsModal({
  onClose,
  onSuccess,
  availableLists = [],
  availableSessions = [],
  defaultSessionId = null
}) {
  // Course lists
  const courses = useMemo(() => {
    const directCourses = availableLists.filter(l => l.is_course || ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2'].includes(l.id));
    if (directCourses.length > 0) return directCourses;
    return availableLists.filter(l => !l.parent_id);
  }, [availableLists]);

  // Helper to get subjects for a given course
  const getSubjectsForCourse = (courseId) => {
    if (!courseId) return [];
    return availableLists.filter(l => l.parent_id === courseId);
  };

  // Shared / Default settings
  const [defaultCourse, setDefaultCourse] = useState(courses[0]?.id || '');
  const [defaultSubject, setDefaultSubject] = useState('');
  const [defaultSeries, setDefaultSeries] = useState(PRESET_SERIES[0]);
  const [defaultSession, setDefaultSession] = useState(defaultSessionId || '');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultStage, setDefaultStage] = useState('Idea');

  // Input states
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'single'
  const [pastedText, setPastedText] = useState('');
  const [singleTitle, setSingleTitle] = useState('');
  const [autoApplyDefaults, setAutoApplyDefaults] = useState(true);

  // Items list
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [defaultsNotice, setDefaultsNotice] = useState(false);

  // Compute number of non-empty lines in pasted text
  const pastedLineCount = useMemo(() => {
    if (!pastedText.trim()) return 0;
    return pastedText.split('\n').map(l => l.trim()).filter(l => l.length > 0).length;
  }, [pastedText]);

  // Create a new item object with current defaults
  const createItemWithDefaults = (titleText) => {
    const id = 'item_' + Math.random().toString(36).substr(2, 9);
    return {
      id,
      title: titleText.trim(),
      hook: '',
      series: autoApplyDefaults ? defaultSeries : PRESET_SERIES[0],
      customSeries: '',
      courseId: autoApplyDefaults ? defaultCourse : (courses[0]?.id || ''),
      subjectId: autoApplyDefaults ? defaultSubject : '',
      sessionId: autoApplyDefaults ? defaultSession : '',
      duration: autoApplyDefaults ? defaultDuration : 60,
      stage: autoApplyDefaults ? defaultStage : 'Idea',
      notes: ''
    };
  };

  // Handle parsing pasted multi-line titles
  const handleParsePastedTitles = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText
      .split('\n')
      .map(l => l.replace(/^[\d+.\-•*\])\s]+/, '').trim()) // strip leading numbering or bullets
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    const newItems = lines.map(line => createItemWithDefaults(line));
    setItems(prev => [...prev, ...newItems]);
    setPastedText('');
    if (!expandedId && newItems.length > 0) {
      setExpandedId(newItems[0].id);
    }
  };

  // Handle adding a single title
  const handleAddSingleTitle = (e) => {
    if (e) e.preventDefault();
    if (!singleTitle.trim()) return;
    const newItem = createItemWithDefaults(singleTitle);
    setItems(prev => [...prev, newItem]);
    setSingleTitle('');
    setExpandedId(newItem.id);
  };

  // Apply defaults to all existing items
  const handleApplyDefaultsToAll = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      courseId: defaultCourse,
      subjectId: defaultSubject,
      series: defaultSeries,
      sessionId: defaultSession,
      duration: defaultDuration,
      stage: defaultStage
    })));
    setDefaultsNotice(true);
    setTimeout(() => setDefaultsNotice(false), 2500);
  };

  // Update a single item field
  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'courseId') {
        const subjects = getSubjectsForCourse(value);
        updated.subjectId = subjects.length > 0 ? subjects[0].id : '';
      }
      return updated;
    }));
  };

  // Remove an item
  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  // Submit all items
  const handleSubmit = async () => {
    if (items.length === 0) {
      setError("Please add at least one Short idea.");
      return;
    }

    // Check for empty titles
    const blankItemIndex = items.findIndex(item => !item.title.trim());
    if (blankItemIndex !== -1) {
      setError(`Item #${blankItemIndex + 1} has an empty title.`);
      setExpandedId(items[blankItemIndex].id);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = items.map(item => {
        const listIds = [];
        if (item.courseId) listIds.push(item.courseId);
        if (item.subjectId && !listIds.includes(item.subjectId)) listIds.push(item.subjectId);

        const finalSeries = item.series === 'CUSTOM' ? (item.customSeries.trim() || 'General Bite') : item.series;
        const finalStatus = item.stage === 'Uploaded' ? 'Uploaded' : 'Planned';

        return {
          title: item.title.trim(),
          content_type: 'short',
          course_id: item.courseId || null,
          subject_id: item.subjectId || null,
          list_ids: listIds,
          session_id: item.sessionId || null,
          hook: item.hook.trim(),
          series: finalSeries,
          target_duration_sec: parseInt(item.duration, 10) || 60,
          production_stage: item.stage,
          status: finalStatus,
          notes: item.notes.trim()
        };
      });

      const res = await fetch('/api/planner/videos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save bulk Shorts ideas.");
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save bulk Shorts.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div 
        className="content-card" 
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(232, 163, 61, 0.4)',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.15rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(232, 163, 61, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E8A33D'
            }}>
              <Zap size={20} fill="#E8A33D" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Bulk Shorts Idea Studio</span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  background: 'rgba(232, 163, 61, 0.15)', 
                  color: '#E8A33D',
                  fontWeight: 600
                }}>
                  Batch Ideator
                </span>
              </h2>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Add multiple video titles at once, then customize hook, series, course, duration, and talking points per Short.
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-ghost" 
            onClick={onClose} 
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.5rem', gap: '1.25rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              color: '#ef4444',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Add Titles Section */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <ListPlus size={16} color="#E8A33D" />
                <span>Step 1: Add Video Titles</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: inputMode === 'paste' ? 600 : 500,
                    background: inputMode === 'paste' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: inputMode === 'paste' ? '#E8A33D' : 'var(--text-muted)',
                    border: inputMode === 'paste' ? '1px solid rgba(232, 163, 61, 0.4)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Paste Multi-Line List
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('single')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: inputMode === 'single' ? 600 : 500,
                    background: inputMode === 'single' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: inputMode === 'single' ? '#E8A33D' : 'var(--text-muted)',
                    border: inputMode === 'single' ? '1px solid rgba(232, 163, 61, 0.4)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Add One by One
                </button>
              </div>
            </div>

            {inputMode === 'paste' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <textarea
                  rows={4}
                  placeholder="Paste multiple titles here (one per line)...&#10;e.g.&#10;TI BA II Plus Bond Pricing in 15 Seconds&#10;Why Covariance Cannot Exceed 1 (Exam Trap)&#10;CFA L1 Ethics: Soft Dollar Rules in 60s&#10;Type I vs Type II Error Cheat Sheet"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {pastedLineCount > 0 ? `${pastedLineCount} video title${pastedLineCount > 1 ? 's' : ''} detected` : 'Tip: You can copy-paste a brainstormed list directly from ChatGPT or Notes'}
                  </span>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleParsePastedTitles}
                    disabled={pastedLineCount === 0}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.85rem',
                      background: '#E8A33D',
                      color: '#000',
                      fontWeight: 600
                    }}
                  >
                    <Plus size={13} />
                    <span>Parse &amp; Add {pastedLineCount > 0 ? `${pastedLineCount} Titles` : 'Titles'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddSingleTitle} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Enter a video title (e.g. Fast Duration Calculation on TI BA II Plus)..."
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!singleTitle.trim()}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.45rem 0.95rem',
                    background: '#E8A33D',
                    color: '#000',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={13} />
                  <span>Add Title</span>
                </button>
              </form>
            )}
          </div>

          {/* 2. Shared Preset Defaults Strip ("Apply to All") */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid rgba(232, 163, 61, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <SlidersHorizontal size={14} color="#E8A33D" />
                <span>Shared Defaults (Speed up planning across all titles)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {defaultsNotice && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--success-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <CheckCircle2 size={12} /> Applied to all {items.length} titles!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleApplyDefaultsToAll}
                  disabled={items.length === 0}
                  className="btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', color: '#E8A33D', borderColor: 'rgba(232, 163, 61, 0.4)' }}
                >
                  Apply Defaults to All Items
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Default Course
                </label>
                <select
                  value={defaultCourse}
                  onChange={(e) => {
                    setDefaultCourse(e.target.value);
                    const validSubs = getSubjectsForCourse(e.target.value);
                    setDefaultSubject(validSubs.length > 0 ? validSubs[0].id : '');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="">General</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Default Series
                </label>
                <select
                  value={defaultSeries}
                  onChange={(e) => setDefaultSeries(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem'
                  }}
                >
                  {PRESET_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Exam Window
                </label>
                <select
                  value={defaultSession}
                  onChange={(e) => setDefaultSession(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="">Evergreen</option>
                  {availableSessions.map(sess => (
                    <option key={sess.id} value={sess.id}>{sess.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Target Duration
                </label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Default Stage
                </label>
                <select
                  value={defaultStage}
                  onChange={(e) => setDefaultStage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem'
                  }}
                >
                  {STAGE_OPTIONS.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Items List with Per-Title Plan Short Features */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Step 2: Review &amp; Configure Shorts ({items.length})
                </span>
                {items.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Click any title to customize hook, series, duration, and talking points
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId ? null : items[0]?.id)}
                    className="btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  >
                    {expandedId ? 'Collapse All' : 'Expand Top'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Clear all items?")) setItems([]);
                    }}
                    className="btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#FF4D4D' }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1.5px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}>
                <Sparkles size={28} color="#E8A33D" style={{ margin: '0 auto 0.5rem', opacity: 0.8 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  No Short ideas added yet
                </div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px', maxWidth: '400px', margin: '4px auto 0' }}>
                  Paste a list of video titles in Step 1 above or type titles one-by-one to begin configuring your Shorts ideas.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {items.map((item, idx) => {
                  const isExpanded = expandedId === item.id;
                  const itemCourse = courses.find(c => c.id === item.courseId);
                  const validSubjects = getSubjectsForCourse(item.courseId);

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: isExpanded ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: isExpanded ? '1px solid rgba(232, 163, 61, 0.45)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        transition: 'all 0.15s ease',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Summary Row */}
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.65rem 0.95rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#E8A33D',
                            background: 'rgba(232, 163, 61, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            #{idx + 1}
                          </span>

                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Short Title..."
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid transparent',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              outline: 'none',
                              padding: '2px 0'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderBottom = '1px solid #E8A33D';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderBottom = '1px solid transparent';
                            }}
                          />
                        </div>

                        {/* Badges & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                          {/* Course Pill */}
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--text-secondary)'
                          }}>
                            {itemCourse?.name || 'General'}
                          </span>

                          {/* Series Pill */}
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(232, 163, 61, 0.1)',
                            color: '#E8A33D',
                            fontWeight: 500
                          }}>
                            {item.series === 'CUSTOM' ? (item.customSeries || 'Custom') : item.series.split(' ')[0]}
                          </span>

                          {/* Duration Pill */}
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-muted)'
                          }}>
                            {item.duration}s
                          </span>

                          {/* Hook Indicator */}
                          {item.hook && (
                            <span title={`Hook: "${item.hook}"`} style={{ color: '#E8A33D', fontSize: '0.7rem' }}>
                              <Sparkles size={13} />
                            </span>
                          )}

                          {/* Expand / Collapse Button */}
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            style={{ padding: '3px', borderRadius: '4px', color: isExpanded ? '#E8A33D' : 'var(--text-muted)' }}
                            title={isExpanded ? "Collapse features" : "Configure all features"}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>

                          {/* Remove Button */}
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => removeItem(item.id)}
                            style={{ padding: '3px', borderRadius: '4px', color: '#FF4D4D' }}
                            title="Remove title"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Plan Short Form for this Title */}
                      {isExpanded && (
                        <div style={{
                          padding: '1rem',
                          borderTop: '1px solid var(--border-subtle)',
                          background: 'rgba(0, 0, 0, 0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.85rem'
                        }}>
                          {/* 3-Second Hook */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Sparkles size={12} color="#E8A33D" />
                                <span>The 3-Second Hook</span>
                              </label>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                Strong opening statement or question
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="e.g. Stop calculating bond duration by hand! Here is the exact formula hack..."
                              value={item.hook}
                              onChange={(e) => updateItem(item.id, 'hook', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(232, 163, 61, 0.35)',
                                background: 'rgba(232, 163, 61, 0.04)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                resize: 'vertical'
                              }}
                            />
                          </div>

                          {/* Series & Target Duration */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Shorts Series / Format
                              </label>
                              <select
                                value={item.series}
                                onChange={(e) => updateItem(item.id, 'series', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {PRESET_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="CUSTOM">+ Custom Series...</option>
                              </select>
                              {item.series === 'CUSTOM' && (
                                <input
                                  type="text"
                                  placeholder="Custom series title..."
                                  value={item.customSeries}
                                  onChange={(e) => updateItem(item.id, 'customSeries', e.target.value)}
                                  style={{
                                    width: '100%',
                                    marginTop: '0.35rem',
                                    padding: '0.4rem 0.65rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.78rem'
                                  }}
                                />
                              )}
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Target Duration
                              </label>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                {[30, 45, 60].map((sec) => (
                                  <button
                                    key={sec}
                                    type="button"
                                    onClick={() => updateItem(item.id, 'duration', sec)}
                                    style={{
                                      flex: 1,
                                      padding: '0.45rem 0.2rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.78rem',
                                      fontWeight: item.duration === sec ? 600 : 500,
                                      background: item.duration === sec ? '#E8A33D' : 'var(--bg-surface)',
                                      color: item.duration === sec ? '#000' : 'var(--text-secondary)',
                                      border: item.duration === sec ? '1px solid #E8A33D' : '1px solid var(--border-subtle)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {sec}s
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Course & Subject Hierarchy */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Course
                              </label>
                              <select
                                value={item.courseId}
                                onChange={(e) => updateItem(item.id, 'courseId', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <option value="">General (No Course)</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Subject / Topic
                              </label>
                              <select
                                value={item.subjectId}
                                onChange={(e) => updateItem(item.id, 'subjectId', e.target.value)}
                                disabled={!item.courseId}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  opacity: item.courseId ? 1 : 0.6
                                }}
                              >
                                <option value="">All / Unspecified</option>
                                {validSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Exam Window & Production Stage */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Exam Window
                              </label>
                              <select
                                value={item.sessionId}
                                onChange={(e) => updateItem(item.id, 'sessionId', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <option value="">Evergreen / General</option>
                                {availableSessions.map(sess => (
                                  <option key={sess.id} value={sess.id}>{sess.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Production Stage
                              </label>
                              <select
                                value={item.stage}
                                onChange={(e) => updateItem(item.id, 'stage', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {STAGE_OPTIONS.map(st => (
                                  <option key={st.value} value={st.value}>{st.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Script Bullets & Talking Points */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                              Script Bullets &amp; Talking Points
                            </label>
                            <textarea
                              rows={2}
                              placeholder="1. Hook&#10;2. Key concept or calculation step&#10;3. Quick summary + CTA"
                              value={item.notes}
                              onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                fontSize: '0.78rem',
                                fontFamily: 'monospace',
                                resize: 'vertical'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface-elevated)'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {items.length > 0 ? (
              <span><strong>{items.length}</strong> Short idea{items.length > 1 ? 's' : ''} ready to add to pipeline</span>
            ) : (
              <span>Add titles above to get started</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={saving}
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              style={{
                fontSize: '0.85rem',
                padding: '0.5rem 1.35rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#E8A33D',
                color: '#000',
                fontWeight: 600
              }}
            >
              <Zap size={15} fill="#000" />
              <span>{saving ? "Saving Shorts..." : `Save ${items.length} Shorts to Pipeline`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
