import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Search, Film, CheckCircle2, AlertCircle, ExternalLink, 
  Edit3, Unlink, Plus, Filter, ArrowUpDown, RefreshCw, BookOpen, Layers
} from 'lucide-react';

export default function FullVideoAnalyticsModal({ isOpen, onClose, onMatchChanged }) {
  const [videos, setVideos] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMatchStatus, setFilterMatchStatus] = useState('ALL'); // 'ALL' | 'MATCHED' | 'UNMATCHED'
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [sortBy, setSortBy] = useState('published_desc');

  // Change / Match Topic Modal state
  const [selectedVideoForMatch, setSelectedVideoForMatch] = useState(null);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [topicCourseFilter, setTopicCourseFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen) {
      fetchVideosAndTopics();
    }
  }, [isOpen]);

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
        // Update locally
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
        if (onMatchChanged) onMatchChanged();
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
        // Update locally
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
        if (onMatchChanged) onMatchChanged();
      }
    } catch (err) {
      console.error('Error unlinking topic:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered and sorted videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(v => 
        (v.title || '').toLowerCase().includes(q) ||
        (v.id || '').toLowerCase().includes(q) ||
        (v.matched_topics || []).some(mt => (mt.topic_name || '').toLowerCase().includes(q))
      );
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

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'published_desc') {
        return (b.published_at || '').localeCompare(a.published_at || '');
      } else if (sortBy === 'published_asc') {
        return (a.published_at || '').localeCompare(b.published_at || '');
      } else if (sortBy === 'views_desc') {
        return (b.views || 0) - (a.views || 0);
      } else if (sortBy === 'ctr_desc') {
        return (b.ctr || 0) - (a.ctr || 0);
      } else if (sortBy === 'match_status') {
        return (b.is_matched ? 1 : 0) - (a.is_matched ? 1 : 0);
      }
      return 0;
    });

    return result;
  }, [videos, searchQuery, filterMatchStatus, filterCourse, filterFormat, sortBy]);

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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 65,
      padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '1240px',
        height: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #F1F5F9',
          background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#EEF2FF',
                color: '#4F46E5',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.04em'
              }}>
                REVERSE MATCHER · VERIFICATION
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {videos.length} Synced YouTube Videos
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
              Full Video Analytics & Reverse Matcher
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Verify syllabus mappings for all YouTube videos. Easily change, link, or unlink topic assignments.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchVideosAndTopics}
              title="Refresh video list"
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: '#F1F5F9',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Bar */}
        <div style={{
          padding: '14px 24px',
          background: '#FAFAFC',
          borderBottom: '1px solid #F1F5F9',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          flexShrink: 0
        }}>
          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Total Videos</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{videos.length}</div>
          </div>
          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} />
              <span>Matched to Syllabus</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>{matchedCount}</div>
          </div>
          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} />
              <span>Unmatched Videos</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>{unmatchedCount}</div>
          </div>
          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6366F1' }}>Linkage Coverage</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#6366F1', marginTop: '2px' }}>{matchRatePct}%</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#FFFFFF',
          flexShrink: 0
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search video title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 30px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#0F172A',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Match Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Match Status:</span>
              <select
                value={filterMatchStatus}
                onChange={(e) => setFilterMatchStatus(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Videos ({videos.length})</option>
                <option value="MATCHED">✓ Matched Only ({matchedCount})</option>
                <option value="UNMATCHED">⚠️ Unmatched Only ({unmatchedCount})</option>
              </select>
            </div>

            {/* Course Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Course:</span>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                style={{
                  padding: '6px 10px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Format:</span>
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                style={{
                  padding: '6px 10px',
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

            {/* Sort Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <option value="published_desc">Published (Newest)</option>
                <option value="published_asc">Published (Oldest)</option>
                <option value="views_desc">Views (High to Low)</option>
                <option value="ctr_desc">CTR % (High to Low)</option>
                <option value="match_status">Match Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading video analytics and syllabus links...</div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>No videos match your filter criteria</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Try resetting search or adjusting filters above.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 20px', minWidth: '380px' }}>Video & Categorization</th>
                  <th style={{ padding: '12px 14px', width: '120px' }}>Performance</th>
                  <th style={{ padding: '12px 14px', width: '90px' }}>CTR</th>
                  <th style={{ padding: '12px 16px', minWidth: '320px' }}>Syllabus Match Status</th>
                  <th style={{ padding: '12px 20px', width: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px', color: '#334155' }}>
                {filteredVideos.map((video) => {
                  const isCFA = (video.course || '').startsWith('CFA');
                  const isRev = (video.format || '').toLowerCase().includes('revision');
                  const isMatched = video.is_matched;
                  const matchedTopic = video.matched_topics?.[0];
                  const isWorking = actionLoadingId === video.id;

                  return (
                    <tr 
                      key={video.id} 
                      style={{ 
                        borderBottom: '1px solid #F1F5F9',
                        background: isMatched ? '#FFFFFF' : '#FFFDF8',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Video Cell */}
                      <td style={{ padding: '12px 20px' }}>
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

                              {video.published_at && (
                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                  {video.published_at.substring(0, 10)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Performance */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {(video.views || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {(video.impressions || 0).toLocaleString()} impr.
                        </div>
                      </td>

                      {/* CTR */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: (video.ctr || 0) >= 4.0 ? '#10B981' : (video.ctr || 0) >= 2.5 ? '#0F172A' : '#E11D48'
                        }}>
                          {(video.ctr || 0).toFixed(1)}%
                        </span>
                      </td>

                      {/* Syllabus Match Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {isMatched && (video.matched_topics || []).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #A7F3D0', alignSelf: 'flex-start' }}>
                              <CheckCircle2 size={10} />
                              <span>{video.matched_topics.length > 1 ? `${video.matched_topics.length} LINKED TOPICS` : 'LINKED TOPIC'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {video.matched_topics.map(mt => (
                                <div key={mt.topic_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5' }}>
                                      {mt.topic_name}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748B' }}>
                                      {mt.course_name} · {mt.subject_name}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleUnlinkTopic(video, mt.topic_id)}
                                    title={`Unlink from ${mt.topic_name}`}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#94A3B8',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#94A3B8',
                              background: '#F8FAFC',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              border: '1px solid #E2E8F0'
                            }}>
                              <AlertCircle size={10} style={{ color: '#F59E0B' }} />
                              <span>Unmatched</span>
                            </span>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                              Not mapped to any syllabus topic
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {isMatched ? (
                            <>
                              <button
                                onClick={() => setSelectedVideoForMatch(video)}
                                disabled={isWorking}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#334155',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Link additional topic or change"
                              >
                                <Plus size={11} />
                                <span>Add Topic</span>
                              </button>

                              <button
                                onClick={() => handleUnlinkTopic(video, matchedTopic.topic_id)}
                                disabled={isWorking}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #FCA5A5',
                                  background: '#FFF5F5',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Unlink from this topic"
                              >
                                <Unlink size={11} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedVideoForMatch(video)}
                              disabled={isWorking}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#4F46E5',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(79, 70, 229, 0.2)'
                              }}
                            >
                              <Plus size={11} />
                              <span>Match Topic</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #F1F5F9',
          background: '#FAFAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#64748B',
          flexShrink: 0
        }}>
          <div>
            Showing <b>{filteredVideos.length}</b> of <b>{videos.length}</b> videos
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Nested Topic Selector Modal */}
      {selectedVideoForMatch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 75,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '80vh',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase' }}>
                  {selectedVideoForMatch.is_matched ? 'Change Topic Match' : 'Assign to Syllabus Topic'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px', maxWidth: '560px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedVideoForMatch.title}
                </div>
              </div>
              <button
                onClick={() => setSelectedVideoForMatch(null)}
                style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#F1F5F9', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter & Search inside Picker */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search topics by name or subject..."
                  value={topicSearchQuery}
                  onChange={(e) => setTopicSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 30px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <select
                value={topicCourseFilter}
                onChange={(e) => setTopicCourseFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  background: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Courses</option>
                <option value="CFA Level 1">CFA Level 1</option>
                <option value="CFA Level 2">CFA Level 2</option>
                <option value="FRM Part 1">FRM Part 1</option>
                <option value="FRM Part 2">FRM Part 2</option>
              </select>
            </div>

            {/* Topics List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              {filteredTopics.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No syllabus topics found matching your search.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredTopics.map(top => {
                    const isCurrent = selectedVideoForMatch.matched_topics?.some(mt => mt.topic_id === top.id);

                    return (
                      <div
                        key={top.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: isCurrent ? '1.5px solid #4F46E5' : '1px solid #E2E8F0',
                          background: isCurrent ? '#EEF2FF' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                            <span>{top.course_name}</span>
                            <span>·</span>
                            <span>{top.subject_name}</span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                            {top.name}
                          </div>
                        </div>

                        <div>
                          {isCurrent ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5', background: '#E0E7FF', padding: '4px 10px', borderRadius: '6px' }}>
                              Current Match
                            </span>
                          ) : (
                            <button
                              onClick={() => handleReassignTopic(selectedVideoForMatch, top)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#4F46E5',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Select & Link
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', background: '#FAFAFC', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedVideoForMatch(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
