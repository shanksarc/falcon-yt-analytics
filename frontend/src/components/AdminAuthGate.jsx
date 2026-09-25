import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

export async function setCustomAdminPasscode(newPasscode, currentPasscode = '') {
  if (newPasscode && newPasscode.trim()) {
    const clean = newPasscode.trim();
    localStorage.setItem('falcon_admin_token', clean);
    try {
      const res = await fetch('/api/auth/change-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_passcode: currentPasscode || clean, new_passcode: clean })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
  return { success: false, message: 'Passcode cannot be empty.' };
}

export function logoutAdmin() {
  localStorage.removeItem('falcon_admin_session');
  localStorage.removeItem('falcon_admin_token');
  sessionStorage.removeItem('falcon_admin_session');
  window.dispatchEvent(new Event('falcon_admin_logout'));
}

export default function AdminAuthGate({ children }) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasConfiguredPasscode, setHasConfiguredPasscode] = useState(false);

  // Login form state
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Setup form state (used only on very first launch if no password is configured)
  const [setupPasscode, setSetupPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        const configured = Boolean(data.is_passcode_configured);

        if (!isMounted) return;
        setHasConfiguredPasscode(configured);

        if (!configured) {
          // No passcode configured on backend yet -> user must create one
          setIsAuthenticated(false);
        } else {
          // Passcode is configured on backend
          const session = localStorage.getItem('falcon_admin_session') === 'true' || sessionStorage.getItem('falcon_admin_session') === 'true';
          const token = localStorage.getItem('falcon_admin_token') || '';

          if (session && token) {
            // Verify stored token against server
            try {
              const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: token })
              });
              if (loginRes.ok) {
                if (isMounted) setIsAuthenticated(true);
              } else {
                localStorage.removeItem('falcon_admin_session');
                localStorage.removeItem('falcon_admin_token');
                sessionStorage.removeItem('falcon_admin_session');
                if (isMounted) setIsAuthenticated(false);
              }
            } catch (err) {
              // Network issue, assume authenticated if session flag is set
              if (isMounted) setIsAuthenticated(true);
            }
          } else {
            if (isMounted) setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.error('Failed to check auth status:', err);
      } finally {
        if (isMounted) setLoadingStatus(false);
      }
    }

    initAuth();

    const handleLogoutEvent = () => setIsAuthenticated(false);
    window.addEventListener('falcon_admin_logout', handleLogoutEvent);
    return () => {
      isMounted = false;
      window.removeEventListener('falcon_admin_logout', handleLogoutEvent);
    };
  }, []);

  const triggerShake = (msg) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Handle first-time password creation (persisted to backend database)
  const handleSetupPasscode = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!setupPasscode || setupPasscode.length < 4) {
      triggerShake('Passcode must be at least 4 characters long.');
      return;
    }
    if (setupPasscode !== confirmPasscode) {
      triggerShake('Passcodes do not match. Please verify.');
      return;
    }

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: setupPasscode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        triggerShake(data.detail || 'Failed to save master passcode.');
        return;
      }

      if (rememberMe) {
        localStorage.setItem('falcon_admin_session', 'true');
        localStorage.setItem('falcon_admin_token', setupPasscode.trim());
      } else {
        sessionStorage.setItem('falcon_admin_session', 'true');
        localStorage.setItem('falcon_admin_token', setupPasscode.trim());
      }
      setHasConfiguredPasscode(true);
      setIsAuthenticated(true);
    } catch (err) {
      triggerShake('Network error saving passcode: ' + err.message);
    }
  };

  // Handle standard login (verified against backend database)
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passcode || !passcode.trim()) {
      triggerShake('Please enter your admin passcode.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        triggerShake(data.detail || 'Incorrect Admin Passcode. Please check and try again.');
        return;
      }

      if (rememberMe) {
        localStorage.setItem('falcon_admin_session', 'true');
        localStorage.setItem('falcon_admin_token', passcode.trim());
      } else {
        sessionStorage.setItem('falcon_admin_session', 'true');
        localStorage.setItem('falcon_admin_token', passcode.trim());
      }
      setIsAuthenticated(true);
    } catch (err) {
      triggerShake('Network error verifying passcode: ' + err.message);
    }
  };

  if (loadingStatus) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(124, 58, 237, 0.2)',
            borderTopColor: '#7C3AED',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '13px' }}>Verifying Falcon Security...</span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'radial-gradient(ellipse at 50% 20%, #1E1B4B 0%, #0F172A 70%, #020617 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#F8FAFC',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.28) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
      }} />

      {/* Lock Card */}
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(124, 58, 237, 0.2)',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 1,
        animation: isShaking ? 'shake 0.4s ease-in-out' : 'none'
      }}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
        `}</style>

        {/* Top Branding Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(124, 58, 237, 0.18)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#C4B5FD',
            letterSpacing: '0.04em'
          }}>
            <ShieldCheck size={14} style={{ color: '#A78BFA' }} />
            <span>FALCON ADMIN SECURITY</span>
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 24px -6px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
          }}>
            <Lock size={28} style={{ color: '#FFFFFF' }} />
          </div>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Outfit, sans-serif',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em'
          }}>
            {hasConfiguredPasscode ? 'Falcon YT Analytics' : 'Set Admin Master Passcode'}
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#94A3B8',
            margin: 0,
            lineHeight: 1.5
          }}>
            {hasConfiguredPasscode
              ? 'Single-administrator console. Enter your admin passcode to unlock full access.'
              : 'Choose a private passcode to secure this console. You will only need to enter it once.'}
          </p>
        </div>

        {/* If no passcode configured yet: First-time setup */}
        {!hasConfiguredPasscode ? (
          <form onSubmit={handleSetupPasscode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                CREATE PASSCODE
              </label>
              <input
                type="password"
                autoFocus
                placeholder="Choose your secret admin passcode"
                value={setupPasscode}
                onChange={(e) => {
                  setSetupPasscode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                CONFIRM PASSCODE
              </label>
              <input
                type="password"
                placeholder="Re-enter passcode to confirm"
                value={confirmPasscode}
                onChange={(e) => {
                  setConfirmPasscode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  outline: 'none'
                }}
              />
            </div>

            {errorMsg && (
              <div style={{ fontSize: '12px', color: '#F87171' }}>
                • {errorMsg}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px 20px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.45)',
                marginTop: '8px'
              }}
            >
              <span>Save Passcode & Unlock</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: '8px',
                letterSpacing: '0.02em'
              }}>
                ADMIN PASSCODE
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  color: '#64748B',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <KeyRound size={16} />
                </div>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  autoFocus
                  placeholder="Enter admin passcode"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 40px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: errorMsg ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {errorMsg && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#F87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>•</span>
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 0'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#94A3B8',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: '#7C3AED',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span>Remember this browser (Stay logged in)</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="admin-btn-unlock"
              style={{
                width: '100%',
                padding: '13px 20px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.45)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>Unlock Admin Console</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Security Footer Notice */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#475569',
          letterSpacing: '0.02em'
        }}>
          Authorized access only · Falcon EduFin Analytics
        </div>
      </div>
    </div>
  );
}
