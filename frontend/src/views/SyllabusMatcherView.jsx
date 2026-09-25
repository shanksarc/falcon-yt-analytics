import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Plus, CheckCircle2, AlertTriangle, AlertCircle, Search, 
  ChevronRight, ChevronDown, Sparkles, Filter, RefreshCw, Layers,
  ExternalLink, Calendar, Trash2, Check, Clock, Film,
  BarChart3, LayoutDashboard, Target, Award, HelpCircle, Info, Compass, CheckCheck, Zap, ArrowUpRight
} from 'lucide-react';
import AddTopicsModal from '../components/AddTopicsModal';
import TopicMatchReviewModal from '../components/TopicMatchReviewModal';
import TopicCellDetailModal from '../components/TopicCellDetailModal';
import PlanTopicModal from '../components/PlanTopicModal';
import FullVideoAnalyticsModal from '../components/FullVideoAnalyticsModal';

// Format definitions and styling for consistent UI across the dashboard
export const FORMAT_CONFIGS = [
  {
    key: 'Discussion',
    altKey: 'topic_discussion',
    label: 'Topic Discussion',
    shortLabel: 'Discussion',
    icon: '📘',
    primaryColor: '#2563EB', // Blue
    secondaryColor: '#60A5FA',
    bgLight: '#EFF6FF',
    borderLight: '#BFDBFE',
    description: 'Core conceptual explanations'
  },
  {
    key: 'Revision',
    altKey: 'revision',
    label: 'Revision',
    shortLabel: 'Revision',
    icon: '📙',
    primaryColor: '#D97706', // Amber
    secondaryColor: '#FBBF24',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    description: 'Rapid summary & formula recaps'
  },
  {
    key: 'Question Solving',
    altKey: 'question_solving',
    label: 'Question Solving',
    shortLabel: 'Questions',
    icon: '🟣',
    primaryColor: '#7C3AED', // Purple
    secondaryColor: '#C084FC',
    bgLight: '#FAF5FF',
    borderLight: '#E9D5FF',
    description: 'Curriculum & mock practice questions'
  },
  {
    key: 'General',
    altKey: 'general',
    label: 'General / Core',
    shortLabel: 'General',
    icon: '🟢',
    primaryColor: '#059669', // Emerald
    secondaryColor: '#34D399',
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    description: 'Foundations & orientation'
  }
];

// Natural alphanumeric comparator: treats R1 as R01, so R1 -> R2 -> R10 instead of R1 -> R10 -> R2
export function naturalSortCompare(a, b) {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
}

// SVG Speedometer Half Dial (0% - 100%)
export function HalfDialGauge({
  pct = 0,
  size = 130,
  strokeWidth = 9,
  color = null,
  trackColor = '#E2E8F0',
  label = '',
  sublabel = '',
  badge = null
}) {
  const clampedPct = Math.min(100, Math.max(0, Number(pct) || 0));
  const height = Math.round(size * 0.58);
  const cx = size / 2;
  const cy = height - 6;
  const radius = cx - strokeWidth - 4;
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength * (1 - clampedPct / 100);

  const activeColor = color || (
    clampedPct >= 75 ? '#10B981' :
    clampedPct >= 50 ? '#0284C7' :
    clampedPct >= 25 ? '#F59E0B' : '#E11D48'
  );

  const angleRad = (clampedPct / 100) * Math.PI;
  const tipX = cx - radius * Math.cos(angleRad);
  const tipY = cy - radius * Math.sin(angleRad);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${height}px`, overflow: 'hidden' }}>
        <svg width={size} height={height} style={{ overflow: 'visible' }}>
          {/* Background Half-Circle Track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Foreground Active Half-Circle Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />

          {/* Indicator Dot at current tip */}
          {clampedPct > 0 && (
            <circle
              cx={tipX}
              cy={tipY}
              r={strokeWidth * 0.55}
              fill="#FFFFFF"
              stroke={activeColor}
              strokeWidth={2.5}
              style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          )}

          {/* Baseline markers */}
          <circle cx={cx - radius} cy={cy} r={2} fill="#CBD5E1" />
          <circle cx={cx + radius} cy={cy} r={2} fill="#CBD5E1" />
        </svg>

        {/* Center Percentage Display */}
        <div style={{
          position: 'absolute',
          bottom: '0px',
          left: 0,
          right: 0,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          lineHeight: 1
        }}>
          <span style={{
            fontSize: `${Math.round(size * 0.22)}px`,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.03em'
          }}>
            {Math.round(clampedPct)}%
          </span>
          {badge && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: activeColor,
              marginTop: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {badge}
            </span>
          )}
        </div>
      </div>

      {(label || sublabel) && (
        <div style={{ marginTop: '6px' }}>
          {label && (
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
              {label}
            </div>
          )}
          {sublabel && (
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 3-color single progress bar: Blue (Uploaded), Yellow (Planned), Gray (Remaining/Missing)
export function ThreeColorProgressBar({
  coveredTopics = 0,
  plannedCount = 0,
  applicableTopics = 0,
  width = '90px',
  height = 6,
  showLabel = true
}) {
  const total = applicableTopics > 0 ? applicableTopics : 1;
  const uploadedPct = Math.min(100, Math.max(0, (coveredTopics / total) * 100));
  const plannedPct = Math.min(100 - uploadedPct, Math.max(0, (plannedCount / total) * 100));

  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <div style={{
        display: 'flex',
        height: `${height}px`,
        width: '100%',
        borderRadius: '9999px',
        overflow: 'hidden',
        background: '#E2E8F0' // Gray (missing)
      }}>
        {uploadedPct > 0 && (
          <div
            style={{
              width: `${uploadedPct}%`,
              background: '#2563EB', // Blue for uploaded
              transition: 'width 0.3s ease'
            }}
            title={`Uploaded: ${coveredTopics} topics (${Math.round(uploadedPct)}%)`}
          />
        )}
        {plannedPct > 0 && (
          <div
            style={{
              width: `${plannedPct}%`,
              background: '#F59E0B', // Yellow for planned
              transition: 'width 0.3s ease'
            }}
            title={`Planned: ${plannedCount} entries (${Math.round(plannedPct)}%)`}
          />
        )}
      </div>
      {showLabel && (
        <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#2563EB', fontWeight: 700 }}>{Math.round(uploadedPct)}%</span>
          <span>({coveredTopics}/{applicableTopics})</span>
        </div>
      )}
    </div>
  );
}

// Mini Half Dial for Course and Subject rows or compact cards
export function MiniHalfDial({ pct = 0, label = '', color = null, size = 62 }) {
  const clampedPct = Math.min(100, Math.max(0, Number(pct) || 0));
  const strokeWidth = 5.5;
  const height = Math.round(size * 0.58);
  const cx = size / 2;
  const cy = height - 3;
  const radius = cx - strokeWidth - 2;
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength * (1 - clampedPct / 100);

  const activeColor = color || (
    clampedPct >= 75 ? '#10B981' :
    clampedPct >= 50 ? '#0284C7' :
    clampedPct >= 25 ? '#F59E0B' : '#E11D48'
  );

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${height}px` }}>
        <svg width={size} height={height}>
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 800,
          color: '#0F172A',
          lineHeight: 1
        }}>
          {Math.round(clampedPct)}%
        </div>
      </div>
      {label && (
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
    </div>
  );
}

