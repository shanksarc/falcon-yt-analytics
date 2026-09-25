import React, { useState, useEffect } from 'react';
import { 
  X, Check, Key, HelpCircle, RefreshCw, Radio, ExternalLink, 
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Copy, LogOut 
} from 'lucide-react';
import { logoutAdmin, setCustomAdminPasscode } from './AdminAuthGate';

export default function SettingsModal({ onClose, onResetDemo, onSyncChannel, isSyncing, status }) {
  const [apiKey, setApiKey] = useState('');
  const [channelId, setChannelId] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [hasOauthClientSecret, setHasOauthClientSecret] = useState(false);
  const [hasOauth, setHasOauth] = useState(false);
  const [oauthRedirectUri, setOauthRedirectUri] = useState('http://localhost:8000/api/auth/google/callback');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [manualSubs, setManualSubs] = useState('');
  const [fetchedSubs, setFetchedSubs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [needsEnvSetup, setNeedsEnvSetup] = useState(false);
  const [hasApiKeyEnv, setHasApiKeyEnv] = useState(false);
  const [hasChannelEnv, setHasChannelEnv] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);
  const [localSyncing, setLocalSyncing] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [isDisconnectingOAuth, setIsDisconnectingOAuth] = useState(false);
  const [newAdminPasscode, setNewAdminPasscode] = useState('');
  const [passcodeSuccessMsg, setPasscodeSuccessMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setApiKey(data.youtube_api_key || '');
      setChannelId(data.channel_id || '');
      setOauthClientId(data.oauth_client_id || '');
      setHasOauthClientSecret(!!data.has_oauth_client_secret);
      setHasOauth(!!data.has_oauth);
      if (data.oauth_redirect_uri) {
        setOauthRedirectUri(data.oauth_redirect_uri);
      }
      setFetchedSubs(data.channel_subscribers || 0);
      setManualSubs(data.manual_channel_subscribers ? String(data.manual_channel_subscribers) : '');
      setHasApiKeyEnv(!!data.has_api_key_env);
      setHasChannelEnv(!!data.has_channel_env);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        youtube_api_key: apiKey,
        channel_id: channelId,
        oauth_client_id: oauthClientId,
        manual_channel_subscribers: manualSubs ? parseInt(manualSubs, 10) : 0
      };
      if (oauthClientSecret.trim()) {
        payload.oauth_client_secret = oauthClientSecret.trim();
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSuccess(true);
        setSaveMsg(data.message || 'Settings saved successfully.');
        setNeedsEnvSetup(!!data.needs_env_setup);
        if (oauthClientSecret.trim()) {
          setHasOauthClientSecret(true);
          setOauthClientSecret('');
        }
        setTimeout(() => { setSavedSuccess(false); setSaveMsg(''); }, 4000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUri = () => {
    navigator.clipboard.writeText(oauthRedirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleConnectOAuth = async () => {
    if (!oauthClientId.trim()) {
      alert("Please enter your Google OAuth Client ID first.");
      return;
    }
    if (!hasOauthClientSecret && !oauthClientSecret.trim()) {
      alert("Please enter your Google OAuth Client Secret first.");
      return;
    }
    setIsConnectingOAuth(true);
    try {
      // Auto-save any dirty fields first
      const payload = {
        youtube_api_key: apiKey,
        channel_id: channelId,
        oauth_client_id: oauthClientId,
        manual_channel_subscribers: manualSubs ? parseInt(manualSubs, 10) : 0
      };
      if (oauthClientSecret.trim()) {
        payload.oauth_client_secret = oauthClientSecret.trim();
      }
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Redirect to Google login flow
      window.location.href = '/api/auth/google/login';
    } catch (err) {
      alert("Failed to initiate Google OAuth: " + err.message);
      setIsConnectingOAuth(false);
    }
  };

  const handleDisconnectOAuth = async () => {
    if (!confirm("Are you sure you want to disconnect YouTube OAuth credentials?")) return;
    setIsDisconnectingOAuth(true);
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (res.ok) {
        setHasOauth(false);
      }
    } catch (err) {
      console.error("Failed to disconnect OAuth:", err);
    } finally {
      setIsDisconnectingOAuth(false);
    }
  };

  const handleManualSync = async () => {
    setLocalSyncing(true);
    setSyncStatusMsg(null);
    try {
      if (onSyncChannel) {
        const res = await onSyncChannel();
        if (res && res.status === 'success') {
          setSyncStatusMsg(`Successfully synced ${res.total_videos_synced} videos (${res.total_channel_views.toLocaleString()} views) from ${res.channel_title}!`);
        }
      } else {
        const res = await fetch('/api/youtube/sync', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          setSyncStatusMsg(`Successfully synced ${data.total_videos_synced} videos (${data.total_channel_views?.toLocaleString()} views) from ${data.channel_title}!`);
        } else {
          setSyncStatusMsg(`Sync error: ${data.detail || 'Failed to sync'}`);
        }
      }
    } catch (err) {
      setSyncStatusMsg(`Sync error: ${err.message}`);
    } finally {
      setLocalSyncing(false);
    }
  };

  const syncingNow = isSyncing || localSyncing;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="var(--cfa-gold)" />
            <h3 className="modal-title">Channel Credentials & YouTube Sync</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.3rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Channel Live Status Card */}
        <div style={{
          background: status?.demo_mode ? 'var(--bg-surface-elevated)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${status?.demo_mode ? 'var(--border-subtle)' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: status?.demo_mode ? '#94a3b8' : 'var(--success-emerald)',
                boxShadow: status?.demo_mode ? 'none' : '0 0 8px var(--success-emerald)'
              }} />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {status?.channel_name || 'Falcon Edufin'}
              </strong>
              <span style={{ 
                fontSize: '0.7rem', 
                padding: '2px 7px', 
                borderRadius: '10px', 
                background: status?.demo_mode ? 'var(--bg-surface)' : 'rgba(16, 185, 129, 0.2)',
                color: status?.demo_mode ? 'var(--text-muted)' : 'var(--success-emerald)',
                fontWeight: 600 
              }}>
                {status?.demo_mode ? 'Demo Dataset' : 'Live Channel Connected'}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              {status?.summary?.total_videos || 0} videos indexed · {status?.summary?.total_views?.toLocaleString() || 0} views · {(status?.summary?.total_subscribers || fetchedSubs)?.toLocaleString() || 0} subscribers
              {status?.last_youtube_sync && (
                <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                  · Last Synced: {new Date(status.last_youtube_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleManualSync}
            disabled={syncingNow}
            style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={13} className={syncingNow ? 'spin' : ''} />
            {syncingNow ? 'Fetching Data...' : 'Sync Channel Data Now'}
          </button>
        </div>

        {syncStatusMsg && (
          <div style={{
            background: syncStatusMsg.includes('error') ? 'rgba(239, 68, 68, 0.1)' : 'var(--success-bg)',
            border: `1px solid ${syncStatusMsg.includes('error') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            color: syncStatusMsg.includes('error') ? '#ef4444' : 'var(--success-emerald)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.82rem'
          }}>
            <Check size={16} /> {syncStatusMsg}
          </div>
        )}

        {/* Env var warning banner */}
        {needsEnvSetup && (
          <div style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            color: '#f59e0b',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            lineHeight: 1.5
          }}>
            <strong>⚠️ Settings saved temporarily.</strong> On Vercel, the database resets between deploys.<br />
            For <strong>permanent storage</strong>, add these as{' '}
            <a href="https://vercel.com/docs/projects/environment-variables" target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24', textDecoration: 'underline' }}>Vercel Environment Variables</a>:
            <br /><code style={{ background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: 4, fontSize: '0.76rem' }}>FALCON_YT_API_KEY</code>{' '}
            and{' '}
            <code style={{ background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: 4, fontSize: '0.76rem' }}>FALCON_CHANNEL_ID</code>
          </div>
        )}

        {savedSuccess && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--success-emerald)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <Check size={16} /> {saveMsg || 'Credentials saved! You can now click "Sync Channel Data Now" above.'}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">YouTube Data API v3 Key (Public Stats & Competitors)</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="AIzaSy..." 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Used to pull public views, durations, titles, playlists, and competitor velocity directly from YouTube.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Your YouTube Channel ID</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="UC..." 
              value={channelId} 
              onChange={(e) => setChannelId(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subscribers Override (Optional)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder={`Current YouTube API Count: ${fetchedSubs || 7380}`} 
              value={manualSubs} 
              onChange={(e) => setManualSubs(e.target.value)} 
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              YouTube's public API reports rounded subscriber counts (e.g. 7.38K). Enter your exact YouTube Studio subscriber count here if you want it displayed precisely.
            </div>
          </div>

          {/* YouTube Analytics OAuth 2.0 Section */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: `1px solid ${hasOauth ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '1.1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color={hasOauth ? 'var(--success-emerald)' : 'var(--cfa-gold)'} />
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  YouTube Analytics OAuth 2.0 (Private Studio Data)
                </span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '12px',
                fontWeight: 600,
                background: hasOauth ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: hasOauth ? 'var(--success-emerald)' : '#eab308',
                border: `1px solid ${hasOauth ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
              }}>
                {hasOauth ? 'OAuth Connected & Active ✅' : 'OAuth Not Authorized ⚠️'}
              </span>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.9rem', lineHeight: 1.45 }}>
              Required to pull private YouTube Studio metrics (real impressions CTR, audience retention curves, and exact studio day-by-day reports).
            </p>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label">OAuth 2.0 Client ID</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="xxxx.apps.googleusercontent.com" 
                value={oauthClientId} 
                onChange={(e) => setOauthClientId(e.target.value)} 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>OAuth 2.0 Client Secret</label>
                {hasOauthClientSecret && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--success-emerald)', fontWeight: 500 }}>
                    ✓ Secret saved in database
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showSecret ? "text" : "password"} 
                  className="form-input" 
                  placeholder={hasOauthClientSecret ? "•••••••••••••••• (Saved. Enter new to update)" : "GOCSPX-..."} 
                  value={oauthClientSecret} 
                  onChange={(e) => setOauthClientSecret(e.target.value)} 
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title={showSecret ? "Hide secret" : "Show secret"}
                >
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Google Cloud Console Redirect URI instructions */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              marginBottom: '0.9rem'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                <strong>Google Cloud Console Requirement:</strong> Add this exact URI under <em>Credentials &rarr; OAuth 2.0 Client &rarr; Authorized redirect URIs</em>:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <code style={{ 
                  fontSize: '0.74rem', 
                  color: 'var(--cfa-gold)', 
                  background: 'rgba(0,0,0,0.25)', 
                  padding: '3px 6px', 
                  borderRadius: '4px',
                  wordBreak: 'break-all'
                }}>
                  {oauthRedirectUri}
                </code>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCopyUri}
                  style={{ fontSize: '0.7rem', padding: '2px 7px', whiteSpace: 'nowrap' }}
                >
                  {copiedUri ? <Check size={11} color="var(--success-emerald)" /> : <Copy size={11} />}
                  {copiedUri ? 'Copied!' : 'Copy URI'}
                </button>
              </div>
            </div>

            {/* OAuth Connection Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {hasOauth 
                  ? "OAuth credentials active. Video analytics can pull studio reports." 
                  : "Click below to sign in with your Falcon YouTube Google Account."}
              </div>

              {hasOauth ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDisconnectOAuth}
                  disabled={isDisconnectingOAuth}
                  style={{ 
                    fontSize: '0.78rem', 
                    padding: '0.35rem 0.75rem',
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <LogOut size={13} />
                  {isDisconnectingOAuth ? 'Disconnecting...' : 'Disconnect OAuth'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConnectOAuth}
                  disabled={isConnectingOAuth}
                  style={{ 
                    fontSize: '0.78rem', 
                    padding: '0.45rem 0.85rem',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    borderColor: '#3b82f6',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <ExternalLink size={13} />
                  {isConnectingOAuth ? 'Redirecting to Google...' : 'Connect Channel with Google'}
                </button>
              )}
            </div>
          </div>

          {/* Admin Security & Session Management */}
          <div style={{ 
            background: 'rgba(124, 58, 237, 0.05)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid rgba(139, 92, 246, 0.25)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} style={{ color: '#7C3AED' }} />
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Admin Access & Security (Persistent Session)
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Lock Admin Session now? You will be prompted for your passcode.')) {
                    onClose();
                    logoutAdmin();
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Lock size={12} />
                <span>Lock Session</span>
              </button>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
              You are currently authenticated as the single administrator. Access is saved in your browser so you do not need to re-login.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Set new custom admin passcode"
                value={newAdminPasscode}
                onChange={(e) => setNewAdminPasscode(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: '#FFFFFF',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!newAdminPasscode.trim()) return;
                  setCustomAdminPasscode(newAdminPasscode.trim());
                  setPasscodeSuccessMsg('Admin passcode updated successfully!');
                  setNewAdminPasscode('');
                  setTimeout(() => setPasscodeSuccessMsg(''), 4000);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#7C3AED',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Update Passcode
              </button>
            </div>

            {passcodeSuccessMsg && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={13} /> {passcodeSuccessMsg}
              </div>
            )}
          </div>

          <div style={{ 
            background: 'var(--bg-surface-elevated)', 
            padding: '0.875rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              <HelpCircle size={14} color="var(--cfa-gold)" />
              <span>How Sync Works:</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Clicking <strong>Sync Channel Data Now</strong> pulls all uploaded public videos, durations, and views from your YouTube channel, auto-categorizes them into CFA/FRM course hierarchies, links them to planned videos in Upload Planner, and recalculates all analytics.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onResetDemo}
              style={{ fontSize: '0.8rem' }}
            >
              <RefreshCw size={13} /> Reload Demo Dataset
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                <Check size={15} />
                {saving ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
