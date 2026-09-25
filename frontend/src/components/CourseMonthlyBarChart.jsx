import React, { useState, useMemo } from 'react';
import { BarChart3, Layers, TrendingUp, Eye, Clock, Percent, Calendar, Check, Award } from 'lucide-react';

const COURSE_COLORS = {
  'CFA L1': '#10B981',       // Emerald
  'CFA L2': '#3B82F6',       // Royal Blue
  'FRM Part 1': '#F59E0B',   // Warm Amber Gold
  'FRM Part 2': '#8B5CF6',   // Purple
  'General Prep': '#06B6D4'  // Cyan
};

const COLOR_FALLBACKS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1', '#14B8A6'];

function formatMetricValue(val, metric) {
  if (val === undefined || val === null) return '0';
  if (metric === 'views') {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + 'k';
    return val.toLocaleString();
  }
  if (metric === 'watch_time_hours') {
    if (val >= 1_000) return (val / 1_000).toFixed(1) + 'k hrs';
    return `${Math.round(val).toLocaleString()} hrs`;
  }
  if (metric === 'ctr') {
    return `${Number(val).toFixed(1)}%`;
  }
  return val.toLocaleString();
}

function formatMonthShort(monthStr) {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = parseInt(parts[1], 10) - 1;
  const yearShort = parts[0] ? `'${parts[0].slice(-2)}` : '';
  return `${months[idx] || parts[1]} ${yearShort}`;
}

function getExamMonthLabel(monthStr) {
  if (!monthStr) return null;
  const monthNum = parseInt(monthStr.split('-')[1], 10);
  if (monthNum === 2) return 'CFA Exam';
  if (monthNum === 5) return 'CFA & FRM';
  if (monthNum === 8) return 'CFA Exam';
  if (monthNum === 11) return 'CFA & FRM';
  if (monthNum === 4 || monthNum === 10) return 'Peak Lead-up';
  return null;
}

