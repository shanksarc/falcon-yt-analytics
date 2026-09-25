import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ArrowDownRight, Edit3, Tag, Layers, ExternalLink, Sparkles, Filter } from 'lucide-react';

export default function LowCTRView({ onLogChangeForVideo, onEditCategoryForVideo, onEditListsForVideo }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('NEEDS_FIX'); // 'ALL' | 'NEEDS_FIX' | 'OPTIMAL'

  useEffect(() => {
    fetchLowCTRData();
  }, []);

  const fetchLowCTRData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/low-ctr');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error("Failed to load low CTR triage:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(v => {
    if (filterCourse !== 'ALL' && v.course !== filterCourse) return false;
    if (filterStatus === 'NEEDS_FIX' && !v.is_flagged) return false;
    if (filterStatus === 'OPTIMAL' && v.status !== 'OPTIMAL') return false;
    return true;
  });

  const flaggedCount = videos.filter(v => v.is_flagged).length;

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF1', borderRadius: '16px', boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.04)', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.01em' }}>Low-CTR Detection & Triage</h2>
            {flaggedCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 500, background: '#FFF0F2', color: '#E11D48', border: '1px solid rgba(225, 29, 72, 0.2)' }}>{flaggedCount} underperforming</span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
            Surfaces videos where CTR is significantly below category baselines.
          </p>
        </div>

        <div className="controls-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
            <select 
              className="control-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              id="select-low-ctr-status"
            >
              <option value="NEEDS_FIX">⚠️ Needs Improvement Only ({flaggedCount})</option>
              <option value="ALL">All Videos ({videos.length})</option>
              <option value="OPTIMAL">✨ High Performers</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Course:</span>
            <select 
              className="control-select"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              id="select-low-ctr-course"
            >
              <option value="ALL">All Courses</option>
              <option value="CFA L1">CFA L1</option>
              <option value="CFA L2">CFA L2</option>
              <option value="CFA L3">CFA L3</option>
              <option value="FRM Part 1">FRM Part 1</option>
              <option value="FRM Part 2">FRM Part 2</option>
              <option value="General Prep">General Prep</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Evaluating category CTR benchmarks...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No videos match the selected filters.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="analytics-table">
            <thead>
              <tr>
                <th style={{ minWidth: '320px' }}>Video & Categorization</th>
                <th>Actual CTR</th>
                <th>Category Baseline</th>
                <th>CTR Gap</th>
                <th>Status</th>
                <th>Suggested Action</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.map((v) => {
                const isCFA = v.course.startsWith('CFA');
                return (
                  <tr key={v.id} style={{ background: v.is_flagged ? 'rgba(244, 63, 94, 0.04)' : 'inherit' }}>
                    <td>
                      <div className="video-cell">
                        <img 
                          src={v.thumbnail_url || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80'} 
                          alt={v.title} 
                          className="video-thumb" 
                        />
                        <div className="video-title-wrap">
                          <span className="video-title" title={v.title}>{v.title}</span>
                          <div className="video-meta-tags">
                            <span className={`badge ${isCFA ? 'badge-cfa' : 'badge-frm'}`}>{v.course}</span>
                            <span className="badge badge-prep">{v.topic}</span>
                            <span className="badge badge-format">{v.format}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ 
                        fontSize: '1rem', 
                        fontWeight: 700, 
                        fontFamily: 'var(--font-mono)',
                        color: v.is_flagged ? 'var(--danger-rose)' : 'inherit'
                      }}>
                        {v.ctr.toFixed(1)}%
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {(v.impressions || 0).toLocaleString()} impr.
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {v.category_baseline_ctr.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        for {v.course} · {v.format}
                      </div>
                    </td>

                    <td>
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.2rem',
                        fontWeight: 700,
                        color: v.ctr_pct_gap < 0 ? 'var(--danger-rose)' : 'var(--success-emerald)'
                      }}>
                        {v.ctr_pct_gap < 0 ? <ArrowDownRight size={14} /> : '+'}
                        {v.ctr_pct_gap}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {v.ctr_difference > 0 ? `+${v.ctr_difference}%` : `${v.ctr_difference}%`} absolute
                      </div>
                    </td>

                    <td>
                      {v.status === 'NEEDS_FIX' && (
                        <span className="badge badge-danger">
                          <AlertTriangle size={11} /> Needs Fix
                        </span>
                      )}
                      {v.status === 'OPTIMAL' && (
                        <span className="badge badge-success">
                          <CheckCircle size={11} /> High CTR
                        </span>
                      )}
                      {v.status === 'AVERAGE' && (
                        <span className="badge badge-format">On Par</span>
                      )}
                    </td>

                    <td style={{ maxWidth: '280px' }}>
                      {v.recommendations && v.recommendations.length > 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          💡 {v.recommendations[0]}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thumbnail/Title healthy</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => onLogChangeForVideo(v)}
                          title="Log title or thumbnail change for this video"
                        >
                          <Edit3 size={12} /> Log Change
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => onEditListsForVideo && onEditListsForVideo(v)}
                          title="Edit which lists this video belongs to"
                        >
                          <Layers size={12} /> Lists
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => onEditCategoryForVideo(v)}
                          title="Re-categorize course/topic/format"
                        >
                          <Tag size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
