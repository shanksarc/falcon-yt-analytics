import React, { useState, useEffect } from 'react';
import { X, Calendar, Sparkles, BookOpen, Trash2, CheckSquare, Square } from 'lucide-react';

const RECURRING_TEMPLATES = [
  { name: "Nov 2026", start_date: "2026-07-01", end_date: "2026-11-25" },
  { name: "Feb 2027", start_date: "2026-10-01", end_date: "2027-02-28" },
  { name: "May 2027", start_date: "2026-11-01", end_date: "2027-05-31" },
  { name: "Aug 2027", start_date: "2027-03-01", end_date: "2027-08-31" },
  { name: "Nov 2027", start_date: "2027-07-01", end_date: "2027-11-25" },
];

export default function CreateSessionModal({ 
  onClose, 
  onSuccess, 
  initialData = null, 
  courses: propCourses = null,
  onDelete = null
}) {
  const [name, setName] = useState(initialData ? initialData.name : '');
  const [startDate, setStartDate] = useState(initialData ? initialData.start_date : new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialData ? initialData.end_date : '');
  
  // Array of available courses
  const [courses, setCourses] = useState(propCourses || []);
  
  // Selected course targets mapping: { [courseId]: targetCount }
  const [courseTargets, setCourseTargets] = useState(() => {
    if (initialData?.course_targets) {
      const map = {};
      initialData.course_targets.forEach(ct => {
        map[ct.course_id] = ct.target_count || 0;
      });
      return map;
    }
    return {};
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!propCourses || propCourses.length === 0) {
      fetch('/api/planner/structure')
        .then(res => res.json())
        .then(data => {
          if (data?.courses) {
            setCourses(data.courses);
          }
        })
        .catch(err => console.error("Error fetching courses for session modal:", err));
    }
  }, [propCourses]);

  const applyTemplate = (tpl) => {
    setName(tpl.name);
    setStartDate(tpl.start_date);
    setEndDate(tpl.end_date);
  };

  const toggleCourse = (courseId) => {
    setCourseTargets(prev => {
      const next = { ...prev };
      if (courseId in next) {
        delete next[courseId];
      } else {
        next[courseId] = 20; // Default target
      }
      return next;
    });
  };

  const handleTargetChange = (courseId, val) => {
    const num = parseInt(val, 10);
    setCourseTargets(prev => ({
      ...prev,
      [courseId]: isNaN(num) ? 0 : Math.max(0, num)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide an exam window name.");
      return;
    }
    if (!endDate) {
      setError("Please specify the exam/end date.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      const url = initialData ? `/api/planner/sessions/${initialData.id}` : '/api/planner/sessions';
      const method = initialData ? 'PUT' : 'POST';

      const targetsArray = Object.entries(courseTargets).map(([cid, count]) => ({
        course_id: cid,
        target_count: count
      }));

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          course_targets: targetsArray
        })
      });

      if (!res.ok) throw new Error("Failed to save exam window");
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save exam window.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData) return;
    if (!window.confirm(`Are you sure you want to remove the "${initialData.name}" exam window?`)) {
      return;
    }

    setDeleting(true);
    try {
      if (onDelete) {
        await onDelete(initialData.id);
      } else {
        const res = await fetch(`/api/planner/sessions/${initialData.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Failed to delete session");
      }
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to delete exam window.");
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--yt-red)" />
            <h3 className="modal-title">{initialData ? 'Edit Exam Window' : 'New Exam Window'}</h3>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--danger-red)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Template suggestions */}
        {!initialData && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sparkles size={12} /> Suggested exam periods:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {RECURRING_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.74rem', background: 'var(--bg-surface-elevated)', padding: '0.2rem 0.6rem' }}
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Exam Window Name</label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g. Nov 2026, May 2027"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input 
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Exam / End Date</label>
              <input 
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Standalone Course Selection & Target Setting Section */}
          <div style={{ 
            marginTop: '1.25rem', 
            padding: '0.85rem', 
            background: 'var(--bg-surface-elevated)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={13} color="#3B82F6" />
                <span>Participating Courses & Targets</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Select courses for this window
              </span>
            </div>

            {courses.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                No courses available. Add courses first in Manage Plan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {courses.map(c => {
                  const isChecked = c.id in courseTargets;
                  return (
                    <div 
                      key={c.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        background: isChecked ? 'var(--bg-surface)' : 'transparent',
                        borderRadius: 'var(--radius-sm)',
                        border: isChecked ? '1px solid var(--border-subtle)' : '1px solid transparent'
                      }}
                    >
                      <label 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: isChecked ? 600 : 400,
                          flex: 1
                        }}
                        onClick={() => toggleCourse(c.id)}
                      >
                        {isChecked ? (
                          <CheckSquare size={16} color="#3EA65E" />
                        ) : (
                          <Square size={16} color="var(--text-muted)" />
                        )}
                        <span>{c.name}</span>
                      </label>

                      {isChecked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target:</span>
                          <input 
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ width: '65px', padding: '0.2rem 0.4rem', fontSize: '0.78rem', textAlign: 'center' }}
                            value={courseTargets[c.id]}
                            onChange={(e) => handleTargetChange(c.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="0"
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>vids</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: initialData ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: '1.5rem' }}>
            {initialData && (
              <button 
                type="button" 
                className="btn-ghost" 
                onClick={handleDelete} 
                disabled={saving || deleting}
                style={{ color: 'var(--danger-red)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
              >
                <Trash2 size={13} />
                <span>{deleting ? 'Deleting...' : 'Delete Window'}</span>
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-ghost" onClick={onClose} disabled={saving || deleting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving || deleting}>
                {saving ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Window')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
