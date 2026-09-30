import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Check, X, Link2, ExternalLink, Calendar, Plus,
  Trash2, Edit3, Eye, ThumbsUp, ChevronDown, CheckSquare, Square,
  UploadCloud, ArrowUpDown, Layers, Zap, Clock, AlertCircle, RefreshCw,
  Video, CheckCircle2, TrendingUp, BarChart2, Flame
} from 'lucide-react';
import { removeLocalPlannedVideo } from '../utils/plannerStorage';

// Subject Abbreviations Dictionary (Fix 2: CFA & FRM Short Form Standard)
const SUBJECT_ABBR_MAP = {
  // CFA Subjects
  'quantitative methods': 'QM',
  'quantitative management': 'QM',
  'quantitative analysis': 'QA',
  'economics': 'ECO',
  'financial statement analysis': 'FSA',
  'financial reporting': 'FSA',
  'corporate issuers': 'CI',
  'corporate finance': 'CI',
  'ethical & professional standards': 'ETH',
  'ethical and professional standards': 'ETH',
  'ethics': 'ETH',
  'equity investments': 'EQ',
  'equity': 'EQ',
  'fixed income': 'FI',
  'derivatives': 'DER',
  'alternative investments': 'AI',
  'portfolio management': 'PM',
  'wealth planning': 'WP',

  // FRM Subjects
  'foundations of risk': 'FR',
  'foundations of risk management': 'FR',
  'financial markets & products': 'FMP',
  'financial markets and products': 'FMP',
  'valuation & risk models': 'VRM',
  'valuation and risk models': 'VRM',
  'market risk': 'MR',
  'market risk measurement': 'MR',
  'credit risk': 'CR',
  'credit risk measurement': 'CR',
  'operational & integrated risk': 'OR',
  'operational risk': 'OR',
  'liquidity & treasury risk': 'LR',
  'liquidity and treasury risk': 'LR',
  'risk management and investment': 'IM',
  'investment management': 'IM',
  'current issues': 'CURR',
  'current issues in financial markets': 'CURR',

  // Special / Common
  'revision marathons & cram sessions': 'MAR',
  'revision marathons': 'MAR',
  'marathons': 'MAR',
  'doubt clearing & live q&a': 'Q&A',
  'doubt clearing': 'Q&A',
  'exam strategy & career guides': 'STRAT',
  'exam strategy': 'STRAT'
};

export function getSubjectAbbreviation(name) {
  if (!name) return '';
  const cleaned = name
    .replace(/^(?:S\d+|B\d+|Section\s*\d+|Part\s*\d+)[-:\s.]*/i, '')
    .trim()
    .toLowerCase();

  if (SUBJECT_ABBR_MAP[cleaned]) {
    return SUBJECT_ABBR_MAP[cleaned];
  }

  for (const [key, abbr] of Object.entries(SUBJECT_ABBR_MAP)) {
    if (cleaned.includes(key)) {
      return abbr;
    }
  }

  // Fallback: initials from words
  const words = cleaned.split(/[\s&/_-]+/).filter(w => w.length > 0 && !['and', 'of', 'in', 'the', 'for'].includes(w));
  if (words.length > 1) {
    return words.map(w => w[0].toUpperCase()).slice(0, 3).join('');
  }
  return cleaned.slice(0, 4).toUpperCase();
}

