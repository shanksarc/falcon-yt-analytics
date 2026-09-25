import React, { useState, useEffect } from 'react';
import { 
  Eye, Clock, Users, Percent, TrendingUp, TrendingDown, 
  Layers, Plus, Settings2, FolderPlus, ArrowRight, PlaySquare, ChevronRight, Sparkles 
} from 'lucide-react';
import YoYTrendChart from '../components/YoYTrendChart';
import ManagePinnedBlocksModal from '../components/ManagePinnedBlocksModal';
import CreateListModal from '../components/CreateListModal';

/* ── Shared Style Objects ── */
const styles = {
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#1E293B',
    letterSpacing: '-0.01em',
  },
  sectionSubtitle: {
    fontSize: '0.8rem',
    color: '#64748B',
    marginTop: '4px',
  },
  ghostBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#64748B',
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  kpiCard: {
    background: '#FFFFFF',
    border: '1px solid #E8ECF1',
    borderRadius: '16px',
    boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.04)',
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  kpiLabel: {
    fontSize: '0.8rem',
    color: '#64748B',
    fontWeight: 500,
  },
  kpiValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1E293B',
    letterSpacing: '-0.02em',
  },
  kpiSub: {
    fontSize: '0.78rem',
    color: '#94A3B8',
  },
  contentCard: {
    background: '#FFFFFF',
    border: '1px solid #E8ECF1',
    borderRadius: '16px',
    boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.04)',
    padding: '24px',
    marginBottom: '0',
  },
  contentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  blockCard: {
    background: '#FFFFFF',
    border: '1px solid #E8ECF1',
    borderRadius: '16px',
    boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.04)',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

