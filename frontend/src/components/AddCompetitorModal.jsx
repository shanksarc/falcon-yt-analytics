import React, { useState } from 'react';
import { X, Check, Users } from 'lucide-react';

export default function AddCompetitorModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [subscribers, setSubscribers] = useState('50000');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          channel_handle: handle.startsWith('@') ? handle : `@${handle}`,
          subscriber_count: parseInt(subscribers) || 10000,
          video_count: 120,
          total_views: (parseInt(subscribers) || 10000) * 120,
        })
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to add competitor:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--cfa-gold)" />
            <h3 className="modal-title">Track Competitor Channel</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.3rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Channel Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Kaplan Schweser CFA" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">YouTube Handle / Channel URL</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. @KaplanSchweser" 
              value={handle} 
              onChange={(e) => setHandle(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subscriber Count</label>
            <input 
              type="number" 
              className="form-input" 
              value={subscribers} 
              onChange={(e) => setSubscribers(e.target.value)} 
              required 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Check size={15} />
              {saving ? 'Adding...' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
