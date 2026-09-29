import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, UploadCloud, RefreshCw } from 'lucide-react';
import ShortsPlannerHub from '../components/ShortsPlannerHub';
import PlanShortModal from '../components/PlanShortModal';
import BulkShortsModal from '../components/BulkShortsModal';
import ErrorBoundary from '../components/ErrorBoundary';

export default function ShortsPlannerView({ onSelectItem, selectedItem }) {
  const [allLists, setAllLists] = useState([]);
  const [showPlanShortModal, setShowPlanShortModal] = useState(false);
  const [showBulkShortsModal, setShowBulkShortsModal] = useState(false);
  const [editingShort, setEditingShort] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/lists');
      const data = await res.json();
      setAllLists(data.all_lists || []);
    } catch (err) {
      console.error('Failed to load lists for shorts planner:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'rgba(234, 88, 12, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EA580C'
          }}>
            <Sparkles size={17} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
            YouTube Shorts Hub
          </h1>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowBulkShortsModal(true)}
            className="btn-ghost"
            style={{
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '0.8rem',
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="Import multiple shorts from spreadsheet or CSV"
          >
            <UploadCloud size={14} />
            <span>Bulk Import</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingShort(null);
              setShowPlanShortModal(true);
            }}
            className="soft-button-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '9999px',
              cursor: 'pointer',
              border: 'none',
              background: '#1E56E3',
              color: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(30, 86, 227, 0.3)'
            }}
          >
            <Plus size={15} />
            <span>Plan Short</span>
          </button>
        </div>
      </div>

      {/* Main Shorts Hub Content */}
      <ErrorBoundary title="Shorts Hub Error">
        <ShortsPlannerHub
          key={`shorts-hub-${refreshKey}`}
          allLists={allLists}
          onOpenPlanShortModal={() => {
            setEditingShort(null);
            setShowPlanShortModal(true);
          }}
          onOpenBulkShortsModal={() => setShowBulkShortsModal(true)}
          onEditShort={(short) => {
            setEditingShort(short);
            setShowPlanShortModal(true);
          }}
          onRefreshAll={handleRefresh}
        />
      </ErrorBoundary>

      {/* Modals */}
      {showPlanShortModal && (
        <PlanShortModal
          editingShort={editingShort}
          allLists={allLists}
          onClose={() => {
            setShowPlanShortModal(false);
            setEditingShort(null);
          }}
          onSuccess={() => {
            setShowPlanShortModal(false);
            setEditingShort(null);
            handleRefresh();
          }}
        />
      )}

      {showBulkShortsModal && (
        <BulkShortsModal
          allLists={allLists}
          onClose={() => setShowBulkShortsModal(false)}
          onSuccess={() => {
            setShowBulkShortsModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
