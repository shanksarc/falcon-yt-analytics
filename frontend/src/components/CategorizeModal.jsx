import React, { useState } from 'react';
import { X, Check, Tag } from 'lucide-react';

export default function CategorizeModal({ video, status, onClose, onSuccess }) {
  const [course, setCourse] = useState(video?.course || 'CFA L1');
  const [topic, setTopic] = useState(video?.topic || 'Fixed Income');
  const [format, setFormat] = useState(video?.format || 'Core Lecture');
  const [saving, setSaving] = useState(false);

  const courses = status?.supported_courses || ['CFA L1', 'CFA L2', 'CFA L3', 'FRM Part 1', 'FRM Part 2', 'General Prep'];
  const topics = status?.supported_topics || ['Fixed Income', 'Quantitative Methods', 'Financial Statement Analysis', 'Equity Investments', 'Corporate Issuers', 'Derivatives', 'Alternative Investments', 'Portfolio Management', 'Ethical & Professional Standards', 'Economics', 'Market Risk', 'Credit Risk', 'Operational Risk', 'Liquidity & Treasury Risk', 'Risk Management Principles', 'General / Strategy'];
  const formats = status?.supported_formats || ['Core Lecture', 'Discussion / Podcast', 'Doubt-clearing / Q&A', 'Revision / Marathon', 'Strategy / General'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/videos/${video.id}/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, topic, format })
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to update category:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={18} color="var(--cfa-gold)" />
            <h3 className="modal-title">Edit Video Taxonomy</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.3rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Video</label>
            <div style={{ padding: '0.6rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <strong>{video?.title}</strong>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Course Level</label>
            <select className="form-select" value={course} onChange={(e) => setCourse(e.target.value)}>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Topic Bucket</label>
            <select className="form-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Content Format</label>
            <select className="form-select" value={format} onChange={(e) => setFormat(e.target.value)}>
              {formats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Check size={15} />
              {saving ? 'Updating...' : 'Save Taxonomy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