export function getVideoTrackInfo(pv) {
  let isCFA = false;
  let isFRM = false;
  let levelCode = null;        // '1', '2', '3' (level / part)
  let courseFullName = '';
  let subjectCode = null;      // 'QM', 'FI', 'VRM', etc.
  let subjectFullName = '';
  let otherTags = [];

  const lists = pv.lists || [];

  for (const l of lists) {
    const lname = l.name || '';
    const lid = (l.id || '').toLowerCase();

    // Check course levels
    if (/cfa\s*(?:level\s*)?1/i.test(lname) || lid.includes('cfa_l1')) {
      isCFA = true;
      levelCode = '1';
      courseFullName = lname || 'CFA Level 1';
    } else if (/cfa\s*(?:level\s*)?2/i.test(lname) || lid.includes('cfa_l2')) {
      isCFA = true;
      levelCode = '2';
      courseFullName = lname || 'CFA Level 2';
    } else if (/cfa\s*(?:level\s*)?3/i.test(lname) || lid.includes('cfa_l3')) {
      isCFA = true;
      levelCode = '3';
      courseFullName = lname || 'CFA Level 3';
    } else if (/frm\s*(?:part\s*)?1/i.test(lname) || lid.includes('frm_p1')) {
      isFRM = true;
      levelCode = '1';
      courseFullName = lname || 'FRM Part 1';
    } else if (/frm\s*(?:part\s*)?2/i.test(lname) || lid.includes('frm_p2')) {
      isFRM = true;
      levelCode = '2';
      courseFullName = lname || 'FRM Part 2';
    } else if (/cfa/i.test(lname)) {
      isCFA = true;
      if (!courseFullName) courseFullName = lname;
    } else if (/frm/i.test(lname)) {
      isFRM = true;
      if (!courseFullName) courseFullName = lname;
    } else if (l.is_course) {
      if (!courseFullName) courseFullName = lname;
    } else {
      const subAbbr = getSubjectAbbreviation(lname);
      if (subAbbr) {
        subjectCode = subAbbr;
        subjectFullName = lname;
      } else {
        otherTags.push(lname);
      }
    }
  }

  // Scan title/series/session if list didn't specify course
  const textToScan = `${pv.title || ''} ${pv.series || ''} ${pv.session_name || ''}`;
  if (!levelCode) {
    if (/cfa\s*(?:level\s*)?1/i.test(textToScan) || /cfa\s*l1/i.test(textToScan)) {
      isCFA = true;
      levelCode = '1';
      courseFullName = 'CFA Level 1';
    } else if (/cfa\s*(?:level\s*)?2/i.test(textToScan) || /cfa\s*l2/i.test(textToScan)) {
      isCFA = true;
      levelCode = '2';
      courseFullName = 'CFA Level 2';
    } else if (/cfa\s*(?:level\s*)?3/i.test(textToScan) || /cfa\s*l3/i.test(textToScan)) {
      isCFA = true;
      levelCode = '3';
      courseFullName = 'CFA Level 3';
    } else if (/frm\s*(?:part\s*)?1/i.test(textToScan) || /frm\s*(?:part\s*)?i\b/i.test(textToScan) || /frm\s*p1/i.test(textToScan)) {
      isFRM = true;
      levelCode = '1';
      courseFullName = 'FRM Part 1';
    } else if (/frm\s*(?:part\s*)?2/i.test(textToScan) || /frm\s*(?:part\s*)?ii\b/i.test(textToScan) || /frm\s*p2/i.test(textToScan)) {
      isFRM = true;
      levelCode = '2';
      courseFullName = 'FRM Part 2';
    } else if (/\bcfa\b/i.test(textToScan)) {
      isCFA = true;
      if (!courseFullName) courseFullName = 'CFA Program';
    } else if (/\bfrm\b/i.test(textToScan)) {
      isFRM = true;
      if (!courseFullName) courseFullName = 'FRM Program';
    }
  }

  // Scan subject from title if not detected
  if (!subjectCode) {
    for (const [key, abbr] of Object.entries(SUBJECT_ABBR_MAP)) {
      if (textToScan.toLowerCase().includes(key)) {
        subjectCode = abbr;
        subjectFullName = key.toUpperCase();
        break;
      }
    }
  }

  return { isCFA, isFRM, levelCode, courseFullName, subjectCode, subjectFullName, otherTags };
}

