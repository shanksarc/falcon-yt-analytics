import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Eye, Clock, Users, Percent, Calendar } from 'lucide-react';

export default function YoYTrendChart({ trendData, title = "12-Month Performance Trend (YoY Comparison)", subtitle = "Compares each month against the same month of the previous year" }) {
  const [activeMetric, setActiveMetric] = useState('views'); // 'views' | 'watch_time' | 'subscribers' | 'ctr'

  if (!trendData || !trendData.months || trendData.months.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No historical trend data available.
      </div>
    );
  }

  const months = trendData.months;
  const totals = trendData.totals;

  const getMetricDetails = (m) => {
    const item = m[activeMetric] || { cur: 0, prev: 0, yoy_pct: 0 };
    return item;
  };

  // Find max value for bar scaling, and min/max for dynamic red-to-blue gradient
  let maxVal = 1;
  let minCur = Infinity;
  let maxCur = -Infinity;
  months.forEach(m => {
    const d = getMetricDetails(m);
    if (d.cur > maxVal) maxVal = d.cur;
    if (d.prev > maxVal) maxVal = d.prev;
    if (d.cur !== undefined && d.cur !== null) {
      if (d.cur < minCur) minCur = d.cur;
      if (d.cur > maxCur) maxCur = d.cur;
    }
  });
  if (minCur === Infinity) minCur = 0;
  if (maxCur === -Infinity) maxCur = 1;

  // Red to Blue gradient function: Worst (Red) -> Best (Blue)
  const getRedToBlueColor = (val, min, max, opacity = 1) => {
    if (val === undefined || val === null) return `rgba(239, 68, 68, ${opacity})`;
    const ratio = max === min ? 0.5 : Math.max(0, Math.min(1, (val - min) / (max - min)));
    const r = Math.round(239 * (1 - ratio) + 59 * ratio);
    const g = Math.round(68 * (1 - ratio) + 130 * ratio);
    const b = Math.round(68 * (1 - ratio) + 246 * ratio);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const formatVal = (val, met) => {
    if (val === undefined || val === null) return '0';
    if (met === 'views') {
      if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
      if (val >= 1_000) return (val / 1_000).toFixed(1) + 'k';
      return val.toLocaleString();
    }
    if (met === 'watch_time') {
      return `${Math.round(val).toLocaleString()}h`;
    }
    if (met === 'subscribers') {
      return `+${val.toLocaleString()}`;
    }
    if (met === 'ctr') {
      return `${Number(val).toFixed(1)}%`;
    }
    return val;
  };

  const metricTotal = totals ? totals[activeMetric] : null;

  return (
    <div className="content-card">
      <div className="content-card-header">
        <div className="card-title-group">
          <h3 style={{ fontSize: '1.15rem' }}>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <div className="controls-bar">
          <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-pill)', padding: '2px' }}>
            <button 
              className={`btn-secondary ${activeMetric === 'views' ? 'btn-primary' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => setActiveMetric('views')}
            >
              <Eye size={12} /> Views
            </button>
            <button 
              className={`btn-secondary ${activeMetric === 'watch_time' ? 'btn-primary' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => setActiveMetric('watch_time')}
            >
              <Clock size={12} /> Watch time
            </button>
            <button 
              className={`btn-secondary ${activeMetric === 'subscribers' ? 'btn-primary' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => setActiveMetric('subscribers')}
            >
              <Users size={12} /> Subscribers
            </button>
            <button 
              className={`btn-secondary ${activeMetric === 'ctr' ? 'btn-primary' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => setActiveMetric('ctr')}
            >
              <Percent size={12} /> CTR
            </button>
          </div>
        </div>
      </div>

      {/* Topline Metric YoY Summary */}
      {metricTotal && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          background: 'var(--bg-surface-elevated)', 
          padding: '0.85rem 1.25rem', 
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current year total</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', marginTop: '2px' }}>
                {formatVal(metricTotal.cur, activeMetric)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Previous year total</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', marginTop: '2px' }}>
                {formatVal(metricTotal.prev, activeMetric)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Full year YoY:</span>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.2rem',
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-pill)',
              background: metricTotal.yoy_pct >= 0 ? 'rgba(62, 166, 94, 0.12)' : 'rgba(255, 0, 0, 0.12)',
              color: metricTotal.yoy_pct >= 0 ? 'var(--success-green)' : 'var(--danger-red)',
              fontWeight: 600,
              fontSize: '0.82rem'
            }}>
              {metricTotal.yoy_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {metricTotal.yoy_pct >= 0 ? `+${metricTotal.yoy_pct}%` : `${metricTotal.yoy_pct}%`}
            </div>
          </div>
        </div>
      )}

      {/* 12-Month Side-by-Side Visual Bars */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(12, 1fr)', 
        gap: '0.5rem', 
        alignItems: 'flex-end', 
        height: '210px', 
        paddingTop: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {months.map((m) => {
          const d = getMetricDetails(m);
          const curH = Math.max(8, Math.round((d.cur / maxVal) * 150));
          const prevH = Math.max(8, Math.round((d.prev / maxVal) * 150));
          const yoy = activeMetric === 'ctr' ? d.yoy_delta : d.yoy_pct;
          const isUp = (yoy || 0) >= 0;
          const barColor = getRedToBlueColor(d.cur, minCur, maxCur);
          const barColorGlow = getRedToBlueColor(d.cur, minCur, maxCur, 0.4);

          return (
            <div key={m.month_label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', height: '100%', justifyContent: 'flex-end' }}>
              {/* YoY Delta indicator */}
              <div style={{ 
                fontSize: '0.62rem', 
                fontWeight: 700, 
                color: isUp ? 'var(--success-emerald)' : 'var(--danger-rose)',
                fontFamily: 'var(--font-mono)'
              }}>
                {isUp ? `+${yoy}` : yoy}{activeMetric !== 'ctr' ? '%' : ''}
              </div>

              {/* Bars container */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                {/* Previous Year Bar */}
                <div 
                  title={`Previous Year (${m.prev_month}): ${formatVal(d.prev, activeMetric)}`}
                  style={{ 
                    width: '10px', 
                    height: `${prevH}px`, 
                    background: 'rgba(255, 255, 255, 0.15)', 
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 0.3s ease'
                  }} 
                />
                {/* Current Year Bar with Red-to-Blue Performance Gradient */}
                <div 
                  title={`Current Year (${m.cur_month}): ${formatVal(d.cur, activeMetric)}`}
                  style={{ 
                    width: '13px', 
                    height: `${curH}px`, 
                    background: `linear-gradient(180deg, ${barColor} 0%, ${getRedToBlueColor(d.cur, minCur, maxCur, 0.75)} 100%)`, 
                    borderRadius: '2px 2px 0 0',
                    boxShadow: `0 0 10px ${barColorGlow}`,
                    transition: 'all 0.3s ease'
                  }} 
                />
              </div>

              {/* Month Label */}
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {m.month_label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Footnote */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '10px', height: '10px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }} />
            <span>Previous Year (2023)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Current Year Performance:</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'rgb(239, 68, 68)', fontWeight: 700 }}>Worst (Red)</span>
              <div style={{ 
                width: '60px', 
                height: '7px', 
                borderRadius: '4px', 
                background: 'linear-gradient(90deg, rgb(239, 68, 68) 0%, rgb(150, 95, 160) 50%, rgb(59, 130, 246) 100%)' 
              }} />
              <span style={{ color: 'rgb(59, 130, 246)', fontWeight: 700 }}>Best (Blue)</span>
            </div>
          </div>
        </div>
        <div>
          Hover bars for monthly comparison details
        </div>
      </div>
    </div>
  );
}
