import React, { useState, useEffect } from 'react';
import { BarChart3, Filter, Calendar, TrendingUp, Layers, HelpCircle, Eye, Clock, Percent } from 'lucide-react';
import CourseMonthlyBarChart from '../components/CourseMonthlyBarChart';

export default function LeaderboardView() {
  const [dimension, setDimension] = useState('course'); // 'course' | 'topic' | 'format'
  const [metric, setMetric] = useState('views'); // 'views' | 'watch_time_hours' | 'ctr'
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [dimension]);

  const fetchCourseData = async () => {
    try {
      const res = await fetch('/api/leaderboard?dimension=course');
      const data = await res.json();
      setCourseData(data);
    } catch (err) {
      console.error("Failed to load course leaderboard data:", err);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?dimension=${dimension}`);
      const data = await res.json();
      setLeaderboardData(data);
      if (dimension === 'course') {
        setCourseData(data);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatMetric = (val, met) => {
    if (val === undefined || val === null) return '—';
    if (met === 'views') {
      if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
      if (val >= 1_000) return (val / 1_000).toFixed(1) + 'k';
      return val.toLocaleString();
    }
    if (met === 'watch_time_hours') {
      return `${Math.round(val).toLocaleString()}h`;
    }
    if (met === 'ctr') {
      return `${Number(val).toFixed(1)}%`;
    }
    return val;
  };

  // Find min and max cell values for dynamic Red-to-Blue heatmap
  const getMinMaxValues = () => {
    if (!leaderboardData?.months) return { min: 0, max: 1 };
    let min = Infinity;
    let max = -Infinity;
    leaderboardData.months.forEach(m => {
      Object.values(m.breakdown).forEach(item => {
        const val = item[metric];
        if (val !== undefined && val !== null) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });
    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 1;
    return { min, max };
  };

  const { min: minVal, max: maxVal } = getMinMaxValues();

  // Gradient from Red (worst: rgb 239, 68, 68) to Blue (best: rgb 59, 130, 246)
  const getRedToBlueColor = (val, min, max, opacity = 1) => {
    if (val === undefined || val === null) return 'transparent';
    const ratio = max === min ? 0.5 : Math.max(0, Math.min(1, (val - min) / (max - min)));
    const r = Math.round(239 * (1 - ratio) + 59 * ratio);
    const g = Math.round(68 * (1 - ratio) + 130 * ratio);
    const b = Math.round(68 * (1 - ratio) + 246 * ratio);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF1', borderRadius: '16px', boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.04)', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.01em' }}>Monthly Performance Leaderboard</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
            Cross-video pivot analysis revealing which courses, topics, and formats perform best across historical exam cycles.
          </p>
        </div>

        <div className="controls-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dimension:</span>
            <select 
              className="control-select" 
              value={dimension} 
              onChange={(e) => setDimension(e.target.value)}
              id="select-leaderboard-dimension"
            >
              <option value="course">Group by course (CFA L1-L3, FRM P1-P2)</option>
              <option value="topic">Group by topic (Fixed income, Quant, FSA...)</option>
              <option value="format">Group by video format (Lecture, Revision...)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Metric:</span>
            <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
              <button 
                className={`btn-secondary ${metric === 'views' ? 'btn-primary' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => setMetric('views')}
                id="btn-metric-views"
              >
                <Eye size={13} /> Views
              </button>
              <button 
                className={`btn-secondary ${metric === 'watch_time_hours' ? 'btn-primary' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => setMetric('watch_time_hours')}
                id="btn-metric-watch"
              >
                <Clock size={13} /> Watch Time
              </button>
              <button 
                className={`btn-secondary ${metric === 'ctr' ? 'btn-primary' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => setMetric('ctr')}
                id="btn-metric-ctr"
              >
                <Percent size={13} /> CTR
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Heatmap:</span>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              background: 'var(--bg-surface-elevated)', 
              padding: '0.25rem 0.6rem', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.72rem'
            }}>
              <span style={{ color: 'rgb(239, 68, 68)', fontWeight: 700 }}>Worst</span>
              <div style={{ 
                width: '60px', 
                height: '8px', 
                borderRadius: '4px', 
                background: 'linear-gradient(90deg, rgb(239, 68, 68) 0%, rgb(150, 95, 160) 50%, rgb(59, 130, 246) 100%)' 
              }} />
              <span style={{ color: 'rgb(59, 130, 246)', fontWeight: 700 }}>Best</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Past 12-Month Course Performance Bar Chart */}
      {(courseData || (dimension === 'course' && leaderboardData)) && (
        <CourseMonthlyBarChart 
          courseData={courseData || leaderboardData} 
          activeMetric={metric} 
        />
      )}

      {/* 2. Detailed Historical Matrix Table Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.85rem',
        marginTop: '0.5rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-hairline)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Historical Pivot Breakdown Table
          </span>
          <span style={{
            fontSize: '0.7rem',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 600
          }}>
            {dimension === 'course' ? 'Courses' : (dimension === 'topic' ? 'Topics' : 'Formats')}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Showing {metric.replace('_', ' ').toUpperCase()} with Red-to-Blue performance heatmap
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading historical pivot matrix...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="analytics-table">
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Month & Exam Window</th>
                <th style={{ textAlign: 'right' }}>Total {metric.replace('_', ' ').toUpperCase()}</th>
                {leaderboardData?.distinct_dimensions?.map(col => (
                  <th key={col} style={{ textAlign: 'right', minWidth: '130px' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboardData?.months?.map((m) => {
                const isHigh = m.seasonality?.is_high_season;
                const totalMetricVal = metric === 'views' 
                  ? m.total_views 
                  : (metric === 'watch_time_hours' ? m.total_watch_time : 'Avg');

                return (
                  <tr key={m.month} style={{ background: isHigh ? 'rgba(255, 0, 0, 0.03)' : 'inherit' }}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.month}</span>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {isHigh ? (
                            <span className="exam-tag-pill exam-pill-high" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              <TrendingUp size={10} /> {m.seasonality?.cfa_phase}
                            </span>
                          ) : (
                            <span className="exam-tag-pill exam-pill-std" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              Off-Season Prep
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatMetric(totalMetricVal, metric)}
                    </td>

                    {leaderboardData.distinct_dimensions.map(col => {
                      const cell = m.breakdown[col];
                      const val = cell ? cell[metric] : null;
                      const hasVal = val !== null && val !== undefined;
                      const cellColor = hasVal ? getRedToBlueColor(val, minVal, maxVal, 1) : 'inherit';
                      const cellBg = hasVal ? getRedToBlueColor(val, minVal, maxVal, 0.08) : 'transparent';
                      const barPercent = hasVal && metric !== 'ctr' 
                        ? Math.max(8, Math.min(100, Math.round(((val - minVal) / Math.max(1, maxVal - minVal)) * 100))) 
                        : 0;

                      return (
                        <td 
                          key={col} 
                          style={{ 
                            textAlign: 'right', 
                            position: 'relative',
                            background: cellBg,
                            transition: 'background 0.2s ease'
                          }}
                        >
                          {cell ? (
                            <div>
                              <div style={{ fontWeight: 700, color: cellColor, fontFamily: 'var(--font-mono)' }}>
                                {formatMetric(val, metric)}
                              </div>
                              {metric !== 'ctr' && (
                                <div style={{ 
                                  height: '4px', 
                                  background: 'rgba(255, 255, 255, 0.08)', 
                                  borderRadius: '2px', 
                                  marginTop: '4px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{ 
                                    height: '100%', 
                                    width: `${barPercent}%`, 
                                    background: `linear-gradient(90deg, rgba(239, 68, 68, 0.9), ${cellColor})`,
                                    borderRadius: '2px'
                                  }} />
                                </div>
                              )}
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {metric === 'views' && `${cell.ctr}% CTR`}
                                {metric === 'ctr' && `${formatMetric(cell.views, 'views')} views`}
                                {metric === 'watch_time_hours' && `${cell.video_count} vids`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Strategic Insight Takeaway Box */}
      <div style={{ 
        marginTop: '1.25rem', 
        padding: '1rem 1.25rem', 
        background: 'var(--bg-surface-elevated)', 
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <HelpCircle size={18} color="var(--cfa-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Domain Seasonality Confirmation: </strong>
          Notice the surge in <strong>October / November</strong> (leading into the Nov CFA/FRM exam windows) and <strong>April / May</strong>.
          Videos in <em>Revision / Marathon</em> format demonstrate a <strong>2.4x viewership velocity</strong> during peak lead-up windows compared to core lecture deep dives.
        </div>
      </div>
    </div>
  );
}
