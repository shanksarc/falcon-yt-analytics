import React, { useState } from 'react';
import { X, Check, FolderPlus, Layers } from 'lucide-react';

export default function CreateListModal({ availableLists = [], defaultParentId = null, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(defaultParentId || '');
  const [description, setDescription] = useState('');
  const [isCourse, setIsCourse] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          parent_id: parentId || null,
          description,
          is_course: isCourse ? 1 : 0
        })
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to create list:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderPlus size={18} color="var(--cfa-gold)" />
            <h3 className="modal-title">Create New Video List</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.3rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">List Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Duration & Convexity or Revision Sprints" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Parent List (Hierarchy Hierarchy Extension)</label>
            <select 
              className="form-select" 
              value={parentId} 
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">(None - Top-Level Root List)</option>
              {availableLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.is_course ? '(Course)' : ''}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Lists support arbitrary nesting depth (e.g. CFA Level 1 → Fixed Income → Duration & Convexity).
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Scope</label>
            <textarea 
              className="form-textarea" 
              rows={2} 
              placeholder="e.g. Focus area covering core valuation techniques..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="chk-is-course" 
              checked={isCourse} 
              onChange={(e) => setIsCourse(e.target.checked)} 
            />
            <label htmlFor="chk-is-course" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Display in Section 02 (Course-Level Block)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Check size={15} />
              {saving ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
