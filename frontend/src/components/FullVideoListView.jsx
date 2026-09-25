import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Check, X, Link2, ExternalLink, Calendar, Plus,
  Trash2, Edit3, Eye, ThumbsUp, ChevronDown, CheckSquare, Square,
  UploadCloud, ArrowUpDown, Layers, Zap, Clock, AlertCircle, RefreshCw,
  Video, CheckCircle2, TrendingUp, BarChart2
} from 'lucide-react';

export default function FullVideoListView({
  plannedVideos = [],
  sessions = [],
  lists = [],
  onRefresh,
  onEditVideo,
  onOpenPlanVideo,
  onOpenLinkModal,
  onOpenBulkImport
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSession, setFilterSession] = useState('ALL');
  const [filterList, setFilterList] = useState('ALL');
  const [filterType, setFilterType] = useState('video'); // 'video' (Lectures) is default type
  const [sortBy, setSortBy] = useState('created_desc'); // 'created_desc' | 'created_asc' | 'title' | 'status'

  // Selection state for Bulk Actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkActionMsg, setBulkActionMsg] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Group lists by course hierarchy
  const courseLists = useMemo(() => {
    return lists.filter(l => l.is_course || ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2'].includes(l.id));
  }, [lists]);

  const specialLists = useMemo(() => {
    return lists.filter(l => !l.is_course && (!l.parent_id || !courseLists.some(c => c.id === l.parent_id)));
  }, [lists, courseLists]);

  // Filter & Sort
  const filteredVideos = useMemo(() => {
    return plannedVideos.filter(pv => {
      // Content type filter
      if (filterType === 'video' && pv.content_type === 'short') return false;
      if (filterType === 'short' && pv.content_type !== 'short') return false;

      // Status filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'Overdue') {
          if (pv.status !== 'Overdue') return false;
        } else if (pv.status !== filterStatus) {
          return false;
        }
      }

      // Session filter
      if (filterSession !== 'ALL') {
        if (filterSession === 'EVERGREEN') {
          if (pv.session_id) return false;
        } else if (pv.session_id !== filterSession) {
          return false;
        }
      }

      // List / Course filter
      if (filterList !== 'ALL') {
        if (!pv.lists?.some(l => l.id === filterList)) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const inTitle = pv.title?.toLowerCase().includes(q);
        const inNotes = pv.notes?.toLowerCase().includes(q);
        const inHook = pv.hook?.toLowerCase().includes(q);
        const inSeries = pv.series?.toLowerCase().includes(q);
        const inLinked = pv.linked_video_title?.toLowerCase().includes(q);
        if (!inTitle && !inNotes && !inHook && !inSeries && !inLinked) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      if (sortBy === 'created_asc') return (a.created_at || '').localeCompare(b.created_at || '');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [plannedVideos, filterType, filterStatus, filterSession, filterList, searchTerm, sortBy]);

  // Pagination slices
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / pageSize));
  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVideos.slice(start, start + pageSize);
  }, [filteredVideos, currentPage, pageSize]);

  // Overall & Categorical counts
  const stats = useMemo(() => {
    const total = plannedVideos.length;

    // Lecture videos (long-form content)
    const lectureVideos = plannedVideos.filter(v => v.content_type !== 'short');
    const lecturesTotal = lectureVideos.length;
    const lecturesUploaded = lectureVideos.filter(v => v.status === 'Uploaded').length;
    const lecturesScheduled = lectureVideos.filter(v => v.status === 'Scheduled').length;
    const lecturesPlanned = lectureVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const lecturesOverdue = lectureVideos.filter(v => v.status === 'Overdue').length;
    const lecturesCompletionPct = lecturesTotal > 0 ? Math.round((lecturesUploaded / lecturesTotal) * 100) : 0;

    // Shorts (vertical short-form content <60s)
    const shortsVideos = plannedVideos.filter(v => v.content_type === 'short');
    const shortsTotal = shortsVideos.length;
    const shortsUploaded = shortsVideos.filter(v => v.status === 'Uploaded').length;
    const shortsScheduled = shortsVideos.filter(v => v.status === 'Scheduled').length;
    const shortsPlanned = shortsVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const shortsOverdue = shortsVideos.filter(v => v.status === 'Overdue').length;
    const shortsCompletionPct = shortsTotal > 0 ? Math.round((shortsUploaded / shortsTotal) * 100) : 0;

    // Combined totals
    const uploaded = plannedVideos.filter(v => v.status === 'Uploaded').length;
    const scheduled = plannedVideos.filter(v => v.status === 'Scheduled').length;
    const planned = plannedVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const overdue = plannedVideos.filter(v => v.status === 'Overdue').length;
    const overallCompletionPct = total > 0 ? Math.round((uploaded / total) * 100) : 0;

    return {
      total,
      uploaded,
      scheduled,
      planned,
      overdue,
      overallCompletionPct,
      shorts: shortsTotal,
      lecturesTotal,
      lecturesUploaded,
      lecturesScheduled,
      lecturesPlanned,
      lecturesOverdue,
      lecturesCompletionPct,
      shortsTotal,
      shortsUploaded,
      shortsScheduled,
      shortsPlanned,
      shortsOverdue,
      shortsCompletionPct
    };
  }, [plannedVideos]);

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllCurrent = () => {
    if (paginatedVideos.every(v => selectedIds.has(v.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedVideos.forEach(v => next.delete(v.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedVideos.forEach(v => next.add(v.id));
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filteredVideos.map(v => v.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk Actions
  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const res = await fetch('/api/planner/videos/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: Array.from(selectedIds),
          status: newStatus
        })
      });

      if (res.ok) {
        setBulkActionMsg(`Updated ${selectedIds.size} videos to "${newStatus}"!`);
        setTimeout(() => setBulkActionMsg(null), 3500);
        setSelectedIds(new Set());
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Bulk status error:", err);
      alert("Failed to update status in bulk: " + err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkAssignSession = async (sessId) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const res = await fetch('/api/planner/videos/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: Array.from(selectedIds),
          status: 'Planned',
          session_id: sessId
        })
      });

      if (res.ok) {
        setBulkActionMsg(`Reassigned ${selectedIds.size} videos to session!`);
        setTimeout(() => setBulkActionMsg(null), 3500);
        setSelectedIds(new Set());
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Bulk session reassign error:", err);
      alert("Failed to reassign session in bulk: " + err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete these ${selectedIds.size} planned videos?`)) return;
    setBulkUpdating(true);
    try {
      const res = await fetch('/api/planner/videos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: Array.from(selectedIds)
        })
      });

      if (res.ok) {
        setBulkActionMsg(`Successfully deleted ${selectedIds.size} planned videos.`);
        setTimeout(() => setBulkActionMsg(null), 3500);
        setSelectedIds(new Set());
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      alert("Failed to delete videos in bulk: " + err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleInlineStatusChange = async (pvId, newStatus) => {
    try {
      await fetch(`/api/planner/videos/${pvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Inline status update failed:", err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Uploaded': return 'badge-cfa';
      case 'Scheduled': return 'badge-prep';
      case 'In Progress': return 'badge-format';
      case 'Overdue': return 'badge-danger';
      default: return '';
    }
  };

  const isAllCurrentSelected = paginatedVideos.length > 0 && paginatedVideos.every(v => selectedIds.has(v.id));

  return (
    <div className="full-video-list-container">
      {/* ------------------------------------------------------------- */}
      {/* Controls & Filter Bar                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="content-card" style={{ marginBottom: '1rem', padding: '0.85rem 1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Format Segmented Switcher + Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {/* Segmented Format Switcher (Lectures Default!) */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-surface-elevated)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                type="button"
                onClick={() => { setFilterType('video'); setCurrentPage(1); }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: filterType === 'video' ? 700 : 500,
                  background: filterType === 'video' ? 'var(--bg-surface)' : 'transparent',
                  color: filterType === 'video' ? '#E8A33D' : 'var(--text-secondary)',
                  border: filterType === 'video' ? '1px solid rgba(232, 163, 61, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Video size={13} />
                <span>Lectures ({stats.lecturesTotal})</span>
              </button>

              <button
                type="button"
                onClick={() => { setFilterType('short'); setCurrentPage(1); }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: filterType === 'short' ? 700 : 500,
                  background: filterType === 'short' ? 'var(--bg-surface)' : 'transparent',
                  color: filterType === 'short' ? '#E8A33D' : 'var(--text-secondary)',
                  border: filterType === 'short' ? '1px solid rgba(232, 163, 61, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Zap size={13} fill={filterType === 'short' ? '#E8A33D' : 'none'} />
                <span>Shorts ({stats.shortsTotal})</span>
              </button>

              <button
                type="button"
                onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: filterType === 'ALL' ? 700 : 500,
                  background: filterType === 'ALL' ? 'var(--bg-surface)' : 'transparent',
                  color: filterType === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: filterType === 'ALL' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                All ({stats.total})
              </button>
            </div>

            {/* Search Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.35rem 0.75rem',
              minWidth: '220px',
              maxWidth: '320px',
              flex: '1 1 auto'
            }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search planned videos, hooks..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  width: '100%'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Content Type Filter */}
            <select
              className="control-select"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: '0.78rem' }}
            >
              <option value="video">Lectures (Default)</option>
              <option value="short">⚡ Shorts Only</option>
              <option value="ALL">All Video Types</option>
            </select>

            {/* Status Filter */}
            <select
              className="control-select"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: '0.78rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Uploaded">Uploaded</option>
              <option value="Overdue">Overdue</option>
            </select>

            {/* Session / Exam Window Filter */}
            <select
              className="control-select"
              value={filterSession}
              onChange={(e) => { setFilterSession(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: '0.78rem' }}
            >
              <option value="ALL">All Exam Windows</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="EVERGREEN">Evergreen (No Exam Window)</option>
            </select>

            {/* List / Course Filter */}
            <select
              className="control-select"
              value={filterList}
              onChange={(e) => { setFilterList(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: '0.78rem' }}
            >
              <option value="ALL">All Lists & Courses</option>

              <optgroup label="📚 Programs & Courses">
                {courseLists.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>

              {courseLists.map(course => {
                const subjects = lists.filter(l => !l.is_course && l.parent_id === course.id);
                if (subjects.length === 0) return null;
                return (
                  <optgroup key={course.id} label={`📖 ${course.name} Subjects`}>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                );
              })}

              {specialLists.length > 0 && (
                <optgroup label="🎯 Special & Other Lists">
                  {specialLists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Action Buttons */}
            <button
              className="btn-ghost"
              onClick={onOpenBulkImport}
              style={{ border: '1px solid var(--border-subtle)', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
              title="Bulk import planned videos from text"
            >
              <UploadCloud size={13} />
              <span>Bulk Import</span>
            </button>

            <button
              className="btn-primary"
              onClick={onOpenPlanVideo}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              <Plus size={13} />
              <span>Plan Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Bulk Actions Sticky / Alert Bar                               */}
      {/* ------------------------------------------------------------- */}
      {selectedIds.size > 0 && (
        <div style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--cfa-gold)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--cfa-gold)' }}>
              {selectedIds.size} video{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClearSelection}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--text-muted)' }}
            >
              Deselect All
            </button>
            {selectedIds.size < filteredVideos.length && (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleSelectAllFiltered}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--text-secondary)' }}
              >
                Select all {filteredVideos.length} filtered
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Bulk Action:</span>

            {/* Quick Bulk Status Buttons */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleBulkStatusChange('Uploaded')}
              disabled={bulkUpdating}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', color: 'var(--success-emerald)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
            >
              <Check size={12} /> Mark Uploaded
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleBulkStatusChange('Scheduled')}
              disabled={bulkUpdating}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', color: 'var(--cfa-gold)', borderColor: 'rgba(232, 163, 61, 0.4)' }}
            >
              <Calendar size={12} /> Mark Scheduled
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleBulkStatusChange('Planned')}
              disabled={bulkUpdating}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
            >
              Mark Planned
            </button>

            {/* Bulk Assign Exam Session */}
            <select
              className="control-select"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              onChange={(e) => {
                if (e.target.value) handleBulkAssignSession(e.target.value);
              }}
              defaultValue=""
              disabled={bulkUpdating}
            >
              <option value="" disabled>Move to Session...</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="EVERGREEN">Evergreen (No Session)</option>
            </select>

            {/* Bulk Delete */}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleBulkDelete}
              disabled={bulkUpdating}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', color: 'var(--danger-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
              title="Delete selected planned videos"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {bulkActionMsg && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success-emerald)',
          padding: '0.55rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={14} /> {bulkActionMsg}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Video Table                                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="analytics-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllCurrentSelected}
                    onChange={handleSelectAllCurrent}
                    title="Select / Deselect all on this page"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ minWidth: '300px' }}>Video Topic & Content</th>
                <th>Course / List</th>
                <th>Exam Window</th>
                <th>Status & Week</th>
                <th style={{ minWidth: '240px' }}>Linked YouTube Video</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No planned videos found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedVideos.map(pv => {
                  const isSelected = selectedIds.has(pv.id);
                  const isShort = pv.content_type === 'short';
                  const isLinked = !!pv.linked_video_id;

                  return (
                    <tr
                      key={pv.id}
                      style={{ background: isSelected ? 'rgba(232, 163, 61, 0.08)' : 'inherit' }}
                    >
                      {/* 1. Selection Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(pv.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* 2. Video Title & Meta */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {isShort ? (
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: '6px',
                                  background: 'rgba(232, 163, 61, 0.2)',
                                  color: '#E8A33D',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  <Zap size={10} fill="#E8A33D" /> Short ({pv.target_duration_sec || 60}s)
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: '6px',
                                  background: 'var(--bg-surface-elevated)',
                                  color: 'var(--text-muted)',
                                  fontWeight: 600
                                }}>
                                  Lecture
                                </span>
                              )}

                              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                {pv.title}
                              </strong>
                            </div>

                            {/* Short Hook or Series */}
                            {isShort && (pv.hook || pv.series) && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                {pv.series && <span style={{ color: 'var(--cfa-gold)', fontWeight: 600 }}>{pv.series} · </span>}
                                {pv.hook && <span style={{ fontStyle: 'italic' }}>"{pv.hook}"</span>}
                              </div>
                            )}

                            {/* Notes preview */}
                            {pv.notes && !isShort && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {pv.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Course / List */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {pv.lists && pv.lists.length > 0 ? (
                            pv.lists.map(l => (
                              <span
                                key={l.id}
                                className={`badge ${l.is_course ? 'badge-cfa' : 'badge-prep'}`}
                                style={{ fontSize: '0.7rem', width: 'fit-content' }}
                              >
                                {l.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Exam Window */}
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: pv.session_name ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}>
                          {pv.session_name || 'Evergreen'}
                        </span>
                      </td>

                      {/* 5. Status & Week */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <select
                            value={pv.status}
                            onChange={(e) => handleInlineStatusChange(pv.id, e.target.value)}
                            style={{
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: pv.status === 'Uploaded' ? 'var(--success-emerald)' : (pv.status === 'Scheduled' ? 'var(--cfa-gold)' : 'var(--text-primary)'),
                              borderRadius: 'var(--radius-sm)',
                              padding: '2px 6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Planned">Planned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Uploaded">Uploaded ✓</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </div>
                        {pv.assigned_week && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Week: {pv.assigned_week}
                          </div>
                        )}
                      </td>

                      {/* 6. Linked YouTube Video (Manual Link UI) */}
                      <td>
                        {isLinked ? (
                          <div style={{
                            background: 'rgba(16, 185, 129, 0.06)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.35rem 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                          }}>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  color: 'var(--success-emerald)',
                                  fontWeight: 700,
                                  textTransform: 'uppercase'
                                }}>
                                  Live on YT
                                </span>
                                <a
                                  href={`https://www.youtube.com/watch?v=${pv.linked_video_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'var(--text-muted)' }}
                                  title="Open on YouTube"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '170px'
                              }} title={pv.linked_video_title || pv.linked_video_id}>
                                {pv.linked_video_title || pv.linked_video_id}
                              </div>
                              {pv.linked_video_views !== undefined && (
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  {(pv.linked_video_views || 0).toLocaleString()} views
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onOpenLinkModal(pv)}
                              className="btn-ghost"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', color: 'var(--cfa-gold)' }}
                              title="Change linked YouTube video"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenLinkModal(pv)}
                            style={{
                              background: 'rgba(232, 163, 61, 0.08)',
                              border: '1px dashed rgba(232, 163, 61, 0.4)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.35rem 0.65rem',
                              color: 'var(--cfa-gold)',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                            title="Manually link to published YouTube video using link or ID"
                          >
                            <Link2 size={12} />
                            <span>+ Link YT Video</span>
                          </button>
                        )}
                      </td>

                      {/* 7. Row Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => onEditVideo(pv)}
                            style={{ padding: '0.25rem' }}
                            title="Edit planned video"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredVideos.length > pageSize && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              Showing {Math.min(filteredVideos.length, (currentPage - 1) * pageSize + 1)}–{Math.min(filteredVideos.length, currentPage * pageSize)} of {filteredVideos.length} videos
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
