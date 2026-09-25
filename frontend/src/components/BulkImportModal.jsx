import React, { useState, useMemo } from 'react';
import { 
  X, UploadCloud, Check, AlertTriangle, AlertCircle, 
  Trash2, RefreshCw, FileText, ArrowRight, ArrowLeft 
} from 'lucide-react';

const SAMPLE_GROUPED_TEXT = `Course: CFA Level 1

Fixed Income:
- Bond Pricing Basics | May 2027
- Yield to Maturity Explained | N/A

Ethics:
- GIPS Standards Overview | May 2027

Course: FRM Part 1
Quant:
- Hypothesis Testing Basics | Nov 2026`;

export default function BulkImportModal({ 
  onClose, 
  onSuccess, 
  availableLists = [], 
  availableSessions = [] 
}) {
  const [inputText, setInputText] = useState(SAMPLE_GROUPED_TEXT);
  const [step, setStep] = useState('input'); // 'input' | 'staging'
  const [parsedRows, setParsedRows] = useState([]);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');

  // Course lists
  const courses = useMemo(() => {
    const directCourses = availableLists.filter(l => l.is_course || ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2'].includes(l.id));
    if (directCourses.length > 0) return directCourses;
    return availableLists.filter(l => !l.parent_id);
  }, [availableLists]);

  // Lookup map for course names by id
  const courseMap = useMemo(() => {
    const map = {};
    availableLists.forEach(l => {
      map[l.id] = l.name;
    });
    return map;
  }, [availableLists]);

  // Helper to get child subjects for a specific course
  const getSubjectsForRow = (courseId) => {
    if (courseId) {
      return availableLists.filter(l => !l.is_course && l.parent_id === courseId);
    }
    return [];
  };

  // Auto-detect format and parse text into raw rows
  const parseRawLines = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const isGrouped = lines.some(l => l.toLowerCase().startsWith('course:') || (l.endsWith(':') && !l.includes(',')));

    const rawRows = [];

    if (isGrouped) {
      let activeCourse = 'CFA Level 1';
      let activeSubject = '';

      for (const line of lines) {
        if (line.toLowerCase().startsWith('course:')) {
          activeCourse = line.slice(7).trim();
          activeSubject = '';
        } else if (line.endsWith(':') && !line.startsWith('-')) {
          activeSubject = line.slice(0, -1).trim();
        } else if (line.startsWith('-') || line.startsWith('*')) {
          const content = line.replace(/^[-*]\s*/, '').trim();
          let videoName = content;
          let sessionText = 'N/A';

          if (content.includes('|')) {
            const parts = content.split('|');
            videoName = parts[0].trim();
            sessionText = parts[1].trim();
          }

          rawRows.push({
            id: `row_${rawRows.length + 1}`,
            course_text: activeCourse,
            subject_text: activeSubject,
            video_name: videoName,
            session_text: sessionText
          });
        }
      }
    } else {
      // Flat CSV or Pipe format fallback: Course, Subject, Video Name, Session
      for (const line of lines) {
        const separator = line.includes('|') ? '|' : (line.includes(',') ? ',' : '\t');
        const parts = line.split(separator).map(p => p.trim());
        if (parts.length >= 2) {
          rawRows.push({
            id: `row_${rawRows.length + 1}`,
            course_text: parts[0] || 'CFA Level 1',
            subject_text: parts[1] || '',
            video_name: parts[2] || parts[1] || 'Untitled video',
            session_text: parts[3] || 'N/A'
          });
        }
      }
    }

    return rawRows;
  };

  const handleParseAndValidate = async () => {
    setError('');
    const rawRows = parseRawLines(inputText);
    if (rawRows.length === 0) {
      setError("No valid video lines found. Please check format or use the sample template.");
      return;
    }

    setValidating(true);
    try {
      const res = await fetch('/api/planner/validate-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawRows)
      });

      if (!res.ok) throw new Error("Failed to validate entries.");
      const validated = await res.json();
      setParsedRows(validated);
      setStep('staging');
    } catch (err) {
      setError(err.message || "Failed to validate parsed rows.");
    } finally {
      setValidating(false);
    }
  };

  const updateStagedRow = (idx, field, value) => {
    setParsedRows(prev => {
      const updated = [...prev];
      const target = { ...updated[idx], [field]: value };

      // If course changed, update course name and re-validate/update subject
      if (field === 'matched_course_id') {
        const found = availableLists.find(l => l.id === value);
        target.matched_course_name = found ? found.name : value;
        target.course_match_status = 'CONFIDENT';

        // Check if currently selected subject is a valid child of the new course
        const validChildSubjects = availableLists.filter(l => !l.is_course && l.parent_id === value);
        const subjectStillValid = validChildSubjects.some(s => s.id === target.matched_subject_id);
        
        if (!subjectStillValid) {
          if (validChildSubjects.length > 0) {
            target.matched_subject_id = validChildSubjects[0].id;
            target.matched_subject_name = validChildSubjects[0].name;
            target.subject_match_status = 'CONFIDENT';
          } else {
            target.matched_subject_id = '';
            target.matched_subject_name = '';
          }
        }
      }
      if (field === 'matched_subject_id') {
        const found = availableLists.find(l => l.id === value);
        target.matched_subject_name = found ? found.name : value;
        target.subject_match_status = 'CONFIDENT';
      }
      if (field === 'matched_session_id') {
        const found = availableSessions.find(s => s.id === value);
        target.matched_session_name = found ? found.name : 'Not Applicable';
        target.session_match_status = 'CONFIDENT';
      }

      target.is_confident_all = 
        target.course_match_status === 'CONFIDENT' &&
        target.subject_match_status === 'CONFIDENT' &&
        target.session_match_status === 'CONFIDENT';

      updated[idx] = target;
      return updated;
    });
  };

  const removeStagedRow = (idx) => {
    setParsedRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCommitAll = async () => {
    if (parsedRows.length === 0) return;
    setCommitting(true);
    setError('');

    try {
      const itemsToCreate = parsedRows.map(r => ({
        title: r.video_name.trim(),
        course_id: r.matched_course_id || null,
        subject_id: r.matched_subject_id || null,
        session_id: r.matched_session_id || null,
        status: 'Planned',
        assigned_week: null
      }));

      const res = await fetch('/api/planner/videos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToCreate)
      });

      if (!res.ok) throw new Error("Failed to save entries.");
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to commit staged entries.");
    } finally {
      setCommitting(false);
    }
  };

  const flaggedCount = parsedRows.filter(r => !r.is_confident_all).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: step === 'input' ? '680px' : '920px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: 'var(--radius-md)', 
              background: 'rgba(62, 166, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <UploadCloud size={18} color="#3EA65E" />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.1rem' }}>Bulk Paste Import (v2)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {step === 'input' 
                  ? 'Paste multiple planned video topics at once with grouped shorthand'
                  : `Review and refine staged rows (${parsedRows.length} entries)`}
              </p>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            color: '#FF0000', fontSize: '0.8rem', background: 'rgba(255, 0, 0, 0.08)',
            padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' 
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {step === 'input' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                Paste planned entries:
              </label>
              <button 
                type="button" 
                className="btn-ghost" 
                style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                onClick={() => setInputText(SAMPLE_GROUPED_TEXT)}
              >
                Reset sample template
              </button>
            </div>

            <textarea 
              className="form-textarea"
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '0.82rem', 
                minHeight: '220px', 
                lineHeight: '1.5',
                whiteSpace: 'pre' 
              }}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Course: CFA Level 1&#10;&#10;Fixed Income:&#10;- Bond Pricing Basics | May 2027&#10;- Yield to Maturity Explained | N/A"
            />

            <div style={{ 
              background: 'var(--bg-surface-elevated)', 
              borderRadius: 'var(--radius-md)', 
              padding: '0.75rem 1rem', 
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                Supported Formats:
              </div>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: '1.4' }}>
                <li><strong>Grouped shorthand:</strong> <code>Course: [Name]</code>, then <code>[Subject]:</code>, then <code>- Video Title | [Session]</code></li>
                <li><strong>Flat fallback:</strong> <code>Course, Subject, Video Name, Session</code> per line</li>
                <li>Unrecognized session text falls back to <em>Not Applicable</em> with a review flag.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleParseAndValidate}
                disabled={validating || !inputText.trim()}
              >
                {validating ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Validating matches...</span>
                  </>
                ) : (
                  <>
                    <span>Parse & Preview</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Staging & Preview Table (Phase 1c) */
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              background: flaggedCount > 0 ? 'rgba(232, 163, 61, 0.08)' : 'rgba(62, 166, 94, 0.08)',
              border: `1px solid ${flaggedCount > 0 ? 'rgba(232, 163, 61, 0.3)' : 'rgba(62, 166, 94, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {flaggedCount > 0 ? (
                  <>
                    <AlertTriangle size={16} color="#E8A33D" />
                    <span style={{ color: '#E8A33D', fontWeight: 600 }}>
                      {flaggedCount} {flaggedCount === 1 ? 'row requires' : 'rows require'} confirmation or adjustment
                    </span>
                  </>
                ) : (
                  <>
                    <Check size={16} color="#3EA65E" />
                    <span style={{ color: '#3EA65E', fontWeight: 600 }}>
                      All {parsedRows.length} rows confidently matched to existing lists and sessions!
                    </span>
                  </>
                )}
              </div>
              <button 
                className="btn-ghost" 
                style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                onClick={() => setStep('input')}
              >
                <ArrowLeft size={12} /> Edit raw text
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <table className="analytics-table" style={{ margin: 0 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface-elevated)', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: '36px' }}>Status</th>
                    <th style={{ width: '180px' }}>Course</th>
                    <th style={{ width: '180px' }}>Subject</th>
                    <th>Video Name</th>
                    <th style={{ width: '190px' }}>Exam Session</th>
                    <th style={{ width: '40px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => {
                    const isAllConfident = row.is_confident_all;
                    return (
                      <tr key={row.id} style={{ background: isAllConfident ? 'transparent' : 'rgba(232, 163, 61, 0.03)' }}>
                        <td style={{ textAlign: 'center' }}>
                          {isAllConfident ? (
                            <span title="Confident match"><Check size={14} color="#3EA65E" strokeWidth={2.5} /></span>
                          ) : (
                            <span title="Fuzzy matched with flag"><AlertTriangle size={14} color="#E8A33D" strokeWidth={2.2} /></span>
                          )}
                        </td>

                        <td>
                          <select 
                            className="control-select"
                            style={{ 
                              width: '100%', 
                              fontSize: '0.75rem',
                              border: row.course_match_status !== 'CONFIDENT' ? '1px solid #E8A33D' : '1px solid var(--border-subtle)'
                            }}
                            value={row.matched_course_id || ''}
                            onChange={(e) => updateStagedRow(idx, 'matched_course_id', e.target.value)}
                          >
                            {courses.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <select 
                            className="control-select"
                            style={{ 
                              width: '100%', 
                              fontSize: '0.75rem',
                              border: row.subject_match_status !== 'CONFIDENT' ? '1px solid #E8A33D' : '1px solid var(--border-subtle)'
                            }}
                            value={row.matched_subject_id || ''}
                            onChange={(e) => updateStagedRow(idx, 'matched_subject_id', e.target.value)}
                          >
                            <option value="">(None / General)</option>
                            {(() => {
                              const subjects = getSubjectsForRow(row.matched_course_id);
                              const isFiltered = Boolean(row.matched_course_id && subjects.some(s => s.parent_id === row.matched_course_id));
                              return subjects.map(s => {
                                const parentName = courseMap[s.parent_id];
                                const displayName = !isFiltered && parentName ? `${s.name} (${parentName})` : s.name;
                                return (
                                  <option key={s.id} value={s.id}>{displayName}</option>
                                );
                              });
                            })()}
                          </select>
                        </td>

                        <td>
                          <input 
                            type="text" 
                            className="form-input"
                            style={{ width: '100%', padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                            value={row.video_name}
                            onChange={(e) => updateStagedRow(idx, 'video_name', e.target.value)}
                          />
                        </td>

                        <td>
                          <select 
                            className="control-select"
                            style={{ 
                              width: '100%', 
                              fontSize: '0.75rem',
                              border: row.session_match_status !== 'CONFIDENT' ? '1px solid #E8A33D' : '1px solid var(--border-subtle)'
                            }}
                            value={row.matched_session_id || ''}
                            onChange={(e) => updateStagedRow(idx, 'matched_session_id', e.target.value)}
                          >
                            <option value="">Not Applicable (Evergreen)</option>
                            {(Array.isArray(availableSessions) ? availableSessions : []).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '2px', color: 'var(--danger-red)' }}
                            onClick={() => removeStagedRow(idx)}
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {parsedRows.length} entries staged for creation
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setStep('input')}>
                  Back
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleCommitAll}
                  disabled={committing || parsedRows.length === 0}
                >
                  {committing ? 'Adding entries...' : `Add All (${parsedRows.length} Entries)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
