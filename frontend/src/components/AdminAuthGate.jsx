import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff, ArrowRight, Sparkles, KeyRound } from 'lucide-react';

const DEFAULT_KEY = import.meta.env.VITE_ADMIN_PASSCODE || 'falcon2025';

export function getAdminPasscode() {
  return localStorage.getItem('falcon_admin_custom_passcode') || DEFAULT_KEY;
}

export function setCustomAdminPasscode(newPasscode) {
  if (newPasscode) {
    localStorage.setItem('falcon_admin_custom_passcode', newPasscode);
    localStorage.setItem('falcon_admin_token', newPasscode);
  }
}

export function logoutAdmin() {
  localStorage.removeItem('falcon_admin_session');
  window.dispatchEvent(new Event('falcon_admin_logout'));
}

export default function AdminAuthGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('falcon_admin_session') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleLogoutEvent = () => setIsAuthenticated(false);
    window.addEventListener('falcon_admin_logout', handleLogoutEvent);
    return () => window.removeEventListener('falcon_admin_logout', handleLogoutEvent);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const expected = getAdminPasscode();
    if (passcode.trim() === expected || passcode.trim() === DEFAULT_KEY) {
      if (rememberMe) {
        localStorage.setItem('falcon_admin_session', 'true');
        localStorage.setItem('falcon_admin_token', passcode.trim());
      } else {
        sessionStorage.setItem('falcon_admin_session', 'true');
        localStorage.setItem('falcon_admin_token', passcode.trim());
      }
      setIsAuthenticated(true);
    } else {
      setErrorMsg('Incorrect Admin Passcode. Please check and try again.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

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
      {/* Background ambient lighting */}
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

      {/* Main Lock Card */}
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.78)',
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

        {/* Falcon Icon & Title */}
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
            Falcon YT Analytics
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#94A3B8',
            margin: 0,
            lineHeight: 1.5
          }}>
            Single-administrator console. Enter your admin passcode to unlock full access.
          </p>
        </div>

        {/* Form */}
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
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
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