export default function FullVideoListView({
  plannedVideos = [],
  sessions = [],
  lists = [],
  onRefresh,
  onEditVideo,
  onOpenPlanVideo,
  onOpenLinkModal,
  onOpenBulkImport,
  onSelectItem,
  selectedItem
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
        const track = getVideoTrackInfo(pv);
        const inTrack = (track.levelCode || '').toLowerCase().includes(q) ||
                        (track.subjectCode || '').toLowerCase().includes(q) ||
                        (track.courseFullName || '').toLowerCase().includes(q) ||
                        (track.subjectFullName || '').toLowerCase().includes(q);
        if (!inTitle && !inNotes && !inHook && !inSeries && !inLinked && !inTrack) return false;
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
      const idsToDelete = Array.from(selectedIds);
      const res = await fetch('/api/planner/videos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: idsToDelete
        })
      });

      if (res.ok) {
        idsToDelete.forEach(id => removeLocalPlannedVideo(id));
        setBulkActionMsg(`Successfully deleted ${idsToDelete.length} planned videos.`);
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

  const handleDeleteSingle = async (pv) => {
    const videoTitle = pv.title || 'this planned video';
    if (!window.confirm(`Are you sure you want to permanently delete "${videoTitle}"?`)) return;
    try {
      const res = await fetch(`/api/planner/videos/${pv.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        removeLocalPlannedVideo(pv.id);
        setBulkActionMsg(`Successfully deleted "${videoTitle}".`);
        setTimeout(() => setBulkActionMsg(null), 3500);
        if (selectedIds.has(pv.id)) {
          const next = new Set(selectedIds);
          next.delete(pv.id);
          setSelectedIds(next);
        }
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete planned video: ${err.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error("Delete single video error:", err);
      alert("Failed to delete planned video: " + err.message);
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
    <div className="full-video-list-container" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* ------------------------------------------------------------- */}
      {/* Controls & Filter Bar                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="content-card full-video-filter-card" style={{ marginBottom: '1rem', padding: '0.85rem 1rem', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0
        }}>
          {/* Format Segmented Switcher + Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: '1 1 280px', maxWidth: '100%', minWidth: 0 }}>
            {/* Segmented Format Switcher (Lectures Default!) */}
            <div style={{
              display: 'inline-flex',
              background: '#E6EAF0',
              padding: '3px',
              borderRadius: '9999px',
              boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.5), inset -2px -2px 4px rgba(255, 255, 255, 0.8)',
              maxWidth: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none'
            }}>
              <button
                type="button"
                onClick={() => { setFilterType('video'); setCurrentPage(1); }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: filterType === 'video' ? 700 : 500,
                  background: filterType === 'video' ? '#F0F3F7' : 'transparent',
                  color: filterType === 'video' ? '#2F65F6' : '#64748B',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: filterType === 'video' ? '2px 2px 5px rgba(166, 175, 195, 0.4), -2px -2px 5px rgba(255, 255, 255, 0.8)' : 'none',
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
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: filterType === 'short' ? 700 : 500,
                  background: filterType === 'short' ? '#F0F3F7' : 'transparent',
                  color: filterType === 'short' ? '#EA580C' : '#64748B',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: filterType === 'short' ? '2px 2px 5px rgba(166, 175, 195, 0.4), -2px -2px 5px rgba(255, 255, 255, 0.8)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Zap size={13} fill={filterType === 'short' ? '#EA580C' : 'none'} />
                <span>Shorts ({stats.shortsTotal})</span>
              </button>

              <button
                type="button"
                onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: filterType === 'ALL' ? 700 : 500,
                  background: filterType === 'ALL' ? '#F0F3F7' : 'transparent',
                  color: filterType === 'ALL' ? '#1E293B' : '#64748B',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: filterType === 'ALL' ? '2px 2px 5px rgba(166, 175, 195, 0.4), -2px -2px 5px rgba(255, 255, 255, 0.8)' : 'none',
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
              background: '#E6EAF0',
              borderRadius: '9999px',
              padding: '0.4rem 0.95rem',
              minWidth: '120px',
              maxWidth: '100%',
              flex: '1 1 160px',
              boxSizing: 'border-box',
              boxShadow: 'inset 2px 2px 4px rgba(166, 175, 195, 0.5), inset -2px -2px 4px rgba(255, 255, 255, 0.8)'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', maxWidth: '100%', minWidth: 0, flex: '1 1 300px' }}>
            {/* Content Type Filter */}
            <select
              className="control-select"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: '0.78rem', minWidth: 0, maxWidth: '100%', flex: '1 1 120px' }}
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
              style={{ fontSize: '0.78rem', minWidth: 0, maxWidth: '100%', flex: '1 1 115px' }}
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
              style={{ fontSize: '0.78rem', minWidth: 0, maxWidth: '100%', flex: '1 1 130px' }}
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
              style={{ fontSize: '0.78rem', minWidth: 0, maxWidth: '100%', flex: '1 1 135px' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
              <button
                className="btn-ghost"
                onClick={onOpenBulkImport}
                style={{ border: '1px solid var(--border-subtle)', fontSize: '0.78rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
                title="Bulk import planned videos from text"
              >
                <UploadCloud size={13} />
                <span>Bulk Import</span>
              </button>

              <button
                className="btn-primary"
                onClick={onOpenPlanVideo}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={13} />
                <span>Plan Video</span>
              </button>
            </div>
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
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
      <div className="content-card" style={{ padding: 0, overflow: 'hidden', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', position: 'relative' }}>
        <div className="table-responsive" style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: 'none', boxShadow: 'none', borderRadius: 0, margin: 0 }}>
          <table className="analytics-table" style={{ margin: 0, minWidth: '780px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '38px', textAlign: 'center', padding: '0.5rem 0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={isAllCurrentSelected}
                    onChange={handleSelectAllCurrent}
                    title="Select / Deselect all on this page"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ width: '36px', textAlign: 'center', padding: '0.5rem 0.35rem' }} title="Urgent Priority">
                  <Flame size={13} color="#EA580C" />
                </th>
                <th style={{ minWidth: '260px', padding: '0.5rem 0.65rem' }}>Video Topic & Content</th>
                <th style={{ width: '135px', padding: '0.5rem 0.65rem', whiteSpace: 'nowrap' }}>Track & Subject</th>
                <th style={{ width: '100px', padding: '0.5rem 0.65rem', whiteSpace: 'nowrap' }}>Exam Window</th>
                <th style={{ width: '130px', padding: '0.5rem 0.65rem', whiteSpace: 'nowrap' }}>Status & Week</th>
                <th style={{ minWidth: '200px', padding: '0.5rem 0.65rem' }}>Linked YouTube Video</th>
                <th style={{ width: '65px', textAlign: 'center', padding: '0.5rem 0.35rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No planned videos found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedVideos.map(pv => {
                  const isSelected = selectedIds.has(pv.id);
                  const isShort = pv.content_type === 'short';
                  const isLinked = !!pv.linked_video_id;
                  const isRowActive = selectedItem?.id === pv.id;
                  const track = getVideoTrackInfo(pv);

                  return (
                    <tr
                      key={pv.id}
                      onClick={(e) => {
                        if (e.target.closest('button, input, select, a')) return;
                        onSelectItem && onSelectItem({ ...pv, item_type: isShort ? 'Planned Short' : 'Planned Video' });
                      }}
                      style={{
                        cursor: 'pointer',
                        background: isRowActive 
                          ? (track.isCFA ? 'rgba(22, 163, 74, 0.08)' : track.isFRM ? 'rgba(37, 99, 235, 0.08)' : 'rgba(47, 101, 246, 0.08)')
                          : (isSelected ? 'rgba(232, 163, 61, 0.08)' : 'inherit'),
                        borderLeft: isRowActive 
                          ? (track.isCFA ? '4px solid #16A34A' : track.isFRM ? '4px solid #2563EB' : '4px solid #2F65F6')
                          : (track.isCFA ? '3px solid rgba(22, 163, 74, 0.5)' : track.isFRM ? '3px solid rgba(37, 99, 235, 0.5)' : '3px solid transparent'),
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* 1. Selection Checkbox */}
                      <td style={{ textAlign: 'center', padding: '0.45rem 0.35rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(pv.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* 1.5 Urgent Button (Fix 2) */}
                      <td style={{ textAlign: 'center', padding: '0.45rem 0.35rem' }}>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newUrgent = pv.is_urgent ? 0 : 1;
                            try {
                              await fetch(`/api/planner/videos/${pv.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ is_urgent: newUrgent })
                              });
                              onRefresh && onRefresh();
                            } catch (err) {
                              console.error('Failed to toggle urgent:', err);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: pv.is_urgent ? '#EA580C' : '#94A3B8',
                            transition: 'all 0.15s ease'
                          }}
                          title={pv.is_urgent ? "Urgent Priority (Click to unmark)" : "Mark as Urgent"}
                        >
                          <Flame size={14} fill={pv.is_urgent ? "#EA580C" : "none"} color={pv.is_urgent ? "#EA580C" : "#94A3B8"} />
                        </button>
                      </td>

                      {/* 2. Video Title & Meta */}
                      <td style={{ padding: '0.45rem 0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                          {isShort ? (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(232, 163, 61, 0.2)',
                              color: '#EA580C',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              flexShrink: 0
                            }}>
                              <Zap size={9} fill="#EA580C" /> Short
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'var(--bg-surface-elevated)',
                              color: 'var(--text-muted)',
                              fontWeight: 600,
                              flexShrink: 0
                            }}>
                              Lec
                            </span>
                          )}

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              title={pv.title}
                              style={{
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '340px'
                              }}
                            >
                              {pv.title}
                            </div>

                            {/* Short Hook or Series or Notes inline preview */}
                            {(pv.notes || pv.hook || pv.series) && (
                              <div
                                title={pv.notes || pv.hook || pv.series}
                                style={{
                                  fontSize: '0.7rem',
                                  color: 'var(--text-muted)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '340px',
                                  marginTop: '1px'
                                }}
                              >
                                {pv.series && <span style={{ color: 'var(--cfa-gold)', fontWeight: 600 }}>{pv.series} · </span>}
                                {pv.hook && <span style={{ fontStyle: 'italic' }}>"{pv.hook}" </span>}
                                {pv.notes && <span>📝 {pv.notes}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Track & Subject (Fix 2: Color indicates CFA green / FRM blue, so level is just 1/2/3 without 'CFA'/'FRM' tag) */}
                      <td style={{ padding: '0.45rem 0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                          {track.levelCode && (
                            <span
                              title={track.courseFullName || (track.isCFA ? `CFA Level ${track.levelCode}` : `FRM Part ${track.levelCode}`)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '18px',
                                padding: '1.5px 5px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                background: track.isCFA ? '#DCFCE7' : (track.isFRM ? '#DBEAFE' : '#F1F5F9'),
                                color: track.isCFA ? '#15803D' : (track.isFRM ? '#1D4ED8' : '#475569'),
                                border: `1px solid ${track.isCFA ? '#86EFAC' : (track.isFRM ? '#93C5FD' : '#CBD5E1')}`
                              }}
                            >
                              {track.levelCode}
                            </span>
                          )}

                          {track.subjectCode && (
                            <span
                              title={track.subjectFullName || track.subjectCode}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '1.5px 5.5px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                background: track.isCFA ? '#F0FDF4' : (track.isFRM ? '#EFF6FF' : '#F8FAFC'),
                                color: track.isCFA ? '#166534' : (track.isFRM ? '#1E40AF' : '#64748B'),
                                border: `1px solid ${track.isCFA ? '#BBF7D0' : (track.isFRM ? '#BFDBFE' : '#E2E8F0')}`
                              }}
                            >
                              {track.subjectCode}
                            </span>
                          )}

                          {!track.levelCode && !track.subjectCode && (
                            track.otherTags.length > 0 ? (
                              <span
                                title={track.otherTags.join(', ')}
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '1.5px 5px',
                                  borderRadius: '4px',
                                  background: '#F1F5F9',
                                  color: '#64748B',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {track.otherTags[0].slice(0, 6)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                            )
                          )}
                        </div>
                      </td>

                      {/* 4. Exam Window */}
                      <td style={{ padding: '0.45rem 0.65rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: pv.session_name ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}>
                          {pv.session_name ? pv.session_name.replace(/CFA\s*Level\s*\d|FRM\s*Part\s*\d/gi, '').trim() || pv.session_name : 'Evergreen'}
                        </span>
                      </td>

                      {/* 5. Status & Week */}
                      <td style={{ padding: '0.45rem 0.65rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <select
                            value={pv.status}
                            onChange={(e) => handleInlineStatusChange(pv.id, e.target.value)}
                            style={{
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: pv.status === 'Uploaded' ? 'var(--success-emerald)' : (pv.status === 'Scheduled' ? 'var(--cfa-gold)' : 'var(--text-primary)'),
                              borderRadius: 'var(--radius-sm)',
                              padding: '2px 5px',
                              fontSize: '0.72rem',
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

                          {pv.assigned_week && (
                            <span style={{
                              fontSize: '0.67rem',
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'var(--bg-surface-elevated)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-hairline)'
                            }}>
                              W{pv.assigned_week.replace(/^.*W(\d+)$/i, '$1')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Linked YouTube Video (Manual Link UI) */}
                      <td style={{ padding: '0.45rem 0.65rem' }}>
                        {isLinked ? (
                          <div style={{
                            background: 'rgba(16, 185, 129, 0.06)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.25rem 0.45rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.4rem'
                          }}>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{
                                  fontSize: '0.62rem',
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
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                              <div style={{
                                fontSize: '0.73rem',
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '160px'
                              }} title={pv.linked_video_title || pv.linked_video_id}>
                                {pv.linked_video_title || pv.linked_video_id}
                              </div>
                              {pv.linked_video_views !== undefined && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {(pv.linked_video_views || 0).toLocaleString()} views
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onOpenLinkModal(pv)}
                              className="btn-ghost"
                              style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', color: 'var(--cfa-gold)' }}
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
                              padding: '0.25rem 0.5rem',
                              color: 'var(--cfa-gold)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                            title="Manually link to published YouTube video using link or ID"
                          >
                            <Link2 size={11} />
                            <span>+ Link YT</span>
                          </button>
                        )}
                      </td>

                      {/* 7. Row Actions */}
                      <td style={{ textAlign: 'center', padding: '0.45rem 0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => onEditVideo(pv)}
                            style={{ padding: '0.2rem' }}
                            title="Edit planned video"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleDeleteSingle(pv)}
                            style={{ padding: '0.2rem', color: '#EF4444' }}
                            title="Delete planned video"
                          >
                            <Trash2 size={13} />
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
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.6rem'
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
