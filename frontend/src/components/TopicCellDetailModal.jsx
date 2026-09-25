import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Play, Trash2, CheckCircle2, AlertTriangle, ExternalLink, Calendar,
  PlusCircle, Search, Layers, Link2, Check, Filter, ChevronDown, ChevronRight, Tag
} from 'lucide-react';

// Natural sort helper so R1, R2, ..., R10 sort in correct sequence
function naturalCompare(a, b) {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
}

export default function TopicCellDetailModal({
  topic,
  format,
  cellData,
  onClose,
  onToggleNA,
  onLinkVideo,
  onUnlinkVideo,
  onOpenPlanModal
}) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'link_search'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState('ALL'); // 'ALL' | 'SAME_SUBJECT' | 'SAME_COURSE' | 'UNLINKED'
  const [allVideos, setAllVideos] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [linkingVideoId, setLinkingVideoId] = useState(null);
  const [expandedMultiTopicVideoId, setExpandedMultiTopicVideoId] = useState(null);
  const [localVideos, setLocalVideos] = useState(cellData?.videos || []);

  const { state, is_na, planned = [] } = cellData || {};

  // Sync local videos when cellData changes
  useEffect(() => {
    setLocalVideos(cellData?.videos || []);
  }, [cellData]);

  // Load all channel videos with linkages and all syllabus topics on modal open
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingVideos(true);
    try {
      const [vRes, tRes] = await Promise.all([
        fetch('/api/syllabus/reverse-match/videos'),
        fetch('/api/syllabus/topics/all')
      ]);
      const vData = await vRes.json();
      const tData = await tRes.json();
      setAllVideos(vData.videos || []);
      setAllTopics(tData || []);
    } catch (err) {
      console.error("Failed to load channel videos or topics:", err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Sibling topics in the same subject (sorted naturally: R18, R19, R20...)
  const siblingTopics = useMemo(() => {
    if (!topic || !allTopics.length) return [];
    return allTopics
      .filter(t => t.parent_id === topic.parent_id || t.subject_name === topic.subject_name)
      .sort((a, b) => naturalCompare(a.name, b.name));
  }, [topic, allTopics]);

  // Count summaries for filter chips
  const subjectVideosCount = useMemo(() => {
    const sName = (topic?.subject_name || '').toLowerCase();
    return allVideos.filter(v =>
      (v.topic || '').toLowerCase().includes(sName) ||
      (v.matched_topics || []).some(mt => (mt.subject_name || '').toLowerCase() === sName)
    ).length;
  }, [allVideos, topic]);

  const courseVideosCount = useMemo(() => {
    const cName = (topic?.course_name || '').toLowerCase();
    return allVideos.filter(v =>
      (v.course || '').toLowerCase() === cName ||
      (v.matched_topics || []).some(mt => (mt.course_name || '').toLowerCase() === cName)
    ).length;
  }, [allVideos, topic]);

  const unlinkedVideosCount = useMemo(() => {
    return allVideos.filter(v => !v.matched_topics || v.matched_topics.length === 0).length;
  }, [allVideos]);

  // Filtered and sorted videos for manual linking
  const filteredVideos = useMemo(() => {
    let list = [...allVideos];

    // Filter by scope
    if (filterScope === 'SAME_SUBJECT') {
      const sName = (topic?.subject_name || '').toLowerCase();
      list = list.filter(v =>
        (v.topic || '').toLowerCase().includes(sName) ||
        (v.matched_topics || []).some(mt => (mt.subject_name || '').toLowerCase() === sName)
      );
    } else if (filterScope === 'SAME_COURSE') {
      const cName = (topic?.course_name || '').toLowerCase();
      list = list.filter(v =>
        (v.course || '').toLowerCase() === cName ||
        (v.matched_topics || []).some(mt => (mt.course_name || '').toLowerCase() === cName)
      );
    } else if (filterScope === 'UNLINKED') {
      list = list.filter(v => !v.matched_topics || v.matched_topics.length === 0);
    }

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);

      list = list.filter(v => {
        const title = (v.title || '').toLowerCase();
        const id = (v.id || '').toLowerCase();
        const course = (v.course || '').toLowerCase();
        const fmt = (v.format || '').toLowerCase();
        const matched = (v.matched_topics || []).map(mt => `${mt.topic_name} ${mt.subject_name}`).join(' ').toLowerCase();
        const fullText = `${title} ${id} ${course} ${fmt} ${matched}`;
        return terms.every(term => fullText.includes(term));
      });
    } else if (filterScope === 'ALL') {
      // If no query and ALL is selected, prioritize videos from the same subject / course, then views
      const sName = (topic?.subject_name || '').toLowerCase();
      const cName = (topic?.course_name || '').toLowerCase();

      list.sort((a, b) => {
        const aSubj = (a.topic || '').toLowerCase().includes(sName) || (a.matched_topics || []).some(mt => (mt.subject_name || '').toLowerCase() === sName);
        const bSubj = (b.topic || '').toLowerCase().includes(sName) || (b.matched_topics || []).some(mt => (mt.subject_name || '').toLowerCase() === sName);
        if (aSubj && !bSubj) return -1;
        if (!aSubj && bSubj) return 1;

        const aCourse = (a.course || '').toLowerCase() === cName;
        const bCourse = (b.course || '').toLowerCase() === cName;
        if (aCourse && !bCourse) return -1;
        if (!aCourse && bCourse) return 1;

        return (b.views || 0) - (a.views || 0);
      });
    }

    return list;
  }, [allVideos, filterScope, searchQuery, topic]);

  // Link video to THIS topic
  const handleLinkToThisTopic = async (video) => {
    setLinkingVideoId(video.id);
    try {
      const success = await onLinkVideo(topic.id, video.id, format);
      if (success !== false) {
        // Optimistically update allVideos matched_topics
        setAllVideos(prev => prev.map(v => {
          if (v.id === video.id) {
            const alreadyHasTopic = (v.matched_topics || []).some(mt => mt.topic_id === topic.id);
            if (!alreadyHasTopic) {
              const updatedMatched = [
                ...(v.matched_topics || []),
                {
                  topic_id: topic.id,
                  topic_name: topic.name,
                  subject_name: topic.subject_name,
                  course_name: topic.course_name,
                  auto_assigned: 0
                }
              ];
              return { ...v, is_matched: true, matched_topics: updatedMatched };
            }
          }
          return v;
        }));

        // Optimistically update local confirmed videos list
        if (!localVideos.some(v => v.id === video.id)) {
          setLocalVideos(prev => [
            ...prev,
            {
              id: video.id,
              title: video.title,
              views: video.views,
              duration_seconds: video.duration_seconds,
              format: video.format,
              thumbnail_url: video.thumbnail_url
            }
          ]);
        }
      }
    } catch (err) {
      console.error("Error linking video:", err);
    } finally {
      setLinkingVideoId(null);
    }
  };

  // Unlink video from THIS topic
  const handleUnlinkFromThisTopic = async (videoId) => {
    setLinkingVideoId(videoId);
    try {
      const success = await onUnlinkVideo(topic.id, videoId);
      if (success !== false) {
        // Optimistically update allVideos matched_topics
        setAllVideos(prev => prev.map(v => {
          if (v.id === videoId) {
            const updatedMatched = (v.matched_topics || []).filter(mt => mt.topic_id !== topic.id);
            return {
              ...v,
              is_matched: updatedMatched.length > 0,
              matched_topics: updatedMatched
            };
          }
          return v;
        }));

        // Optimistically remove from local confirmed list
        setLocalVideos(prev => prev.filter(v => v.id !== videoId));
      }
    } catch (err) {
      console.error("Error unlinking video:", err);
    } finally {
      setLinkingVideoId(null);
    }
  };

  // Toggle linkage for any arbitrary topic (multi-topic management)
  const handleToggleTopicForVideo = async (video, targetTopic, shouldLink) => {
    try {
      const res = await fetch('/api/syllabus/link-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: targetTopic.id,
          video_id: video.id,
          action: shouldLink ? 'link' : 'unlink',
          format
        })
      });

      if (res.ok) {
        setAllVideos(prev => prev.map(v => {
          if (v.id === video.id) {
            let updated;
            if (shouldLink) {
              const exists = (v.matched_topics || []).some(mt => mt.topic_id === targetTopic.id);
              if (!exists) {
                updated = [
                  ...(v.matched_topics || []),
                  {
                    topic_id: targetTopic.id,
                    topic_name: targetTopic.name,
                    subject_name: targetTopic.subject_name || topic.subject_name,
                    course_name: targetTopic.course_name || topic.course_name,
                    auto_assigned: 0
                  }
                ];
              } else {
                updated = v.matched_topics;
              }
            } else {
              updated = (v.matched_topics || []).filter(mt => mt.topic_id !== targetTopic.id);
            }
            return { ...v, is_matched: updated.length > 0, matched_topics: updated };
          }
          return v;
        }));

        // If targetTopic is THIS topic, also sync localVideos
        if (targetTopic.id === topic.id) {
          if (shouldLink) {
            if (!localVideos.some(lv => lv.id === video.id)) {
              setLocalVideos(prev => [
                ...prev,
                {
                  id: video.id,
                  title: video.title,
                  views: video.views,
                  duration_seconds: video.duration_seconds,
                  format: video.format,
                  thumbnail_url: video.thumbnail_url
                }
              ]);
            }
          } else {
            setLocalVideos(prev => prev.filter(lv => lv.id !== video.id));
          }
        }
      }
    } catch (err) {
      console.error("Failed to toggle topic for video:", err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
      padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '88vh',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.2)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: '#F1F5F9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {topic.course_name} · {topic.subject_name}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: localVideos.length > 0 ? '#EBFBF7' : state === 'yellow' ? '#FFF5ED' : state === 'gray' ? '#F1F5F9' : '#F1F5F9',
                color: localVideos.length > 0 ? '#0D9488' : state === 'yellow' ? '#EA580C' : '#475569',
                border: '1px solid ' + (localVideos.length > 0 ? 'rgba(13, 148, 136, 0.25)' : state === 'yellow' ? 'rgba(234, 88, 12, 0.25)' : '#CBD5E1')
              }}>
                {localVideos.length > 0 ? `${localVideos.length} Video Available` : state === 'yellow' ? 'Planned Video' : state === 'gray' ? 'Not Applicable (N/A)' : 'Missing Video'}
              </span>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.3 }}>
              {topic.name}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Format Column:</span>
              <span style={{
                fontWeight: 700,
                color: format === 'Revision' ? '#D97706' : format === 'Discussion' ? '#2563EB' : format === 'Question Solving' ? '#7C3AED' : '#059669',
                background: format === 'Revision' ? '#FEF3C7' : format === 'Discussion' ? '#EFF6FF' : format === 'Question Solving' ? '#FAF5FF' : '#ECFDF5',
                padding: '1px 8px',
                borderRadius: '4px'
              }}>
                {format}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 24px',
          background: '#FFFFFF',
          gap: '20px'
        }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 4px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'details' ? '#7C3AED' : '#64748B',
              borderBottom: activeTab === 'details' ? '2px solid #7C3AED' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Overview & Linked Content ({localVideos.length + planned.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('link_search')}
            style={{
              padding: '12px 4px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'link_search' ? '#7C3AED' : '#64748B',
              borderBottom: activeTab === 'link_search' ? '2px solid #7C3AED' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <PlusCircle size={14} />
            <span>Link Video Manually ({allVideos.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'details' ? (
            <div>
              {/* Not Applicable Toggle Card */}
              <div style={{
                background: is_na ? '#F8FAFC' : '#F1F5F9',
                padding: '14px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                border: '1px solid #E2E8F0'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                    {is_na ? 'Format Marked as Not Applicable (Gray Cell)' : 'Mark as Not Applicable (Gray Cell)'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {is_na
                      ? 'Excluded from syllabus coverage calculation.'
                      : 'Gray cells do not count against full coverage % (e.g. theoretical topics without Q&A).'}
                  </div>
                </div>
                <button
                  onClick={() => onToggleNA(topic.id, format, !is_na)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: is_na ? '#0D9488' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  {is_na ? 'Mark Applicable' : 'Set as Gray (N/A)'}
                </button>
              </div>

              {/* Confirmed Uploaded Videos */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Confirmed Uploaded Videos ({localVideos.length})
                  </h4>
                  <button
                    onClick={() => setActiveTab('link_search')}
                    style={{
                      fontSize: '12px',
                      color: '#7C3AED',
                      fontWeight: 600,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <PlusCircle size={13} />
                    <span>+ Link Another Video</span>
                  </button>
                </div>

                {localVideos.length === 0 ? (
                  <div style={{
                    padding: '24px 18px',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1',
                    textAlign: 'center',
                    background: '#F8FAFC'
                  }}>
                    <div style={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                      No uploaded videos linked for {format} format yet.
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '4px' }}>
                      Search existing channel videos to link, or queue a planned recording.
                    </div>
                    <button
                      onClick={() => setActiveTab('link_search')}
                      style={{
                        marginTop: '12px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#7C3AED',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Search & Link Video Now
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {localVideos.map(v => {
                      // Check other topics covered by this video
                      const videoItem = allVideos.find(av => av.id === v.id);
                      const otherTopics = (videoItem?.matched_topics || []).filter(mt => mt.topic_id !== topic.id);

                      return (
                        <div
                          key={v.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <a
                                href={`https://www.youtube.com/watch?v=${v.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                              >
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {v.title}
                                </span>
                                <ExternalLink size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                              </a>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748B', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span>{v.views?.toLocaleString()} views</span>
                                <span>·</span>
                                <span>{Math.round((v.duration_seconds || 0) / 60)} mins</span>
                                <span>·</span>
                                <span style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                                  {v.format}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnlinkFromThisTopic(v.id)}
                              disabled={linkingVideoId === v.id}
                              title="Unlink video from this topic"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #FEE2E2',
                                background: '#FFF5F5',
                                color: '#E11D48',
                                cursor: 'pointer',
                                flexShrink: 0,
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Unlink</span>
                            </button>
                          </div>

                          {/* Multi-Topic Coverage Badge */}
                          {otherTopics.length > 0 && (
                            <div style={{
                              marginTop: '8px',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: '#F0F9FF',
                              border: '1px solid #BAE6FD',
                              fontSize: '11px',
                              color: '#0369A1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700 }}>🔗 Multi-Topic Video:</span>
                                <span>Also linked to:</span>
                                {otherTopics.map(ot => (
                                  <span
                                    key={ot.topic_id}
                                    style={{
                                      background: '#FFFFFF',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #7DD3FC',
                                      fontWeight: 600
                                    }}
                                  >
                                    {ot.topic_name}
                                  </span>
                                ))}
                              </div>
                              <button
                                onClick={() => {
                                  setActiveTab('link_search');
                                  setSearchQuery(v.title);
                                  setExpandedMultiTopicVideoId(v.id);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#0284C7',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Manage Linkages →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Planned Video Entries */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Planned Video Entries ({planned.length})
                  </h4>
                  {planned.length === 0 && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPlanModal(topic);
                      }}
                      style={{
                        fontSize: '12px',
                        color: '#7C3AED',
                        fontWeight: 600,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      + Plan {format} Video
                    </button>
                  )}
                </div>

                {planned.length === 0 ? (
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px dashed #E2E8F0',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}>
                    No planned video entries queued for this format.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {planned.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid #FED7AA',
                          background: '#FFFBEB'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#9A3412' }}>
                            {p.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                            Status: {p.status} · Session: {p.session_name}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#FEF3C7',
                          color: '#B45309',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          Flips Green on Upload
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: MANUAL VIDEO SEARCH & MULTI-TOPIC LINKING */
            <div>
              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '9px 12px',
                marginBottom: '10px'
              }}>
                <Search size={16} style={{ color: '#64748B' }} />
                <input
                  type="text"
                  placeholder="Search video by title, keyword, ID, or covered topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    width: '100%',
                    color: '#1E293B',
                    fontWeight: 500
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Filter Scope Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterScope('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: filterScope === 'ALL' ? '#7C3AED' : '#E2E8F0',
                    background: filterScope === 'ALL' ? '#F5F3FF' : '#FFFFFF',
                    color: filterScope === 'ALL' ? '#7C3AED' : '#64748B',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  All Videos ({allVideos.length})
                </button>
                <button
                  onClick={() => setFilterScope('SAME_SUBJECT')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: filterScope === 'SAME_SUBJECT' ? '#7C3AED' : '#E2E8F0',
                    background: filterScope === 'SAME_SUBJECT' ? '#F5F3FF' : '#FFFFFF',
                    color: filterScope === 'SAME_SUBJECT' ? '#7C3AED' : '#64748B',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Same Subject ({subjectVideosCount})
                </button>
                <button
                  onClick={() => setFilterScope('SAME_COURSE')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: filterScope === 'SAME_COURSE' ? '#7C3AED' : '#E2E8F0',
                    background: filterScope === 'SAME_COURSE' ? '#F5F3FF' : '#FFFFFF',
                    color: filterScope === 'SAME_COURSE' ? '#7C3AED' : '#64748B',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Same Course ({courseVideosCount})
                </button>
                <button
                  onClick={() => setFilterScope('UNLINKED')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: filterScope === 'UNLINKED' ? '#7C3AED' : '#E2E8F0',
                    background: filterScope === 'UNLINKED' ? '#F5F3FF' : '#FFFFFF',
                    color: filterScope === 'UNLINKED' ? '#7C3AED' : '#64748B',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Unlinked ({unlinkedVideosCount})
                </button>
              </div>

              {/* Informational Multi-Topic Tip */}
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#1E40AF',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '13px' }}>💡</span>
                <span>
                  <strong>Multi-Topic Linkages Supported:</strong> A single YouTube video can cover multiple topics (e.g. Revision or Marathon videos). Linking here connects this topic without disconnecting other topics.
                </span>
              </div>

              {/* Video List */}
              {isLoadingVideos ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  Loading channel videos...
                </div>
              ) : filteredVideos.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                  No videos match your search or filter. Try a different keyword or reset filters.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredVideos.slice(0, 35).map(v => {
                    const isLinkedToThisTopic = (v.matched_topics || []).some(mt => mt.topic_id === topic.id) || localVideos.some(lv => lv.id === v.id);
                    const isExpanded = expandedMultiTopicVideoId === v.id;
                    const isWorking = linkingVideoId === v.id;

                    return (
                      <div
                        key={v.id}
                        style={{
                          borderRadius: '12px',
                          border: isLinkedToThisTopic ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                          background: isLinkedToThisTopic ? '#F0FDF4' : '#FFFFFF',
                          padding: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        {/* Video Info Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', minWidth: 0, flex: 1 }}>
                            {/* Thumbnail */}
                            <div style={{ position: 'relative', width: '68px', height: '40px', flexShrink: 0 }}>
                              <img
                                src={v.thumbnail_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80'}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }}
                              />
                              {v.duration_seconds > 0 && (
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
                                  {Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, '0')}
                                </span>
                              )}
                            </div>

                            {/* Title & Metadata */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <a
                                href={`https://www.youtube.com/watch?v=${v.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  lineHeight: 1.3
                                }}
                                title={v.title}
                              >
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {v.title}
                                </span>
                                <ExternalLink size={11} style={{ color: '#94A3B8', flexShrink: 0 }} />
                              </a>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#64748B', marginTop: '3px', flexWrap: 'wrap' }}>
                                <span style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                  {v.course || 'General'}
                                </span>
                                <span style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                  {v.format}
                                </span>
                                <span>{(v.views || 0).toLocaleString()} views</span>
                              </div>
                            </div>
                          </div>

                          {/* Primary Action Button */}
                          <div style={{ flexShrink: 0 }}>
                            {isLinkedToThisTopic ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#047857',
                                  background: '#D1FAE5',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Check size={12} />
                                  <span>Linked</span>
                                </span>
                                <button
                                  onClick={() => handleUnlinkFromThisTopic(v.id)}
                                  disabled={isWorking}
                                  title="Unlink from this topic"
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #FCA5A5',
                                    background: '#FFFFFF',
                                    color: '#DC2626',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Unlink
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleLinkToThisTopic(v)}
                                disabled={isWorking}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#7C3AED',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 2px rgba(124, 58, 237, 0.2)'
                                }}
                              >
                                <PlusCircle size={12} />
                                <span>Link to this Topic</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Current Linkages Bar */}
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid #F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Coverage:</span>
                            {(!v.matched_topics || v.matched_topics.length === 0) ? (
                              <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>
                                Not linked to any syllabus topic yet
                              </span>
                            ) : (
                              v.matched_topics.map(mt => {
                                const isCurrent = mt.topic_id === topic.id;
                                return (
                                  <span
                                    key={mt.topic_id}
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: isCurrent ? '#D1FAE5' : '#F1F5F9',
                                      color: isCurrent ? '#047857' : '#334155',
                                      border: `1px solid ${isCurrent ? '#A7F3D0' : '#CBD5E1'}`
                                    }}
                                  >
                                    {isCurrent && '✓ '}
                                    {mt.topic_name}
                                  </span>
                                );
                              })
                            )}
                          </div>

                          {/* Multi-Topic Linker Toggle */}
                          <button
                            onClick={() => setExpandedMultiTopicVideoId(isExpanded ? null : v.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: isExpanded ? '#7C3AED' : '#64748B',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Layers size={12} />
                            <span>Covers Multiple Topics? ({v.matched_topics?.length || 0})</span>
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        </div>

                        {/* Collapsible Multi-Topic Management Selector */}
                        {isExpanded && (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px 12px',
                            background: '#F8FAFC',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                              Select all topics covered by this video in {topic.subject_name}:
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                              gap: '6px',
                              maxHeight: '160px',
                              overflowY: 'auto'
                            }}>
                              {siblingTopics.map(st => {
                                const isLinked = (v.matched_topics || []).some(mt => mt.topic_id === st.id) || (st.id === topic.id && isLinkedToThisTopic);
                                return (
                                  <label
                                    key={st.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '11px',
                                      color: isLinked ? '#0F172A' : '#64748B',
                                      fontWeight: isLinked ? 700 : 500,
                                      cursor: 'pointer',
                                      background: isLinked ? '#ECFDF5' : '#FFFFFF',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      border: `1px solid ${isLinked ? '#A7F3D0' : '#E2E8F0'}`
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isLinked}
                                      onChange={(e) => handleToggleTopicForVideo(v, st, e.target.checked)}
                                      style={{ cursor: 'pointer', accentColor: '#10B981' }}
                                    />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {st.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <button
            onClick={() => {
              onClose();
              onOpenPlanModal(topic);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #7C3AED',
              background: '#FFFFFF',
              color: '#7C3AED',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={14} />
            <span>Open Plan Modal for Topic</span>
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
