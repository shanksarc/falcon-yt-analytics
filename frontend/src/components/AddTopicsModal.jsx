import React, { useState, useMemo } from 'react';
import { X, UploadCloud, Check, AlertTriangle, AlertCircle, Trash2, FileText, ArrowRight, Plus, ListFilter, Sparkles } from 'lucide-react';

const SAMPLE_FLAT_TEXT = `Bond Pricing Basics & Present Value
Yield to Maturity & Spot Rates
Duration, Modified Duration & Convexity
Key Rate Duration & Immunization Strategies
Credit Spreads & Default Probability`;

const SAMPLE_GROUPED_TEXT = `Course: CFA Level 1

Fixed Income:
- Bond Pricing Basics
- Yield to Maturity Explained
- Duration and Convexity Deep Dive

Ethics:
- Standards of Professional Conduct
- Code of Ethics Case Studies

Course: FRM Part 1
Quant:
- Hypothesis Testing Basics
- Binomial vs Poisson Distribution`;

export default function AddTopicsModal({
  courses = [],
  onClose,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState('flat'); // 'flat' | 'grouped' | 'single'

  // Flat mode state
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || 'list_cfa_l1');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [flatText, setFlatText] = useState(SAMPLE_FLAT_TEXT);
  const [flatPreviewItems, setFlatPreviewItems] = useState([]);
  const [isCreatingFlat, setIsCreatingFlat] = useState(false);

  // Grouped mode state
  const [groupedText, setGroupedText] = useState(SAMPLE_GROUPED_TEXT);
  const [groupedStep, setGroupedStep] = useState('input'); // 'input' | 'staging'
  const [stagedRows, setStagedRows] = useState([]);
  const [isValidatingGrouped, setIsValidatingGrouped] = useState(false);
  const [isCommittingGrouped, setIsCommittingGrouped] = useState(false);

  // Single topic state
  const [singleCourseId, setSingleCourseId] = useState(courses[0]?.id || 'list_cfa_l1');
  const [singleSubjectId, setSingleSubjectId] = useState('');
  const [singleTopicName, setSingleTopicName] = useState('');
  const [isCreatingSingle, setIsCreatingSingle] = useState(false);

  const [error, setError] = useState('');

  // Course subjects helper
  const getSubjectsForCourse = (cId) => {
    const course = courses.find(c => c.id === cId);
    return course ? course.subjects || [] : [];
  };

  // Initialize selected subjects when course changes
  React.useEffect(() => {
    const subjs = getSubjectsForCourse(selectedCourseId);
    if (subjs.length > 0 && !subjs.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjs[0].id);
    }
  }, [selectedCourseId, courses]);

  React.useEffect(() => {
    const subjs = getSubjectsForCourse(singleCourseId);
    if (subjs.length > 0 && !subjs.some(s => s.id === singleSubjectId)) {
      setSingleSubjectId(subjs[0].id);
    }
  }, [singleCourseId, courses]);

  // Update flat preview items on text change
  React.useEffect(() => {
    const lines = flatText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));
    setFlatPreviewItems(lines);
  }, [flatText]);

  // Remove single line from flat preview
  const handleRemovePreviewItem = (indexToRemove) => {
    const updated = flatPreviewItems.filter((_, idx) => idx !== indexToRemove);
    setFlatPreviewItems(updated);
    setFlatText(updated.join('\n'));
  };

  // 1. Submit Flat Mode
  const handleCommitFlat = async () => {
    if (!selectedCourseId || !selectedSubjectId) {
      setError('Please select both Course and Subject.');
      return;
    }
    if (flatPreviewItems.length === 0) {
      setError('Please enter at least one topic name.');
      return;
    }

    setIsCreatingFlat(true);
    setError('');

    try {
      const res = await fetch('/api/syllabus/topics/flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: selectedCourseId,
          subject_id: selectedSubjectId,
          topics: flatPreviewItems
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create topics');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create topics');
    } finally {
      setIsCreatingFlat(false);
    }
  };

  // 2. Parse & Validate Grouped Mode
  const handleParseAndValidateGrouped = async () => {
    setError('');
    const lines = groupedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const rawRows = [];

    let activeCourse = 'CFA Level 1';
    let activeSubject = '';

    for (const line of lines) {
      if (line.toLowerCase().startsWith('course:')) {
        activeCourse = line.slice(7).trim();
        activeSubject = '';
      } else if (line.endsWith(':') && !line.startsWith('-')) {
        activeSubject = line.slice(0, -1).trim();
      } else if (line.startsWith('-') || line.startsWith('*')) {
        const topicName = line.replace(/^[-*]\s*/, '').trim();
        if (topicName) {
          rawRows.push({
            id: `row_${rawRows.length + 1}`,
            course_text: activeCourse,
            subject_text: activeSubject,
            video_name: topicName, // validator uses video_name as entity name
            topic_name: topicName,
            session_text: 'N/A'
          });
        }
      }
    }

    if (rawRows.length === 0) {
      setError('No valid topic lines found. Ensure topics start with "- " and subjects end with ":"');
      return;
    }

    setIsValidatingGrouped(true);
    try {
      const res = await fetch('/api/planner/validate-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawRows)
      });

      const validated = await res.json();
      if (!res.ok) throw new Error("Validation failed");

      setStagedRows(validated);
      setGroupedStep('staging');
    } catch (err) {
      setError(err.message || 'Failed to validate grouped topics');
    } finally {
      setIsValidatingGrouped(false);
    }
  };

  // Update a staged row's course or subject
  const updateStagedRow = (idx, field, value) => {
    setStagedRows(prev => {
      const updated = [...prev];
      const target = { ...updated[idx], [field]: value };

      if (field === 'matched_course_id') {
        const found = courses.find(c => c.id === value);
        target.matched_course_name = found ? found.name : value;
        target.course_match_status = 'CONFIDENT';

        const subjs = getSubjectsForCourse(value);
        if (subjs.length > 0) {
          target.matched_subject_id = subjs[0].id;
          target.matched_subject_name = subjs[0].name;
          target.subject_match_status = 'CONFIDENT';
        }
      }

      if (field === 'matched_subject_id') {
        const allSubs = courses.flatMap(c => c.subjects || []);
        const found = allSubs.find(s => s.id === value);
        target.matched_subject_name = found ? found.name : value;
        target.subject_match_status = 'CONFIDENT';
      }

      updated[idx] = target;
      return updated;
    });
  };

  // Commit Grouped Topics
  const handleCommitGrouped = async () => {
    setIsCommittingGrouped(true);
    setError('');

    try {
      const res = await fetch('/api/syllabus/topics/grouped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: stagedRows.map(r => ({
            matched_subject_id: r.matched_subject_id,
            topic_name: r.video_name
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to commit grouped topics");

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to commit topics");
    } finally {
      setIsCommittingGrouped(false);
    }
  };

  // 3. Submit Single Topic
  const handleCommitSingle = async (e) => {
    e.preventDefault();
    if (!singleTopicName.trim()) {
      setError('Topic name cannot be empty.');
      return;
    }

    setIsCreatingSingle(true);
    setError('');

    try {
      const res = await fetch('/api/syllabus/topics/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: singleCourseId,
          subject_id: singleSubjectId,
          topic_name: singleTopicName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add topic");

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add topic");
    } finally {
      setIsCreatingSingle(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
      padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        width: '100%',
        maxWidth: activeTab === 'grouped' && groupedStep === 'staging' ? '860px' : '640px',
        maxHeight: '90vh',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'max-width 0.2s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
              Add Syllabus Curriculum Topics
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              Add topic-level rows under Subjects to build out your curriculum coverage grid.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 24px',
          background: '#FFFFFF',
          gap: '20px'
        }}>
          <button
            onClick={() => { setActiveTab('flat'); setError(''); }}
            style={{
              padding: '12px 4px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'flat' ? '#7C3AED' : '#64748B',
              borderBottom: activeTab === 'flat' ? '2px solid #7C3AED' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            Flat Paste (Primary)
          </button>
          <button
            onClick={() => { setActiveTab('grouped'); setError(''); }}
            style={{
              padding: '12px 4px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'grouped' ? '#7C3AED' : '#64748B',
              borderBottom: activeTab === 'grouped' ? '2px solid #7C3AED' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            Grouped Shorthand (Multi-Subject)
          </button>
          <button
            onClick={() => { setActiveTab('single'); setError(''); }}
            style={{
              padding: '12px 4px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'single' ? '#7C3AED' : '#64748B',
              borderBottom: activeTab === 'single' ? '2px solid #7C3AED' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            Single Topic
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              background: '#FFF0F2',
              color: '#E11D48',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: FLAT MODE (PRIMARY) */}
          {activeTab === 'flat' && (
            <div>
              {/* Dropdowns Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    1. Select Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#1E293B',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    2. Select Subject
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#1E293B',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  >
                    {getSubjectsForCourse(selectedCourseId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Textarea */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    3. Paste Plain Topic List (One per line)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#7C3AED' }}>
                    {flatPreviewItems.length} topics detected
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={flatText}
                  onChange={(e) => setFlatText(e.target.value)}
                  placeholder="Paste topics from syllabus, one topic per line..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Staging / Scan Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Parsed Preview (Verify & scan before committing)
                </label>
                {flatPreviewItems.length === 0 ? (
                  <div style={{ padding: '16px', borderRadius: '10px', border: '1px dashed #E2E8F0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No topics entered yet.
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    background: '#F8FAFC'
                  }}>
                    {flatPreviewItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom: idx < flatPreviewItems.length - 1 ? '1px solid #E2E8F0' : 'none',
                          fontSize: '13px',
                          color: '#334155'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#94A3B8', width: '20px' }}>
                            {idx + 1}.
                          </span>
                          <span style={{ fontWeight: 500 }}>{item}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePreviewItem(idx)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GROUPED MODE (SECONDARY) */}
          {activeTab === 'grouped' && (
            <div>
              {groupedStep === 'input' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '12px', color: '#64748B' }}>
                      Load an entire curriculum using <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>Course:</code>, <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>Subject:</code>, and <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>- Topic</code> lines.
                    </p>
                    <button
                      type="button"
                      onClick={() => setGroupedText(SAMPLE_GROUPED_TEXT)}
                      style={{
                        fontSize: '11px',
                        color: '#7C3AED',
                        fontWeight: 600,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      Load Sample Template
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    value={groupedText}
                    onChange={(e) => setGroupedText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      lineHeight: '1.5',
                      color: '#1E293B',
                      outline: 'none'
                    }}
                  />
                </div>
              ) : (
                /* Staging Table */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                      Staged Topics for Import ({stagedRows.length})
                    </h4>
                    <button
                      onClick={() => setGroupedStep('input')}
                      style={{
                        fontSize: '12px',
                        color: '#64748B',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      ← Edit Text
                    </button>
                  </div>

                  <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px' }}>Topic Name</th>
                          <th style={{ padding: '10px 12px' }}>Matched Course</th>
                          <th style={{ padding: '10px 12px' }}>Matched Subject</th>
                          <th style={{ padding: '10px 12px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagedRows.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1E293B' }}>
                              {r.video_name}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <select
                                value={r.matched_course_id || ''}
                                onChange={(e) => updateStagedRow(idx, 'matched_course_id', e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12px',
                                  background: '#FFFFFF'
                                }}
                              >
                                {courses.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <select
                                value={r.matched_subject_id || ''}
                                onChange={(e) => updateStagedRow(idx, 'matched_subject_id', e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12px',
                                  background: '#FFFFFF'
                                }}
                              >
                                {getSubjectsForCourse(r.matched_course_id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: r.course_match_status === 'CONFIDENT' && r.subject_match_status === 'CONFIDENT' ? '#EBFBF7' : '#FFF0F2',
                                color: r.course_match_status === 'CONFIDENT' && r.subject_match_status === 'CONFIDENT' ? '#0D9488' : '#E11D48'
                              }}>
                                {r.course_match_status === 'CONFIDENT' && r.subject_match_status === 'CONFIDENT' ? 'CONFIDENT' : 'FLAGGED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SINGLE TOPIC */}
          {activeTab === 'single' && (
            <form onSubmit={handleCommitSingle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Course
                  </label>
                  <select
                    value={singleCourseId}
                    onChange={(e) => setSingleCourseId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#1E293B',
                      background: '#FFFFFF'
                    }}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Subject
                  </label>
                  <select
                    value={singleSubjectId}
                    onChange={(e) => setSingleSubjectId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#1E293B',
                      background: '#FFFFFF'
                    }}
                  >
                    {getSubjectsForCourse(singleCourseId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Topic Name
                </label>
                <input
                  type="text"
                  value={singleTopicName}
                  onChange={(e) => setSingleTopicName(e.target.value)}
                  placeholder="e.g. Monte Carlo Simulation & Stochastic Modeling"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSingle || !singleTopicName.trim()}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#7C3AED',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isCreatingSingle ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isCreatingSingle ? 'Adding...' : 'Add Topic'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer (for Flat & Grouped modes) */}
        {activeTab !== 'single' && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {activeTab === 'flat' && (
              <button
                type="button"
                onClick={handleCommitFlat}
                disabled={isCreatingFlat || flatPreviewItems.length === 0}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isCreatingFlat ? 'not-allowed' : 'pointer',
                  opacity: isCreatingFlat ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={15} />
                <span>{isCreatingFlat ? 'Creating Topics...' : `Confirm & Create ${flatPreviewItems.length} Topics`}</span>
              </button>
            )}

            {activeTab === 'grouped' && (
              groupedStep === 'input' ? (
                <button
                  type="button"
                  onClick={handleParseAndValidateGrouped}
                  disabled={isValidatingGrouped || !groupedText.trim()}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#7C3AED',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isValidatingGrouped ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowRight size={15} />
                  <span>{isValidatingGrouped ? 'Validating...' : 'Validate & Preview'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCommitGrouped}
                  disabled={isCommittingGrouped || stagedRows.length === 0}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isCommittingGrouped ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={15} />
                  <span>{isCommittingGrouped ? 'Committing...' : `Commit All (${stagedRows.length}) Topics`}</span>
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
