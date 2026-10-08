import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Film, CheckCircle2, AlertCircle, ExternalLink, 
  Edit3, Unlink, Plus, Filter, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, BookOpen, Layers,
  Eye, Clock, ThumbsUp, ThumbsDown, Users, Percent, Flame, Video, Globe, Lock, BarChart2, Calendar
} from 'lucide-react';

// Helper to extract 4-digit publish year
export const getPublishYear = (dateStr) => {
  if (!dateStr) return null;
  const match = String(dateStr).match(/\b(20\d\d|19\d\d)\b/);
  return match ? match[1] : (dateStr.length >= 4 ? dateStr.substring(0, 4) : null);
};

export default function AllVideoListView({ onNavigateToSyllabus }) {
  const [videos, setVideos] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [aggregateStats, setAggregateStats] = useState({
    totalViews: 0,
    totalWatchTime: 0,
    totalLikes: 0,
    totalDislikes: 0,
    totalSubs: 0,
    totalImpr: 0,
    avgCtr: 0,
    publicCount: 0,
    unlistedCount: 0
  });

  // Table Mode: 'PERFORMANCE' | 'ENGAGEMENT' (Fix 4: Separate Likes/Dislikes table)
  const [activeTableTab, setActiveTableTab] = useState('PERFORMANCE');

  // Filters (Fix 2: Visibility / Published vs Unlisted is FIRST filter)
  const [filterVisibility, setFilterVisibility] = useState('public'); // 'public' | 'unlisted' | 'ALL'
  const [filterMatchStatus, setFilterMatchStatus] = useState('ALL'); // 'ALL' | 'MATCHED' | 'UNMATCHED'
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting (Fix 6: Full sorting for all metrics)
  const [sortField, setSortField] = useState('views');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Topic Reassign Modal State
  const [selectedVideoForMatch, setSelectedVideoForMatch] = useState(null);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [topicCourseFilter, setTopicCourseFilter] = useState('ALL');

  useEffect(() => {
    fetchVideosAndTopics();
  }, []);

  const fetchVideosAndTopics = async () => {
    setLoading(true);
    try {
      const [vRes, tRes] = await Promise.all([
        fetch('/api/syllabus/reverse-match/videos'),
        fetch('/api/syllabus/topics/all')
      ]);
      const vData = await vRes.json();
      const tData = await tRes.json();
      setVideos(vData.videos || []);
      setTopics(tData || []);
      setAggregateStats({
        totalViews: vData.total_views || 0,
        totalWatchTime: vData.total_watch_time || 0,
        totalLikes: vData.total_likes || 0,
        totalDislikes: vData.videos ? vData.videos.reduce((acc, v) => acc + (v.dislikes || 0), 0) : 0,
        totalSubs: vData.total_subscribers || 0,
        totalImpr: vData.total_impressions || 0,
        avgCtr: vData.avg_ctr || 0,
        publicCount: vData.public_count || vData.videos?.filter(v => v.privacy_status === 'public').length || 0,
        unlistedCount: vData.unlisted_count || vData.videos?.filter(v => v.privacy_status !== 'public').length || 0
      });
    } catch (err) {
      console.error('Failed to load video analytics or topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReassignTopic = async (video, newTopic) => {
    setActionLoadingId(video.id);
    try {
      const oldTopicId = video.matched_topics?.[0]?.topic_id || null;
      const res = await fetch('/api/syllabus/reverse-match/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: video.id,
          new_topic_id: newTopic.id,
          old_topic_id: oldTopicId
        })
      });
      if (res.ok) {
        setVideos(prev => prev.map(v => {
          if (v.id === video.id) {
            return {
              ...v,
              is_matched: true,
              matched_topics: [{
                topic_id: newTopic.id,
                topic_name: newTopic.name,
                subject_name: newTopic.subject_name,
                course_name: newTopic.course_name,
                auto_assigned: 0
              }]
            };
          }
          return v;
        }));
        setSelectedVideoForMatch(null);
      }
    } catch (err) {
      console.error('Error reassigning topic:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlinkTopic = async (video, topicId) => {
    if (!window.confirm(`Unlink "${video.title}" from this syllabus topic?`)) return;
    setActionLoadingId(video.id);
    try {
      const res = await fetch('/api/syllabus/reverse-match/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: video.id,
          topic_id: topicId
        })
      });
      if (res.ok) {
        setVideos(prev => prev.map(v => {
          if (v.id === video.id) {
            const updated = (v.matched_topics || []).filter(mt => mt.topic_id !== topicId);
            return {
              ...v,
              is_matched: updated.length > 0,
              matched_topics: updated
            };
          }
          return v;
        }));
      }
    } catch (err) {
      console.error('Error unlinking topic:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
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

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Fix 2: Visibility Filter (First filter)
    if (filterVisibility === 'public') {
      result = result.filter(v => (v.privacy_status || 'public') === 'public');
    } else if (filterVisibility === 'unlisted') {
      result = result.filter(v => (v.privacy_status || '') !== 'public');
    }

    // Year filter (Fix 2: Clearly visible year & filter)
    if (filterYear !== 'ALL') {
      result = result.filter(v => getPublishYear(v.published_at) === filterYear);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(v => {
        const inTitle = (v.title || '').toLowerCase().includes(q);
        const inCourse = (v.course || '').toLowerCase().includes(q);
        const inTopic = (v.topic || '').toLowerCase().includes(q);
        const inId = (v.id || '').toLowerCase().includes(q);
        const inMatched = (v.matched_topics || []).some(mt => 
          (mt.topic_name || '').toLowerCase().includes(q) ||
          (mt.subject_name || '').toLowerCase().includes(q)
        );
        return inTitle || inCourse || inTopic || inId || inMatched;
      });
    }

    // Match status filter
    if (filterMatchStatus === 'MATCHED') {
      result = result.filter(v => v.is_matched);
    } else if (filterMatchStatus === 'UNMATCHED') {
      result = result.filter(v => !v.is_matched);
    }

    // Course filter
    if (filterCourse !== 'ALL') {
      result = result.filter(v => (v.course || '') === filterCourse);
    }

    // Format filter
    if (filterFormat !== 'ALL') {
      result = result.filter(v => (v.format || '') === filterFormat);
    }

    // Comprehensive Sorting (Fix 6)
    result.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'views':
          valA = a.views || 0;
          valB = b.views || 0;
          break;
        case 'impressions':
          valA = a.impressions || 0;
          valB = b.impressions || 0;
          break;
        case 'watch_time_hours':
          valA = a.watch_time_hours || 0;
          valB = b.watch_time_hours || 0;
          break;
        case 'likes':
          valA = a.likes || 0;
          valB = b.likes || 0;
          break;
        case 'dislikes':
          valA = a.dislikes || 0;
          valB = b.dislikes || 0;
          break;
        case 'like_ratio':
          valA = a.like_ratio !== undefined ? a.like_ratio : 100;
          valB = b.like_ratio !== undefined ? b.like_ratio : 100;
          break;
        case 'subscribers_gained':
          valA = a.subscribers_gained || 0;
          valB = b.subscribers_gained || 0;
          break;
        case 'ctr':
          valA = a.ctr || 0;
          valB = b.ctr || 0;
          break;
        case 'duration_seconds':
          valA = a.duration_seconds || 0;
          valB = b.duration_seconds || 0;
          break;
        case 'retention_pct':
          valA = a.retention_pct || 0;
          valB = b.retention_pct || 0;
          break;
        case 'published_at':
          valA = a.published_at || '';
          valB = b.published_at || '';
          return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        case 'title':
          valA = a.title || '';
          valB = b.title || '';
          return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        case 'match_status':
          valA = a.is_matched ? 1 : 0;
          valB = b.is_matched ? 1 : 0;
          break;
        default:
          valA = a.views || 0;
          valB = b.views || 0;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [videos, filterVisibility, filterYear, searchQuery, filterMatchStatus, filterCourse, filterFormat, sortField, sortOrder]);

  // Topic search in Topic Picker modal
  const filteredTopics = useMemo(() => {
    let res = [...topics];
    if (topicCourseFilter !== 'ALL') {
      res = res.filter(t => (t.course_name || '').toLowerCase().includes(topicCourseFilter.toLowerCase()));
    }
    if (topicSearchQuery.trim()) {
      const q = topicSearchQuery.toLowerCase().trim();
      res = res.filter(t => 
        (t.name || '').toLowerCase().includes(q) ||
        (t.subject_name || '').toLowerCase().includes(q) ||
        (t.course_name || '').toLowerCase().includes(q)
      );
    }
    res.sort((a, b) => {
      const cComp = (a.course_name || '').localeCompare(b.course_name || '', undefined, { numeric: true, sensitivity: 'base' });
      if (cComp !== 0) return cComp;
      const sComp = (a.subject_name || '').localeCompare(b.subject_name || '', undefined, { numeric: true, sensitivity: 'base' });
      if (sComp !== 0) return sComp;
      return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
    });
    return res;
  }, [topics, topicCourseFilter, topicSearchQuery]);

  const matchedCount = videos.filter(v => v.is_matched).length;
  const unmatchedCount = videos.length - matchedCount;
  const matchRatePct = videos.length > 0 ? Math.round((matchedCount / videos.length) * 100) : 0;

  // Active subset metrics
  const activeViews = filteredVideos.reduce((acc, v) => acc + (v.views || 0), 0);
  const activeWatchTime = filteredVideos.reduce((acc, v) => acc + (v.watch_time_hours || 0), 0);
  const activeLikes = filteredVideos.reduce((acc, v) => acc + (v.likes || 0), 0);
  const activeDislikes = filteredVideos.reduce((acc, v) => acc + (v.dislikes || 0), 0);
  const activeSubs = filteredVideos.reduce((acc, v) => acc + (v.subscribers_gained || 0), 0);
  const activeImpr = filteredVideos.reduce((acc, v) => acc + (v.impressions || 0), 0);
  const activePositiveRatio = activeLikes + activeDislikes > 0 ? Math.round((activeLikes / (activeLikes + activeDislikes)) * 100) : 100;

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} style={{ opacity: 0.35, marginLeft: '4px' }} />;
    }
    return sortOrder === 'desc' 
      ? <ArrowDown size={12} style={{ color: '#3B82F6', marginLeft: '4px' }} />
      : <ArrowUp size={12} style={{ color: '#3B82F6', marginLeft: '4px' }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ─── HEADER BAR ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        padding: '20px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Video size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                All Video List
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0' }}>
                Complete catalog of {videos.length} videos · {aggregateStats.publicCount} Published (Public), {aggregateStats.unlistedCount} Unlisted
              </p>
            </div>
          </div>
        </div>

        {/* Fix 4: Separate Table Modes (Performance vs Likes/Dislikes) */}
        <div style={{
          display: 'inline-flex',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTableTab('PERFORMANCE')}
            style={{
              padding: '8px 16px',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTableTab === 'PERFORMANCE' ? '#FFFFFF' : 'transparent',
              color: activeTableTab === 'PERFORMANCE' ? '#0F172A' : '#64748B',
              boxShadow: activeTableTab === 'PERFORMANCE' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChart2 size={14} color={activeTableTab === 'PERFORMANCE' ? '#2563EB' : '#94A3B8'} />
            <span>Performance & Watch Time</span>
          </button>

          <button
            onClick={() => setActiveTableTab('ENGAGEMENT')}
            style={{
              padding: '8px 16px',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTableTab === 'ENGAGEMENT' ? '#FFFFFF' : 'transparent',
              color: activeTableTab === 'ENGAGEMENT' ? '#0F172A' : '#64748B',
              boxShadow: activeTableTab === 'ENGAGEMENT' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ThumbsUp size={14} color={activeTableTab === 'ENGAGEMENT' ? '#F59E0B' : '#94A3B8'} />
            <span>Likes & Dislikes Table</span>
          </button>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS BAR ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '14px'
      }}>
        {activeTableTab === 'PERFORMANCE' ? (
          <>
            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Film size={13} color="#64748B" />
                <span>Showing Videos</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {filteredVideos.length} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>/ {videos.length}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                {matchRatePct}% mapped to syllabus
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Eye size={13} color="#3B82F6" />
                <span>Total Views</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {activeViews.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                {filterVisibility === 'public' ? 'Public published videos' : filterVisibility === 'unlisted' ? 'Unlisted content' : 'All videos'}
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={13} color="#8B5CF6" />
                <span>Watch Time</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {Math.round(activeWatchTime).toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>hrs</span>
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Student watch hours</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={13} color="#10B981" />
                <span>Subscribers Gained</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                +{activeSubs.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Direct conversions</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Percent size={13} color="#EC4899" />
                <span>Impressions</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {activeImpr.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Thumbnail impressions</div>
            </div>
          </>
        ) : (
          /* Fix 4: Likes & Dislikes dedicated KPI bar */
          <>
            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ThumbsUp size={13} color="#F59E0B" />
                <span>Total Likes</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {activeLikes.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                Student appreciation
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ThumbsDown size={13} color="#EF4444" />
                <span>Total Dislikes</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
                {activeDislikes.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Negative signals</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Percent size={13} color="#10B981" />
                <span>Positive Like Ratio</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                {activePositiveRatio}%
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Channel satisfaction score</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Eye size={13} color="#3B82F6" />
                <span>Like Rate (per 1K views)</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {activeViews > 0 ? ((activeLikes / activeViews) * 1000).toFixed(1) : '0.0'}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Likes / 1,000 views</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Flame size={13} color="#8B5CF6" />
                <span>Dislike Rate (per 1K views)</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {activeViews > 0 ? ((activeDislikes / activeViews) * 1000).toFixed(1) : '0.0'}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Dislikes / 1,000 views</div>
            </div>
          </>
        )}
      </div>

      {/* ─── FILTER CONTROLS BAR (Fix 2: Visibility is First Filter) ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px 20px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by title, ID, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* FIX 2: Visibility Filter (FIRST FILTER) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Status:</span>
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '9px',
                border: '1.5px solid #3B82F6',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1E40AF',
                background: '#EFF6FF',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="public">🟢 Published Only ({aggregateStats.publicCount})</option>
              <option value="unlisted">🔒 Unlisted Only ({aggregateStats.unlistedCount})</option>
              <option value="ALL">🌐 All Videos ({videos.length})</option>
            </select>
          </div>

          {/* Syllabus Match Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Syllabus:</span>
            <select
              value={filterMatchStatus}
              onChange={(e) => setFilterMatchStatus(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Linkages</option>
              <option value="MATCHED">✓ Matched ({matchedCount})</option>
              <option value="UNMATCHED">⚠️ Unmatched ({unmatchedCount})</option>
            </select>
          </div>

          {/* Course Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Course:</span>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer'
              }}
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

          {/* Format Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Format:</span>
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Formats</option>
              <option value="Revision / Marathon">Revision / Marathon</option>
              <option value="Core Lecture">Core Lecture</option>
              <option value="Doubt-clearing / Q&A">Doubt-clearing / Q&A</option>
              <option value="Strategy / General">Strategy / General</option>
              <option value="Discussion / Podcast">Discussion / Podcast</option>
            </select>
          </div>

          {/* Year Filter (Fix 2: clearly visible year & filter) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Year:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: filterYear !== 'ALL' ? 700 : 400,
                color: filterYear !== 'ALL' ? '#B45309' : '#0F172A',
                background: filterYear !== 'ALL' ? '#FEF3C7' : '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Fix 6: Sorting Dropdown (Quick select) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Sort:</span>
            <select
              value={`${sortField}_${sortOrder}`}
              onChange={(e) => {
                const parts = e.target.value.split('_');
                const order = parts.pop();
                const field = parts.join('_');
                setSortField(field);
                setSortOrder(order);
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <option value="views_desc">Views (Most to Least)</option>
              <option value="views_asc">Views (Least to Most)</option>
              <option value="impressions_desc">Impressions (Most to Least)</option>
              <option value="impressions_asc">Impressions (Least to Most)</option>
              <option value="watch_time_hours_desc">Watch Time (Most to Least)</option>
              <option value="watch_time_hours_asc">Watch Time (Least to Most)</option>
              <option value="likes_desc">Likes (Most to Least)</option>
              <option value="likes_asc">Likes (Least to Most)</option>
              <option value="dislikes_desc">Dislikes (Most to Least)</option>
              <option value="dislikes_asc">Dislikes (Least to Most)</option>
              <option value="like_ratio_desc">Like Ratio % (Highest)</option>
              <option value="like_ratio_asc">Like Ratio % (Lowest)</option>
              <option value="subscribers_gained_desc">Subscribers (Most to Least)</option>
              <option value="subscribers_gained_asc">Subscribers (Least to Most)</option>
              <option value="ctr_desc">CTR % (Highest to Lowest)</option>
              <option value="ctr_asc">CTR % (Lowest to Highest)</option>
              <option value="duration_seconds_desc">Duration (Longest to Shortest)</option>
              <option value="duration_seconds_asc">Duration (Shortest to Longest)</option>
              <option value="published_at_desc">Published (Newest first)</option>
              <option value="published_at_asc">Published (Oldest first)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── DATA TABLES ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading video intelligence catalog...</div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No videos match your filter criteria</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try switching between Published and Unlisted or resetting filters.</div>
          </div>
        ) : activeTableTab === 'PERFORMANCE' ? (
          /* ─── TABLE 1: PERFORMANCE & WATCH TIME (Fix 5: Views and Impressions Separate) ─── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 18px', minWidth: '320px', cursor: 'pointer' }} onClick={() => handleSort('title')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Video Title & Status {renderSortIndicator('title')}
                    </span>
                  </th>
                  {/* Fix 5: Views and Impressions are SEPARATE columns */}
                  <th style={{ padding: '12px 14px', width: '105px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('views')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Views {renderSortIndicator('views')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '115px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('impressions')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Impressions {renderSortIndicator('impressions')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '125px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('watch_time_hours')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Watch Time {renderSortIndicator('watch_time_hours')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '90px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('ctr')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      CTR % {renderSortIndicator('ctr')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '100px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('subscribers_gained')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Subs Gained {renderSortIndicator('subscribers_gained')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 16px', minWidth: '220px' }}>Syllabus Linkage</th>
                  <th style={{ padding: '12px 18px', width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px', color: '#334155' }}>
                {filteredVideos.map((video) => {
                  const isCFA = (video.course || '').startsWith('CFA');
                  const isRev = (video.format || '').toLowerCase().includes('revision');
                  const isMatched = video.is_matched;
                  const isPublic = video.privacy_status === 'public';
                  const isWorking = actionLoadingId === video.id;

                  return (
                    <tr 
                      key={video.id} 
                      style={{ 
                        borderBottom: '1px solid #F1F5F9',
                        background: isMatched ? '#FFFFFF' : '#FFFDF8',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isMatched ? '#FFFFFF' : '#FFFDF8'; }}
                    >
                      {/* Video Title & Badges */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ position: 'relative', width: '76px', height: '44px', flexShrink: 0 }}>
                            <img
                              src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80'}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }}
                            />
                            {video.duration_seconds > 0 && (
                              <span style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                background: 'rgba(0,0,0,0.75)',
                                color: '#FFFFFF',
                                fontSize: '9px',
                                fontWeight: 600,
                                padding: '1px 3px',
                                borderRadius: '3px'
                              }}>
                                {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <a
                                href={`https://www.youtube.com/watch?v=${video.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#0F172A',
                                  textDecoration: 'none',
                                  lineHeight: 1.3
                                }}
                                title={video.title}
                              >
                                {video.title}
                              </a>
                              <ExternalLink size={11} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {/* Visibility Badge (Fix 2) */}
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isPublic ? '#ECFDF5' : '#FFF1F2',
                                color: isPublic ? '#059669' : '#E11D48',
                                border: `1px solid ${isPublic ? '#A7F3D0' : '#FECDD3'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                {isPublic ? <Globe size={9} /> : <Lock size={9} />}
                                {isPublic ? 'Published' : 'Unlisted'}
                              </span>

                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isCFA ? '#EFF6FF' : '#FFF7ED',
                                color: isCFA ? '#1D4ED8' : '#C2410C',
                                border: `1px solid ${isCFA ? '#DBEAFE' : '#FFEDD5'}`
                              }}>
                                {video.course || 'General'}
                              </span>

                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isRev ? '#FAF5FF' : '#F1F5F9',
                                color: isRev ? '#7C3AED' : '#475569',
                                border: `1px solid ${isRev ? '#E9D5FF' : '#E2E8F0'}`
                              }}>
                                {video.format}
                              </span>

                              {/* Fix 2: Year of video published as clearly visible tag */}
                              {getPublishYear(video.published_at) && (
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
                                }} title={`Published: ${video.published_at}`}>
                                  <Calendar size={10} color="#B45309" />
                                  <span>{getPublishYear(video.published_at)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Fix 5: Views Column */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                          {(video.views || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Fix 5: Impressions Column */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', fontFamily: 'monospace' }}>
                          {(video.impressions || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Watch Time & AVD Column */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5', fontFamily: 'monospace' }}>
                          {(video.watch_time_hours || 0).toLocaleString()}h
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>
                          AVD: {Math.floor((video.avg_view_duration || 0) / 60)}m{(video.avg_view_duration || 0) % 60}s
                        </div>
                      </td>

                      {/* CTR Column */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: (video.ctr || 0) >= 4.0 ? '#10B981' : (video.ctr || 0) >= 2.5 ? '#0F172A' : '#E11D48'
                        }}>
                          {(video.ctr || 0).toFixed(1)}%
                        </span>
                      </td>

                      {/* Subscribers Gained Column */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', fontFamily: 'monospace' }}>
                          +{(video.subscribers_gained || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Syllabus Match Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {isMatched && (video.matched_topics || []).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {video.matched_topics.map(mt => (
                              <div key={mt.topic_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5' }}>
                                    {mt.topic_name}
                                  </div>
                                  <div style={{ fontSize: '9px', color: '#64748B' }}>
                                    {mt.course_name} · {mt.subject_name}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleUnlinkTopic(video, mt.topic_id)}
                                  title={`Unlink from ${mt.topic_name}`}
                                  style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: '2px', display: 'flex' }}
                                >
                                  <Unlink size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#94A3B8', background: '#F8FAFC', padding: '2px 7px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                            <AlertCircle size={10} color="#F59E0B" /> Unlinked
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedVideoForMatch(video)}
                          disabled={isWorking}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={11} style={{ marginRight: '4px', display: 'inline' }} />
                          {isMatched ? 'Reassign' : 'Map Topic'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── TABLE 2: LIKES & DISLIKES DEDICATED TABLE (Fix 4) ─── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
              <thead>
                <tr style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 18px', minWidth: '320px', cursor: 'pointer' }} onClick={() => handleSort('title')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Video Title & Status {renderSortIndicator('title')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '110px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('likes')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Likes 👍 {renderSortIndicator('likes')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '110px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('dislikes')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Dislikes 👎 {renderSortIndicator('dislikes')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 16px', width: '150px', cursor: 'pointer' }} onClick={() => handleSort('like_ratio')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Like Ratio % {renderSortIndicator('like_ratio')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '110px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('views')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Views {renderSortIndicator('views')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 14px', width: '120px', textAlign: 'right' }}>
                    Like Rate / 1K
                  </th>
                  <th style={{ padding: '12px 14px', width: '120px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('subscribers_gained')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      Subs Gained {renderSortIndicator('subscribers_gained')}
                    </span>
                  </th>
                  <th style={{ padding: '12px 18px', width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px', color: '#334155' }}>
                {filteredVideos.map((video) => {
                  const isPublic = video.privacy_status === 'public';
                  const lCount = video.likes || 0;
                  const dCount = video.dislikes || 0;
                  const totalRatings = lCount + dCount;
                  const ratio = totalRatings > 0 ? Math.round((lCount / totalRatings) * 100) : 100;
                  const likeRate = video.views > 0 ? ((lCount / video.views) * 1000).toFixed(1) : '0.0';

                  return (
                    <tr 
                      key={video.id} 
                      style={{ 
                        borderBottom: '1px solid #F1F5F9',
                        background: '#FFFFFF',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FFFDF5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                    >
                      {/* Video Title & Meta */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img
                            src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80'}
                            alt=""
                            style={{ width: '70px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0', flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <a
                              href={`https://www.youtube.com/watch?v=${video.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', textDecoration: 'none', lineHeight: 1.3 }}
                              title={video.title}
                            >
                              {video.title}
                            </a>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: isPublic ? '#ECFDF5' : '#FFF1F2',
                                color: isPublic ? '#059669' : '#E11D48',
                                border: `1px solid ${isPublic ? '#A7F3D0' : '#FECDD3'}`
                              }}>
                                {isPublic ? 'Public' : 'Unlisted'}
                              </span>
                              <span style={{ fontSize: '10px', color: '#64748B' }}>{video.course}</span>
                              {getPublishYear(video.published_at) && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 750,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FDE68A',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }} title={`Published: ${video.published_at}`}>
                                  <Calendar size={10} color="#B45309" />
                                  <span>{getPublishYear(video.published_at)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Likes */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#D97706', fontFamily: 'monospace' }}>
                          {lCount.toLocaleString()}
                        </div>
                      </td>

                      {/* Dislikes */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: dCount > 0 ? '#EF4444' : '#94A3B8', fontFamily: 'monospace' }}>
                          {dCount.toLocaleString()}
                        </div>
                      </td>

                      {/* Like Ratio & Bar */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#FEE2E2', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${ratio}%`, height: '100%', background: ratio >= 90 ? '#10B981' : '#F59E0B' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: ratio >= 90 ? '#10B981' : '#B45309', fontFamily: 'monospace', minWidth: '40px' }}>
                            {ratio}%
                          </span>
                        </div>
                      </td>

                      {/* Views */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                          {(video.views || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Like Rate per 1K views */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', fontFamily: 'monospace' }}>
                          {likeRate} / 1k
                        </div>
                      </td>

                      {/* Subscribers Gained */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', fontFamily: 'monospace' }}>
                          +{(video.subscribers_gained || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <a
                          href={`https://www.youtube.com/watch?v=${video.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#334155',
                            textDecoration: 'none'
                          }}
                        >
                          <ExternalLink size={11} /> Watch
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL: TOPIC REASSIGN ─── */}
      {selectedVideoForMatch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Map Video to Syllabus Topic
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', maxWidth: '440px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedVideoForMatch.title}
                </div>
              </div>
              <button
                onClick={() => setSelectedVideoForMatch(null)}
                style={{ border: 'none', background: '#F1F5F9', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '14px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search topic or subject..."
                value={topicSearchQuery}
                onChange={(e) => setTopicSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '7px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              <select
                value={topicCourseFilter}
                onChange={(e) => setTopicCourseFilter(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              >
                <option value="ALL">All Courses</option>
                <option value="CFA L1">CFA L1</option>
                <option value="CFA L2">CFA L2</option>
                <option value="CFA L3">CFA L3</option>
                <option value="FRM Part 1">FRM Part 1</option>
                <option value="FRM Part 2">FRM Part 2</option>
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px' }}>
              {filteredTopics.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleReassignTopic(selectedVideoForMatch, t)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{t.course_name} · {t.subject_name}</div>
                  </div>
                  <button style={{ border: 'none', background: '#3B82F6', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
