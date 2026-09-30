import React, { useState, useMemo } from 'react';
import { 
  X, Zap, Layers, BookOpen, Calendar, Clock, Check, 
  AlertCircle, Sparkles, FileText, ChevronDown 
} from 'lucide-react';
import { saveLocalPlannedVideo } from '../utils/plannerStorage';

const PRESET_SERIES = [
  "Calculator Hacks (TI BA II Plus)",
  "Formula Hacks in 60s",
  "Concept in 60s",
  "Exam Traps & Pitfalls",
  "Ethics Quick-Bite",
  "Rapid Q&A / Doubt",
  "General Finance Bite"
];

export default function PlanShortModal({
  onClose,
  onSuccess,
  availableLists = [],
  availableSessions = [],
  initialData = null,
  defaultSessionId = null,
  // Alternative prop names from callers
  allLists: propAllLists,
  courses: propCourses,
  sessions: propSessions,
  editingShort,
  activeSessionId
}) {
  const resolvedInitialData = initialData || editingShort || null;
  const resolvedDefaultSessionId = defaultSessionId || activeSessionId || null;

  // Fallback fetches in case caller passed empty data
  const [fetchedLists, setFetchedLists] = useState([]);
  const [fetchedSessions, setFetchedSessions] = useState([]);

  const inputLists = useMemo(() => {
    if (Array.isArray(availableLists) && availableLists.length > 0) return availableLists;
    if (Array.isArray(propAllLists) && propAllLists.length > 0) return propAllLists;
    if (Array.isArray(propCourses) && propCourses.length > 0) return propCourses;
    return [];
  }, [availableLists, propAllLists, propCourses]);

  const inputSessions = useMemo(() => {
    if (Array.isArray(availableSessions) && availableSessions.length > 0) return availableSessions;
    if (Array.isArray(propSessions) && propSessions.length > 0) return propSessions;
    return [];
  }, [availableSessions, propSessions]);

  React.useEffect(() => {
    if (inputLists.length === 0) {
      fetch('/api/lists')
        .then(r => r.json())
        .then(data => {
          if (data?.all_lists && Array.isArray(data.all_lists)) setFetchedLists(data.all_lists);
        })
        .catch(() => {});
    }
  }, [inputLists.length]);

  React.useEffect(() => {
    if (inputSessions.length === 0) {
      fetch('/api/planner/overview')
        .then(r => r.json())
        .then(data => {
          if (data?.sessions && Array.isArray(data.sessions)) setFetchedSessions(data.sessions);
        })
        .catch(() => {});
    }
  }, [inputSessions.length]);

  const { courses, subjectsByCourse, allFlatLists } = useMemo(() => {
    const catalog = inputLists.length > 0 ? inputLists : fetchedLists;
    const coursesMap = new Map();
    const subjectsMap = new Map();
    const flatListAcc = [];

    catalog.forEach(item => {
      if (!item) return;

      if (Array.isArray(item.subjects)) {
        coursesMap.set(item.id, { id: item.id, name: item.name, is_course: 1 });
        flatListAcc.push({ id: item.id, name: item.name, is_course: 1 });
        const existingSubs = subjectsMap.get(item.id) || [];
        item.subjects.forEach(sub => {
          flatListAcc.push({ id: sub.id, name: sub.name, parent_id: item.id, is_course: 0 });
          if (!existingSubs.some(s => s.id === sub.id)) {
            existingSubs.push({ id: sub.id, name: sub.name, parent_id: item.id });
          }
        });
        subjectsMap.set(item.id, existingSubs);
        return;
      }

      const isKnownCourse = Boolean(
        item.is_course || 
        ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2'].includes(item.id)
      );

      flatListAcc.push(item);

      if (isKnownCourse) {
        coursesMap.set(item.id, { id: item.id, name: item.name, is_course: 1 });
      } else if (item.parent_id) {
        const existingSubs = subjectsMap.get(item.parent_id) || [];
        if (!existingSubs.some(s => s.id === item.id)) {
          existingSubs.push({ id: item.id, name: item.name, parent_id: item.parent_id });
        }
        subjectsMap.set(item.parent_id, existingSubs);
      }
    });

    if (coursesMap.size === 0) {
      catalog.forEach(item => {
        if (!item.parent_id) {
          coursesMap.set(item.id, { id: item.id, name: item.name, is_course: 1 });
        }
      });
    }

    return {
      courses: Array.from(coursesMap.values()),
      subjectsByCourse: subjectsMap,
      allFlatLists: flatListAcc
    };
  }, [inputLists, fetchedLists]);

  // Initial course and subject deduction
  const initialSelectedCourse = useMemo(() => {
    if (resolvedInitialData?.lists && resolvedInitialData.lists.length > 0) {
      const matchedCourse = resolvedInitialData.lists.find(l => courses.some(c => c.id === l.id));
      if (matchedCourse) return matchedCourse.id;
      for (const l of resolvedInitialData.lists) {
        const found = allFlatLists.find(item => item.id === l.id);
        if (found?.parent_id) return found.parent_id;
      }
    }
    return courses[0]?.id || '';
  }, [resolvedInitialData, courses, allFlatLists]);

  const initialSelectedSubject = useMemo(() => {
    if (resolvedInitialData?.lists && resolvedInitialData.lists.length > 0) {
      const nonCourse = resolvedInitialData.lists.find(l => !courses.some(c => c.id === l.id));
      if (nonCourse) return nonCourse.id;
    }
    return '';
  }, [resolvedInitialData, courses]);

  const [title, setTitle] = useState(resolvedInitialData ? resolvedInitialData.title : '');
  const [hook, setHook] = useState(resolvedInitialData ? (resolvedInitialData.hook || '') : '');
  const [series, setSeries] = useState(resolvedInitialData ? (resolvedInitialData.series || PRESET_SERIES[0]) : PRESET_SERIES[0]);
  const [customSeries, setCustomSeries] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(initialSelectedCourse);
  const [selectedSubject, setSelectedSubject] = useState(initialSelectedSubject);
  const [sessionId, setSessionId] = useState(resolvedInitialData ? (resolvedInitialData.session_id || '') : (resolvedDefaultSessionId || ''));
  const [duration, setDuration] = useState(resolvedInitialData ? (resolvedInitialData.target_duration_sec || 60) : 60);
  const [stage, setStage] = useState(resolvedInitialData ? (resolvedInitialData.production_stage || 'Idea') : 'Idea');
  const [scriptNotes, setScriptNotes] = useState(resolvedInitialData ? (resolvedInitialData.notes || '') : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!selectedCourse && courses.length > 0) {
      setSelectedCourse(courses[0].id);
      const subs = subjectsByCourse.get(courses[0].id) || [];
      if (subs.length > 0 && !selectedSubject) {
        setSelectedSubject(subs[0].id);
      }
    }
  }, [courses, selectedCourse, subjectsByCourse, selectedSubject]);

  const childSubjects = useMemo(() => {
    if (!selectedCourse) return [];
    return subjectsByCourse.get(selectedCourse) || [];
  }, [selectedCourse, subjectsByCourse]);

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    const validSubs = subjectsByCourse.get(courseId) || [];
    if (validSubs.length > 0) {
      setSelectedSubject(validSubs[0].id);
    } else {
      setSelectedSubject('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title or topic for this Short.");
      return;
    }

    setSaving(true);
    setError('');

    try {
      const listIds = [];
      if (selectedCourse) listIds.push(selectedCourse);
      if (selectedSubject && !listIds.includes(selectedSubject)) listIds.push(selectedSubject);

      const finalSeries = series === 'CUSTOM' ? (customSeries.trim() || 'General Bite') : series;
      const finalStatus = stage === 'Uploaded' ? 'Uploaded' : 'Planned';

      const url = resolvedInitialData ? `/api/planner/videos/${resolvedInitialData.id}` : '/api/planner/videos';
      const method = resolvedInitialData ? 'PUT' : 'POST';

      const payload = {
        title: title.trim(),
        session_id: sessionId || null,
        list_ids: listIds,
        content_type: 'short',
        hook: hook.trim(),
        series: finalSeries,
        target_duration_sec: parseInt(duration, 10) || 60,
        production_stage: stage,
        status: finalStatus,
        notes: scriptNotes.trim()
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to save Short plan.");
      }

      const resData = await res.json().catch(() => ({}));
      const savedShort = {
        id: resData?.video?.id || resData?.id || resolvedInitialData?.id || `ps_${Date.now()}`,
        ...payload,
        lists: listIds.map(lid => {
          const found = allFlatLists.find(item => item.id === lid);
          return found ? { id: found.id, name: found.name, is_course: found.is_course, parent_id: found.parent_id } : { id: lid, name: lid };
        }),
        created_at: resolvedInitialData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Also persist to localStorage for serverless durability
      saveLocalPlannedVideo(savedShort);

      if (onSuccess) onSuccess(savedShort);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save Short.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
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
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(232, 163, 61, 0.35)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(232, 163, 61, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E8A33D'
            }}>
              <Zap size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {initialData ? "Edit YouTube Short" : "Plan New YouTube Short"}
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Vertical short-form video (&lt;60s) • Hook-driven production
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-ghost" 
            onClick={onClose} 
            style={{ padding: '0.35rem', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem', gap: '1.1rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#FF4D4D',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Short Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Short Title / Topic <span style={{ color: '#FF4D4D' }}>*</span>
            </label>
            <input 
              type="text"
              placeholder="e.g. TI BA II Plus Bond Pricing in 15 Seconds"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* 3-Second Opening Hook */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={13} color="#E8A33D" />
                <span>The 3-Second Hook</span>
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                First 3 seconds determine 80% of Shorts views
              </span>
            </div>
            <textarea
              rows={2}
              placeholder="e.g. Stop doing bond math by hand! Here is how to get the exact PV in 3 keystrokes..."
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(232, 163, 61, 0.4)',
                background: 'rgba(232, 163, 61, 0.04)',
                color: 'var(--text-primary)',
                fontSize: '0.83rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Series / Format & Target Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Shorts Series / Format
              </label>
              <select
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.83rem'
                }}
              >
                {PRESET_SERIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="CUSTOM">+ Custom Series...</option>
              </select>
              {series === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Enter custom series name..."
                  value={customSeries}
                  onChange={(e) => setCustomSeries(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.55rem 0.8rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Target Duration
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[30, 45, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDuration(sec)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.4rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      fontWeight: duration === sec ? 600 : 500,
                      background: duration === sec ? '#E8A33D' : 'var(--bg-surface)',
                      color: duration === sec ? '#000' : 'var(--text-secondary)',
                      border: duration === sec ? '1px solid #E8A33D' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Course & Subject Hierarchy */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.83rem'
                }}
              >
                <option value="">General (No Course)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Subject / Topic
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedCourse}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.83rem',
                  opacity: selectedCourse ? 1 : 0.6
                }}
              >
                <option value="">All / Subject Unspecified</option>
                {childSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Exam Session & Production Stage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Exam Window
              </label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.83rem'
                }}
              >
                <option value="">Evergreen / General Shorts</option>
                {availableSessions.map((sess) => (
                  <option key={sess.id} value={sess.id}>
                    {sess.name} ({sess.start_date} → {sess.end_date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Production Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.83rem'
                }}
              >
                <option value="Idea">💡 Idea / Concept</option>
                <option value="Scripted">📝 Scripted / Ready</option>
                <option value="Recorded">🎙️ Recorded</option>
                <option value="Scheduled">⏳ Scheduled</option>
                <option value="Uploaded">🚀 Uploaded & Published</option>
              </select>
            </div>
          </div>

          {/* Talking Points / Script Bullets */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Script Bullets & Talking Points
            </label>
            <textarea
              rows={3}
              placeholder="1. Show calculator clear screen: 2nd + CLR TVM&#10;2. Input N=5, I/Y=6, PMT=80, FV=1000&#10;3. Press CPT PV = -1,084.25&#10;4. CTA: Subscribe for daily 60s CFA hacks"
              value={scriptNotes}
              onChange={(e) => setScriptNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.83rem',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={saving}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{
                fontSize: '0.85rem',
                padding: '0.45rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#E8A33D',
                color: '#000',
                fontWeight: 600
              }}
            >
              <Zap size={14} fill="#000" />
              <span>{saving ? "Saving..." : (initialData ? "Update Short" : "Save Planned Short")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
