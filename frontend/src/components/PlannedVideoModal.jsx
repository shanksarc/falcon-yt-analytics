import React, { useState, useMemo } from 'react';
import { X, BookOpen, Layers, Calendar, Check, AlertCircle } from 'lucide-react';

export default function PlannedVideoModal({ 
  onClose, 
  onSuccess, 
  availableLists = [], 
  availableSessions = [], 
  initialData = null,
  defaultSessionId = null,
  defaultListId = null
}) {
  // Extract course lists (top level / is_course = 1)
  const courses = useMemo(() => {
    const directCourses = availableLists.filter(l => l.is_course || ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2'].includes(l.id));
    if (directCourses.length > 0) return directCourses;
    return availableLists.filter(l => !l.parent_id);
  }, [availableLists]);

  // Determine initial course & subject if initialData or defaultListId provided
  const initialSelectedCourse = useMemo(() => {
    if (initialData?.lists && initialData.lists.length > 0) {
      const matchedCourse = initialData.lists.find(l => courses.some(c => c.id === l.id));
      if (matchedCourse) return matchedCourse.id;
      // Or find parent of any list
      for (const l of initialData.lists) {
        const found = availableLists.find(item => item.id === l.id);
        if (found?.parent_id) return found.parent_id;
      }
    }
    if (defaultListId) {
      const found = availableLists.find(l => l.id === defaultListId);
      if (found?.is_course) return found.id;
      if (found?.parent_id) return found.parent_id;
    }
    return courses[0]?.id || '';
  }, [initialData, defaultListId, courses, availableLists]);

  const initialSelectedSubject = useMemo(() => {
    if (initialData?.lists && initialData.lists.length > 0) {
      const nonCourse = initialData.lists.find(l => !courses.some(c => c.id === l.id));
      if (nonCourse) return nonCourse.id;
    }
    if (defaultListId) {
      const found = availableLists.find(l => l.id === defaultListId);
      if (found && !found.is_course) return found.id;
    }
    return '';
  }, [initialData, defaultListId, courses, availableLists]);

  const [selectedCourse, setSelectedCourse] = useState(initialSelectedCourse);
  const [selectedSubject, setSelectedSubject] = useState(initialSelectedSubject);
  const [title, setTitle] = useState(initialData ? initialData.title : '');
  const [sessionId, setSessionId] = useState(initialData ? (initialData.session_id || '') : (defaultSessionId || ''));
  const [status, setStatus] = useState(initialData ? initialData.status : 'Planned');
  const [assignedMonth, setAssignedMonth] = useState(initialData ? (initialData.assigned_month || '') : '');
  const [assignedWeek, setAssignedWeek] = useState(initialData ? (initialData.assigned_week || '') : '');
  const [notes, setNotes] = useState(initialData ? (initialData.notes || '') : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Child lists dependent on selected course
  const childSubjects = useMemo(() => {
    if (!selectedCourse) return [];
    return availableLists.filter(l => !l.is_course && l.parent_id === selectedCourse);
  }, [selectedCourse, availableLists]);

  // If selected subject is not in childSubjects, reset or pick first
  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    const validChildren = availableLists.filter(l => l.parent_id === courseId);
    if (validChildren.length > 0) {
      setSelectedSubject(validChildren[0].id);
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

      const url = initialData ? `/api/planner/videos/${initialData.id}` : '/api/planner/videos';
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          session_id: sessionId || null,
          list_ids: listIds,
          status,
          assigned_month: assignedMonth || null,
          assigned_week: assignedWeek || null,
          notes: notes.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to save planned video entry");
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save planned video.");
    } finally {
      setSaving(false);
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
                {initialData ? 'Edit Planned Video' : 'Individual Entry Form'}
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
                <option value="" disabled>Select course...</option>
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
                {(Array.isArray(availableSessions) ? availableSessions : []).map(s => (
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (initialData ? 'Save changes' : 'Create Planned Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
