import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Target, TrendingUp, X, Sparkles, Check, ChevronRight } from 'lucide-react';

function formatCompactNum(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return Math.round(num).toLocaleString();
}

export default function ForecastSpeedometerCard({ 
  plannedVideos = [], 
  activeSession = null 
}) {
  const [showModal, setShowModal] = useState(false);

  // Initialize target date and target views from localStorage or activeSession
  const defaultTargetDate = useMemo(() => {
    return activeSession?.end_date || '2026-11-25';
  }, [activeSession]);

  const [targetDate, setTargetDate] = useState(() => {
    return localStorage.getItem('falcon_forecast_target_date') || defaultTargetDate;
  });

  const [targetViews, setTargetViews] = useState(() => {
    const saved = localStorage.getItem('falcon_forecast_target_views');
    return saved ? parseInt(saved, 10) : 1000;
  });

  // Modal temporary state
  const [tempDate, setTempDate] = useState(targetDate);
  const [tempViews, setTempViews] = useState(targetViews);

  // Sync if activeSession changes and user hasn't set custom date
  useEffect(() => {
    const savedDate = localStorage.getItem('falcon_forecast_target_date');
    if (!savedDate && activeSession?.end_date) {
      setTargetDate(activeSession.end_date);
      setTempDate(activeSession.end_date);
    }
  }, [activeSession]);

  // Core Math Calculation
  const stats = useMemo(() => {
    const uploadedVideos = plannedVideos.filter(pv => pv.status === 'Uploaded' || pv.linked_video_id);

    const totalPlannedViews = uploadedVideos.reduce((sum, pv) => {
      const v = Number(pv.linked_video_views ?? pv.views ?? 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);

    const sortedByDate = [...uploadedVideos]
      .map(v => {
        const dStr = v.linked_video_published_at || v.published_at || v.created_at;
        return { ...v, dateObj: dStr ? new Date(dStr) : null };
      })
      .filter(v => v.dateObj && !isNaN(v.dateObj.getTime()))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    const firstVideo = sortedByDate[0];
    const now = new Date();
    const firstUploadDate = firstVideo ? firstVideo.dateObj : now;

    // Total days from first upload till current date
    const diffMs = Math.max(0, now.getTime() - firstUploadDate.getTime());
    const daysElapsed = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // Per-day average views
    const avgViewsPerDay = totalPlannedViews > 0 ? (totalPlannedViews / daysElapsed) : 0;

    // Forecast till stated date
    const targetDt = new Date(targetDate);
    const validTargetDt = !isNaN(targetDt.getTime()) ? targetDt : new Date(now.getTime() + 60 * 86400000);
    const totalDaysToTarget = Math.max(daysElapsed, Math.round((validTargetDt.getTime() - firstUploadDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const forecastedViews = Math.round(avgViewsPerDay * totalDaysToTarget);

    // Speedometer dial calculations: Max value is 20% higher than target
    const effectiveTargetViews = Math.max(1, targetViews);
    const maxDialValue = Math.round(effectiveTargetViews * 1.2);
    
    // Percentage on dial (0 to 100%)
    const dialPct = Math.min(100, Math.max(0, (forecastedViews / maxDialValue) * 100));

    // Target tick is placed at (targetViews / maxDialValue) * 100 = 83.33%
    const targetTickPct = (effectiveTargetViews / maxDialValue) * 100;

    // Angle on 180-degree semi-circle (-90deg to +90deg)
    const needleAngle = (dialPct / 100) * 180 - 90;

    const isBeatingTarget = forecastedViews >= effectiveTargetViews;
    const beatPct = isBeatingTarget 
      ? Math.round(((forecastedViews - effectiveTargetViews) / effectiveTargetViews) * 100) 
      : 0;

    return {
      uploadedCount: uploadedVideos.length,
      totalPlannedViews,
      firstUploadDate,
      daysElapsed,
      avgViewsPerDay,
      forecastedViews,
      effectiveTargetViews,
      maxDialValue,
      dialPct,
      targetTickPct,
      needleAngle,
      isBeatingTarget,
      beatPct
    };
  }, [plannedVideos, targetDate, targetViews]);

  const handleOpenModal = (e) => {
    e.stopPropagation();
    setTempDate(targetDate);
    setTempViews(targetViews);
    setShowModal(true);
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (tempDate) {
      setTargetDate(tempDate);
      localStorage.setItem('falcon_forecast_target_date', tempDate);
    }
    const raw = typeof tempViews === 'string' ? tempViews.replace(/[,\s]/g, '') : tempViews;
    const cleanViews = parseInt(raw, 10);
    if (!isNaN(cleanViews) && cleanViews > 0) {
      setTargetViews(cleanViews);
      localStorage.setItem('falcon_forecast_target_views', cleanViews.toString());
    }
    setShowModal(false);
  };

  // Speedometer SVG parameters
  const cx = 80;
  const cy = 68;
  const r = 52;
  const arcLength = Math.PI * r; // ~163.36
  const strokeOffset = arcLength * (1 - stats.dialPct / 100);

  // Target tick coordinate calculation at 83.33% (angle = 30° from right, or 150° along arc)
  const tickAngleRad = (Math.PI * (180 - (stats.targetTickPct / 100) * 180)) / 180;
  const tickX1 = cx + (r - 7) * Math.cos(tickAngleRad);
  const tickY1 = cy - (r - 7) * Math.sin(tickAngleRad);
  const tickX2 = cx + (r + 7) * Math.cos(tickAngleRad);
  const tickY2 = cy - (r + 7) * Math.sin(tickAngleRad);

  return (
    <>
      <div 
        onClick={handleOpenModal}
        id="card-views-forecast"
        title="Click to configure forecast date and target"
        style={{
          background: '#F0F3F7',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '16px',
          padding: '12px 14px',
          boxShadow: '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '5px 5px 14px rgba(166, 175, 195, 0.5), -5px -5px 14px rgba(255, 255, 255, 0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '4px 4px 10px rgba(166, 175, 195, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85)';
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Forecast
          </span>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: '9999px',
            background: stats.isBeatingTarget ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.1)',
            color: stats.isBeatingTarget ? '#059669' : '#2563EB'
          }}>
            {stats.isBeatingTarget ? `+${stats.beatPct}% Target` : `${Math.round((stats.forecastedViews / stats.effectiveTargetViews) * 100)}% Target`}
          </div>
        </div>

        {/* Speedometer Gauge Dial */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '-4px 0 -8px 0' }}>
          <svg width="160" height="78" viewBox="0 0 160 78" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="forecastSpeedoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="55%" stopColor="#6366F1" />
                <stop offset="82%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <filter id="speedoGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#3B82F6" floodOpacity="0.3" />
              </filter>
            </defs>

            {/* Background Track Arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="#DDE3EA"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Target 100% Marker Line */}
            <line
              x1={tickX1}
              y1={tickY1}
              x2={tickX2}
              y2={tickY2}
              stroke="#1E293B"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Active Gauge Arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="url(#forecastSpeedoGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeOffset}
              filter="url(#speedoGlow)"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Speedometer Needle */}
            <g 
              transform={`rotate(${stats.needleAngle}, ${cx}, ${cy})`}
              style={{ transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <polygon
                points={`${cx - 2},${cy} ${cx + 2},${cy} ${cx},${cy - r + 8}`}
                fill={stats.isBeatingTarget ? '#10B981' : '#1E293B'}
              />
              <circle cx={cx} cy={cy} r="4.5" fill="#1E293B" />
              <circle cx={cx} cy={cy} r="2" fill="#FFFFFF" />
            </g>
          </svg>
        </div>

        {/* Bottom Numbers Row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
              {formatCompactNum(stats.forecastedViews)}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              / {formatCompactNum(stats.effectiveTargetViews)}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>
            {targetDate ? new Date(targetDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Set date'}
          </span>
        </div>
      </div>

      {/* Target & Date Configuration Modal */}
      {showModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
              border: '1px solid #E2E8F0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '10px', 
                  background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <TrendingUp size={18} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                    Forecast Target
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              {/* Target Date Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target Stated Date
                </label>
                <input
                  type="date"
                  required
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Target Views Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target Views Total
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={tempViews}
                  onChange={(e) => setTempViews(e.target.value)}
                  placeholder="e.g. 50000"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Metric Breakdown Card */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Current Daily Speed</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {stats.avgViewsPerDay.toFixed(1)} views/day
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Tracked Period</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {stats.daysElapsed} days elapsed
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Projected by Date</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB' }}>
                    {stats.forecastedViews.toLocaleString()} views
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Speed Dial Max (120%)</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                    {Math.round((parseInt(tempViews, 10) || 1000) * 1.2).toLocaleString()} views
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
