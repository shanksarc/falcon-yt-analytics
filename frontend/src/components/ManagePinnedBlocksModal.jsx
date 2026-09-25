import React, { useState } from 'react';
import { X, Check, Pin, Layers } from 'lucide-react';

export default function ManagePinnedBlocksModal({ allLists = [], currentPinnedIds = [], onClose, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState(new Set(currentPinnedIds));
  const [saving, setSaving] = useState(false);

  const toggleList = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/pinned-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned_ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        onSuccess(Array.from(selectedIds));
      }
    } catch (err) {
      console.error("Failed to update pinned blocks:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pin size={18} color="var(--cfa-gold)" />
            <h3 className="modal-title">Customize Dashboard List Blocks (Section 03)</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.3rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Select which Lists you want pinned as performance blocks on your main dashboard overview. Your selection persists across sessions.
        </p>

        <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
          {allLists.map((l) => {
            const isPinned = selectedIds.has(l.id);
            return (
              <div 
                key={l.id}
                onClick={() => toggleList(l.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem 1rem', 
                  background: isPinned ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-surface-elevated)',
                  border: isPinned ? '1px solid var(--cfa-gold)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    checked={isPinned} 
                    onChange={() => {}} // Handled by div click
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{l.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {l.stats?.video_count || 0} videos · {(l.stats?.total_views || 0).toLocaleString()} views
                    </div>
                  </div>
                </div>

                {l.is_course ? (
                  <span className="badge badge-cfa" style={{ fontSize: '0.65rem' }}>Course</span>
                ) : (
                  <span className="badge badge-format" style={{ fontSize: '0.65rem' }}>List</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {selectedIds.size} lists selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving...' : 'Save Layout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
