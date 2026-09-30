import React from 'react';
import { CalendarDays, Zap, LayoutDashboard, BookOpen, SlidersHorizontal, Menu } from 'lucide-react';

export default function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenMenu,
  onOpenInspector,
  hasSelectedItem = false
}) {
  const tabs = [
    { id: 'planner', label: 'Planner', icon: CalendarDays },
    { id: 'shorts', label: 'Shorts', icon: Zap },
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            title={tab.label}
          >
            <div className="mobile-nav-icon-wrap">
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}

      {/* Inspector / YouTube Impact Toggle */}
      <button
        onClick={onOpenInspector}
        className="mobile-nav-btn"
        title="Inspector & YouTube Impact"
      >
        <div className="mobile-nav-icon-wrap" style={{ position: 'relative' }}>
          <SlidersHorizontal size={19} strokeWidth={1.8} />
          {hasSelectedItem && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '8px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#EA580C',
                boxShadow: '0 0 0 1.5px #EBEEF2'
              }}
            />
          )}
        </div>
        <span>Inspector</span>
      </button>

      {/* Full Menu Drawer Button */}
      <button
        onClick={onOpenMenu}
        className="mobile-nav-btn"
        title="More Views & Settings"
      >
        <div className="mobile-nav-icon-wrap">
          <Menu size={19} strokeWidth={1.8} />
        </div>
        <span>Menu</span>
      </button>
    </nav>
  );
}
