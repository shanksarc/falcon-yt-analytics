import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowRight, Sparkles, CheckCircle2, History, Layers } from 'lucide-react';

export default function ChangeLogView({ onOpenNewChangeModal }) {
  const [data, setData] = useState({ changes: [], strategy_insights: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChangeLogs();
  }, []);

  const fetchChangeLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/change-log');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load change log:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Strategy Performance Rollup Section */}
      <div className="content-card">
        <div className="content-card-header">
          <div className="card-title-group">
            <h2>Strategic optimization insights</h2>
            <p>
              Second-order macro learnings across change types (Title vs Thumbnail vs Combined).
            </p>
          </div>

          <button 
            className="btn-primary" 
            onClick={() => onOpenNewChangeModal()}
            id="btn-add-change-log"
          >
            <Plus size={15} /> Log video change
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {['Thumbnail Only', 'Title Only', 'Both'].map((strat) => {
            const insight = data.strategy_insights[strat] || { count: 0, avg_impact: 0.0, win_rate: 0 };
            return (
              <div 
                key={strat} 
                style={{ 
                  background: 'var(--bg-surface-elevated)', 
                  padding: '1.25rem', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{strat}</span>
                  <span className="badge badge-format">{insight.count} Tests</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: insight.avg_impact >= 0 ? 'var(--success-emerald)' : 'var(--danger-rose)' }}>
                  {insight.avg_impact >= 0 ? `+${insight.avg_impact}%` : `${insight.avg_impact}%`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Net CTR Lift · {insight.win_rate}% Win Rate
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Changes Timeline Table */}
      <div className="content-card">
        <div className="content-card-header">
          <div className="card-title-group">
            <h3>Logged Title & Thumbnail Experiments</h3>
            <p>14-day pre/post comparison with confounder subtraction formula: (CTR_after − CTR_before) − (ChannelCTR_after − ChannelCTR_before)</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading experiment history...
          </div>
        ) : data.changes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No change experiments logged yet. Click "Log Video Change" above to track an edit.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '100px' }}>Date</th>
                  <th style={{ minWidth: '260px' }}>Video & Modification</th>
                  <th>Type</th>
                  <th>14d Video CTR</th>
                  <th>Channel Drift</th>
                  <th style={{ textAlign: 'right' }}>Net Impact Score</th>
                </tr>
              </thead>
              <tbody>
                {data.changes.map((c) => {
                  const isPositive = c.impact_score > 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {c.change_date}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: '440px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="badge badge-cfa" style={{ fontSize: '0.65rem' }}>{c.course}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.current_title}</span>
                          </div>

                          {c.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                              📝 {c.notes}
                            </div>
                          )}

                          {c.old_title && c.new_title && c.old_title !== c.new_title && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span style={{ textDecoration: 'line-through' }}>{c.old_title}</span>
                              {' '}<ArrowRight size={10} style={{ display: 'inline' }} />{' '}
                              <span style={{ color: 'var(--cfa-gold)' }}>{c.new_title}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-format">
                          {c.change_type}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{c.ctr_before_14d}%</span>
                          <ArrowRight size={12} color="var(--text-muted)" />
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.ctr_after_14d}%</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Δ {c.ctr_after_14d - c.ctr_before_14d > 0 ? '+' : ''}{(c.ctr_after_14d - c.ctr_before_14d).toFixed(1)}% raw
                        </div>
                      </td>

                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {c.channel_ctr_before_14d}% → {c.channel_ctr_after_14d}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Shift: {(c.channel_ctr_after_14d - c.channel_ctr_before_14d) > 0 ? '+' : ''}{(c.channel_ctr_after_14d - c.channel_ctr_before_14d).toFixed(1)}%
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.3rem', 
                          padding: '0.3rem 0.65rem',
                          borderRadius: 'var(--radius-md)',
                          background: isPositive ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: isPositive ? 'var(--success-emerald)' : 'var(--danger-rose)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isPositive ? `+${c.impact_score}%` : `${c.impact_score}%`}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Lift vs Seasonality
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
