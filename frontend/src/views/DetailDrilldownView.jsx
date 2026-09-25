import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Eye, Clock, Users, Percent, Layers, PlayCircle, FolderPlus, Tag, Plus, Check } from 'lucide-react';
import YoYTrendChart from '../components/YoYTrendChart';
import CreateListModal from '../components/CreateListModal';
import ManageVideoListsModal from '../components/ManageVideoListsModal';

export default function DetailDrilldownView({ 
  drilldownTarget, // { type: 'list' | 'video', id: '...' }
  onNavigateDrilldown, // (target) => void
  onBackToOverview, // () => void
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateChildList, setShowCreateChildList] = useState(false);
  const [editingVideoForLists, setEditingVideoForLists] = useState(null);

  useEffect(() => {
    fetchDetailData();
  }, [drilldownTarget]);

  const fetchDetailData = async () => {
    setLoading(true);
    try {
      if (drilldownTarget.type === 'list') {
        const res = await fetch(`/api/lists/${drilldownTarget.id}/details`);
        const json = await res.json();
        setData(json);
      } else if (drilldownTarget.type === 'video') {
        const res = await fetch(`/api/videos/${drilldownTarget.id}/details`);
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load drilldown details:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatNum = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n.toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading detailed recursive breakdown & YoY trends...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger-rose)', marginBottom: '1rem' }}>Resource not found.</p>
        <button className="btn-secondary" onClick={onBackToOverview}>
          <ArrowLeft size={14} /> Back to Overview
        </button>
      </div>
    );
  }

  // Render for Single Video Drilldown
  if (drilldownTarget.type === 'video') {
    const v = data.video;
    return (
      <div>
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <button 
            className="btn-secondary" 
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            onClick={onBackToOverview}
          >
            <ArrowLeft size={13} /> Overview
          </button>
          <ChevronRight size={14} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-muted)' }}>Video Detail</span>
          <ChevronRight size={14} color="var(--text-muted)" />
          <span style={{ fontWeight: 600, color: 'var(--cfa-gold)' }}>{v.title}</span>
        </div>

        {/* Video Header Card */}
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img 
              src={v.thumbnail_url || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80'} 
              alt={v.title} 
              style={{ width: '220px', height: '124px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
            />
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-cfa">{v.course}</span>
                <span className="badge badge-prep">{v.topic}</span>
                <span className="badge badge-format">{v.format}</span>
              </div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{v.title}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Published: {v.published_at.split('T')[0]} · Duration: {Math.round(v.duration_seconds / 60)} mins
              </div>

              {/* Multi-List Membership badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Belongs to Lists:</span>
                {data.member_lists?.map(l => (
                  <button 
                    key={l.id}
                    className="btn-secondary"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
                    onClick={() => onNavigateDrilldown({ type: 'list', id: l.id })}
                  >
                    <Layers size={11} /> {l.name}
                  </button>
                ))}
                <button 
                  className="btn-primary"
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
                  onClick={() => setEditingVideoForLists(v)}
                  id="btn-edit-video-lists"
                >
                  <Layers size={11} /> Edit Allocated Lists
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top: 12-Month Trend with YoY Comparison */}
        <YoYTrendChart 
          trendData={data.trend} 
          title="Video 12-Month Performance (YoY Trend)"
          subtitle={`Historical performance for "${v.title}" compared against previous year`}
        />

        {editingVideoForLists && (
          <ManageVideoListsModal 
            video={editingVideoForLists}
            onClose={() => setEditingVideoForLists(null)}
            onSuccess={() => {
              setEditingVideoForLists(null);
              fetchDetailData();
            }}
          />
        )}
      </div>
    );
  }

  // Render for List / Course Drilldown
  const list = data.list;
  const stats = data.stats;
  const childLists = data.child_lists || [];
  const videos = data.videos || [];

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
        <button 
          className="btn-secondary" 
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
          onClick={onBackToOverview}
        >
          <ArrowLeft size={13} /> Performance Overview
        </button>
        {data.breadcrumbs?.map((b, idx) => (
          <React.Fragment key={b.id}>
            <ChevronRight size={14} color="var(--text-muted)" />
            {idx === data.breadcrumbs.length - 1 ? (
              <span style={{ fontWeight: 700, color: 'var(--cfa-gold)' }}>{b.name}</span>
            ) : (
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                onClick={() => onNavigateDrilldown({ type: 'list', id: b.id })}
              >
                {b.name}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
      {/* List Header Summary Banner */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="content-card-header">
          <div className="card-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2>{list.name}</h2>
            </div>
            <p>{list.description || `Combined performance reflecting all assigned videos and child lists.`}</p>
          </div>

          <button 
            className="btn-ghost" 
            onClick={() => setShowCreateChildList(true)}
            id="btn-add-child-list"
          >
            <FolderPlus size={14} />
            <span>Add child subject or list</span>
          </button>
        </div>

        {/* Topline Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Combined views</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatNum(stats.total_views)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success-green)', marginTop: '2px' }}>
              +{stats.yoy_views_growth}% YoY
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Watch time</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatNum(stats.total_watch_time)}h
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Assigned videos</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {stats.video_count}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Average CTR</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {stats.avg_ctr}%
            </div>
          </div>
        </div>
      </div>

      {/* 1. TOP: Reusable 12-Month Trend with YoY Comparison Component */}
      <YoYTrendChart 
        trendData={data.trend} 
        title={`${list.name} — 12-Month Performance Trend (YoY)`}
        subtitle="Aggregates all videos in this list and its descendant child lists"
      />

      {/* 2. THEN: Subject-Wise Performance (Child Lists) */}
      {childLists.length > 0 && (
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <div className="content-card-header">
            <div className="card-title-group">
              <h3>Subject-wise performance</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {childLists.map((child) => (
              <div 
                key={child.id}
                className="overview-block-card"
                onClick={() => onNavigateDrilldown({ type: 'list', id: child.id })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{child.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{child.stats?.video_count || 0} videos</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {formatNum(child.stats?.total_views)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>views</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                  <span>Watch: {formatNum(child.stats?.total_watch_time)}h</span>
                  <span style={{ color: 'var(--success-green)', fontWeight: 500 }}>+{child.stats?.yoy_views_growth}% YoY</span>
                </div>
                <div className="card-hover-action">
                  <span>Drill down</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. THEN: Video-Wise Performance */}
      <div className="content-card">
        <div className="content-card-header">
          <div className="card-title-group">
            <h3>Video-Wise Performance</h3>
            <p>Individual videos mapped to {list.name}. Click any video to open its dedicated 12-month YoY drill-down.</p>
          </div>
          <span className="badge badge-format">{videos.length} Videos</span>
        </div>

        {videos.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No videos assigned to this list yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '300px' }}>Video</th>
                  <th>Topic & Format</th>
                  <th style={{ textAlign: 'right' }}>Total Views</th>
                  <th style={{ textAlign: 'right' }}>Watch Hours</th>
                  <th style={{ textAlign: 'right' }}>CTR</th>
                  <th style={{ textAlign: 'right' }}>Subscribers</th>
                  <th style={{ textAlign: 'right' }}>Drill-Down</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <tr 
                    key={v.id} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigateDrilldown({ type: 'video', id: v.id })}
                  >
                    <td>
                      <div className="video-cell">
                        <img 
                          src={v.thumbnail_url || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80'} 
                          alt={v.title} 
                          className="video-thumb" 
                        />
                        <div className="video-title-wrap">
                          <span className="video-title" title={v.title}>{v.title}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Published {v.published_at.split('T')[0]}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span className="badge badge-prep" style={{ width: 'fit-content', fontSize: '0.7rem' }}>{v.topic}</span>
                        <span className="badge badge-format" style={{ width: 'fit-content', fontSize: '0.65rem' }}>{v.format}</span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {formatNum(v.views)}
                    </td>

                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {Math.round(v.watch_time_hours).toLocaleString()}h
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {v.ctr.toFixed(1)}%
                    </td>

                    <td style={{ textAlign: 'right', color: 'var(--cfa-gold)', fontFamily: 'var(--font-mono)' }}>
                      +{v.subscribers_gained}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.7rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingVideoForLists(v);
                          }}
                          title="Edit which lists this video belongs to"
                        >
                          <Layers size={11} /> Lists
                        </button>
                        <span className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                          View YoY <ChevronRight size={11} style={{ display: 'inline' }} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateChildList && (
        <CreateListModal 
          defaultParentId={list?.id}
          availableLists={[{ id: list?.id, name: list?.name }]}
          onClose={() => setShowCreateChildList(false)}
          onSuccess={() => {
            setShowCreateChildList(false);
            fetchDetailData();
          }}
        />
      )}

      {editingVideoForLists && (
        <ManageVideoListsModal 
          video={editingVideoForLists}
          onClose={() => setEditingVideoForLists(null)}
          onSuccess={() => {
            setEditingVideoForLists(null);
            fetchDetailData();
          }}
        />
      )}
    </div>
  );
}

