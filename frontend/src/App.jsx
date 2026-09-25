import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import PerformanceOverviewView from './views/PerformanceOverviewView';
import DetailDrilldownView from './views/DetailDrilldownView';
import LeaderboardView from './views/LeaderboardView';
import LowCTRView from './views/LowCTRView';
import ChangeLogView from './views/ChangeLogView';
import CompetitorsView from './views/CompetitorsView';
import UploadPlannerView from './views/UploadPlannerView';
import SyllabusMatcherView from './views/SyllabusMatcherView';

import ChangeLogModal from './components/ChangeLogModal';
import CategorizeModal from './components/CategorizeModal';
import AddCompetitorModal from './components/AddCompetitorModal';
import SettingsModal from './components/SettingsModal';
import ManageVideoListsModal from './components/ManageVideoListsModal';
import ErrorBoundary from './components/ErrorBoundary';
import AdminAuthGate from './components/AdminAuthGate';

import { LayoutDashboard, BarChart3, AlertTriangle, History, Users, Calendar, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('planner'); // 'overview' | 'planner' | 'leaderboard' | 'low-ctr' | 'change-log' | 'competitors'
  const [drilldownTarget, setDrilldownTarget] = useState(null); // { type: 'list' | 'video', id: '...' }
  const [status, setStatus] = useState(null);
  const [lowCtrCount, setLowCtrCount] = useState(0);
  const [plannerQueueCount, setPlannerQueueCount] = useState(0);
  const [syllabusQueueCount, setSyllabusQueueCount] = useState(0);
  const [changeLogStats, setChangeLogStats] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [activeChangeVideo, setActiveChangeVideo] = useState(null);
  const [showNewChangeModal, setShowNewChangeModal] = useState(false);
  const [activeCategorizeVideo, setActiveCategorizeVideo] = useState(null);
  const [activeVideoForLists, setActiveVideoForLists] = useState(null);

  // Key to force re-fetch across views on data mutation
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_connected') === '1') {
      setSyncToast({
        type: 'success',
        msg: 'Google YouTube OAuth successfully connected! Private YouTube Studio Analytics access is now enabled.'
      });
      setTimeout(() => setSyncToast(null), 8000);
      setRefreshKey(prev => prev + 1);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('oauth_error')) {
      setSyncToast({
        type: 'error',
        msg: `Google OAuth Authorization Failed: ${decodeURIComponent(params.get('oauth_error'))}`
      });
      setTimeout(() => setSyncToast(null), 8000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetchSystemStatus();
    fetchSummaryCounts();
  }, [refreshKey]);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to load status:", err);
    }
  };

  const fetchSummaryCounts = async () => {
    try {
      const [ctrRes, chgRes, planRes, sylRes] = await Promise.all([
        fetch('/api/low-ctr'),
        fetch('/api/change-log'),
        fetch('/api/planner/overview'),
        fetch('/api/syllabus/match-queue')
      ]);
      const ctrData = await ctrRes.json();
      const chgData = await chgRes.json();
      const planData = await planRes.json();
      const sylData = await sylRes.json();

      setLowCtrCount(ctrData.filter(v => v.is_flagged).length);
      setChangeLogStats(chgData.strategy_insights);
      setPlannerQueueCount(planData.review_queue_count || 0);
      setSyllabusQueueCount(Array.isArray(sylData) ? sylData.length : 0);
    } catch (err) {
      console.error("Failed to fetch summary counts:", err);
    }
  };

  const handleSyncChannel = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/youtube/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncToast({
          type: 'success',
          msg: `Synced ${data.total_videos_synced} videos (${data.total_channel_views?.toLocaleString()} views) from ${data.channel_title}`
        });
        setRefreshKey(prev => prev + 1);
        setTimeout(() => setSyncToast(null), 6000);
        return data;
      } else {
        alert("YouTube Sync failed: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      console.error("YouTube sync failed:", err);
      alert("YouTube sync failed: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm("Reload the sample CFA/FRM dataset with hierarchical lists and YoY data?")) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      if (res.ok) {
        setDrilldownTarget(null);
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error("Failed to reset demo dataset:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab !== 'overview') {
      setDrilldownTarget(null);
    }
  };

  return (
    <AdminAuthGate>
      <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] text-slate-800 font-sans">
      {/* 1. Left Sidebar Navigation (<aside>) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleTabSwitch}
        status={status}
        lowCtrCount={lowCtrCount}
        plannerQueueCount={plannerQueueCount}
        syllabusQueueCount={syllabusQueueCount}
        onOpenSettings={() => setShowSettings(true)}
        onResetSeed={handleResetSeed}
        isResetting={isResetting}
        onSyncChannel={handleSyncChannel}
        isSyncing={isSyncing}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* 2. SCROLLABLE MAIN CONTENT AREA */}
      <main style={{ flex: 1, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top Utility Header (h-16) */}
        <TopHeader
          activeTab={activeTab}
          status={status}
          onOpenSettings={() => setShowSettings(true)}
          onSyncChannel={handleSyncChannel}
          isSyncing={isSyncing}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />

        {/* Global Sync Toast Notification */}
        {syncToast && (
          <div style={{
            background: syncToast.type === 'error' ? '#FFF0F2' : '#EBFBF7',
            borderBottom: `1px solid ${syncToast.type === 'error' ? 'rgba(225, 29, 72, 0.25)' : 'rgba(13, 148, 136, 0.25)'}`,
            color: syncToast.type === 'error' ? '#E11D48' : '#0D9488',
            padding: '0.65rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            zIndex: 10
          }}>
            {syncToast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{syncToast.msg}</span>
          </div>
        )}

        {/* Content Container */}
        <div style={{ padding: '28px 32px', maxWidth: '1280px', width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ErrorBoundary title="View Error">
            {/* Tab 1: Performance Overview or Drilldown View */}
            {activeTab === 'overview' && (
              drilldownTarget ? (
                <DetailDrilldownView
                  key={`drilldown-${drilldownTarget.type}-${drilldownTarget.id}-${refreshKey}`}
                  drilldownTarget={drilldownTarget}
                  onNavigateDrilldown={(target) => setDrilldownTarget(target)}
                  onBackToOverview={() => setDrilldownTarget(null)}
                />
              ) : (
                <PerformanceOverviewView
                  key={`overview-${refreshKey}`}
                  onNavigateDrilldown={(target) => setDrilldownTarget(target)}
                />
              )
            )}

            {/* Tab 2: Upload Planner */}
            {activeTab === 'planner' && (
              <UploadPlannerView key={`planner-${refreshKey}`} />
            )}

            {/* Tab 2.5: Syllabus Matcher */}
            {activeTab === 'syllabus' && (
              <SyllabusMatcherView key={`syllabus-${refreshKey}`} />
            )}

            {/* Tab 3: Monthly Leaderboard */}
            {activeTab === 'leaderboard' && (
              <LeaderboardView key={`leaderboard-${refreshKey}`} />
            )}

            {/* Tab 4: Low-CTR Triage */}
            {activeTab === 'low-ctr' && (
              <LowCTRView
                key={`low-ctr-${refreshKey}`}
                onLogChangeForVideo={(video) => setActiveChangeVideo(video)}
                onEditCategoryForVideo={(video) => setActiveCategorizeVideo(video)}
                onEditListsForVideo={(video) => setActiveVideoForLists(video)}
              />
            )}

            {/* Tab 5: Change Log & Impact */}
            {activeTab === 'change-log' && (
              <ChangeLogView
                key={`change-log-${refreshKey}`}
                onOpenNewChangeModal={() => setShowNewChangeModal(true)}
              />
            )}

            {/* Tab 6: Competitor Benchmarking */}
            {activeTab === 'competitors' && (
              <CompetitorsView
                key={`competitors-${refreshKey}`}
                onOpenAddCompetitor={() => setShowAddCompetitor(true)}
              />
            )}
          </ErrorBoundary>
        </div>

        <footer style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#94A3B8', padding: '24px 0', borderTop: '1px solid rgba(226, 232, 240, 0.6)' }}>
          Falcon YT Analytics · CFA & FRM Channel Intelligence Platform · Hierarchical List System & 12-Month YoY Engine
        </footer>
      </main>

      {/* Modals */}
      {(activeChangeVideo || showNewChangeModal) && (
        <ChangeLogModal
          video={activeChangeVideo || { id: 'cfa_l1_03', title: 'CFA Level 1 FSA Balance Sheet', course: 'CFA L1', topic: 'FSA', ctr: 3.4 }}
          onClose={() => {
            setActiveChangeVideo(null);
            setShowNewChangeModal(false);
          }}
          onSuccess={() => {
            setActiveChangeVideo(null);
            setShowNewChangeModal(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {activeCategorizeVideo && (
        <CategorizeModal
          video={activeCategorizeVideo}
          status={status}
          onClose={() => setActiveCategorizeVideo(null)}
          onSuccess={() => {
            setActiveCategorizeVideo(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {activeVideoForLists && (
        <ManageVideoListsModal
          video={activeVideoForLists}
          onClose={() => setActiveVideoForLists(null)}
          onSuccess={() => {
            setActiveVideoForLists(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showAddCompetitor && (
        <AddCompetitorModal
          onClose={() => setShowAddCompetitor(false)}
          onSuccess={() => {
            setShowAddCompetitor(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onResetDemo={() => {
            handleResetSeed();
            setShowSettings(false);
          }}
          onSyncChannel={handleSyncChannel}
          isSyncing={isSyncing}
          status={status}
        />
      )}
      </div>
    </AdminAuthGate>
  );
}
