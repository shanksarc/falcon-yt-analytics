import React, { useState, useEffect } from 'react';
import { X, Check, Search, Layers, Plus, Tag } from 'lucide-react';
import CreateListModal from './CreateListModal';

export default function ManageVideoListsModal({ video, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allLists, setAllLists] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchVideoLists();
  }, [video?.id]);

  const fetchVideoLists = async () => {
    if (!video?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${video.id}/lists`);
      const data = await res.json();
      setAllLists(data.all_lists || []);
      setSelectedListIds(new Set(data.assigned_list_ids || []));
    } catch (err) {
      console.error("Failed to load video lists:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleList = (id) => {
    setSelectedListIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/videos/${video.id}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_ids: Array.from(selectedListIds) })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          onSuccess(Array.from(selectedListIds));
        }, 400);
      }
    } catch (err) {
      console.error("Failed to update video lists:", err);
    } finally {
      setSaving(false);
    }
  };

  const filteredLists = allLists.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const courseLists = filteredLists.filter(l => l.is_course);
  const otherLists = filteredLists.filter(l => !l.is_course);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-icon-wrap" style={{ width: '32px', height: '32px' }}>
              <Layers size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.1rem' }}>Edit Video Lists</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Allocate this video to one or multiple lists simultaneously
              </p>
            </div>
          </div>
          <button className="btn-secondary" style={{ padding: '0.35rem', borderRadius: '50%' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {saveSuccess && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', color: 'var(--success-emerald)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <Check size={15} /> Lists successfully allocated!
          </div>
        )}

        {/* Video Target Preview */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          background: 'var(--bg-surface-elevated)', 
          padding: '0.75rem 1rem', 
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          border: '1px solid var(--border-subtle)'
        }}>
          <img 
            src={video?.thumbnail_url || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80'} 
            alt={video?.title} 
            style={{ width: '60px', height: '34px', borderRadius: '4px', objectFit: 'cover' }}
          />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {video?.title}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Currently allocated to <strong style={{ color: 'var(--yt-red)' }}>{selectedListIds.size}</strong> lists
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search available lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <button 
            type="button"
            className="btn-secondary"
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={13} /> New List
          </button>
        </div>

        {/* List Checkboxes */}
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading lists...
          </div>
        ) : (
          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '0.25rem', marginBottom: '1.25rem' }}>
            {courseLists.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, padding: '0.2rem 0.5rem' }}>
                  Course Lists
                </div>
                {courseLists.map(l => {
                  const isChecked = selectedListIds.has(l.id);
                  return (
                    <label 
                      key={l.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.8rem',
                        borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'rgba(255, 0, 0, 0.08)' : 'var(--bg-surface-elevated)',
                        border: isChecked ? '1px solid var(--yt-red)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        marginBottom: '0.25rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleList(l.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--yt-red)' }} 
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.name}</span>
                      </div>
                      <span className="badge badge-cfa" style={{ fontSize: '0.65rem' }}>Course</span>
                    </label>
                  );
                })}
              </div>
            )}

            {otherLists.length > 0 && (
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, padding: '0.2rem 0.5rem' }}>
                  Subjects & Custom Lists
                </div>
                {otherLists.map(l => {
                  const isChecked = selectedListIds.has(l.id);
                  return (
                    <label 
                      key={l.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.8rem',
                        borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'rgba(255, 0, 0, 0.08)' : 'var(--bg-surface-elevated)',
                        border: isChecked ? '1px solid var(--yt-red)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        marginBottom: '0.25rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleList(l.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--yt-red)' }} 
                        />
                        <span style={{ fontSize: '0.85rem' }}>{l.name}</span>
                      </div>
                      <span className="badge badge-format" style={{ fontSize: '0.65rem' }}>
                        {(() => {
                          if (l.parent_id) {
                            const parent = allLists.find(p => p.id === l.parent_id);
                            if (parent) return parent.name;
                          }
                          return 'Subject';
                        })()}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {filteredLists.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No lists matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {selectedListIds.size} lists selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loading}>
              <Check size={14} />
              {saving ? 'Saving...' : 'Save Lists'}
            </button>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateListModal 
          availableLists={allLists}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchVideoLists();
          }}
        />
      )}
    </div>
  );
}
