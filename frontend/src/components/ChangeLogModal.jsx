import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, Sparkles, Calculator } from 'lucide-react';

export default function ChangeLogModal({ video, onClose, onSuccess }) {
  const [changeType, setChangeType] = useState('Both');
  const [changeDate, setChangeDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTitle, setNewTitle] = useState(video?.title || '');
  const [newThumbnail, setNewThumbnail] = useState(video?.thumbnail_url || '');
  const [notes, setNotes] = useState('');
  
  // 14d CTR metrics
  const [ctrBefore, setCtrBefore] = useState(video?.ctr || 3.2);
  const [ctrAfter, setCtrAfter] = useState(5.4);
  const [channelCtrBefore, setChannelCtrBefore] = useState(5.2);
  const [channelCtrAfter, setChannelCtrAfter] = useState(5.3);
  const [submitting, setSubmitting] = useState(false);

  // Live impact calculation
  const videoDelta = parseFloat(ctrAfter || 0) - parseFloat(ctrBefore || 0);
  const channelDelta = parseFloat(channelCtrAfter || 0) - parseFloat(channelCtrBefore || 0);
  const liveImpact = (videoDelta - channelDelta).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        video_id: video?.id,
        change_date: changeDate,
        change_type: changeType,
        old_title: video?.title || '',
        new_title: newTitle,
        old_thumbnail: video?.thumbnail_url || '',
        new_thumbnail: newThumbnail,
        notes: notes,
        ctr_before_14d: parseFloat(ctrBefore),
        ctr_after_14d: parseFloat(ctrAfter),
        channel_ctr_before_14d: parseFloat(channelCtrBefore),
        channel_ctr_after_14d: parseFloat(channelCtrAfter),
        views_before_14d: 500,
        views_after_14d: 1200
      };

      const res = await fetch('/api/change-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to save change log:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--cfa-gold)" />
            <h3 className="modal-title">Log Title / Thumbnail Edit</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.3rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Video Target</label>
            <div style={{ padding: '0.6rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <strong>{video?.title}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {video?.course} · {video?.topic} · Current CTR: {video?.ctr}%
              </div>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">What Changed?</label>
              <select className="form-select" value={changeType} onChange={(e) => setChangeType(e.target.value)}>
                <option value="Both">Both Title & Thumbnail</option>
                <option value="Thumbnail Only">Thumbnail Only</option>
                <option value="Title Only">Title Only</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date of Change</label>
              <input 
                type="date" 
                className="form-input" 
                value={changeDate} 
                onChange={(e) => setChangeDate(e.target.value)} 
                required 
              />
            </div>
          </div>

          {(changeType === 'Title Only' || changeType === 'Both') && (
            <div className="form-group">
              <label className="form-label">New Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                placeholder="Enter new high-intent title..."
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Optimization Hypothesis & Notes</label>
            <textarea 
              className="form-textarea" 
              rows={2} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Added exam year and high-contrast formula badge to test search click-through."
            />
          </div>

          {/* 14-Day Confounder Control Inputs */}
          <div style={{ 
            background: 'var(--bg-surface-elevated)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1.25rem',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cfa-gold)' }}>
              <Calculator size={14} />
              <span>14-Day Before vs. After Metric Windows</span>
            </div>

            <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label">Video CTR Before (14d)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  value={ctrBefore} 
                  onChange={(e) => setCtrBefore(e.target.value)} 
                />
              </div>
              <div>
                <label className="form-label">Video CTR After (14d)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  value={ctrAfter} 
                  onChange={(e) => setCtrAfter(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-row-2">
              <div>
                <label className="form-label">Channel CTR Before (14d)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  value={channelCtrBefore} 
                  onChange={(e) => setChannelCtrBefore(e.target.value)} 
                />
              </div>
              <div>
                <label className="form-label">Channel CTR After (14d)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  value={channelCtrAfter} 
                  onChange={(e) => setChannelCtrAfter(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ 
              marginTop: '1rem', 
              paddingTop: '0.75rem', 
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Computed Net Impact (diff-in-diff):
              </span>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontWeight: 800, 
                fontSize: '1.1rem',
                color: liveImpact >= 0 ? 'var(--success-emerald)' : 'var(--danger-rose)' 
              }}>
                {liveImpact >= 0 ? `+${liveImpact}%` : `${liveImpact}%`} CTR Lift
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Check size={15} />
              {submitting ? 'Saving...' : 'Save & Compute Impact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
