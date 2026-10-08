import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, CheckCircle, ArrowDownRight, Edit3, Tag, Layers, 
  ExternalLink, Sparkles, Filter, ArrowUpDown, TrendingUp, Eye, EyeOff, ThumbsUp, Users, Calendar, SlidersHorizontal
} from 'lucide-react';

const getPublishYear = (dateStr) => {
  if (!dateStr) return null;
  const match = String(dateStr).match(/\b(20\d\d|19\d\d)\b/);
  return match ? match[1] : (dateStr.length >= 4 ? dateStr.substring(0, 4) : null);
};

export default function LowCTRView({ onLogChangeForVideo, onEditCategoryForVideo, onEditListsForVideo, onSelectItem }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters: Fix 2 style - first filter is Published vs Unlisted
  const [filterPrivacy, setFilterPrivacy] = useState('PUBLIC'); // 'PUBLIC' | 'UNLISTED' | 'ALL'
  const [filterStatus, setFilterStatus] = useState('NEEDS_FIX'); // 'ALL' | 'NEEDS_FIX' | 'OPTIMAL'
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [sortBy, setSortBy] = useState('opportunity_desc'); // 'opportunity_desc' | 'impr_desc' | 'ctr_asc' | 'gap_desc' | 'views_desc'

  useEffect(() => {
    fetchLowCTRData();
  }, []);

  const fetchLowCTRData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/low-ctr');
      const data = await res.json();
      setVideos(data || []);
    } catch (err) {
      console.error("Failed to load low CTR triage:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic available years
  const availableYears = useMemo(() => {
    const years = new Set();
    videos.forEach(v => {
      const yr = getPublishYear(v.published_at);
      if (yr) years.add(yr);
    });
    return Array.from(years).sort().reverse();
  }, [videos]);

  // Filtered and sorted
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // 1. Privacy filter (First filter)
    if (filterPrivacy === 'PUBLIC') {
      result = result.filter(v => (v.privacy_status || 'public').toLowerCase() === 'public');
    } else if (filterPrivacy === 'UNLISTED') {
      result = result.filter(v => (v.privacy_status || '').toLowerCase() === 'unlisted');
    }

    // 2. Year filter (Fix 2: clearly visible year & filter)
    if (filterYear !== 'ALL') {
      result = result.filter(v => getPublishYear(v.published_at) === filterYear);
    }

    // 3. Status filter
    if (filterStatus === 'NEEDS_FIX') {
      result = result.filter(v => v.is_flagged);
    } else if (filterStatus === 'OPTIMAL') {
      result = result.filter(v => v.status === 'OPTIMAL');
    }

    // 4. Course filter
    if (filterCourse !== 'ALL') {
      result = result.filter(v => v.course === filterCourse);
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === 'opportunity_desc') {
        return (b.views_opportunity || 0) - (a.views_opportunity || 0);
      } else if (sortBy === 'impr_desc') {
        return (b.impressions || 0) - (a.impressions || 0);
      } else if (sortBy === 'ctr_asc') {
        return (a.ctr || 0) - (b.ctr || 0);
      } else if (sortBy === 'ctr_desc') {
        return (b.ctr || 0) - (a.ctr || 0);
      } else if (sortBy === 'gap_desc') {
        return (a.ctr_pct_gap || 0) - (b.ctr_pct_gap || 0); // most negative first
      } else if (sortBy === 'views_desc') {
        return (b.views || 0) - (a.views || 0);
      } else if (sortBy === 'likes_desc') {
        return (b.likes || 0) - (a.likes || 0);
      }
      return 0;
    });

    return result;
  }, [videos, filterPrivacy, filterYear, filterStatus, filterCourse, sortBy]);

  // Aggregate stats
  const publicCount = videos.filter(v => (v.privacy_status || 'public').toLowerCase() === 'public').length;
  const unlistedCount = videos.filter(v => (v.privacy_status || '').toLowerCase() === 'unlisted').length;
  const flaggedCount = filteredVideos.filter(v => v.is_flagged).length;
  const totalOpportunity = filteredVideos.reduce((acc, v) => acc + (v.views_opportunity || 0), 0);

  return (
    <div style={{ background: '#F0F3F7', border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: '22px', boxShadow: '6px 6px 14px rgba(166, 175, 195, 0.55), -6px -6px 14px rgba(255, 255, 255, 0.85)', padding: '24px' }}>
      
      {/* Header & KPI Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 
              style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.01em' }}
              title="Surfaces videos where CTR is significantly below category baselines and quantifies view recovery potential."
            >
              Low-CTR Detection & Triage
            </h2>
            {flaggedCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600, background: '#FFF0F2', color: '#E11D48', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                <AlertTriangle size={12} /> {flaggedCount} underperforming
              </span>
            )}
            {totalOpportunity > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600, background: '#ECFDF5', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                <TrendingUp size={12} /> +{totalOpportunity.toLocaleString()} views recoverable
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
            Pinpoint videos falling below their course format baseline CTR and prioritize thumbnail/title updates by potential view gain.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="controls-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
          
          {/* FIX 2: Visibility (Published vs Unlisted) as FIRST filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Visibility:
            </span>
            <select 
              className="control-select"
              value={filterPrivacy}
              onChange={(e) => setFilterPrivacy(e.target.value)}
              id="select-low-ctr-privacy"
              style={{ fontWeight: 600, borderColor: '#3B82F6', background: '#F8FAFC' }}
            >
              <option value="PUBLIC">🟢 Published Only ({publicCount})</option>
              <option value="UNLISTED">🔒 Unlisted Only ({unlistedCount})</option>
              <option value="ALL">🌐 All Videos ({videos.length})</option>
            </select>
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
            <select 
              className="control-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              id="select-low-ctr-status"
            >
              <option value="NEEDS_FIX">⚠️ Needs Fix Only</option>
              <option value="ALL">All CTR Ratings</option>
              <option value="OPTIMAL">✨ High Performers</option>
            </select>
          </div>

          {/* Course filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Course:</span>
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

          {/* Year Filter (Fix 2: clearly visible year & filter) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Year:</span>
            <select 
              className="control-select"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              id="select-low-ctr-year"
              style={{ fontWeight: filterYear !== 'ALL' ? 700 : 400, background: filterYear !== 'ALL' ? '#FEF3C7' : 'inherit' }}
            >
              <option value="ALL">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* FIX 6: Sort options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sort:</span>
            <select 
              className="control-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              id="select-low-ctr-sort"
            >
              <option value="opportunity_desc">🔥 View Opportunity (High to Low)</option>
              <option value="impr_desc">👁️ Impressions (Most to Least)</option>
              <option value="gap_desc">📉 CTR Underperformance (Largest Gap)</option>
              <option value="ctr_asc">🎯 CTR (Lowest First)</option>
              <option value="ctr_desc">⭐ CTR (Highest First)</option>
              <option value="views_desc">📊 Views (Most to Least)</option>
              <option value="likes_desc">👍 Likes (Most to Least)</option>
            </select>
          </div>

        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Evaluating category CTR benchmarks and recovery potentials...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: '#FFFFFF', borderRadius: '14px', border: '1px dashed #CBD5E1' }}>
          No videos match the selected filters ({filterPrivacy === 'PUBLIC' ? 'Published' : filterPrivacy === 'UNLISTED' ? 'Unlisted' : 'All'}).
        </div>
      ) : (
        <div className="table-responsive" style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', overflowX: 'auto' }}>
          <table className="analytics-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ minWidth: '300px', textAlign: 'left', padding: '12px 14px' }}>Video & Categorization</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>Visibility</th>
                <th style={{ textAlign: 'center', padding: '12px 10px', color: '#059669' }}>View Opportunity</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>Actual CTR</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>Category Baseline</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>CTR Gap</th>
                {/* FIX 5: Views and Impressions kept separate */}
                <th style={{ textAlign: 'right', padding: '12px 10px' }}>Impressions</th>
                <th style={{ textAlign: 'right', padding: '12px 10px' }}>Views</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>Likes & Dislikes</th>
                <th style={{ minWidth: '220px', textAlign: 'left', padding: '12px 14px' }}>Suggested Action</th>
                <th style={{ textAlign: 'right', padding: '12px 14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.map((v) => {
                const isCFA = (v.course || '').startsWith('CFA');
                const isPublic = (v.privacy_status || 'public').toLowerCase() === 'public';
                const likes = v.likes || 0;
                const dislikes = v.dislikes || 0;
                const totalVotes = likes + dislikes;
                const likeRatio = totalVotes > 0 ? ((likes / totalVotes) * 100).toFixed(1) : null;

                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9', background: v.is_flagged ? 'rgba(244, 63, 94, 0.025)' : 'inherit' }}>
                    
                    {/* Video Info */}
                    <td style={{ padding: '12px 14px' }}>
                      <div className="video-cell" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img 
                            src={v.thumbnail_url || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80'} 
                            alt={v.title} 
                            style={{ width: '84px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }}
                          />
                          {v.duration_seconds > 0 && (
                            <span style={{
                              position: 'absolute',
                              bottom: '3px',
                              right: '3px',
                              background: 'rgba(0,0,0,0.8)',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 3px',
                              borderRadius: '3px'
                            }}>
                              {Math.floor(v.duration_seconds / 60)}:{(v.duration_seconds % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <a 
                            href={`https://youtube.com/watch?v=${v.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ 
                              fontSize: '12px', 
                              fontWeight: 700, 
                              color: '#0F172A', 
                              display: '-webkit-box', 
                              WebkitLineClamp: 2, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden',
                              textDecoration: 'none',
                              lineHeight: '1.3'
                            }}
                            title={v.title}
                          >
                            {v.title}
                          </a>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <span className={`badge ${isCFA ? 'badge-cfa' : 'badge-frm'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>{v.course}</span>
                            <span className="badge badge-prep" style={{ fontSize: '10px', padding: '1px 6px' }}>{v.topic}</span>
                            <span className="badge badge-format" style={{ fontSize: '10px', padding: '1px 6px' }}>{v.format}</span>
                            {/* Fix 2: Year of video published as clearly visible tag */}
                            {getPublishYear(v.published_at) && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 750,
                                padding: '1px 7px',
                                borderRadius: '4px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FDE68A',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }} title={`Published: ${v.published_at}`}>
                                <Calendar size={10} color="#B45309" />
                                <span>{getPublishYear(v.published_at)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Privacy Status */}
                    <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                      {isPublic ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: '#DCFCE7', color: '#15803D' }}>
                          <Eye size={11} /> Public
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: '#F1F5F9', color: '#64748B' }}>
                          <EyeOff size={11} /> Unlisted
                        </span>
                      )}
                    </td>

                    {/* Views Opportunity */}
                    <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                      {v.views_opportunity > 0 ? (
                        <div style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>
                            +{v.views_opportunity.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>
                            potential views
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>—</span>
                      )}
                    </td>

                    {/* Actual CTR */}
                    <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: 800, 
                        fontFamily: 'monospace',
                        color: v.is_flagged ? '#E11D48' : '#0F172A'
                      }}>
                        {v.ctr.toFixed(1)}%
                      </span>
                    </td>

                    {/* Baseline CTR */}
                    <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', color: '#334155' }}>
                        {v.category_baseline_ctr.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                        {v.course} · {v.format}
                      </div>
                    </td>

                    {/* CTR Gap */}
                    <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '2px',
                        fontWeight: 800,
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: v.ctr_pct_gap < 0 ? '#E11D48' : '#059669'
                      }}>
                        {v.ctr_pct_gap < 0 ? <ArrowDownRight size={13} /> : '+'}
                        {v.ctr_pct_gap}%
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                        {v.ctr_difference > 0 ? `+${v.ctr_difference}%` : `${v.ctr_difference}%`} pts
                      </div>
                    </td>

                    {/* FIX 5: Impressions (Separate) */}
                    <td style={{ textAlign: 'right', padding: '12px 10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                        {(v.impressions || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* FIX 5: Views (Separate) */}
                    <td style={{ textAlign: 'right', padding: '12px 10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
                        {(v.views || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Likes & Dislikes / Community */}
                    <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                      {likes > 0 || dislikes > 0 ? (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            <ThumbsUp size={11} color="#059669" />
                            <span>{likes.toLocaleString()}</span>
                            {dislikes > 0 && <span style={{ color: '#EF4444', fontSize: '10px' }}>({dislikes}👎)</span>}
                          </div>
                          {likeRatio && (
                            <div style={{ fontSize: '10px', fontWeight: 600, color: '#059669' }}>
                              {likeRatio}% positive
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>—</span>
                      )}
                    </td>

                    {/* Suggested Action */}
                    <td style={{ padding: '12px 14px' }}>
                      {v.recommendations && v.recommendations.length > 0 ? (
                        <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.3' }}>
                          💡 {v.recommendations[0]}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>CTR benchmark healthy</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        {onSelectItem && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#2563EB', borderColor: '#DBEAFE', background: '#EFF6FF', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => onSelectItem(v)}
                            title="Inspect in Right Dock"
                          >
                            <SlidersHorizontal size={11} /> Inspect
                          </button>
                        )}
                        <button 
                          className="btn-primary" 
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => onLogChangeForVideo(v)}
                          title="Log title or thumbnail change for this video"
                        >
                          <Edit3 size={11} /> Log Change
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => onEditListsForVideo && onEditListsForVideo(v)}
                          title="Edit which lists this video belongs to"
                        >
                          <Layers size={11} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => onEditCategoryForVideo(v)}
                          title="Re-categorize course/topic/format"
                        >
                          <Tag size={11} />
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
