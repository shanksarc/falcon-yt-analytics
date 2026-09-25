import React, { useState } from 'react';
import { X, Layers, Plus, ListPlus, Edit3 } from 'lucide-react';

export default function SubjectModal({ 
  courses = [], 
  defaultCourseId = null, 
  initialData = null, 
  onClose, 
  onSuccess 
}) {
  const isEditing = Boolean(initialData);

  // Parent Course selection
  const [parentId, setParentId] = useState(
    initialData ? initialData.parent_id : (defaultCourseId || (courses[0]?.id || ''))
  );

  // Mode: 'bulk' (multiple subjects) or 'single' (one subject with description)
  const [mode, setMode] = useState('bulk');

  // Bulk state
  const [bulkText, setBulkText] = useState('');
  const [bulkDescription, setBulkDescription] = useState('');

  // Single state
  const [singleName, setSingleName] = useState(initialData ? initialData.name : '');
  const [singleDescription, setSingleDescription] = useState(initialData ? initialData.description : '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Helper to parse multiple subjects from text (split by newline or comma)
  const parseSubjects = (text) => {
    return Array.from(new Set(
      text
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
    ));
  };

  const detectedSubjects = parseSubjects(bulkText);

  const handleRemoveChip = (nameToRemove) => {
    const remaining = detectedSubjects.filter(name => name.toLowerCase() !== nameToRemove.toLowerCase());
    setBulkText(remaining.join('\n'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parentId) {
      setError("Please select a parent course.");
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        // Edit single subject
        if (!singleName.trim()) {
          setError("Please provide a subject name.");
          setSaving(false);
          return;
        }

        const res = await fetch(`/api/planner/subjects/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: singleName.trim(),
            parent_id: parentId,
            description: singleDescription.trim()
          })
        });
        if (!res.ok) throw new Error("Failed to update subject.");
      } else if (mode === 'bulk') {
        // Multiple subjects bulk create
        if (detectedSubjects.length === 0) {
          setError("Please enter at least one subject name.");
          setSaving(false);
          return;
        }

        const res = await fetch('/api/planner/subjects/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_id: parentId,
            names: detectedSubjects,
            description: bulkDescription.trim()
          })
        });
        if (!res.ok) throw new Error("Failed to create subjects.");
      } else {
        // Single subject create
        if (!singleName.trim()) {
          setError("Please provide a subject name.");
          setSaving(false);
          return;
        }

        const res = await fetch('/api/planner/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: singleName.trim(),
            parent_id: parentId,
            description: singleDescription.trim()
          })
        });
        if (!res.ok) throw new Error("Failed to create subject.");
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save subject(s).");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="#A855F7" />
            <h3 className="modal-title">
              {isEditing ? 'Edit Subject' : 'Add Subjects to Course'}
            </h3>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ 
            color: 'var(--danger-red)', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8rem', 
            marginBottom: '1rem' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Parent Course Selector */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Parent Course</label>
            <select 
              className="form-input"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Mode Switcher if creating new */}
          {!isEditing && (
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-surface-elevated)', 
              borderRadius: 'var(--radius-md)', 
              padding: '3px',
              marginBottom: '1.25rem',
              border: '1px solid var(--border-hairline)'
            }}>
              <button
                type="button"
                className={mode === 'bulk' ? 'btn-primary' : 'btn-ghost'}
                onClick={() => setMode('bulk')}
                style={{ 
                  flex: 1, 
                  fontSize: '0.78rem', 
                  padding: '0.35rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <ListPlus size={14} />
                <span>Multiple Subjects ({detectedSubjects.length})</span>
              </button>
              <button
                type="button"
                className={mode === 'single' ? 'btn-primary' : 'btn-ghost'}
                onClick={() => setMode('single')}
                style={{ 
                  flex: 1, 
                  fontSize: '0.78rem', 
                  padding: '0.35rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Edit3 size={14} />
                <span>Single Subject</span>
              </button>
            </div>
          )}

          {/* BULK MODE (MULTIPLE SUBJECTS) */}
          {!isEditing && mode === 'bulk' && (
            <div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
                    Subject Names
                  </label>
                  <span style={{ fontSize: '0.72rem', color: detectedSubjects.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {detectedSubjects.length} {detectedSubjects.length === 1 ? 'subject' : 'subjects'} detected
                  </span>
                </div>

                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                  Enter or paste multiple subjects, one per line or separated by commas:
                </p>

                <textarea 
                  className="form-input"
                  rows={5}
                  placeholder={`Fixed Income\nDerivatives\nEquity Investments\nQuantitative Methods\nPortfolio Management`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  autoFocus
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', lineHeight: '1.4' }}
                />
              </div>

              {/* Detected preview badge chips */}
              {detectedSubjects.length > 0 && (
                <div style={{ 
                  background: 'var(--bg-surface-elevated)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.65rem 0.75rem',
                  marginBottom: '1rem' 
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.45rem' }}>
                    Preview ({detectedSubjects.length} to be added):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '110px', overflowY: 'auto' }}>
                    {detectedSubjects.map(name => (
                      <span 
                        key={name}
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(168, 85, 247, 0.12)',
                          color: '#C084FC',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        {name}
                        <button 
                          type="button"
                          onClick={() => handleRemoveChip(name)}
                          style={{ background: 'none', border: 'none', color: '#C084FC', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          title="Remove from list"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Shared Description / Notes (optional)
                </label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Core curriculum modules for 2026-2027"
                  value={bulkDescription}
                  onChange={(e) => setBulkDescription(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>
          )}

          {/* SINGLE MODE (SINGLE SUBJECT OR EDIT) */}
          {(isEditing || mode === 'single') && (
            <div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Subject Name</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Fixed Income, Derivatives, Quant"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea 
                  className="form-input"
                  rows={3}
                  placeholder="Key topics, chapters, or units in this subject"
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-hairline)', paddingTop: '1rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={saving || (!isEditing && mode === 'bulk' && detectedSubjects.length === 0)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={14} />
              <span>
                {saving 
                  ? 'Saving...' 
                  : isEditing 
                    ? 'Save Changes' 
                    : mode === 'bulk' 
                      ? (detectedSubjects.length > 0 
                          ? `Add ${detectedSubjects.length} Subject${detectedSubjects.length > 1 ? 's' : ''}` 
                          : 'Add Subjects')
                      : 'Create Subject'
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