export default function PerformanceOverviewView({ onNavigateDrilldown }) {
  const [summary, setSummary] = useState(null);
  const [channelTrend, setChannelTrend] = useState(null);
  const [listsOverview, setListsOverview] = useState({ course_blocks: [], pinned_blocks: [], all_lists: [], pinned_ids: [] });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showManagePinned, setShowManagePinned] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, listsRes] = await Promise.all([
        fetch('/api/channel/summary'),
        fetch('/api/channel/yoy-trend'),
        fetch('/api/lists')
      ]);

      const sumJson = await sumRes.json();
      const trendJson = await trendRes.json();
      const listsJson = await listsRes.json();

      setSummary(sumJson);
      setChannelTrend(trendJson);
      setListsOverview(listsJson);
    } catch (err) {
      console.error("Failed to load overview data:", err);
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
      <div style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}>
        Loading Performance Overview dashboard...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* ------------------------------------------------------------- */}
      {/* Section 01 — Channel Summary                                    */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Channel Summary</h2>
            <p style={styles.sectionSubtitle}>Aggregate performance across your entire channel</p>
          </div>
          <button 
            style={styles.ghostBtn}
            onClick={() => setShowCreateList(true)}
            id="btn-create-list"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#1E293B'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
          >
            <FolderPlus size={14} />
            <span>New list</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Channel views</div>
            <div style={styles.kpiValue}>{formatNum(summary?.total_views)}</div>
            <div style={{ ...styles.kpiSub, color: '#0D9488', fontWeight: 500 }}>
              +{summary?.yoy_growth_pct}% YoY growth
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Watch time</div>
            <div style={styles.kpiValue}>{formatNum(summary?.total_watch_time)}h</div>
            <div style={styles.kpiSub}>Total watch hours</div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Subscribers</div>
            <div style={styles.kpiValue} title={`${summary?.total_subscribers?.toLocaleString() || 0} subscribers`}>
              {formatNum(summary?.total_subscribers)}
            </div>
            <div style={styles.kpiSub}>{summary?.total_subscribers?.toLocaleString() || 0} total subscribers</div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Average CTR & retention</div>
            <div style={styles.kpiValue}>{summary?.avg_ctr}%</div>
            <div style={styles.kpiSub}>{Math.round((summary?.avg_view_duration || 0) / 60)} min avg retention</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Section 02 — Course-Wise Performance Blocks                     */}
      {/* ------------------------------------------------------------- */}
      <div style={styles.contentCard}>
        <div style={styles.contentCardHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Course-wise Performance</h2>
            <p style={styles.sectionSubtitle}>Click any block to drill down into individual videos</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {listsOverview.course_blocks.map((course) => (
            <div 
              key={course.id}
              style={styles.blockCard}
              onClick={() => onNavigateDrilldown({ type: 'list', id: course.id })}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 8px 30px -4px rgba(0, 0, 0, 0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8ECF1'; e.currentTarget.style.boxShadow = '0 4px 24px -4px rgba(0, 0, 0, 0.04)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>
                  {course.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  {course.stats?.video_count || 0} videos
                </span>
              </div>

              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                {formatNum(course.stats?.total_views)}
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94A3B8', marginLeft: '6px' }}>views</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B', marginTop: '12px' }}>
                <span>Watch: {formatNum(course.stats?.total_watch_time)}h</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0D9488', fontWeight: 500 }}>
                  +{course.stats?.yoy_views_growth}% YoY
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.75rem', color: '#7C3AED', marginTop: '12px', fontWeight: 600 }}>
                <span>Drill down</span>
                <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Section 03 — Customizable List-Level Performance Blocks       */}
      {/* ------------------------------------------------------------- */}
      <div style={styles.contentCard}>
        <div style={styles.contentCardHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Customizable List Blocks</h2>
            <p style={styles.sectionSubtitle}>Pin your most-tracked playlists for quick comparison</p>
          </div>

          <button 
            style={styles.ghostBtn}
            onClick={() => setShowManagePinned(true)}
            id="btn-customize-blocks"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#1E293B'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
          >
            <Settings2 size={14} />
            <span>Customize pinned blocks ({listsOverview.pinned_blocks.length})</span>
          </button>
        </div>

        {listsOverview.pinned_blocks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
            No list blocks currently pinned. Click "Customize pinned blocks" above to add lists.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {listsOverview.pinned_blocks.map((l) => (
              <div 
                key={l.id}
                style={styles.blockCard}
                onClick={() => onNavigateDrilldown({ type: 'list', id: l.id })}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 8px 30px -4px rgba(0, 0, 0, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8ECF1'; e.currentTarget.style.boxShadow = '0 4px 24px -4px rgba(0, 0, 0, 0.04)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1E293B' }}>{l.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{l.stats?.video_count || 0} videos</span>
                </div>

                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  {formatNum(l.stats?.total_views)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94A3B8', marginLeft: '6px' }}>views</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B', marginTop: '12px' }}>
                  <span>Watch: {formatNum(l.stats?.total_watch_time)}h</span>
                  <span style={{ color: '#0D9488', fontWeight: 500 }}>+{l.stats?.yoy_views_growth}% YoY</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.75rem', color: '#7C3AED', marginTop: '12px', fontWeight: 600 }}>
                  <span>Drill down</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Section 04 — Monthly Time Series (Channel-Wide YoY)            */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>Monthly Time Series (Channel-Wide)</h2>
          <p style={styles.sectionSubtitle}>12-month YoY comparison across the entire channel</p>
        </div>

        <YoYTrendChart 
          trendData={channelTrend}
          title="Channel-wide 12-month performance (YoY)"
          subtitle="Monthly progress across entire channel compared against the same month of the previous year"
        />
      </div>

      {/* Modals */}
      {showManagePinned && (
        <ManagePinnedBlocksModal 
          allLists={listsOverview.all_lists}
          currentPinnedIds={listsOverview.pinned_ids}
          onClose={() => setShowManagePinned(false)}
          onSuccess={() => {
            setShowManagePinned(false);
            fetchOverviewData();
          }}
        />
      )}

      {showCreateList && (
        <CreateListModal 
          availableLists={listsOverview.all_lists}
          onClose={() => setShowCreateList(false)}
          onSuccess={() => {
            setShowCreateList(false);
            fetchOverviewData();
          }}
        />
      )}
    </div>
  );
}
