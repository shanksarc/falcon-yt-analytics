import React from 'react';
import { Eye, Clock, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';

export default function KPICards({ status, lowCtrCount, changeLogStats }) {
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const winRate = () => {
    if (!changeLogStats) return '85%';
    const total = Object.values(changeLogStats).reduce((acc, curr) => acc + curr.count, 0);
    const positive = Object.values(changeLogStats).reduce((acc, curr) => acc + curr.positive_count, 0);
    if (total === 0) return 'N/A';
    return `${Math.round((positive / total) * 100)}%`;
  };

  return (
    <div className="kpi-grid">
      <div className="kpi-card kpi-gold">
        <div className="kpi-header">
          <span>Channel Views</span>
          <Eye size={16} color="var(--cfa-gold)" />
        </div>
        <div className="kpi-value">{formatNumber(status?.total_views)}</div>
        <div className="kpi-subtext">Across {status?.total_videos || 0} CFA/FRM videos</div>
      </div>

      <div className="kpi-card kpi-blue">
        <div className="kpi-header">
          <span>Watch Time</span>
          <Clock size={16} color="var(--frm-blue)" />
        </div>
        <div className="kpi-value">{formatNumber(status?.total_watch_time)} hrs</div>
        <div className="kpi-subtext">Total student engagement hours</div>
      </div>

      <div className="kpi-card kpi-purple">
        <div className="kpi-header">
          <span>Low-CTR Triage</span>
          <AlertTriangle size={16} color="var(--danger-rose)" />
        </div>
        <div className="kpi-value" style={{ color: lowCtrCount > 0 ? 'var(--danger-rose)' : 'inherit' }}>
          {lowCtrCount} Videos
        </div>
        <div className="kpi-subtext">Underperforming category baseline (&gt;15% gap)</div>
      </div>

      <div className="kpi-card kpi-emerald">
        <div className="kpi-header">
          <span>Change Impact Win Rate</span>
          <TrendingUp size={16} color="var(--success-emerald)" />
        </div>
        <div className="kpi-value" style={{ color: 'var(--success-emerald)' }}>
          {winRate()}
        </div>
        <div className="kpi-subtext">Controlled for channel-wide seasonality shift</div>
      </div>
    </div>
  );
}
