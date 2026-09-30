import React from 'react';

/**
 * SegmentedLedProgress
 * Renders a segmented LED equalizer / VU-meter progress bar 
 * inspired by studio hardware and digital instrument panels.
 */
export default function SegmentedLedProgress({
  percentage = 0,
  segmentsCount = 24,
  variant = 'capsule', // 'capsule' | 'bar'
  height = 14,
  color, // optional color override (defaults to theme electric blue)
  glowColor,
  trackBg,
  inactiveColor,
  style = {}
}) {
  const pct = Math.min(100, Math.max(0, percentage));
  const activeSegments = pct > 0 ? Math.max(1, Math.round((pct / 100) * segmentsCount)) : 0;

  // Active theme color (defaults to theme vivid electric blue)
  const isCustomColor = Boolean(color);
  const activeColor = color || '#2563EB';
  const activeGlow = glowColor || (isCustomColor ? activeColor : '#60A5FA');

  return (
    <div 
      style={{
        background: trackBg || '#E2E6ED',
        borderRadius: '10px',
        padding: '4px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '3px',
        boxShadow: 'inset 2px 2px 5px rgba(166, 175, 195, 0.45), inset -2px -2px 5px rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(166, 175, 195, 0.25)',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {Array.from({ length: segmentsCount }).map((_, index) => {
        const isActive = index < activeSegments;
        const isLeading = index === activeSegments - 1;

        let background = inactiveColor || 'rgba(166, 175, 195, 0.35)';
        let boxShadow = 'none';

        if (isActive) {
          if (isLeading) {
            background = activeGlow;
            boxShadow = `0 0 6px ${activeGlow}, 0 0 10px rgba(37, 99, 235, 0.35)`;
          } else {
            background = isCustomColor 
              ? activeColor 
              : 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)';
            boxShadow = '0 1px 3px rgba(37, 99, 235, 0.25)';
          }
        }

        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${height}px`,
              borderRadius: variant === 'capsule' ? '9999px' : '2px',
              background,
              boxShadow,
              transition: 'all 0.3s ease',
              minWidth: '2.5px'
            }}
          />
        );
      })}
    </div>
  );
}
