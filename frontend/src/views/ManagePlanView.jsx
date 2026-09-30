import React, { useState, useEffect, useMemo } from 'react';
import {
  SlidersHorizontal, Plus, Target, Check, AlertTriangle, X,
  List, Calendar, BookOpen, UploadCloud, Edit3, Trash2, Search,
  Link2, CheckCircle2, ChevronDown, FileSpreadsheet
} from 'lucide-react';
import CreateSessionModal from '../components/CreateSessionModal';
import CourseModal from '../components/CourseModal';
import SubjectModal from '../components/SubjectModal';
import PlannedVideoModal from '../components/PlannedVideoModal';
import BulkImportModal from '../components/BulkImportModal';
import TargetManagementModal from '../components/TargetManagementModal';
import LinkYouTubeModal from '../components/LinkYouTubeModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { getLocalPlannedVideos, mergePlannedVideos, syncLocalVideosToServer, saveLocalPlannedVideo } from '../utils/plannerStorage';

function PlannerStatusIcon({ status, color, size = 14 }) {
  if (status === 'TARGET_MET' || status === 'ON_TRACK') {
    return <Check size={size} style={{ color: color || '#3EA65E', strokeWidth: 2.5, flexShrink: 0 }} />;
  }
  if (status === 'AT_RISK') {
    return <AlertTriangle size={size} style={{ color: color || '#E8A33D', strokeWidth: 2.2, flexShrink: 0 }} />;
  }
  if (status === 'CRITICAL' || status === 'OVERDUE') {
    return (
      <span
        style={{
          width: `${Math.max(6, size - 5)}px`,
          height: `${Math.max(6, size - 5)}px`,
          borderRadius: '50%',
          backgroundColor: color || '#FF0000',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: `${Math.max(6, size - 5)}px`,
        height: `${Math.max(6, size - 5)}px`,
        borderRadius: '50%',
        border: `1.5px solid ${color || '#5A5A5A'}`,
        display: 'inline-block',
        flexShrink: 0
      }}
    />
  );
}

function getStatusColor(pacing) {
  if (!pacing) return '#5A5A5A';
  if (pacing.color) return pacing.color;
  switch (pacing.status) {
    case 'TARGET_MET':
    case 'ON_TRACK':
      return '#3EA65E';
    case 'AT_RISK':
      return '#E8A33D';
    case 'CRITICAL':
    case 'OVERDUE':
      return '#FF0000';
    case 'NO_TARGET':
    default:
      return '#5A5A5A';
  }
}

export default function ManagePlanView({ onSelectItem, selectedItem }) {
  const [manageSubTab, setManageSubTab] = useState('backlog'); // 'backlog' | 'windows' | 'curriculum'
  const [overview, setOverview] = useState(null);
  const [structure, setStructure] = useState({ courses: [], sessions: [] });
  const [allLists, setAllLists] = useState([]);
  const [allPlannedVideos, setAllPlannedVideos] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Backlog
  const [filterList, setFilterList] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showPlannedModal, setShowPlannedModal] = useState(false);
  const [editingPlannedVideo, setEditingPlannedVideo] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [linkingVideo, setLinkingVideo] = useState(null);

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectParentCourseId, setSubjectParentCourseId] = useState(null);

  useEffect(() => {
    fetchManageData();
  }, []);

  useEffect(() => {
    const handlePlannerEvent = (e) => {
      const deletedId = e?.detail?.videoId;
      if (e?.detail?.action === 'delete' && deletedId) {
        setAllPlannedVideos(prev => prev.filter(v => v.id !== deletedId));
      } else {
        const localVideos = getLocalPlannedVideos();
        setAllPlannedVideos(prev => mergePlannedVideos(prev, localVideos));
      }
    };
    window.addEventListener('falcon_planner_updated', handlePlannerEvent);
    return () => window.removeEventListener('falcon_planner_updated', handlePlannerEvent);
  }, []);

  const fetchManageData = async () => {
    setLoading(true);
    try {
      const [ovRes, listsRes, qRes, structRes, pvsRes] = await Promise.all([
        fetch('/api/planner/overview'),
        fetch('/api/lists'),
        fetch('/api/planner/review-queue'),
        fetch('/api/planner/structure'),
        fetch('/api/planner/videos')
      ]);

      const ovJson = await ovRes.json();
      const listsJson = await listsRes.json();
      const qJson = await qRes.json();
      const structJson = await structRes.json();
      const pvsJson = await pvsRes.json();

      setOverview(ovJson);
      setAllLists(listsJson.all_lists || []);
      setReviewQueue(qJson);
      setStructure(structJson || { courses: [], sessions: [] });

      const localVideos = getLocalPlannedVideos();
      const mergedPvs = mergePlannedVideos(pvsJson || [], localVideos);
      setAllPlannedVideos(mergedPvs);

      // Background sync missing to server
      syncLocalVideosToServer(pvsJson || []);
    } catch (err) {
      console.error('Failed to load manage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => {
    fetchManageData();
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`Delete the course "${courseName}" and all its linked subjects?`)) return;
    try {
      const res = await fetch(`/api/planner/courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Delete the subject "${subjectName}"?`)) return;
    try {
      const res = await fetch(`/api/planner/subjects/${subjectId}`, { method: 'DELETE' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  const handleDeleteSession = async (sessId, sessName) => {
    if (!window.confirm(`Delete the exam window "${sessName}"?`)) return;
    try {
      const res = await fetch(`/api/planner/sessions/${sessId}`, { method: 'DELETE' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleDeletePlannedVideo = async (videoId) => {
    if (!window.confirm('Delete this planned video?')) return;
    try {
      const res = await fetch(`/api/planner/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error('Failed to delete planned video:', err);
    }
  };

  const handleConfirmReviewMatch = async (queueId) => {
    try {
      const res = await fetch(`/api/planner/review-queue/${queueId}/confirm`, { method: 'POST' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error('Failed to confirm match:', err);
    }
  };

  const handleRejectReviewMatch = async (queueId) => {
    try {
      const res = await fetch(`/api/planner/review-queue/${queueId}/reject`, { method: 'POST' });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error('Failed to reject match:', err);
    }
  };

  const handleOpenLinkDifferent = (item) => {
    setLinkingVideo({
      id: item.planned_video_id,
      title: item.planned_title,
      course_id: item.course_id,
      course_name: item.course_name,
      session_name: item.session_name,
      assigned_week: item.assigned_week
    });
  };

  const displayPlannedVideos = useMemo(() => {
    return allPlannedVideos.filter(pv => {
      if (filterList !== 'ALL' && pv.course_id !== filterList) return false;
      if (filterStatus !== 'ALL' && pv.status !== filterStatus) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (pv.title || '').toLowerCase().includes(q) ||
               (pv.topic || '').toLowerCase().includes(q) ||
               (pv.course_name || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [allPlannedVideos, filterList, filterStatus, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'rgba(124, 58, 237, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7C3AED'
          }}>
            <SlidersHorizontal size={17} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
            Manage Plan & Curriculum
          </h1>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowTargetModal(true)}
            id="btn-target-management-manage"
            title="Set and reconcile total, program, course, and subject targets"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 500,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              borderRadius: '9999px',
              cursor: 'pointer'
            }}
          >
            <Target size={14} style={{ color: '#64748B' }} />
            <span>Targets</span>
          </button>
        </div>
      </div>

      {/* Review Queue Banner if pending */}
      {reviewQueue.length > 0 && (
        <div style={{
          background: 'rgba(232, 163, 61, 0.08)',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          border: '1px solid rgba(232, 163, 61, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#D97706' }}>
              <AlertTriangle size={16} />
              <span>Match review queue ({reviewQueue.length} uncertain {reviewQueue.length === 1 ? 'match' : 'matches'})</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {reviewQueue.map(item => (
              <div
                key={item.queue_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FFFFFF',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ color: '#64748B', fontSize: '0.7rem' }}>Planned:</div>
                  <div style={{ fontWeight: 600, color: '#1E293B' }}>{item.planned_title}</div>
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ color: '#64748B', fontSize: '0.7rem' }}>Matched Upload ({Math.round(item.confidence * 100)}%):</div>
                  <div style={{ color: '#475569' }}>{item.video_title}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                  <button
                    className="btn-primary"
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#3EA65E', borderColor: '#3EA65E', borderRadius: '6px' }}
                    onClick={() => handleConfirmReviewMatch(item.queue_id)}
                  >
                    <Check size={12} /> Confirm
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                    onClick={() => handleOpenLinkDifferent(item)}
                  >
                    <Link2 size={12} /> Relink
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleRejectReviewMatch(item.queue_id)}
                    title="Reject match"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Navigation for Manage Plan */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#EBEEF2',
        padding: '8px 12px',
        borderRadius: '16px',
        border: '1px solid rgba(166, 175, 195, 0.35)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#E2E7EE',
          padding: '3px',
          borderRadius: '9999px',
          boxShadow: 'inset 1.5px 1.5px 3px rgba(166, 175, 195, 0.45), inset -1.5px -1.5px 3px rgba(255, 255, 255, 0.85)',
          gap: '3px'
        }}>
          <button 
            type="button"
            onClick={() => setManageSubTab('backlog')}
            id="subtab-video-backlog"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: manageSubTab === 'backlog' ? 700 : 500,
              borderRadius: '9999px',
              border: 'none',
              background: manageSubTab === 'backlog' ? '#7C3AED' : 'transparent',
              color: manageSubTab === 'backlog' ? '#FFFFFF' : '#64748B',
              boxShadow: manageSubTab === 'backlog' ? '0 2px 6px rgba(124, 58, 237, 0.35)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <List size={13} />
            <span>Video Backlog</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              background: manageSubTab === 'backlog' ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1',
              color: manageSubTab === 'backlog' ? '#FFFFFF' : '#475569'
            }}>
              {displayPlannedVideos.length}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => setManageSubTab('windows')}
            id="subtab-exam-windows"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: manageSubTab === 'windows' ? 700 : 500,
              borderRadius: '9999px',
              border: 'none',
              background: manageSubTab === 'windows' ? '#7C3AED' : 'transparent',
              color: manageSubTab === 'windows' ? '#FFFFFF' : '#64748B',
              boxShadow: manageSubTab === 'windows' ? '0 2px 6px rgba(124, 58, 237, 0.35)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Calendar size={13} />
            <span>Exam Windows</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              background: manageSubTab === 'windows' ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1',
              color: manageSubTab === 'windows' ? '#FFFFFF' : '#475569'
            }}>
              {(structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])).length}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => setManageSubTab('curriculum')}
            id="subtab-courses-subjects"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: manageSubTab === 'curriculum' ? 700 : 500,
              borderRadius: '9999px',
              border: 'none',
              background: manageSubTab === 'curriculum' ? '#7C3AED' : 'transparent',
              color: manageSubTab === 'curriculum' ? '#FFFFFF' : '#64748B',
              boxShadow: manageSubTab === 'curriculum' ? '0 2px 6px rgba(124, 58, 237, 0.35)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={13} />
            <span>Courses & Subjects</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              background: manageSubTab === 'curriculum' ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1',
              color: manageSubTab === 'curriculum' ? '#FFFFFF' : '#475569'
            }}>
              {structure.courses?.length || 0}
            </span>
          </button>
        </div>

        {/* Contextual Action Buttons */}
        <div>
          {manageSubTab === 'backlog' && (
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowBulkImport(true)}
                id="btn-bulk-import-manage"
                style={{
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <UploadCloud size={13} />
                <span>Bulk import</span>
              </button>
              <button
                onClick={() => {
                  setEditingPlannedVideo(null);
                  setShowPlannedModal(true);
                }}
                id="btn-add-planned-video-manage"
                style={{
                  background: '#7C3AED',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>Plan video</span>
              </button>
            </div>
          )}

          {manageSubTab === 'windows' && (
            <button
              onClick={() => { setEditingSession(null); setShowCreateSession(true); }}
              id="btn-create-session"
              style={{
                background: '#7C3AED',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: '9999px',
                boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              <span>New Exam Window</span>
            </button>
          )}

          {manageSubTab === 'curriculum' && (
            <button
              onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
              id="btn-create-course"
              style={{
                background: '#7C3AED',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: '9999px',
                boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              <span>New Course</span>
            </button>
          )}
        </div>
      </div>

      {/* SubTab 1: Video Backlog */}
      {manageSubTab === 'backlog' && (
        <div className="content-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <List size={16} color="#7C3AED" />
              <span>Planned Video Backlog</span>
            </h2>

            {/* Filter controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', borderRadius: '8px', padding: '0.35rem 0.7rem', border: '1px solid #E2E8F0' }}>
                <Search size={13} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Filter backlog..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.78rem', width: '130px' }}
                />
              </div>

              <select
                value={filterList}
                onChange={(e) => setFilterList(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.78rem', color: '#334155' }}
              >
                <option value="ALL">All Courses</option>
                {allLists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.78rem', color: '#334155' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Uploaded">Uploaded</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="analytics-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '240px' }}>Title & Topic</th>
                  <th style={{ width: '130px' }}>Course</th>
                  <th style={{ width: '110px' }}>Assigned</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '130px' }}>Linked YouTube</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayPlannedVideos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                      No videos found in backlog matching filters.
                    </td>
                  </tr>
                ) : (
                  displayPlannedVideos.map(pv => (
                    <tr
                      key={pv.id}
                      onClick={() => onSelectItem && onSelectItem(pv)}
                      style={{ cursor: 'pointer', background: selectedItem?.id === pv.id ? 'rgba(124, 58, 237, 0.08)' : 'inherit' }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.82rem' }}>{pv.title}</div>
                        {pv.topic && <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{pv.topic}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                          {pv.course_name || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {pv.assigned_week || pv.session_name || 'Backlog'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '1.5px 6px',
                          borderRadius: '4px',
                          background: pv.status === 'Uploaded' ? 'rgba(62, 166, 94, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                          color: pv.status === 'Uploaded' ? '#2E7D32' : '#475569'
                        }}>
                          {pv.status}
                        </span>
                      </td>
                      <td>
                        {pv.linked_video_id ? (
                          <span style={{ fontSize: '0.74rem', color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} /> Linked
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLinkingVideo(pv);
                            }}
                            style={{ fontSize: '0.72rem', padding: '2px 6px', color: '#7C3AED' }}
                          >
                            + Link
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              setEditingPlannedVideo(pv);
                              setShowPlannedModal(true);
                            }}
                            style={{ padding: '3px', color: '#64748B' }}
                            title="Edit planned video"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleDeletePlannedVideo(pv.id)}
                            style={{ padding: '3px', color: '#DC2626' }}
                            title="Delete planned video"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 2: Exam Windows */}
      {manageSubTab === 'windows' && (
        <div className="content-card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#7C3AED" />
            <span>Exam Windows ({(structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])).length})</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {(structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])).map((sess) => {
              const pacing = sess.pacing || {};
              const statusColor = getStatusColor(pacing);
              const targetCount = sess.total_target || sess.target || 0;
              const uploadedCount = sess.uploaded || 0;
              const completionPct = targetCount > 0 ? Math.round((uploadedCount / targetCount) * 100) : 0;

              return (
                <div
                  key={sess.id}
                  className="overview-block-card"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(166, 175, 195, 0.4)',
                    padding: '1.1rem',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                        {sess.name}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                        {sess.start_date} → {sess.end_date}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '3px', color: '#64748B' }}
                        onClick={() => {
                          setEditingSession(sess);
                          setShowCreateSession(true);
                        }}
                        title="Edit window"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '3px', color: '#DC2626' }}
                        onClick={() => handleDeleteSession(sess.id, sess.name)}
                        title="Delete window"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: statusColor, lineHeight: 1 }}>
                      {uploadedCount}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      / {targetCount > 0 ? targetCount : '—'} target
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', marginLeft: 'auto' }}>
                      {targetCount > 0 ? `${completionPct}%` : 'No target'}
                    </span>
                  </div>

                  {/* Targeted Courses */}
                  {sess.course_targets && sess.course_targets.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                      {sess.course_targets.map(ct => (
                        <span
                          key={ct.course_id}
                          style={{
                            fontSize: '0.7rem',
                            padding: '1.5px 6px',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            color: '#334155',
                            fontWeight: 500
                          }}
                        >
                          {ct.course_name}: <strong>{ct.target_count}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 3: Courses & Subjects Curriculum Grid */}
      {manageSubTab === 'curriculum' && (
        <div className="content-card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} color="#3B82F6" />
            <span>Courses & Subjects ({structure.courses?.length || 0})</span>
          </h2>

          {structure.courses.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '2.5rem' }}>
              No courses configured. Click "New Course" above to add your first course.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {structure.courses.map((course) => (
                <div
                  key={course.id}
                  className="overview-block-card"
                  style={{
                    background: '#FFFFFF',
                    padding: '1.1rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(166, 175, 195, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                          {course.name}
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          ({course.subjects?.length || 0} subjects · {course.planned_count || 0} videos)
                        </span>
                      </div>
                      {course.description && (
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                          {course.description}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: '0.72rem', padding: '2px 8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '3px' }}
                        onClick={() => {
                          setSubjectParentCourseId(course.id);
                          setEditingSubject(null);
                          setShowSubjectModal(true);
                        }}
                      >
                        <Plus size={11} />
                        <span>Add Subject</span>
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '3px', color: '#64748B' }}
                        onClick={() => {
                          setEditingCourse(course);
                          setShowCourseModal(true);
                        }}
                        title="Edit course"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '3px', color: '#DC2626' }}
                        onClick={() => handleDeleteCourse(course.id, course.name)}
                        title="Delete course"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Linked Subjects Chips List */}
                  {course.subjects && course.subjects.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                      {course.subjects.map(sub => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            fontSize: '0.75rem',
                            color: '#334155'
                          }}
                        >
                          <span>{sub.name}</span>
                          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>({sub.planned_count || 0})</span>
                          <button
                            className="btn-ghost"
                            style={{ padding: '1px', color: '#64748B', marginLeft: '2px' }}
                            onClick={() => {
                              setSubjectParentCourseId(course.id);
                              setEditingSubject(sub);
                              setShowSubjectModal(true);
                            }}
                            title="Edit subject"
                          >
                            <Edit3 size={10} />
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ padding: '1px', color: '#DC2626' }}
                            onClick={() => handleDeleteSubject(sub.id, sub.name)}
                            title="Delete subject"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateSession && (
        <CreateSessionModal
          initialData={editingSession}
          courses={structure.courses}
          onClose={() => { setShowCreateSession(false); setEditingSession(null); }}
          onSuccess={() => {
            setShowCreateSession(false);
            setEditingSession(null);
            refreshAll();
          }}
          onDelete={async (sessId) => {
            await handleDeleteSession(sessId, editingSession?.name || 'window');
            setShowCreateSession(false);
            setEditingSession(null);
          }}
        />
      )}

      {showCourseModal && (
        <CourseModal
          course={editingCourse}
          onClose={() => { setShowCourseModal(false); setEditingCourse(null); }}
          onSuccess={() => {
            setShowCourseModal(false);
            setEditingCourse(null);
            refreshAll();
          }}
        />
      )}

      {showSubjectModal && (
        <SubjectModal
          subject={editingSubject}
          parentCourseId={subjectParentCourseId}
          courses={structure.courses}
          onClose={() => {
            setShowSubjectModal(false);
            setEditingSubject(null);
            setSubjectParentCourseId(null);
          }}
          onSuccess={() => {
            setShowSubjectModal(false);
            setEditingSubject(null);
            setSubjectParentCourseId(null);
            refreshAll();
          }}
        />
      )}

      {showPlannedModal && (
        <PlannedVideoModal
          initialData={editingPlannedVideo}
          editingVideo={editingPlannedVideo}
          availableLists={allLists.length > 0 ? allLists : structure.courses}
          courses={structure.courses?.length > 0 ? structure.courses : allLists}
          availableSessions={structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])}
          sessions={structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])}
          defaultSessionId={structure.sessions?.[0]?.id || null}
          activeSessionId={structure.sessions?.[0]?.id || null}
          onClose={() => { setShowPlannedModal(false); setEditingPlannedVideo(null); }}
          onSuccess={(savedVideo) => {
            setShowPlannedModal(false);
            setEditingPlannedVideo(null);
            if (savedVideo) {
              setAllPlannedVideos(prev => [savedVideo, ...prev.filter(p => p.id !== savedVideo.id)]);
            }
            refreshAll();
          }}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          courses={structure.courses?.length > 0 ? structure.courses : allLists}
          sessions={structure.sessions?.length > 0 ? structure.sessions : (overview?.sessions || [])}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false);
            refreshAll();
          }}
        />
      )}

      {showTargetModal && (
        <TargetManagementModal
          sessionId={structure.sessions?.[0]?.id || 'sess_cfa_l1_nov26'}
          sessionName={structure.sessions?.[0]?.name || 'Active Session'}
          onClose={() => setShowTargetModal(false)}
          onSuccess={() => {
            setShowTargetModal(false);
            refreshAll();
          }}
        />
      )}

      {linkingVideo && (
        <LinkYouTubeModal
          plannedVideo={linkingVideo}
          onClose={() => setLinkingVideo(null)}
          onSuccess={() => {
            setLinkingVideo(null);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}
