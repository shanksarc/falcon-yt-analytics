import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Plus, Target, Check, Clock, AlertTriangle,
  UploadCloud, BarChart3, ListVideo, Info, ChevronDown, FileSpreadsheet
} from 'lucide-react';
import PlannedVideoModal from '../components/PlannedVideoModal';
import BulkImportModal from '../components/BulkImportModal';
import TargetManagementModal from '../components/TargetManagementModal';
import WeeklyScheduleBoard from '../components/WeeklyScheduleBoard';
import ProgressSection from '../components/ProgressSection';
import FullVideoListView from '../components/FullVideoListView';
import LinkYouTubeModal from '../components/LinkYouTubeModal';
import ErrorBoundary from '../components/ErrorBoundary';
import ForecastSpeedometerCard from '../components/ForecastSpeedometerCard';
import SegmentedLedProgress from '../components/SegmentedLedProgress';
import { getLocalPlannedVideos, mergePlannedVideos, syncLocalVideosToServer, saveLocalPlannedVideo } from '../utils/plannerStorage';

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

export default function UploadPlannerView({ onSelectItem, selectedItem }) {
  const [overview, setOverview] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [allLists, setAllLists] = useState([]);
  const [allPlannedVideos, setAllPlannedVideos] = useState([]);
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Modals
  const [showPlannedModal, setShowPlannedModal] = useState(false);
  const [editingPlannedVideo, setEditingPlannedVideo] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [linkingVideo, setLinkingVideo] = useState(null);

  // Active view tab: progress (default) | videos | schedule
  const [activeViewTab, setActiveViewTab] = useState('progress');

  useEffect(() => {
    try {
      localStorage.removeItem('falcon_planner_active_session');
    } catch (e) {}
    fetchInitialData();
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
      setRefreshCounter(c => c + 1);
    };
    window.addEventListener('falcon_planner_updated', handlePlannerEvent);
    return () => window.removeEventListener('falcon_planner_updated', handlePlannerEvent);
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleSelectSession = (sessId) => {
    if (sessId && sessId !== 'ALL') {
      setSelectedSessionId(sessId);
    } else {
      setSelectedSessionId(null);
    }
    try {
      localStorage.removeItem('falcon_planner_active_session');
    } catch (e) {}
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ovRes, listsRes, allPvsRes] = await Promise.all([
        fetch('/api/planner/overview'),
        fetch('/api/lists'),
        fetch('/api/planner/videos')
      ]);

      const ovJson = await ovRes.json();
      const listsJson = await listsRes.json();
      const allPvsJson = await allPvsRes.json();

      setOverview(ovJson);
      setAllLists(listsJson.all_lists || []);

      const localVideos = getLocalPlannedVideos();
      const mergedPvs = mergePlannedVideos(allPvsJson || [], localVideos);
      setAllPlannedVideos(mergedPvs);

      // Background sync missing to server for serverless persistence
      syncLocalVideosToServer(allPvsJson || []);

      // Default directly to Full Plan (null)
      setSelectedSessionId(null);
      try {
        localStorage.removeItem('falcon_planner_active_session');
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load upload planner overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetail = async (sessId) => {
    try {
      const res = await fetch(`/api/planner/sessions/${sessId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch session detail:', err);
    }
  };

  const refreshAll = () => {
    setRefreshCounter(c => c + 1);
    fetchInitialData();
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
    }
  };

  const handleTriggerAutoMatch = async () => {
    try {
      const res = await fetch('/api/youtube/sync', { method: 'POST' });
      if (res.ok) {
        refreshAll();
      }
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    }
  };

  // KPI Metrics
  const kpiStats = useMemo(() => {
    const lectureVideos = allPlannedVideos.filter(v => v.content_type !== 'short');
    const lecturesTotal = lectureVideos.length;
    const lecturesUploaded = lectureVideos.filter(v => v.status === 'Uploaded').length;
    const lecturesScheduled = lectureVideos.filter(v => v.status === 'Scheduled').length;
    const lecturesBacklog = lectureVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const lecturesPct = lecturesTotal > 0 ? Math.round((lecturesUploaded / lecturesTotal) * 100) : 0;

    const shortsVideos = allPlannedVideos.filter(v => v.content_type === 'short');
    const shortsTotal = shortsVideos.length;
    const shortsUploaded = shortsVideos.filter(v => v.status === 'Uploaded').length;
    const shortsScheduled = shortsVideos.filter(v => v.status === 'Scheduled').length;
    const shortsPct = shortsTotal > 0 ? Math.round((shortsUploaded / shortsTotal) * 100) : 0;

    const inProdCount = allPlannedVideos.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const schedCount = allPlannedVideos.filter(v => v.status === 'Scheduled').length;
    const totalBacklog = inProdCount + schedCount;

    const totalVideos = allPlannedVideos.length;
    const totalUploaded = allPlannedVideos.filter(v => v.status === 'Uploaded').length;
    const velocityPct = totalVideos > 0 ? Math.round((totalUploaded / totalVideos) * 100) : 0;
    const activeSession = overview?.sessions?.find(s => s.id === selectedSessionId) || overview?.sessions?.[0];
    const sessionName = activeSession?.name || 'Active Exam Window';

    return {
      lecturesTotal,
      lecturesUploaded,
      lecturesScheduled,
      lecturesBacklog,
      lecturesPct,
      shortsTotal,
      shortsUploaded,
      shortsScheduled,
      shortsPct,
      inProdCount,
      schedCount,
      totalBacklog,
      totalVideos,
      totalUploaded,
      velocityPct,
      sessionName
    };
  }, [allPlannedVideos, overview, selectedSessionId]);

  const activeSession = overview?.sessions?.find(s => s.id === selectedSessionId) || overview?.sessions?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* 1. Top Bar: Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>Upload Planner</h1>
          <span 
            title="Exam Seasonality: CFA (Feb · May · Aug · Nov) · FRM (May · Nov) — Prioritize revision/marathon content 30–60 days out."
            style={{ display: 'inline-flex', alignItems: 'center', color: '#94A3B8', cursor: 'help' }}
          >
            <Info size={15} />
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '9999px', padding: '2px' }}>
            <button 
              onClick={handleTriggerAutoMatch}
              id="btn-trigger-auto-match"
              title="Run title similarity matcher against channel uploads"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '0.75rem', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '9999px' }}
            >
              <UploadCloud size={13} />
              <span>Scan</span>
            </button>
            <button 
              onClick={() => setShowTargetModal(true)}
              id="btn-target-management-top"
              title="Set and reconcile total, program, course, and subject targets"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '0.75rem', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '9999px' }}
            >
              <Target size={13} />
              <span>Targets</span>
            </button>
          </div>

          {/* Primary CTA with Dropdown */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <div style={{ display: 'inline-flex', borderRadius: '9999px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(30, 86, 227, 0.3)' }}>
              <button 
                onClick={() => {
                  setEditingPlannedVideo(null);
                  setShowPlannedModal(true);
                }}
                id="btn-plan-video-top"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600, border: 'none', background: '#1E56E3', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <Plus size={15} />
                <span>Plan Video</span>
              </button>
              <button
                onClick={() => setShowPlanMenu(prev => !prev)}
                title="More creation options"
                style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 10px', background: '#1E56E3', color: '#FFFFFF', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {showPlanMenu && (
              <>
                <div 
                  onClick={() => setShowPlanMenu(false)} 
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                />
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  zIndex: 50,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  padding: '6px',
                  minWidth: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  <button
                    onClick={() => {
                      setShowPlanMenu(false);
                      setShowBulkImport(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.75rem', fontWeight: 500, color: '#334155', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <FileSpreadsheet size={13} color="#64748B" />
                    <span>Bulk Import</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigation Bar: 3 Core Planner Views */}
      <div className="sub-nav-scroll-container">
        <div style={{ display: 'inline-flex', background: '#E6EAF0', borderRadius: '9999px', padding: '4px', boxShadow: 'inset 2px 2px 5px rgba(166, 175, 195, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.8)', border: 'none', alignSelf: 'flex-start' }}>
          <nav style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveViewTab('progress')}
              id="tab-progress-analytics"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 16px',
                fontSize: '0.78rem',
                borderRadius: '9999px',
                border: 'none',
                background: activeViewTab === 'progress' ? '#2F65F6' : 'transparent',
                color: activeViewTab === 'progress' ? '#FFFFFF' : '#64748B',
                boxShadow: activeViewTab === 'progress' ? '0 2px 8px rgba(47, 101, 246, 0.35)' : 'none',
                fontWeight: activeViewTab === 'progress' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <BarChart3 size={14} />
              <span>Progress & Analytics</span>
            </button>

            <button
              onClick={() => setActiveViewTab('videos')}
              id="tab-full-video-list"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 16px',
                fontSize: '0.78rem',
                borderRadius: '9999px',
                border: 'none',
                background: activeViewTab === 'videos' ? '#2F65F6' : 'transparent',
                color: activeViewTab === 'videos' ? '#FFFFFF' : '#64748B',
                boxShadow: activeViewTab === 'videos' ? '0 2px 8px rgba(47, 101, 246, 0.35)' : 'none',
                fontWeight: activeViewTab === 'videos' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <ListVideo size={14} />
              <span>Full Video List</span>
              <span style={{ padding: '2px 7px', background: activeViewTab === 'videos' ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1', color: activeViewTab === 'videos' ? '#FFFFFF' : '#475569', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}>
                {allPlannedVideos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveViewTab('schedule')}
              id="tab-weekly-schedule"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 16px',
                fontSize: '0.78rem',
                borderRadius: '9999px',
                border: 'none',
                background: activeViewTab === 'schedule' ? '#2F65F6' : 'transparent',
                color: activeViewTab === 'schedule' ? '#FFFFFF' : '#64748B',
                boxShadow: activeViewTab === 'schedule' ? '0 2px 8px rgba(47, 101, 246, 0.35)' : 'none',
                fontWeight: activeViewTab === 'schedule' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Calendar size={14} />
              <span>Weekly Schedule</span>
            </button>
          </nav>
        </div>
      </div>

      {/* 3. Consolidated KPI Metrics Grid */}
      <div className="planner-kpi-grid">
        {/* Card 1: Forecast Speedometer */}
        <ForecastSpeedometerCard
          plannedVideos={allPlannedVideos}
          activeSession={activeSession}
        />

        {/* Card 2: Lectures Progress */}
        <div style={{
          background: '#F0F3F7',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '16px',
          padding: '12px 14px',
          boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '120px'
        }}>
          {/* Top Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Lectures
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '9999px',
              background: kpiStats.lecturesPct >= 100 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.1)',
              color: kpiStats.lecturesPct >= 100 ? '#059669' : '#2563EB',
              whiteSpace: 'nowrap'
            }}>
              {kpiStats.lecturesPct}%
            </div>
          </div>

          {/* Center: Segmented LED Progress Bar */}
          <div style={{ margin: '4px 0' }}>
            <SegmentedLedProgress percentage={kpiStats.lecturesPct} segmentsCount={16} height={11} />
          </div>

          {/* Bottom Numbers Row */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
              <span className="kpi-num" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
                {kpiStats.lecturesUploaded}
              </span>
              <span className="kpi-sub" style={{ fontSize: '0.72rem', color: '#64748B' }}>
                / {kpiStats.lecturesTotal} vids
              </span>
            </div>
            <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {Math.max(0, kpiStats.lecturesTotal - kpiStats.lecturesUploaded)} left
            </span>
          </div>
        </div>

        {/* Card 3: Shorts Progress */}
        <div style={{
          background: '#F0F3F7',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '16px',
          padding: '12px 14px',
          boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '120px'
        }}>
          {/* Top Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Shorts
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '9999px',
              background: kpiStats.shortsPct >= 100 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.1)',
              color: kpiStats.shortsPct >= 100 ? '#059669' : '#EA580C',
              whiteSpace: 'nowrap'
            }}>
              {kpiStats.shortsPct}%
            </div>
          </div>

          {/* Center: Segmented LED Progress Bar */}
          <div style={{ margin: '4px 0' }}>
            <SegmentedLedProgress percentage={kpiStats.shortsPct} segmentsCount={16} height={11} color="#EA580C" glowColor="#FB923C" />
          </div>

          {/* Bottom Numbers Row */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
              <span className="kpi-num" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
                {kpiStats.shortsUploaded}
              </span>
              <span className="kpi-sub" style={{ fontSize: '0.72rem', color: '#64748B' }}>
                / {kpiStats.shortsTotal} shorts
              </span>
            </div>
            <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {Math.max(0, kpiStats.shortsTotal - kpiStats.shortsUploaded)} left
            </span>
          </div>
        </div>

        {/* Card 4: Total Pipeline */}
        <div style={{
          background: '#F0F3F7',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '16px',
          padding: '12px 14px',
          boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '120px'
        }}>
          {/* Top Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Pipeline
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '9999px',
              background: 'rgba(124, 58, 237, 0.1)',
              color: '#7C3AED',
              whiteSpace: 'nowrap'
            }}>
              {kpiStats.velocityPct}% Done
            </div>
          </div>

          {/* Center: Segmented LED Progress Bar */}
          <div style={{ margin: '4px 0' }}>
            <SegmentedLedProgress percentage={kpiStats.velocityPct} segmentsCount={16} height={11} color="#7C3AED" glowColor="#A78BFA" />
          </div>

          {/* Bottom Numbers Row */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
              <span className="kpi-num" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
                {kpiStats.totalUploaded}
              </span>
              <span className="kpi-sub" style={{ fontSize: '0.72rem', color: '#64748B' }}>
                / {kpiStats.totalVideos} total
              </span>
            </div>
            <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {kpiStats.totalBacklog} queued
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active Tab Content View */}
      {activeViewTab === 'progress' && (
        <ErrorBoundary title="Progress Section Error">
          <ProgressSection
            activeSessionId={selectedSessionId}
            refreshTrigger={refreshCounter}
            onSelectSession={handleSelectSession}
            onOpenTargetModal={() => setShowTargetModal(true)}
            onNavigateToVideos={() => setActiveViewTab('videos')}
          />
        </ErrorBoundary>
      )}

      {activeViewTab === 'videos' && (
        <ErrorBoundary title="Video List Error">
          <FullVideoListView
            plannedVideos={allPlannedVideos}
            sessions={overview?.sessions || []}
            lists={allLists}
            onRefresh={refreshAll}
            onOpenPlanVideo={() => {
              setEditingPlannedVideo(null);
              setShowPlannedModal(true);
            }}
            onEditVideo={(v) => {
              setEditingPlannedVideo(v);
              setShowPlannedModal(true);
            }}
            onOpenLinkModal={(v) => setLinkingVideo(v)}
            onOpenBulkImport={() => setShowBulkImport(true)}
            onSelectItem={onSelectItem}
            selectedItem={selectedItem}
          />
        </ErrorBoundary>
      )}

      {activeViewTab === 'schedule' && (
        <ErrorBoundary title="Schedule Board Error">
          <WeeklyScheduleBoard
            plannedVideos={allPlannedVideos}
            onRefresh={refreshAll}
            onOpenPlanVideo={() => {
              setEditingPlannedVideo(null);
              setShowPlannedModal(true);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Modals */}
      {showPlannedModal && (
        <PlannedVideoModal
          initialData={editingPlannedVideo}
          editingVideo={editingPlannedVideo}
          availableLists={allLists}
          courses={allLists}
          availableSessions={overview?.sessions || []}
          sessions={overview?.sessions || []}
          defaultSessionId={selectedSessionId}
          activeSessionId={selectedSessionId}
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
          courses={allLists}
          sessions={overview?.sessions || []}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false);
            refreshAll();
          }}
        />
      )}

      {showTargetModal && (
        <TargetManagementModal
          sessionId={selectedSessionId || overview?.sessions?.[0]?.id || 'sess_cfa_l1_nov26'}
          sessionName={activeSession?.name || 'Active Session'}
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
