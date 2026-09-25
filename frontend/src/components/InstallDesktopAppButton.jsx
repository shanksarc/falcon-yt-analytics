import React, { useState, useEffect } from 'react';
import { Laptop, Download, Check, X, ExternalLink, HelpCircle } from 'lucide-react';

export default function InstallDesktopAppButton({ className = '', style = {} }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone desktop mode
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(isRunningStandalone);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isStandalone) {
      alert('Falcon YT Analytics is already running as a desktop app!');
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setShowGuideModal(true);
      }
    } else {
      // In Safari or Chromium when prompt is deferred/not ready, guide the user
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        id="btn-install-desktop-app"
        title="Add Falcon YT Analytics as a browser-based desktop app"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          background: isStandalone ? 'rgba(16, 185, 129, 0.08)' : '#FFFFFF',
          border: isStandalone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          color: isStandalone ? '#059669' : '#475569',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          ...style
        }}
        onMouseOver={(e) => {
          if (!isStandalone) {
            e.currentTarget.style.borderColor = '#8B5CF6';
            e.currentTarget.style.color = '#7C3AED';
            e.currentTarget.style.background = '#F5F3FF';
          }
        }}
        onMouseOut={(e) => {
          if (!isStandalone) {
            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.background = '#FFFFFF';
          }
        }}
      >
        {isStandalone ? (
          <>
            <Check size={13} style={{ color: '#10B981' }} />
            <span>Desktop App</span>
          </>
        ) : (
          <>
            <Laptop size={13} style={{ color: '#7C3AED' }} />
            <span>Install App</span>
          </>
        )}
      </button>

      {/* Safari / Browser Installation Instruction Modal */}
      {showGuideModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px 28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowGuideModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#F3E8FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7C3AED'
              }}>
                <Laptop size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
                  Use as a Desktop App
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Open Falcon YT Analytics in a clean, standalone desktop window
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#334155' }}>
              <div style={{
                padding: '12px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  Option A: Mac Safari
                </div>
                <div style={{ color: '#64748B' }}>
                  Click <strong style={{ color: '#334155' }}>File</strong> in the top macOS menu bar &rarr; click <strong style={{ color: '#7C3AED' }}>"Add to Dock"</strong>. Falcon will open as an independent Mac app in your Dock!
                </div>
              </div>

              <div style={{
                padding: '12px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  Option B: Google Chrome / Edge
                </div>
                <div style={{ color: '#64748B' }}>
                  Click the <strong style={{ color: '#7C3AED' }}>Install icon</strong> in the right side of the address bar (or <strong style={{ color: '#334155' }}>Menu ⋮ &rarr; Save and share &rarr; Install Falcon YT</strong>).
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{
                  padding: '8px 20px',
                  background: '#7C3AED',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
