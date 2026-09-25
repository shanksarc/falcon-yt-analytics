import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, CheckCircle2, AlertTriangle, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';

export default function TopicMatchReviewModal({
  onClose,
  onQueueUpdated
}) {
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/syllabus/match-queue');
      const data = await res.json();
      setQueue(data || []);
    } catch (err) {
      console.error("Failed to load match queue:", err);
      setError("Failed to load match review queue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (queueId) => {
    setActioningId(queueId);
    try {
      const res = await fetch(`/api/syllabus/match-queue/${queueId}/confirm`, {
        method: 'POST'
      });
      if (res.ok) {
        setQueue(prev => prev.filter(q => q.id !== queueId));
        if (onQueueUpdated) onQueueUpdated();
      }
    } catch (err) {
      console.error("Confirm failed:", err);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (queueId) => {
    setActioningId(queueId);
    try {
      const res = await fetch(`/api/syllabus/match-queue/${queueId}/reject`, {
        method: 'POST'
      });
      if (res.ok) {
        setQueue(prev => prev.filter(q => q.id !== queueId));
        if (onQueueUpdated) onQueueUpdated();
      }
    } catch (err) {
      console.error("Reject failed:", err);
    } finally {
      setActioningId(null);
    }
  };

  const handleConfirmAll = async () => {
    if (!window.confirm(`Confirm all ${queue.length} pending candidate matches?`)) return;
    setIsLoading(true);
    for (const item of queue) {
      try {
        await fetch(`/api/syllabus/match-queue/${item.id}/confirm`, { method: 'POST' });
      } catch (e) {
        console.error(e);
      }
    }
    await fetchQueue();
    if (onQueueUpdated) onQueueUpdated();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
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
        maxWidth: '720px',
        maxHeight: '85vh',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
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
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#FFF5ED',
                color: '#EA580C',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                Match Review Queue
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {queue.length} Candidates Pending
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
              Review Uncertain Video-Topic Matches
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              Confirm or reject candidate video matches. Confirmed videos immediately link to the topic grid cell.
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
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              background: '#FFF0F2',
              color: '#E11D48',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
              Loading candidate matches...
            </div>
          ) : queue.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: '16px',
              border: '1px dashed #CBD5E1'
            }}>
              <CheckCircle2 size={36} style={{ color: '#10B981', margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                Match Queue is Clear
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '360px', margin: '0 auto' }}>
                All high-confidence videos are already linked, and no uncertain matches require your confirmation right now.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queue.map(item => {
                const confPct = Math.round((item.confidence || 0) * 100);
                const confColor = confPct >= 70 ? '#10B981' : confPct >= 50 ? '#F59E0B' : '#64748B';
                const isWorking = actioningId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Topic Breadcrumb */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                        <span>{item.course_name}</span>
                        <span>/</span>
                        <span>{item.subject_name}</span>
                        <span>/</span>
                        <span style={{ fontWeight: 700, color: '#7C3AED' }}>{item.topic_name}</span>
                      </div>

                      {/* Video Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <a
                          href={`https://www.youtube.com/watch?v=${item.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#0F172A',
                            textDecoration: 'none'
                          }}
                        >
                          {item.video_title}
                        </a>
                        <ExternalLink size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                      </div>

                      {/* Video Meta & Confidence */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                        <span style={{
                          background: `${confColor}15`,
                          color: confColor,
                          fontWeight: 700,
                          fontSize: '11px',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          border: `1px solid ${confColor}30`
                        }}>
                          {confPct}% Match Confidence
                        </span>
                        <span>·</span>
                        <span>{item.video_views?.toLocaleString()} views</span>
                        <span>·</span>
                        <span>Format: {item.video_format}</span>
                      </div>

                      {item.match_reason && (
                        <div style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          color: '#4F46E5',
                          background: '#EEF2FF',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid #E0E7FF'
                        }}>
                          <span>💡</span>
                          <span>Rule: {item.match_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={isWorking}
                        title="Reject match (will not be asked again)"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#64748B',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: isWorking ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleConfirm(item.id)}
                        disabled={isWorking}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: isWorking ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        <Check size={14} />
                        <span>Confirm</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          {queue.length > 1 && (
            <button
              onClick={handleConfirmAll}
              disabled={isLoading}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #10B981',
                background: '#FFFFFF',
                color: '#10B981',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Confirm All ({queue.length})
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
