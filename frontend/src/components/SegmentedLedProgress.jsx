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
  height = 18,
  glowColor = '#26FF9E'
}) {
  const pct = Math.min(100, Math.max(0, percentage));
  const activeSegments = pct > 0 ? Math.max(1, Math.round((pct / 100) * segmentsCount)) : 0;

  return (
    <div 
      style={{
        background: '#0B1320',
        borderRadius: '10px',
        padding: '5px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '3px',
        boxShadow: 'inset 0 1.5px 4px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(15, 23, 42, 0.15)',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {Array.from({ length: segmentsCount }).map((_, index) => {
        const isActive = index < activeSegments;
        const isLeading = index === activeSegments - 1;

        let background = 'rgba(16, 185, 129, 0.08)';
        let boxShadow = 'none';

        if (isActive) {
          if (isLeading) {
            background = glowColor;
            boxShadow = `0 0 8px ${glowColor}, 0 0 12px rgba(38, 255, 158, 0.6)`;
          } else {
            background = 'linear-gradient(180deg, #10B981 0%, #059669 100%)';
            boxShadow = '0 0 4px rgba(16, 185, 129, 0.35)';
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