export default function CourseMonthlyBarChart({ courseData, activeMetric = 'views' }) {
  const [chartMode, setChartMode] = useState('grouped'); // 'grouped' | 'stacked'
  const [hiddenCourses, setHiddenCourses] = useState({});
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Distinct courses
  const courses = useMemo(() => {
    if (courseData?.distinct_dimensions && courseData.distinct_dimensions.length > 0) {
      return courseData.distinct_dimensions;
    }
    return ['CFA L1', 'CFA L2', 'FRM Part 1', 'FRM Part 2', 'General Prep'];
  }, [courseData]);

  // Chronological 12 months (oldest to newest: Jan -> Dec)
  const months = useMemo(() => {
    if (!courseData?.months) return [];
    return [...courseData.months]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [courseData]);

  const activeCourses = useMemo(() => {
    return courses.filter(c => !hiddenCourses[c]);
  }, [courses, hiddenCourses]);

  const toggleCourseVisibility = (c) => {
    setHiddenCourses(prev => ({
      ...prev,
      [c]: !prev[c]
    }));
  };

  const getCourseColor = (c, idx) => {
    return COURSE_COLORS[c] || COLOR_FALLBACKS[idx % COLOR_FALLBACKS.length];
  };

  // Top summary metrics
  const summary = useMemo(() => {
    if (months.length === 0) return null;

    let totalVal = 0;
    const courseTotals = {};
    courses.forEach(c => { courseTotals[c] = 0; });

    let peakMonthObj = null;
    let peakMonthVal = -1;

    let examTotal = 0;
    let examCount = 0;
    let nonExamTotal = 0;
    let nonExamCount = 0;

    months.forEach(m => {
      let mTotal = 0;
      courses.forEach(c => {
        const val = m.breakdown?.[c]?.[activeMetric] || 0;
        if (!hiddenCourses[c]) {
          totalVal += val;
          mTotal += val;
          courseTotals[c] += val;
        }
      });

      if (mTotal > peakMonthVal) {
        peakMonthVal = mTotal;
        peakMonthObj = m;
      }

      const isExam = [2, 5, 8, 11].includes(parseInt(m.month.split('-')[1], 10));
      if (isExam) {
        examTotal += mTotal;
        examCount++;
      } else {
        nonExamTotal += mTotal;
        nonExamCount++;
      }
    });

    let topCourseName = null;
    let topCourseVal = -1;
    Object.entries(courseTotals).forEach(([c, val]) => {
      if (val > topCourseVal) {
        topCourseVal = val;
        topCourseName = c;
      }
    });

    const examAvg = examCount > 0 ? examTotal / examCount : 0;
    const nonExamAvg = nonExamCount > 0 ? nonExamTotal / nonExamCount : 0;
    const examLift = nonExamAvg > 0 ? Math.round(((examAvg - nonExamAvg) / nonExamAvg) * 100) : 0;

    return {
      totalVal,
      topCourseName,
      topCourseVal,
      topCourseShare: totalVal > 0 ? Math.round((topCourseVal / totalVal) * 100) : 0,
      peakMonth: peakMonthObj?.month,
      peakMonthVal,
      examLift
    };
  }, [months, courses, hiddenCourses, activeMetric]);

  // Chart Dimensions
  const svgWidth = 960;
  const svgHeight = 290;
  const padLeft = 60;
  const padRight = 24;
  const padTop = 28;
  const padBottom = 48;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const numMonths = months.length || 1;
  const slotWidth = plotW / numMonths;

  // Max value calculation for scale
  const maxVal = useMemo(() => {
    let max = 0;
    if (chartMode === 'grouped') {
      months.forEach(m => {
        activeCourses.forEach(c => {
          const val = m.breakdown?.[c]?.[activeMetric] || 0;
          if (val > max) max = val;
        });
      });
    } else {
      // Stacked
      months.forEach(m => {
        let sum = 0;
        activeCourses.forEach(c => {
          sum += (m.breakdown?.[c]?.[activeMetric] || 0);
        });
        if (sum > max) max = sum;
      });
    }
    return max > 0 ? max * 1.12 : 100; // 12% headroom
  }, [months, activeCourses, activeMetric, chartMode]);

  // Y-axis Ticks
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = (maxVal / count) * i;
      const y = (padTop + plotH) - (i * (plotH / count));
      ticks.push({ val, y });
    }
    return ticks;
  }, [maxVal, plotH, padTop]);

  if (!courseData || months.length === 0) {
    return null;
  }

  const metricLabel = activeMetric === 'views' ? 'Views' : (activeMetric === 'watch_time_hours' ? 'Watch Time' : 'CTR');

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem 1.35rem',
      marginBottom: '1.5rem',
      position: 'relative'
    }}>
      {/* Chart Top Header & Summary Stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.15rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#3B82F6',
              padding: '5px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BarChart3 size={16} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              12-Month Course Performance Trend
            </h3>
            <span style={{
              fontSize: '0.68rem',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontWeight: 600
            }}>
              Past 12 Months
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0 2rem' }}>
            Visualizing historical {metricLabel.toLowerCase()} trajectory and exam-cycle spikes across each curriculum
          </p>
        </div>

        {/* Controls: Grouped vs Stacked */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2px'
          }}>
            <button
              onClick={() => setChartMode('grouped')}
              className={`btn-secondary ${chartMode === 'grouped' ? 'btn-primary' : ''}`}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.74rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Side-by-side grouped bars for course comparison"
            >
              <BarChart3 size={13} />
              <span>Grouped</span>
            </button>
            <button
              onClick={() => setChartMode('stacked')}
              className={`btn-secondary ${chartMode === 'stacked' ? 'btn-primary' : ''}`}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.74rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Stacked bars showing aggregate channel share"
            >
              <Layers size={13} />
              <span>Stacked</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Level Trajectory KPI Cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          {/* Total 12-Month Volume */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              12-Month Total {metricLabel}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatMetricValue(summary.totalVal, activeMetric)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Across active courses
            </div>
          </div>

          {/* Top Course */}
          {summary.topCourseName && (
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Leading Course
                </span>
                <Award size={13} color={COURSE_COLORS[summary.topCourseName] || '#3EA65E'} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: COURSE_COLORS[summary.topCourseName] || 'var(--text-primary)', marginTop: '2px' }}>
                {summary.topCourseName}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                {formatMetricValue(summary.topCourseVal, activeMetric)} ({summary.topCourseShare}% share)
              </div>
            </div>
          )}

          {/* Peak Month */}
          {summary.peakMonth && (
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Peak Month
                </span>
                <Calendar size={13} color="#E8A33D" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#E8A33D', marginTop: '2px' }}>
                {formatMonthShort(summary.peakMonth)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                {formatMetricValue(summary.peakMonthVal, activeMetric)} {metricLabel.toLowerCase()}
              </div>
            </div>
          )}

          {/* Exam Lift Velocity */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Exam Surge Impact
              </span>
              <TrendingUp size={13} color="#3EA65E" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: summary.examLift >= 0 ? '#3EA65E' : 'var(--text-secondary)', marginTop: '2px' }}>
              {summary.examLift >= 0 ? `+${summary.examLift}%` : `${summary.examLift}%`}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Exam months vs baseline
            </div>
          </div>
        </div>
      )}

      {/* SVG Bar Chart Canvas */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', minWidth: '680px', display: 'block' }}
        >
          <defs>
            {/* Soft vertical gradient for exam window background stripes */}
            <linearGradient id="examStripeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(232, 163, 61, 0.08)" />
              <stop offset="100%" stopColor="rgba(232, 163, 61, 0.01)" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={svgWidth - padRight}
                y2={tick.y}
                stroke="var(--border-hairline)"
                strokeDasharray={i === 0 ? "none" : "3 4"}
                strokeWidth={i === 0 ? "1.5" : "1"}
              />
              <text
                x={padLeft - 8}
                y={tick.y + 3.5}
                fill="var(--text-muted)"
                fontSize="9.5"
                fontWeight="500"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                {formatMetricValue(tick.val, activeMetric)}
              </text>
            </g>
          ))}

          {/* Exam Seasonality Background Highlights */}
          {months.map((m, idx) => {
            const examTag = getExamMonthLabel(m.month);
            if (!examTag) return null;
            const slotX = padLeft + (idx * slotWidth);

            return (
              <g key={`exam_stripe_${idx}`}>
                <rect
                  x={slotX + 2}
                  y={padTop}
                  width={slotWidth - 4}
                  height={plotH}
                  fill="url(#examStripeGradient)"
                  rx="4"
                />
                <text
                  x={slotX + slotWidth / 2}
                  y={padTop - 6}
                  fill="#E8A33D"
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="middle"
                  letterSpacing="0.3px"
                >
                  {examTag}
                </text>
              </g>
            );
          })}

          {/* Render Bars (Grouped or Stacked) */}
          {months.map((m, mIdx) => {
            const slotX = padLeft + (mIdx * slotWidth);
            const isMonthHovered = hoveredPoint?.month === m.month;

            if (chartMode === 'grouped') {
              // Grouped side-by-side
              const k = activeCourses.length || 1;
              const barW = Math.max(3, Math.min(11, (slotWidth * 0.72) / k));
              const groupW = k * barW + (k - 1) * 2;
              const groupStartX = slotX + (slotWidth - groupW) / 2;

              return (
                <g key={`m_${m.month}`}>
                  {/* Invisible full-slot hover catcher */}
                  <rect
                    x={slotX}
                    y={padTop}
                    width={slotWidth}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHoveredPoint({ month: m.month, data: m })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  />

                  {activeCourses.map((c, cIdx) => {
                    const val = m.breakdown?.[c]?.[activeMetric] || 0;
                    const barH = (val / maxVal) * plotH;
                    const barX = groupStartX + cIdx * (barW + 2);
                    const barY = (padTop + plotH) - barH;
                    const col = getCourseColor(c, cIdx);
                    const isHovered = isMonthHovered && (!hoveredPoint.course || hoveredPoint.course === c);

                    return (
                      <g key={c}>
                        <rect
                          x={barX}
                          y={barY}
                          width={barW}
                          height={Math.max(2, barH)}
                          fill={col}
                          rx="2"
                          opacity={isHovered ? 1 : (isMonthHovered ? 0.75 : 0.88)}
                          style={{
                            transition: 'opacity 0.15s ease, y 0.2s ease, height 0.2s ease',
                            filter: isHovered ? `drop-shadow(0 0 6px ${col}80)` : 'none'
                          }}
                          onMouseEnter={() => setHoveredPoint({ month: m.month, course: c, val, data: m })}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            } else {
              // Stacked
              const barW = Math.min(28, slotWidth * 0.52);
              const barX = slotX + (slotWidth - barW) / 2;
              let currentY = padTop + plotH;

              return (
                <g key={`m_stacked_${m.month}`}>
                  {/* Invisible full-slot hover catcher */}
                  <rect
                    x={slotX}
                    y={padTop}
                    width={slotWidth}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHoveredPoint({ month: m.month, data: m })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  />

                  {activeCourses.map((c, cIdx) => {
                    const val = m.breakdown?.[c]?.[activeMetric] || 0;
                    const segH = (val / maxVal) * plotH;
                    const segY = currentY - segH;
                    currentY = segY;
                    const col = getCourseColor(c, cIdx);
                    const isHovered = isMonthHovered && (!hoveredPoint.course || hoveredPoint.course === c);

                    return (
                      <rect
                        key={c}
                        x={barX}
                        y={segY}
                        width={barW}
                        height={Math.max(1, segH)}
                        fill={col}
                        opacity={isHovered ? 1 : 0.88}
                        style={{
                          transition: 'opacity 0.15s ease',
                          filter: isHovered ? `drop-shadow(0 0 6px ${col}80)` : 'none'
                        }}
                        onMouseEnter={() => setHoveredPoint({ month: m.month, course: c, val, data: m })}
                      />
                    );
                  })}
                </g>
              );
            }
          })}

          {/* X-Axis Month Labels */}
          {months.map((m, mIdx) => {
            const slotX = padLeft + (mIdx * slotWidth);
            const labelX = slotX + slotWidth / 2;
            const labelY = padTop + plotH + 16;
            const isExam = [2, 5, 8, 11].includes(parseInt(m.month.split('-')[1], 10));
            const isHovered = hoveredPoint?.month === m.month;

            return (
              <g key={`label_${m.month}`}>
                <text
                  x={labelX}
                  y={labelY}
                  fill={isHovered ? 'var(--text-primary)' : (isExam ? '#E8A33D' : 'var(--text-muted)')}
                  fontSize="9.5"
                  fontWeight={isExam || isHovered ? '700' : '500'}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {formatMonthShort(m.month)}
                </text>
                {isExam && (
                  <circle
                    cx={labelX}
                    cy={labelY + 8}
                    r="2"
                    fill="#E8A33D"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Tooltip Card on Hover */}
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          top: '4.75rem',
          right: '1.5rem',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.85rem',
          zIndex: 10,
          minWidth: '220px',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.35rem', marginBottom: '0.45rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {formatMonthShort(hoveredPoint.month)}
            </span>
            {getExamMonthLabel(hoveredPoint.month) && (
              <span style={{ fontSize: '0.65rem', background: 'rgba(232, 163, 61, 0.15)', color: '#E8A33D', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                {getExamMonthLabel(hoveredPoint.month)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.73rem' }}>
            {activeCourses.map((c, i) => {
              const val = hoveredPoint.data?.breakdown?.[c]?.[activeMetric] || 0;
              const isSelected = hoveredPoint.course === c;
              const col = getCourseColor(c, i);

              return (
                <div key={c} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: col, flexShrink: 0 }} />
                    <span>{c}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatMetricValue(val, activeMetric)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Course Legend */}
      <div style={{
        marginTop: '0.85rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Courses:</span>
          {courses.map((c, i) => {
            const col = getCourseColor(c, i);
            const isVisible = !hiddenCourses[c];

            return (
              <button
                key={c}
                onClick={() => toggleCourseVisibility(c)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: `1px solid ${isVisible ? col : 'var(--border-subtle)'}`,
                  background: isVisible ? `${col}15` : 'transparent',
                  color: isVisible ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: isVisible ? 600 : 400,
                  transition: 'all 0.15s ease'
                }}
                title={`Click to ${isVisible ? 'hide' : 'show'} ${c}`}
              >
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isVisible ? col : 'var(--text-muted)'
                }} />
                <span>{c}</span>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E8A33D', display: 'inline-block' }} />
          <span>Orange markers indicate CFA/FRM exam windows</span>
        </div>
      </div>
    </div>
  );
}
