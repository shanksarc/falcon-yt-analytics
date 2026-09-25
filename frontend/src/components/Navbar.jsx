import React from 'react';
import { PlayCircle, Settings, RefreshCw } from 'lucide-react';

export default function Navbar({ status, onOpenSettings, onResetSeed, isResetting, onSyncChannel, isSyncing }) {
  const isDemo = status?.demo_mode !== false;

  return (
    <header className="top-navbar">
      <div className="brand-section">
        <div className="brand-icon-wrap">
          <PlayCircle size={20} />
        </div>
        <div>
          <div className="brand-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Falcon YT Analytics</span>
            <span style={{
              fontSize: '0.68rem',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: isDemo ? '#F1F5F9' : '#EBFBF7',
              color: isDemo ? '#64748B' : '#0D9488',
              border: `1px solid ${isDemo ? '#E2E8F0' : 'rgba(13, 148, 136, 0.25)'}`,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isDemo ? '#94A3B8' : '#0D9488',
                boxShadow: isDemo ? 'none' : '0 0 6px #0D9488'
              }} />
              {isDemo ? 'Demo Mode' : 'Live Channel'}
            </span>
          </div>
          <div className="brand-subtitle">
            {status?.channel_name || 'Falcon EduFin'} · {status?.summary?.total_videos || status?.total_videos || 0} videos
            {status?.summary?.total_views ? ` · ${status.summary.total_views.toLocaleString()} views` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <button
          className="btn-primary"
          onClick={onSyncChannel}
          disabled={isSyncing}
          title="Fetch latest videos and statistics from your YouTube channel"
          id="btn-sync-channel"
        >
          <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Channel'}</span>
        </button>

        <button 
          className="btn-secondary" 
          onClick={onResetSeed} 
          disabled={isResetting}
          title="Reload demo dataset"
          id="btn-reset-demo"
        >
          <RefreshCw size={12} className={isResetting ? 'spin' : ''} />
          <span>Demo Data</span>
        </button>

        <button 
          className="btn-secondary" 
          onClick={onOpenSettings}
          id="btn-open-settings"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}
