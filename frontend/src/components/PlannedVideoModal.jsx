import React, { useState, useMemo, useEffect } from 'react';
import { X, BookOpen, Layers, Calendar, Check, AlertCircle, Trash2 } from 'lucide-react';
import { saveLocalPlannedVideo, removeLocalPlannedVideo } from '../utils/plannerStorage';

export default function PlannedVideoModal({ 
  onClose, 
  onSuccess, 
  availableLists = [], 
  availableSessions = [], 
  initialData = null,
  defaultSessionId = null,
  defaultListId = null,
  // Alternative prop names used across the codebase
  courses: propCourses,
  sessions: propSessions,
  editingVideo,
  activeSessionId,
  allLists: propAllLists
}) {
  // Normalize initial editing item
  const resolvedInitialData = initialData || editingVideo || null;
  const resolvedDefaultSessionId = defaultSessionId || activeSessionId || null;

  // Fallback fetches in case caller passed empty or loading data
  const [fetchedLists, setFetchedLists] = useState([]);
  const [fetchedSessions, setFetchedSessions] = useState([]);

  // Resolve raw lists input from any supplied prop
  const inputLists = useMemo(() => {
    if (Array.isArray(availableLists) && availableLists.length > 0) return availableLists;
    if (Array.isArray(propCourses) && propCourses.length > 0) return propCourses;
    if (Array.isArray(propAllLists) && propAllLists.length > 0) return propAllLists;
    return [];
  }, [availableLists, propCourses, propAllLists]);

  // Resolve raw sessions input from any supplied prop
  const inputSessions = useMemo(() => {
    if (Array.isArray(availableSessions) && availableSessions.length > 0) return availableSessions;
    if (Array.isArray(propSessions) && propSessions.length > 0) return propSessions;
    return [];
  }, [availableSessions, propSessions]);

  // Fallback fetch if lists are empty
  useEffect(() => {
    if (inputLists.length === 0) {
      fetch('/api/lists')
        .then(r => r.json())
        .then(data => {
          if (data?.all_lists && Array.isArray(data.all_lists)) {
            setFetchedLists(data.all_lists);
          }
        })
        .catch(err => console.debug('Notice fetching fallback lists:', err));
    }
  }, [inputLists.length]);

  // Fallback fetch if sessions are empty
  useEffect(() => {
    if (inputSessions.length === 0) {
      fetch('/api/planner/overview')
        .then(r => r.json())
        .then(data => {
          if (data?.sessions && Array.isArray(data.sessions)) {
            setFetchedSessions(data.sessions);
          }
        })
        .catch(err => console.debug('Notice fetching fallback sessions:', err));
    }
  }, [inputSessions.length]);

  const resolvedSessions = inputSessions.length > 0 ? inputSessions : fetchedSessions;

  // Unified list processing: handles both flat catalogs (with parent_id) and nested catalogs (with .subjects)
  const { courses, subjectsByCourse, allFlatLists } = useMemo(() => {
    const catalog = inputLists.length > 0 ? inputLists : fetchedLists;
    const coursesMap = new Map();
    const subjectsMap = new Map();
    const flatListAcc = [];

    catalog.forEach(item => {
      if (!item) return;

      // Case A: Item is a nested Course object (from /api/planner/structure)
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

      // Case B: Flat item (from /api/lists all_lists)
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

    // Fallback: If no explicit is_course flags were matched, pick items with parent_id === null or empty
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

  // Determine initial selected course and subject
  const initialSelectedCourse = useMemo(() => {
    if (resolvedInitialData?.lists && resolvedInitialData.lists.length > 0) {
      const matched = resolvedInitialData.lists.find(l => courses.some(c => c.id === l.id));
      if (matched) return matched.id;
      for (const l of resolvedInitialData.lists) {
        const found = allFlatLists.find(item => item.id === l.id);
        if (found?.parent_id) return found.parent_id;
      }
    }
    if (defaultListId) {
      const found = allFlatLists.find(l => l.id === defaultListId);
      if (found?.is_course) return found.id;
      if (found?.parent_id) return found.parent_id;
    }
    return courses[0]?.id || '';
  }, [resolvedInitialData, defaultListId, courses, allFlatLists]);

  const initialSelectedSubject = useMemo(() => {
    if (resolvedInitialData?.lists && resolvedInitialData.lists.length > 0) {
      const nonCourse = resolvedInitialData.lists.find(l => !courses.some(c => c.id === l.id));
      if (nonCourse) return nonCourse.id;
    }
    if (defaultListId) {
      const found = allFlatLists.find(l => l.id === defaultListId);
      if (found && !found.is_course) return found.id;
    }
    return '';
  }, [resolvedInitialData, defaultListId, courses, allFlatLists]);

  const [selectedCourse, setSelectedCourse] = useState(initialSelectedCourse);
  const [selectedSubject, setSelectedSubject] = useState(initialSelectedSubject);
  const [title, setTitle] = useState(resolvedInitialData ? resolvedInitialData.title : '');
  const [sessionId, setSessionId] = useState(
    resolvedInitialData ? (resolvedInitialData.session_id || '') : (resolvedDefaultSessionId || '')
  );
  const [status, setStatus] = useState(resolvedInitialData ? resolvedInitialData.status : 'Planned');
  const [assignedMonth, setAssignedMonth] = useState(resolvedInitialData ? (resolvedInitialData.assigned_month || '') : '');
  const [assignedWeek, setAssignedWeek] = useState(resolvedInitialData ? (resolvedInitialData.assigned_week || '') : '');
  const [notes, setNotes] = useState(resolvedInitialData ? (resolvedInitialData.notes || '') : '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Keep selectedCourse synced when courses finish loading asynchronously
  useEffect(() => {
    if (!selectedCourse && courses.length > 0) {
      setSelectedCourse(courses[0].id);
      const subs = subjectsByCourse.get(courses[0].id) || [];
      if (subs.length > 0 && !selectedSubject) {
        setSelectedSubject(subs[0].id);
      }
    }
  }, [courses, selectedCourse, subjectsByCourse, selectedSubject]);

  // Derived child subjects for the currently chosen course
  const childSubjects = useMemo(() => {
    if (!selectedCourse) return [];
    return subjectsByCourse.get(selectedCourse) || [];
  }, [selectedCourse, subjectsByCourse]);

  // When changing course, select the first subject if available
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
      setError("Please provide a planned video title.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      const listIds = [];
      if (selectedCourse) listIds.push(selectedCourse);
      if (selectedSubject && !listIds.includes(selectedSubject)) listIds.push(selectedSubject);

      const url = resolvedInitialData ? `/api/planner/videos/${resolvedInitialData.id}` : '/api/planner/videos';
      const method = resolvedInitialData ? 'PUT' : 'POST';

      const payload = {
        title: title.trim(),
        session_id: sessionId || null,
        list_ids: listIds,
        status,
        assigned_month: assignedMonth || null,
        assigned_week: assignedWeek || null,
        notes: notes.trim(),
        content_type: 'video'
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to save planned video entry");
      }

      const resData = await res.json().catch(() => ({}));
      const resolvedSessionObj = resolvedSessions.find(s => s.id === sessionId);

      // Build complete video entity for immediate UI responsiveness & client-side persistence
      const savedVideo = {
        id: resData?.video?.id || resData?.id || resolvedInitialData?.id || `pv_${Date.now()}`,
        title: title.trim(),
        session_id: sessionId || null,
        session_name: resolvedSessionObj?.name || (sessionId ? sessionId : 'Evergreen'),
        status: status || 'Planned',
        assigned_month: assignedMonth || null,
        assigned_week: assignedWeek || null,
        notes: notes.trim(),
        content_type: 'video',
        lists: listIds.map(lid => {
          const found = allFlatLists.find(item => item.id === lid);
          return found ? { id: found.id, name: found.name, is_course: found.is_course, parent_id: found.parent_id } : { id: lid, name: lid };
        }),
        created_at: resolvedInitialData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Persist locally so it instantly survives Vercel serverless cold starts & multi-container switches
      saveLocalPlannedVideo(savedVideo);

      if (onSuccess) {
        onSuccess(savedVideo);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save planned video.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resolvedInitialData?.id) return;
    const itemTitle = title ? `"${title}"` : 'this planned video';
    if (!window.confirm(`Are you sure you want to delete ${itemTitle}? This action cannot be undone.`)) return;

    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/planner/videos/${resolvedInitialData.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete planned video');
      }
      removeLocalPlannedVideo(resolvedInitialData.id);
      if (onSuccess) {
        onSuccess({ id: resolvedInitialData.id, deleted: true });
      }
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete planned video.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ 
              width: '28px', height: '28px', borderRadius: 'var(--radius-md)', 
              background: 'rgba(62, 166, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <BookOpen size={16} color="#3EA65E" />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.05rem' }}>
                {resolvedInitialData ? 'Edit Planned Video' : 'Individual Entry Form'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                Specify course, subject, title, and exam session.
              </p>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            color: '#FF0000', fontSize: '0.8rem', background: 'rgba(255, 0, 0, 0.08)',
            padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' 
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Dependent Dropdowns: Course -> Subject */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>1. Course</label>
              <select 
                className="form-select"
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                required
              >
                {courses.length === 0 && (
                  <option value="" disabled>Loading courses...</option>
                )}
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>2. Subject</label>
              <select 
                className="form-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">(None / General for course)</option>
                {childSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Video Title */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>3. Video Name / Topic</label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g. Bond Pricing Basics, Spot Rates & Forward Curves"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Exam Session & Status */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>4. Exam Session</label>
              <select 
                className="form-select"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">Not Applicable (Evergreen / Someday)</option>
                {resolvedSessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Status</label>
              <select 
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Uploaded">Uploaded</option>
              </select>
            </div>
          </div>

          {/* Optional Schedule Allocation: Coarse Month & Fine Week */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">
                Target Month <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Coarse)</span>
              </label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. 2026-10"
                value={assignedMonth}
                onChange={(e) => setAssignedMonth(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Scheduled Week <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Fine)</span>
              </label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. 2026-W40"
                value={assignedWeek}
                onChange={(e) => setAssignedWeek(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes / Outline (Optional)</label>
            <textarea 
              className="form-textarea"
              rows={2}
              placeholder="Concepts to cover, target duration, spreadsheet templates..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: resolvedInitialData ? 'space-between' : 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {resolvedInitialData && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Trash2 size={14} />
                <span>{deleting ? 'Deleting...' : 'Delete Video'}</span>
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button type="button" className="btn-ghost" onClick={onClose} disabled={saving || deleting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving || deleting}>
                {saving ? 'Saving...' : (resolvedInitialData ? 'Save changes' : 'Create Planned Entry')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
