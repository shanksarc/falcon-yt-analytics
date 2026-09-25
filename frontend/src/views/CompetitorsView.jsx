import React, { useState, useEffect } from 'react';
import { Users, Flame, Zap, Award, ExternalLink, Plus, Search, Compass, TrendingUp } from 'lucide-react';

export default function CompetitorsView({ onOpenAddCompetitor }) {
  const [data, setData] = useState({ competitors: [], videos: [], top_performing_topics: [] });
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCompetitorData();
  }, []);

  const fetchCompetitorData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competitors');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load competitor data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = data.videos.filter(v => {
    if (selectedChannel !== 'ALL' && v.channel_id !== selectedChannel) return false;
    if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatViews = (val) => {
    if (!val) return '0';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + 'k';
    return val.toLocaleString();
  };

  return (
    <div>
      {/* Competitor Channels Overview */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF1', borderRadius: '16px', boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.04)', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.01em' }}>Niche Competitor Benchmarking</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Normalized public benchmarks (Views/Day velocity and Channel Outlier multiplier).
            </p>
          </div>

          <button 
            onClick={onOpenAddCompetitor}
            id="btn-add-competitor"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#7C3AED',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px -1px rgba(124, 58, 237, 0.35)',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={15} /> Track new competitor
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {data.competitors.map((c) => (
            <div 
              key={c.id} 
              style={{ 
                background: 'var(--bg-surface-elevated)', 
                padding: '1.25rem', 
                borderRadius: 'var(--radius-md)',
                border: selectedChannel === c.id ? '1px solid var(--cfa-gold)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onClick={() => setSelectedChannel(selectedChannel === c.id ? 'ALL' : c.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <img 
                  src={c.avatar_url} 
                  alt={c.name} 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.channel_handle}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Subscribers: <strong style={{ color: 'var(--text-primary)' }}>{formatViews(c.subscriber_count)}</strong></span>
                <span>Videos: <strong style={{ color: 'var(--text-primary)' }}>{c.video_count}</strong></span>
                <span>Views: <strong style={{ color: 'var(--text-primary)' }}>{formatViews(c.total_views)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Velocity Topic Ideas in the Niche */}
      <div className="content-card">
        <div className="content-card-header">
          <div className="card-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} color="var(--cfa-gold)" />
              <h3>High-Velocity Topic Clusters</h3>
            </div>
            <p>Topics with the highest daily view velocity across multiple competitor channels</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {data.top_performing_topics.map((t) => (
            <div 
              key={t.topic}
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.topic}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Avg {t.avg_velocity} views/day · {t.high_outliers} high outliers
                </div>
              </div>
              <span className="badge badge-cfa" style={{ fontSize: '0.65rem' }}>
                <Zap size={10} /> Fast Velocity
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor Videos Leaderboard */}
      <div className="content-card">
        <div className="content-card-header">
          <div className="card-title-group">
            <h3>Competitor Video Leaderboard (Normalized Velocity & Outliers)</h3>
            <p>Surfaces genuine breakout hits by normalizing views against days live and the channel's standard baseline</p>
          </div>

          <div className="controls-bar">
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search competitor titles..."
                className="form-input"
                style={{ paddingLeft: '2rem', width: '240px', padding: '0.4rem 0.8rem 0.4rem 2rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="input-search-competitors"
              />
              <Search size={13} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <select 
              className="control-select"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              id="select-competitor-filter"
            >
              <option value="ALL">All Competitors</option>
              {data.competitors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Calculating competitor velocities...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '320px' }}>Video & Framing</th>
                  <th>Channel</th>
                  <th>Total Views</th>
                  <th>Daily Velocity</th>
                  <th>Outlier Multiplier</th>
                  <th>Title Framing Hook</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.map((v) => {
                  const isOutlier = v.outlier_score >= 2.0;
                  return (
                    <tr key={v.id} style={{ background: isOutlier ? 'rgba(245, 158, 11, 0.03)' : 'inherit' }}>
                      <td>
                        <div className="video-cell">
                          <img 
                            src={v.thumbnail_url || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&q=80'} 
                            alt={v.title} 
                            className="video-thumb" 
                          />
                          <div className="video-title-wrap">
                            <span className="video-title" title={v.title}>{v.title}</span>
                            <div className="video-meta-tags">
                              <span className="badge badge-cfa">{v.course}</span>
                              <span className="badge badge-prep">{v.topic}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.channel_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Published {v.published_at.split('T')[0]}
                        </div>
                      </td>

                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {formatViews(v.views)}
                      </td>

                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          <Zap size={13} color="var(--cfa-gold)" />
                          {v.velocity.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>views / day</div>
                      </td>

                      <td>
                        <span 
                          className={`badge ${isOutlier ? 'badge-cfa' : 'badge-format'}`}
                          style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                        >
                          {v.outlier_score}x Avg
                        </span>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {v.title.includes('Marathon') && '🔥 High-yield marathon recap hook'}
                        {v.title.includes('Fail') && '⚠️ Contrarian / fear mitigation hook'}
                        {v.title.includes('Minutes') && '⚡ Rapid bite-sized learning'}
                        {v.title.includes('90th') && '🏆 Elite percentile benchmark framing'}
                        {!v.title.includes('Marathon') && !v.title.includes('Fail') && !v.title.includes('Minutes') && !v.title.includes('90th') && 'Standard syllabus indexing'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
