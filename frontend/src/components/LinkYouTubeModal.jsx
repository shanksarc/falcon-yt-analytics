import React, { useState, useEffect } from 'react';
import { X, Link2, Check, ExternalLink, Search, PlayCircle, Eye, ThumbsUp, AlertCircle, Unlink } from 'lucide-react';

export default function LinkYouTubeModal({ plannedVideo, onClose, onSuccess }) {
  const [inputValue, setInputValue] = useState('');
  const [extractedId, setExtractedId] = useState('');
  const [channelVideos, setChannelVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedVideo, setMatchedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchChannelVideos();
    if (plannedVideo?.linked_video_id) {
      setInputValue(plannedVideo.linked_video_id);
    } else if (plannedVideo?.initialSearchQuery) {
      setSearchQuery(plannedVideo.initialSearchQuery);
      setShowPicker(true);
    }
  }, [plannedVideo]);

  // Extract ID when input changes
  useEffect(() => {
    const raw = inputValue.trim();
    if (!raw) {
      setExtractedId('');
      setMatchedVideo(null);
      return;
    }

    const id = parseYouTubeId(raw);
    setExtractedId(id);

    // Look for video in loaded channel videos
    if (id && channelVideos.length > 0) {
      const found = channelVideos.find(v => v.id === id);
      setMatchedVideo(found || null);
    }
  }, [inputValue, channelVideos]);

  const parseYouTubeId = (urlOrId) => {
    if (!urlOrId) return '';
    const s = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const patterns = [
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/,
      /[\?&]v=([a-zA-Z0-9_-]{11})/,
      /\/([a-zA-Z0-9_-]{11})(?:\?|&|$|\/)/
    ];
    for (const p of patterns) {
      const m = s.match(p);
      if (m && m[1]) return m[1];
    }
    return s;
  };

  const fetchChannelVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        setChannelVideos(data);
        if (plannedVideo?.linked_video_id) {
          const found = data.find(v => v.id === plannedVideo.linked_video_id);
          if (found) setMatchedVideo(found);
        }
      }
    } catch (err) {
      console.error("Failed to load channel videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!extractedId) {
      setErrorMsg("Please paste a valid YouTube video URL or ID");
      return;
    }

    setLinking(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/planner/videos/${plannedVideo.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: inputValue
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (onSuccess) onSuccess(data);
        onClose();
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to link video");
      }
    } catch (err) {
      setErrorMsg("Connection error: " + err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm("Unlink this YouTube video and revert status to Planned?")) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/planner/videos/${plannedVideo.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        if (onSuccess) onSuccess({ unlinked: true });
        onClose();
      }
    } catch (err) {
      setErrorMsg("Failed to unlink: " + err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleSelectVideoFromList = (v) => {
    setInputValue(`https://www.youtube.com/watch?v=${v.id}`);
    setMatchedVideo(v);
    setShowPicker(false);
  };

  const filteredPickerVideos = channelVideos.filter(v => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return v.title?.toLowerCase().includes(q) || v.id?.toLowerCase().includes(q);
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Link2 size={18} color="var(--cfa-gold)" />
            <h3 className="modal-title">Link YouTube Video</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.3rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Planned Video Context Card */}
        <div style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>
            Target Planned Video
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px' }}>
            {plannedVideo?.title}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '6px', flexWrap: 'wrap' }}>
            {plannedVideo?.session_name && (
              <span className="badge badge-cfa" style={{ fontSize: '0.7rem' }}>
                {plannedVideo.session_name}
              </span>
            )}
            {plannedVideo?.lists?.map(l => (
              <span key={l.id} className="badge badge-prep" style={{ fontSize: '0.7rem' }}>
                {l.name}
              </span>
            ))}
            <span className="badge" style={{ fontSize: '0.7rem', background: 'var(--bg-surface)' }}>
              Current Status: {plannedVideo?.status}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Manual YouTube URL Input */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>YouTube Video URL or Video ID</span>
            <button 
              type="button" 
              onClick={() => setShowPicker(!showPicker)} 
              style={{ background: 'none', border: 'none', color: 'var(--cfa-gold)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              {showPicker ? "Hide Channel Videos" : "Browse Channel Videos (187)"}
            </button>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or 11-char ID"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Supports standard YouTube watch URLs, youtu.be short links, YouTube Shorts, or raw 11-character video IDs.
          </div>
        </div>

        {/* Channel Video Picker (Expandable) */}
        {showPicker && (
          <div style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            background: 'var(--bg-surface)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Search size={14} color="var(--text-muted)" />
              <input 
                type="text"
                placeholder="Search channel videos by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem'
                }}
              />
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredPickerVideos.slice(0, 30).map(v => (
                <div 
                  key={v.id}
                  onClick={() => handleSelectVideoFromList(v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: matchedVideo?.id === v.id ? 'rgba(232, 163, 61, 0.15)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.78rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-elevated)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = matchedVideo?.id === v.id ? 'rgba(232, 163, 61, 0.15)' : 'transparent'}
                >
                  <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '420px' }}>
                    {v.title}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }}>
                    {v.views?.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Matched Video Preview Card */}
        {extractedId && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'center'
          }}>
            <img 
              src={matchedVideo?.thumbnail_url || `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`} 
              alt="Video Preview"
              style={{ width: '90px', height: '52px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-subtle)', flexShrink: 0 }}
              onError={(e) => e.target.style.display = 'none'}
            />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--success-emerald)' }}>
                  Detected YouTube ID: {extractedId}
                </span>
                <a 
                  href={`https://www.youtube.com/watch?v=${extractedId}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: 'var(--text-muted)' }}
                  title="Watch on YouTube"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {matchedVideo?.title || "Video found on YouTube"}
              </div>
              {matchedVideo && (
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  <span><Eye size={11} style={{ verticalAlign: '-1px' }} /> {matchedVideo.views?.toLocaleString()} views</span>
                  <span><ThumbsUp size={11} style={{ verticalAlign: '-1px' }} /> {matchedVideo.likes?.toLocaleString()} likes</span>
                  <span>Course: {matchedVideo.course}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <div>
            {plannedVideo?.linked_video_id && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleUnlink}
                disabled={linking}
                style={{ color: 'var(--danger-rose)', borderColor: 'rgba(244, 63, 94, 0.3)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Unlink size={13} />
                <span>Unlink Video</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={linking}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleLink}
              disabled={linking || !extractedId}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Check size={14} />
              <span>{linking ? 'Linking...' : 'Link Video & Mark Uploaded'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