// Format-wise completion progress bar
export function FormatProgressBar({
  formatKey,
  label,
  icon,
  data,
  primaryColor = '#2563EB',
  secondaryColor = '#60A5FA',
  compact = false
}) {
  const safeData = data || { covered_topics: 0, applicable_topics: 0, total_topics: 0, pct: 0, video_count: 0, planned_count: 0 };
  const pct = Math.min(100, Math.max(0, safeData.pct || 0));

  if (compact) {
    return (
      <div style={{ flex: 1, minWidth: '120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
            <span>{icon}</span>
            <span>{label}</span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: primaryColor }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div style={{
          height: '6px',
          width: '100%',
          background: '#F1F5F9',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            borderRadius: '9999px',
            transition: 'width 0.5s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '10px', color: '#94A3B8' }}>
          <span>{safeData.covered_topics}/{safeData.applicable_topics}</span>
          <span>{safeData.video_count || 0} vids</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '16px 18px',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: `${primaryColor}15`,
            color: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {label}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              {safeData.video_count || 0} published videos
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: primaryColor, lineHeight: 1 }}>
            {Math.round(pct)}%
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginTop: '3px' }}>
            {safeData.covered_topics} / {safeData.applicable_topics} topics
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div style={{
        height: '8px',
        width: '100%',
        background: '#F1F5F9',
        borderRadius: '9999px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
          borderRadius: '9999px',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
        <span>{Math.max(0, safeData.applicable_topics - safeData.covered_topics)} unrecorded topics</span>
        {safeData.planned_count > 0 ? (
          <span style={{ color: '#EA580C', fontWeight: 700 }}>
            {safeData.planned_count} planned
          </span>
        ) : (
          <span style={{ color: '#10B981', fontWeight: 600 }}>
            {pct === 100 ? 'Complete' : `${Math.round(pct)}% complete`}
          </span>
        )}
      </div>
    </div>
  );
}

// Collapsible Coverage Clarity Guide component
export function CoverageClarityGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.9) 0%, rgba(245, 243, 255, 0.9) 100%)',
      border: '1px solid rgba(199, 210, 254, 0.7)',
      borderRadius: '16px',
      padding: '12px 18px',
      marginBottom: '18px'
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#6366F1',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HelpCircle size={16} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#312E81' }}>
              Coverage Guide: Topic Reach (Basic) vs. Complete Mastery (Full)
            </span>
            <span style={{ fontSize: '12px', color: '#6366F1', marginLeft: '8px', fontWeight: 600 }}>
              {isOpen ? '▲ Collapse guide' : '▼ Click to understand how they differ & why Full Coverage is 0%'}
            </span>
          </div>
        </div>
        <div style={{ color: '#6366F1' }}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {isOpen && (
        <div style={{
          marginTop: '14px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(199, 210, 254, 0.6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px'
        }}>
          {/* Card 1: Breadth */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>🎯</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0D9488' }}>
                Topic Reach (Basic Coverage)
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                background: '#CCFBF1',
                color: '#0F766E',
                padding: '2px 6px',
                borderRadius: '6px'
              }}>
                BREADTH
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
              <b>"Did we introduce this topic on YouTube?"</b>
              <br />
              A topic is counted as <b>Reached</b> if it has <b>at least 1 video</b> published in <i>any</i> format (Topic Discussion, Revision, or Practice Questions).
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
              💡 <i>Answers: "What percentage of the syllabus syllabus footprint is active on our channel?"</i>
            </div>
          </div>

          {/* Card 2: Depth */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>🏆</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#7C3AED' }}>
                Complete Mastery (Full Coverage)
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                background: '#EDE9FE',
                color: '#6D28D9',
                padding: '2px 6px',
                borderRadius: '6px'
              }}>
                DEPTH
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
              <b>"Is the full learning journey complete?"</b>
              <br />
              A topic achieves <b>Mastery</b> only when <b>every required format</b> is published (Topic Discussion + Revision + Questions, skipping any marked N/A).
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
              💡 <i>If you only have Discussion videos recorded, Mastery will remain 0% until you also publish Revision & Question Solving!</i>
            </div>
          </div>

          {/* Card 3: Format Breakdown */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>📊</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB' }}>
                Format-Wise Progress Bars
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                background: '#DBEAFE',
                color: '#1E40AF',
                padding: '2px 6px',
                borderRadius: '6px'
              }}>
                FORMAT PROGRESS
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
              <b>"What should we record next?"</b>
              <br />
              Breaks down curriculum status across <b>📘 Topic Discussion</b>, <b>📙 Revision</b>, and <b>🟣 Question Solving</b> so you know exactly which video types are missing.
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
              💡 <i>Use the Course & Subject Completion Dashboard below to track recording queues!</i>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SyllabusMatcherView() {
  const [gridData, setGridData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'GAPS' | 'COVERED' | 'PLANNED'

  // Expand / collapse tracking
  const [expandedCourses, setExpandedCourses] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});

  // Coverage guide tooltip toggle
  const [showCoverageTooltip, setShowCoverageTooltip] = useState(false);

  // Quick plan next video for subject
  const handlePlanNextForSubject = (subject) => {
    if (!subject || !subject.topics || subject.topics.length === 0) return;
    const gapTopic = subject.topics.find(t => !t.is_full_covered || Object.values(t.formats || {}).some(f => f.state === 'red')) || subject.topics[0];
    setActivePlanTopic(gapTopic);
  };

  // Modals state
  const [showAddTopicsModal, setShowAddTopicsModal] = useState(false);
  const [showMatchReviewModal, setShowMatchReviewModal] = useState(false);
  const [showReverseMatcherModal, setShowReverseMatcherModal] = useState(false);
  const [activeCellDetail, setActiveCellDetail] = useState(null); // { topic, format, cellData }
  const [activePlanTopic, setActivePlanTopic] = useState(null); // topic object

  useEffect(() => {
    fetchGridData();
    fetchSessions();
  }, []);

  const fetchGridData = async () => {
    try {
      const res = await fetch('/api/syllabus/grid');
      const data = await res.json();
      setGridData(data);
    } catch (err) {
      console.error("Failed to load syllabus grid:", err);
      showToast('error', 'Failed to load syllabus grid data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/planner/sessions');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : (data?.sessions || []));
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessions([]);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleRunMatcher = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/syllabus/run-matcher', { method: 'POST' });
      const data = await res.json();
      showToast('success', `Matcher finished: Auto-linked ${data.auto_linked_count} videos, queued ${data.review_queue_added} for review.`);
      fetchGridData();
    } catch (err) {
      showToast('error', 'Failed to run matcher: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleNA = async (topicId, format, isNa) => {
    try {
      const res = await fetch('/api/syllabus/toggle-na', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, format, is_na: isNa })
      });
      if (res.ok) {
        showToast('success', `Updated ${format} cell to ${isNa ? 'Not Applicable' : 'Applicable'}`);
        fetchGridData();
        if (activeCellDetail) {
          setActiveCellDetail(prev => ({
            ...prev,
            cellData: {
              ...prev.cellData,
              is_na: isNa,
              state: isNa ? 'gray' : (prev.cellData.videos?.length > 0 ? 'green' : prev.cellData.planned?.length > 0 ? 'yellow' : 'red')
            }
          }));
        }
      }
    } catch (err) {
      showToast('error', 'Failed to update N/A state');
    }
  };

  const handleLinkVideo = async (topicId, videoId, formatOverride = null) => {
    try {
      const res = await fetch('/api/syllabus/link-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
          video_id: videoId,
          action: 'link',
          format: formatOverride || activeCellDetail?.format
        })
      });
      if (res.ok) {
        showToast('success', 'Video linked to topic successfully!');
        fetchGridData();
        return true;
      }
    } catch (err) {
      showToast('error', 'Failed to link video');
      return false;
    }
  };

  const handleUnlinkVideo = async (topicId, videoId) => {
    try {
      const res = await fetch('/api/syllabus/link-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, video_id: videoId, action: 'unlink' })
      });
      if (res.ok) {
        showToast('success', 'Video unlinked from topic.');
        fetchGridData();
        if (activeCellDetail) {
          setActiveCellDetail(prev => ({
            ...prev,
            cellData: {
              ...prev.cellData,
              videos: (prev.cellData.videos || []).filter(v => v.id !== videoId)
            }
          }));
        }
        return true;
      }
    } catch (err) {
      showToast('error', 'Failed to unlink video');
      return false;
    }
  };

  const handleDeleteTopic = async (topicId, topicName) => {
    if (!window.confirm(`Delete syllabus topic "${topicName}"? This will unlink associated video mappings.`)) return;
    try {
      const res = await fetch(`/api/syllabus/topics/${topicId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', `Deleted topic "${topicName}"`);
        fetchGridData();
      }
    } catch (err) {
      showToast('error', 'Failed to delete topic');
    }
  };

  const toggleCourseExpand = (cId) => {
    setExpandedCourses(prev => ({ ...prev, [cId]: !prev[cId] }));
  };

  const toggleSubjectExpand = (sId) => {
    setExpandedSubjects(prev => ({ ...prev, [sId]: !prev[sId] }));
  };

  const handleExpandAll = () => {
    if (!gridData) return;
    const cMap = {};
    const sMap = {};
    gridData.courses.forEach(c => {
      cMap[c.id] = true;
      (c.subjects || []).forEach(s => {
        sMap[s.id] = true;
      });
    });
    setExpandedCourses(cMap);
    setExpandedSubjects(sMap);
  };

  const handleCollapseAll = () => {
    setExpandedCourses({});
    setExpandedSubjects({});
  };

  // Filtered courses and topics calculation
  const filteredCourses = useMemo(() => {
    if (!gridData || !gridData.courses) return [];

    return gridData.courses
      .filter(c => courseFilter === 'ALL' || c.id === courseFilter)
      .map(c => {
        const sortedSubjects = [...(c.subjects || [])].sort((a, b) =>
          naturalSortCompare(a.name, b.name)
        );

        const filteredSubjects = sortedSubjects
          .map(s => {
            const sortedTopics = [...(s.topics || [])].sort((a, b) =>
              naturalSortCompare(a.name, b.name)
            );

            const filteredTopics = sortedTopics.filter(t => {
              // Search query check
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesTopic = t.name.toLowerCase().includes(q);
                const matchesSubject = s.name.toLowerCase().includes(q);
                if (!matchesTopic && !matchesSubject) return false;
              }

              // Status filter check
              if (statusFilter === 'GAPS') {
                return !t.is_full_covered;
              } else if (statusFilter === 'COVERED') {
                return t.is_full_covered;
              } else if (statusFilter === 'PLANNED') {
                return Object.values(t.formats || {}).some(f => f.state === 'yellow');
              }

              return true;
            });

            return {
              ...s,
              filteredTopics
            };
          })
          .filter(s => s.filteredTopics.length > 0 || (searchQuery === '' && statusFilter === 'ALL'));

        return {
          ...c,
          filteredSubjects
        };
      })
      .filter(c => c.filteredSubjects.length > 0 || (searchQuery === '' && statusFilter === 'ALL'));
  }, [gridData, courseFilter, statusFilter, searchQuery]);

  const { analytics = {} } = gridData || {};
  const pendingQueueCount = analytics.pending_queue_count || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '28px',
          zIndex: 70,
          background: toast.type === 'error' ? '#FFF0F2' : '#EBFBF7',
          color: toast.type === 'error' ? '#E11D48' : '#0D9488',
          border: `1px solid ${toast.type === 'error' ? 'rgba(225,29,72,0.3)' : 'rgba(13,148,136,0.3)'}`,
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 1. COMPACT PAGE TITLE & SUBTITLE */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Syllabus Matcher
          </h1>
          <span style={{
            background: '#F3EEFF',
            color: '#7C3AED',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid rgba(124, 58, 237, 0.2)'
          }}>
            Topic × Video Coverage Matrix
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Reconcile curriculum topics with YouTube videos across Discussion, Questions, Revision, and General formats.
        </p>
      </div>

      {/* 2. GLOBAL ACTIONS BAR (DEDICATED BAR INSTEAD OF CARD) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '10px 18px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Global Actions
          </span>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            • Quick synchronization & management tools
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Run Auto-Matcher */}
          <button
            onClick={handleRunMatcher}
            disabled={isScanning}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isScanning ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Run Auto-Matcher reconciliation"
          >
            <RefreshCw size={13} style={{ color: '#0D9488', animation: isScanning ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isScanning ? 'Matching...' : 'Run Auto-Matcher'}</span>
          </button>

          {/* Review Matches Queue */}
          <button
            onClick={() => setShowMatchReviewModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Review pending matcher candidates"
          >
            <Layers size={13} style={{ color: '#EA580C' }} />
            <span>Review Matches</span>
            {pendingQueueCount > 0 && (
              <span style={{
                background: '#EA580C',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '9999px',
                marginLeft: '2px'
              }}>
                {pendingQueueCount}
              </span>
            )}
          </button>

          {/* Full Video Analytics */}
          <button
            onClick={() => setShowReverseMatcherModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            id="btn-open-reverse-matcher"
            title="Full Video Analytics: Reverse match YouTube video list"
          >
            <Film size={13} style={{ color: '#4F46E5' }} />
            <span>Full Video Analytics</span>
          </button>

          {/* Add Topics Button (Primary) */}
          <button
            onClick={() => setShowAddTopicsModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)'
            }}
          >
            <Plus size={14} />
            <span>+ Add Topic</span>
          </button>
        </div>
      </div>

      {/* 3. EXECUTIVE 3-CARD METRIC RIBBON */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Card 1: Channel Topic Reach */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 18px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Channel Topic Reach
              </span>
              <span style={{ fontSize: '10px', background: '#CCFBF1', color: '#0F766E', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                ≥1 Format
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {analytics.basic_coverage_pct || 0}%
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                ({analytics.topics_with_video || 0} / {analytics.total_topics || 0} Topics Covered)
              </span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{
              height: '6px',
              width: '100%',
              background: '#F1F5F9',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, analytics.basic_coverage_pct || 0))}%`,
                background: 'linear-gradient(90deg, #0D9488, #14B8A6)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
              Topics with at least one published format
            </div>
          </div>
        </div>

        {/* Card 2: Full Mastery */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px 18px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}
          onMouseEnter={() => setShowCoverageTooltip(true)}
          onMouseLeave={() => setShowCoverageTooltip(false)}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Full Mastery
                </span>
                <span
                  style={{ cursor: 'pointer', color: '#A78BFA', display: 'flex', alignItems: 'center' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCoverageTooltip(prev => !prev);
                  }}
                  title="Click or hover to learn why Full Mastery is 0%"
                >
                  <Info size={13} />
                </span>
              </div>
              <span style={{ fontSize: '10px', background: '#EDE9FE', color: '#6D28D9', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                All 3 Formats
              </span>
            </div>

            {/* Hover Tooltip explaining Reach vs Mastery */}
            {showCoverageTooltip && (
              <div style={{
                position: 'absolute',
                top: '40px',
                left: '12px',
                right: '12px',
                zIndex: 60,
                background: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '12px',
                padding: '12px 14px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)',
                fontSize: '11px',
                lineHeight: 1.45,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ fontWeight: 800, color: '#C084FC', marginBottom: '4px', fontSize: '12px' }}>
                  Coverage Guide: Reach vs. Mastery
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <b style={{ color: '#2DD4BF' }}>Topic Reach ({analytics.basic_coverage_pct || 0}%):</b> Topics with ≥1 video published in any format.
                </div>
                <div>
                  <b style={{ color: '#A78BFA' }}>Full Mastery ({analytics.full_coverage_pct || 0}%):</b> Requires all 3 core formats (Discussion + Questions + Revision). Currently 0 topics have all 3 completed together.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {analytics.full_coverage_pct || 0}%
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                ({analytics.topics_full_covered || 0} / {analytics.total_topics || 0} Topics with All 3 Formats)
              </span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{
              height: '6px',
              width: '100%',
              background: '#F1F5F9',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, analytics.full_coverage_pct || 0))}%`,
                background: 'linear-gradient(90deg, #7C3AED, #A855F7)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
              Requires Discussion + Questions + Revision
            </div>
          </div>
        </div>

        {/* Card 3: Actionable Pipeline */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 18px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Actionable Pipeline
              </span>
              <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                Content Status
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginTop: '8px', lineHeight: 1.4 }}>
              <span style={{ color: '#0D9488' }}>{analytics.total_videos_linked || 0} Published</span>
              <span style={{ color: '#CBD5E1', margin: '0 6px' }}>|</span>
              <span style={{ color: '#EA580C' }}>{analytics.total_planned_linked || 0} Planned</span>
              <span style={{ color: '#CBD5E1', margin: '0 6px' }}>|</span>
              <span style={{ color: '#E11D48' }}>{analytics.unstarted_topics || 0} Missing</span>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            {/* Segmented Pipeline Bar */}
            <div style={{
              display: 'flex',
              height: '6px',
              width: '100%',
              borderRadius: '9999px',
              overflow: 'hidden',
              background: '#F1F5F9'
            }}>
              <div
                style={{
                  width: `${((analytics.topics_with_video || 0) / (analytics.total_topics || 1)) * 100}%`,
                  background: '#0D9488'
                }}
                title={`${analytics.topics_with_video || 0} Covered Topics`}
              />
              <div
                style={{
                  width: `${((analytics.total_planned_linked || 0) / (analytics.total_topics || 1)) * 100}%`,
                  background: '#EA580C'
                }}
                title={`${analytics.total_planned_linked || 0} Planned Entries`}
              />
              <div
                style={{
                  flex: 1,
                  background: '#FDA4AF'
                }}
                title={`${analytics.unstarted_topics || 0} Missing Topics`}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
              Green: Published • Orange: Planned • Red: Missing
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONSOLIDATED COURSE TABS & FILTER TOOLBAR */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '12px 18px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Left: Primary Course Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCourseFilter('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: courseFilter === 'ALL' ? '#0F172A' : '#F1F5F9',
              color: courseFilter === 'ALL' ? '#FFFFFF' : '#475569'
            }}
          >
            All Courses
          </button>
          {(gridData?.courses || []).map(c => {
            const isSelected = courseFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCourseFilter(c.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: isSelected ? 'none' : '1px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: isSelected ? '#7C3AED' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#475569'
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Right: Search, Status Dropdown & Expand/Collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '9999px',
            padding: '5px 12px',
            minWidth: '180px'
          }}>
            <Search size={13} style={{ color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search topic or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#1E293B',
                width: '100%'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '9999px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '12px',
              color: '#334155',
              fontWeight: 600,
              outline: 'none'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="GAPS">Gaps (Incomplete)</option>
            <option value="COVERED">Fully Covered</option>
            <option value="PLANNED">Has Planned Entries</option>
          </select>

          {/* Expand / Collapse All */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleExpandAll}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Collapse All
            </button>
          </div>

          {/* Compact Inline Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748B', marginLeft: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} /> Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B' }} /> Planned
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94A3B8' }} /> Missing (Gray)
            </span>
            <span style={{ color: '#CBD5E1' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '5px', borderRadius: '2px', background: '#2563EB' }} />
              <span style={{ width: '10px', height: '5px', borderRadius: '2px', background: '#F59E0B' }} />
              <span style={{ width: '10px', height: '5px', borderRadius: '2px', background: '#E2E8F0' }} />
              <span style={{ fontSize: '10px' }}>Bar: Blue (Uploaded) • Yellow (Planned)</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: COVERAGE GRID TABLE */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            Loading curriculum coverage grid...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <BookOpen size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
              No Topics Match Filter
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 auto 16px' }}>
              Try clearing your search query or add new topics using the flat paste tool.
            </p>
            <button
              onClick={() => setShowAddTopicsModal(true)}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                border: 'none',
                background: '#7C3AED',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Add Topics to Syllabus
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
              <thead>
                <tr style={{
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}>
                  <th style={{ padding: '14px 20px', width: '36%', verticalAlign: 'bottom' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Topic Name
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, textTransform: 'none', marginTop: '2px' }}>
                      Course → Subject → Topic Structure
                    </div>
                  </th>
                  <th style={{ padding: '10px 8px', width: '13%', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B' }}>
                        Discussion
                      </span>
                      <ThreeColorProgressBar
                        coveredTopics={analytics.format_breakdown?.['Discussion']?.covered_topics || 0}
                        plannedCount={analytics.format_breakdown?.['Discussion']?.planned_count || 0}
                        applicableTopics={analytics.format_breakdown?.['Discussion']?.applicable_topics || 0}
                        width="85px"
                        height={6}
                      />
                    </div>
                  </th>
                  <th style={{ padding: '10px 8px', width: '15%', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B' }}>
                        Question Solving
                      </span>
                      <ThreeColorProgressBar
                        coveredTopics={analytics.format_breakdown?.['Question Solving']?.covered_topics || 0}
                        plannedCount={analytics.format_breakdown?.['Question Solving']?.planned_count || 0}
                        applicableTopics={analytics.format_breakdown?.['Question Solving']?.applicable_topics || 0}
                        width="85px"
                        height={6}
                      />
                    </div>
                  </th>
                  <th style={{ padding: '10px 8px', width: '13%', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B' }}>
                        Revision
                      </span>
                      <ThreeColorProgressBar
                        coveredTopics={analytics.format_breakdown?.['Revision']?.covered_topics || 0}
                        plannedCount={analytics.format_breakdown?.['Revision']?.planned_count || 0}
                        applicableTopics={analytics.format_breakdown?.['Revision']?.applicable_topics || 0}
                        width="85px"
                        height={6}
                      />
                    </div>
                  </th>
                  <th style={{ padding: '10px 8px', width: '13%', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B' }}>
                        General
                      </span>
                      <ThreeColorProgressBar
                        coveredTopics={analytics.format_breakdown?.['General']?.covered_topics || 0}
                        plannedCount={analytics.format_breakdown?.['General']?.planned_count || 0}
                        applicableTopics={analytics.format_breakdown?.['General']?.applicable_topics || 0}
                        width="85px"
                        height={6}
                      />
                    </div>
                  </th>
                  <th style={{ padding: '10px 14px', width: '10%', textAlign: 'center', verticalAlign: 'bottom' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                      Plan Action
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, textTransform: 'none', marginTop: '2px' }}>
                      Queue
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map(course => {
                  const isCourseExpanded = !!expandedCourses[course.id];

                  return (
                    <React.Fragment key={course.id}>
                      {/* COURSE LEVEL ROW */}
                      <tr
                        onClick={() => toggleCourseExpand(course.id)}
                        style={{
                          background: '#F1F5F9',
                          borderTop: '1px solid #E2E8F0',
                          borderBottom: '1px solid #CBD5E1',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        {/* Col 1: Course Name + Topics count */}
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: '#475569' }}>
                              {isCourseExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                              {course.name}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#E2E8F0',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: '9999px'
                            }}>
                              {course.topics_count} Topics
                            </span>
                          </div>
                        </td>

                        {/* Cols 2-5: Course Format Three-Color Progress Bars */}
                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ThreeColorProgressBar
                              coveredTopics={course.format_breakdown?.['Discussion']?.covered_topics || 0}
                              plannedCount={course.format_breakdown?.['Discussion']?.planned_count || 0}
                              applicableTopics={course.format_breakdown?.['Discussion']?.applicable_topics || 0}
                              width="76px"
                              height={6}
                            />
                          </div>
                        </td>

                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ThreeColorProgressBar
                              coveredTopics={course.format_breakdown?.['Question Solving']?.covered_topics || 0}
                              plannedCount={course.format_breakdown?.['Question Solving']?.planned_count || 0}
                              applicableTopics={course.format_breakdown?.['Question Solving']?.applicable_topics || 0}
                              width="76px"
                              height={6}
                            />
                          </div>
                        </td>

                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ThreeColorProgressBar
                              coveredTopics={course.format_breakdown?.['Revision']?.covered_topics || 0}
                              plannedCount={course.format_breakdown?.['Revision']?.planned_count || 0}
                              applicableTopics={course.format_breakdown?.['Revision']?.applicable_topics || 0}
                              width="76px"
                              height={6}
                            />
                          </div>
                        </td>

                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ThreeColorProgressBar
                              coveredTopics={course.format_breakdown?.['General']?.covered_topics || 0}
                              plannedCount={course.format_breakdown?.['General']?.planned_count || 0}
                              applicableTopics={course.format_breakdown?.['General']?.applicable_topics || 0}
                              width="76px"
                              height={6}
                            />
                          </div>
                        </td>

                        {/* Col 6: Course summary badge */}
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#475569',
                            background: '#FFFFFF',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            display: 'inline-block'
                          }}>
                            {course.topics_with_video || 0} Active
                          </span>
                        </td>
                      </tr>

                      {/* SUBJECTS & TOPICS (IF COURSE EXPANDED) */}
                      {isCourseExpanded && (course.filteredSubjects || []).map(subject => {
                        const isSubjectExpanded = !!expandedSubjects[subject.id];
                        const topics = subject.filteredTopics || [];
                        const activeFormatsCount = ['Discussion', 'Question Solving', 'Revision'].filter(f => {
                          const fData = subject.format_breakdown?.[f];
                          return (fData?.video_count || 0) > 0;
                        }).length;

                        return (
                          <React.Fragment key={subject.id}>
                            {/* SUBJECT LEVEL ROW */}
                            <tr
                              id={`subject-row-${subject.id}`}
                              onClick={() => toggleSubjectExpand(subject.id)}
                              style={{
                                background: '#F8FAFC',
                                borderBottom: '1px solid #F1F5F9',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'background-color 0.2s ease'
                              }}
                            >
                              {/* Col 1: Subject Name + Topic Count + Format Badge + Coverage Progress Bar */}
                              <td style={{ padding: '10px 16px 10px 32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>
                                    {isSubjectExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                                        {subject.name}
                                      </span>
                                      <span style={{ fontSize: '11px', color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                        {subject.topics_count} topics
                                      </span>
                                      <span style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        background: activeFormatsCount > 0 ? '#F0FDF4' : '#F1F5F9',
                                        color: activeFormatsCount > 0 ? '#15803D' : '#64748B',
                                        border: activeFormatsCount > 0 ? '1px solid #BBF7D0' : '1px solid #E2E8F0'
                                      }}>
                                        {activeFormatsCount}/3 Formats Active
                                      </span>
                                    </div>
                                    {/* Coverage Progress Bar replacing the radial gauge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                      <div style={{
                                        width: '90px',
                                        height: '5px',
                                        background: '#E2E8F0',
                                        borderRadius: '9999px',
                                        overflow: 'hidden'
                                      }}>
                                        <div style={{
                                          width: `${Math.min(100, Math.max(0, subject.basic_coverage_pct || 0))}%`,
                                          height: '100%',
                                          background: 'linear-gradient(90deg, #0D9488, #14B8A6)',
                                          borderRadius: '9999px'
                                        }} />
                                      </div>
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>
                                        {Math.round(subject.basic_coverage_pct || 0)}% Reach
                                      </span>
                                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                        ({subject.topics_with_video || 0}/{subject.topics_count})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Cols 2-5: Format Distribution Dots/Pills */}
                              {['Discussion', 'Question Solving', 'Revision', 'General'].map(fmt => {
                                const fData = subject.format_breakdown?.[fmt];
                                const vids = fData?.video_count || 0;
                                const plnd = fData?.planned_count || 0;

                                return (
                                  <td key={fmt} style={{ padding: '8px 8px', textAlign: 'center' }}>
                                    {vids > 0 ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '3px 10px',
                                        borderRadius: '9999px',
                                        background: '#EBFBF7',
                                        color: '#0D9488',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        border: '1px solid rgba(13, 148, 136, 0.25)'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0D9488' }} />
                                        {vids} {vids === 1 ? 'vid' : 'vids'}
                                      </span>
                                    ) : plnd > 0 ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '3px 10px',
                                        borderRadius: '9999px',
                                        background: '#FFF5ED',
                                        color: '#EA580C',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        border: '1px solid rgba(234, 88, 12, 0.25)'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EA580C' }} />
                                        {plnd} plnd
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Col 6: Plan Next Video quick-action button */}
                              <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlanNextForSubject(subject);
                                  }}
                                  title={`Plan next video for ${subject.name}`}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    color: '#6D28D9',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F5F3FF';
                                    e.currentTarget.style.borderColor = '#7C3AED';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                    e.currentTarget.style.borderColor = '#CBD5E1';
                                  }}
                                >
                                  <Plus size={12} />
                                  <span>Plan Next</span>
                                </button>
                              </td>
                            </tr>

                            {/* TOPIC ROWS (IF SUBJECT EXPANDED) */}
                            {isSubjectExpanded && (
                              topics.length === 0 ? (
                                <tr>
                                  <td colSpan={6} style={{ padding: '16px 20px 16px 54px', color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>
                                    No topics created under {subject.name} yet.
                                  </td>
                                </tr>
                              ) : (
                                topics.map((topic, tIdx) => {
                                  return (
                                    <tr
                                      key={topic.id}
                                      style={{
                                        borderBottom: '1px solid #F1F5F9',
                                        transition: 'background-color 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FBFDFF'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      {/* Col 1: Topic Name */}
                                      <td style={{ padding: '10px 16px 10px 48px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                                            {topic.name}
                                          </span>
                                          <button
                                            onClick={() => handleDeleteTopic(topic.id, topic.name)}
                                            title="Delete topic"
                                            style={{
                                              border: 'none',
                                              background: 'transparent',
                                              color: '#CBD5E1',
                                              cursor: 'pointer',
                                              padding: '4px'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#E11D48'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = '#CBD5E1'}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>

                                      {/* Columns 2-5: Formats (Discussion, Question Solving, Revision, General) */}
                                      {['Discussion', 'Question Solving', 'Revision', 'General'].map(fmt => {
                                        const cell = topic.formats?.[fmt] || { state: 'red', videos: [], planned: [], is_na: false };

                                        // Format state color scheme: Missing is gray, Published is green, Planned is yellow, N/A is muted
                                        let bg = '#F1F5F9';
                                        let text = '#475569';
                                        let border = '1px solid #CBD5E1';
                                        let label = 'Missing';

                                        if (cell.state === 'gray') {
                                          bg = '#F8FAFC';
                                          text = '#94A3B8';
                                          border = '1px solid #E2E8F0';
                                          label = 'N/A';
                                        } else if (cell.state === 'green') {
                                          bg = '#EBFBF7';
                                          text = '#0D9488';
                                          border = '1px solid rgba(13, 148, 136, 0.25)';
                                          label = cell.videos?.length > 1 ? `${cell.videos.length} Vids` : 'Available';
                                        } else if (cell.state === 'yellow') {
                                          bg = '#FFF5ED';
                                          text = '#EA580C';
                                          border = '1px solid rgba(234, 88, 12, 0.25)';
                                          label = 'Planned';
                                        }

                                        return (
                                          <td key={fmt} style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <button
                                              onClick={() => setActiveCellDetail({ topic, format: fmt, cellData: cell })}
                                              title={`Click to view details or toggle N/A for ${topic.name} (${fmt})`}
                                              style={{
                                                padding: '5px 12px',
                                                borderRadius: '8px',
                                                border,
                                                background: bg,
                                                color: text,
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                minWidth: '78px',
                                                transition: 'all 0.15s ease',
                                                textDecoration: cell.state === 'gray' ? 'line-through' : 'none'
                                              }}
                                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                              {label}
                                            </button>
                                          </td>
                                        );
                                      })}

                                      {/* Col 6: Plan Action Button */}
                                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                        <button
                                          onClick={() => setActivePlanTopic(topic)}
                                          title={`Plan video for ${topic.name}`}
                                          style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #CBD5E1',
                                            background: '#FFFFFF',
                                            color: '#6D28D9',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#F5F3FF';
                                            e.currentTarget.style.borderColor = '#7C3AED';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                                            e.currentTarget.style.borderColor = '#CBD5E1';
                                          }}
                                        >
                                          <Plus size={12} />
                                          <span>Plan Video</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD TOPICS */}
      {showAddTopicsModal && (
        <AddTopicsModal
          courses={gridData?.courses || []}
          onClose={() => setShowAddTopicsModal(false)}
          onSuccess={(res) => {
            showToast('success', `Created ${res.created_count || res.total_submitted || 'new'} topics successfully!`);
            fetchGridData();
          }}
        />
      )}

      {/* MODAL 2: MATCH REVIEW QUEUE */}
      {showMatchReviewModal && (
        <TopicMatchReviewModal
          onClose={() => setShowMatchReviewModal(false)}
          onQueueUpdated={() => {
            fetchGridData();
          }}
        />
      )}

      {/* MODAL 3: CELL DETAIL POPUP */}
      {activeCellDetail && (
        <TopicCellDetailModal
          topic={activeCellDetail.topic}
          format={activeCellDetail.format}
          cellData={activeCellDetail.cellData}
          onClose={() => setActiveCellDetail(null)}
          onToggleNA={handleToggleNA}
          onLinkVideo={handleLinkVideo}
          onUnlinkVideo={handleUnlinkVideo}
          onOpenPlanModal={(t) => setActivePlanTopic(t)}
        />
      )}

      {/* MODAL 4: PLAN TOPIC */}
      {activePlanTopic && (
        <PlanTopicModal
          topic={activePlanTopic}
          availableSessions={sessions}
          onClose={() => setActivePlanTopic(null)}
          onSuccess={(res) => {
            showToast('success', `Created ${res.created_count} planned video entries! Grid cell updated.`);
            fetchGridData();
          }}
        />
      )}

      {/* MODAL 5: FULL VIDEO ANALYTICS & REVERSE MATCHER */}
      {showReverseMatcherModal && (
        <FullVideoAnalyticsModal
          isOpen={showReverseMatcherModal}
          onClose={() => setShowReverseMatcherModal(false)}
          onMatchChanged={() => {
            fetchGridData();
            showToast('success', 'Syllabus topic linkage updated!');
          }}
        />
      )}
    </div>
  );
}
