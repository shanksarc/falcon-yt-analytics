import React, { useState, useEffect } from 'react';
import { 
  X, Target, Check, AlertTriangle, ChevronDown, ChevronRight, 
  Zap, RefreshCw, BookOpen, Layers, PlusCircle, AlertCircle
} from 'lucide-react';

export default function TargetManagementModal({ 
  onClose, 
  onSuccess 
}) {
  const [totalTarget, setTotalTarget] = useState(0);
  const [programs, setPrograms] = useState([]);
  const [initialDataMap, setInitialDataMap] = useState({});
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Target Update Mode: 'replace' | 'add'
  const [targetMode, setTargetMode] = useState('replace'); // 'replace' or 'add'
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    setError('');
    try {
      // Targets independent of sessions (session_id not passed)
      const res = await fetch('/api/planner/targets/hierarchy');
      if (!res.ok) throw new Error("Failed to load targets hierarchy");
      const data = await res.json();
      
      const progs = data.programs || [];
      setTotalTarget(data.total_target || 0);
      setPrograms(progs);

      // Cache initial targets for diffing and preview in 'add' mode
      const map = {};
      map['total'] = data.total_target || 0;
      for (const p of progs) {
        map[p.id] = p.target || 0;
        for (const c of (p.courses || [])) {
          map[c.id] = c.target || 0;
          for (const s of (c.subjects || [])) {
            map[s.id] = s.target || 0;
          }
        }
      }
      setInitialDataMap(map);
    } catch (err) {
      setError(err.message || "Failed to load targets hierarchy.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle subject expansion for a course
  const toggleCourseExpand = (courseId) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  // Handlers for state updates
  const handleProgramTargetChange = (progId, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setPrograms(prev => prev.map(p => p.id === progId ? { ...p, target: num } : p));
  };

  const handleCourseTargetChange = (progId, courseId, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setPrograms(prev => prev.map(p => {
      if (p.id !== progId) return p;
      return {
        ...p,
        courses: p.courses.map(c => c.id === courseId ? { ...c, target: num } : c)
      };
    }));
  };

  const handleSubjectTargetChange = (progId, courseId, subjectId, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setPrograms(prev => prev.map(p => {
      if (p.id !== progId) return p;
      return {
        ...p,
        courses: p.courses.map(c => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            subjects: c.subjects.map(s => s.id === subjectId ? { ...s, target: num } : s)
          };
        })
      };
    }));
  };

  // Quick Helper: Auto-sum programs to total target
  const handleAutoSumTotal = () => {
    const sum = programs.reduce((acc, p) => acc + (parseInt(p.target, 10) || 0), 0);
    setTotalTarget(sum);
  };

  // Quick Helper: Auto-sum courses to program target
  const handleAutoSumProgram = (progId) => {
    const prog = programs.find(p => p.id === progId);
    if (!prog) return;
    const sum = prog.courses.reduce((acc, c) => acc + (parseInt(c.target, 10) || 0), 0);
    handleProgramTargetChange(progId, sum);
  };

  // Quick Helper: Auto-sum subjects to course target
  const handleAutoSumCourse = (progId, courseId) => {
    const prog = programs.find(p => p.id === progId);
    if (!prog) return;
    const course = prog.courses.find(c => c.id === courseId);
    if (!course) return;
    const sum = course.subjects.reduce((acc, s) => acc + (parseInt(s.target, 10) || 0), 0);
    handleCourseTargetChange(progId, courseId, sum);
  };

  // Clear all subjects under a course
  const handleClearSubjects = (progId, courseId) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== progId) return p;
      return {
        ...p,
        courses: p.courses.map(c => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            subjects: c.subjects.map(s => ({ ...s, target: 0 }))
          };
        })
      };
    }));
  };

  // Calculate reconciliation sums
  const sumPrograms = programs.reduce((acc, p) => acc + (parseInt(p.target, 10) || 0), 0);
  const totalDifference = totalTarget - sumPrograms;

  // Intercept Save to show Warning Modal first
  const handleInitiateSave = () => {
    setShowWarningModal(true);
  };

  // Submit all targets atomically after confirmation
  const handleConfirmExecuteSave = async () => {
    setShowWarningModal(false);
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const targetsList = [];

      // Collect program targets
      for (const p of programs) {
        if (p.target > 0 || targetMode === 'replace') {
          targetsList.push({ list_id: p.id, target_count: p.target });
        }
        // Collect course targets
        for (const c of p.courses) {
          if (c.target > 0 || targetMode === 'replace') {
            targetsList.push({ list_id: c.id, target_count: c.target });
          }
          // Collect subject targets
          for (const s of c.subjects) {
            if (s.target > 0 || targetMode === 'replace') {
              targetsList.push({ list_id: s.id, target_count: s.target });
            }
          }
        }
      }

      const res = await fetch('/api/planner/targets/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: null, // Session-independent target setting
          total_target: parseInt(totalTarget, 10) || 0,
          mode: targetMode, // 'replace' or 'add'
          targets: targetsList
        })
      });

      if (!res.ok) throw new Error("Failed to save target hierarchy.");
      setSuccessMsg(`Targets successfully ${targetMode === 'add' ? 'added to existing' : 'replaced'}!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err) {
      setError(err.message || "Failed to save targets.");
    } finally {
      setSaving(false);
    }
  };

  // Summary counts for warning modal
  const affectedCoursesCount = programs.reduce((acc, p) => acc + (p.courses?.length || 0), 0);
  const affectedSubjectsCount = programs.reduce((acc, p) => 
    acc + (p.courses?.reduce((cAcc, c) => cAcc + (c.subjects?.length || 0), 0) || 0), 0
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header Bar */}
        <div className="modal-header" style={{ paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(232, 163, 61, 0.15)', color: '#E8A33D', padding: '7px', borderRadius: '8px' }}>
              <Target size={20} color="#E8A33D" />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Course & Subject Target Setting
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Curriculum-wide targets independent of exam sessions. Reconciles Courses, Subjects, and Channels.
              </p>
            </div>
          </div>

          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* MODE SELECTOR (Replace vs Add to Existing) */}
        <div style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Target Setting Action
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {targetMode === 'replace' 
                ? 'Will overwrite and set new target counts across courses.' 
                : 'Will add your entered values onto existing course targets.'}
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-surface)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => setTargetMode('replace')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: targetMode === 'replace' ? '#3B82F6' : 'transparent',
                color: targetMode === 'replace' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: targetMode === 'replace' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={12} />
              <span>Replace Existing Targets</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('add')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: targetMode === 'add' ? '#3EA65E' : 'transparent',
                color: targetMode === 'add' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: targetMode === 'add' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <PlusCircle size={12} />
              <span>Add to Existing Targets</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ 
            color: 'var(--danger-red)', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 0.85rem',
            fontSize: '0.8rem', 
            marginTop: '0.75rem'
          }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ 
            color: '#3EA65E', 
            background: 'rgba(62, 166, 94, 0.1)', 
            border: '1px solid rgba(62, 166, 94, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 0.85rem',
            fontSize: '0.8rem', 
            marginTop: '0.75rem'
          }}>
            {successMsg}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading curriculum targets...
          </div>
        ) : (
          <div style={{ overflowY: 'auto', paddingRight: '4px', marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* LEVEL 0: TOTAL TARGET CARD */}
            <div style={{ 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '1.15rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Curriculum Pacing Scope: All Exam Tracks
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Total Video Target {targetMode === 'add' ? '(Addition)' : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="number"
                    min="0"
                    className="form-input"
                    value={totalTarget}
                    onChange={(e) => setTotalTarget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ width: '100px', fontSize: '1.25rem', fontWeight: 700, textAlign: 'center', padding: '0.35rem' }}
                  />
                  <button 
                    type="button"
                    className="btn-ghost"
                    onClick={handleAutoSumTotal}
                    title="Auto-sum total target from program allocations"
                    style={{ border: '1px solid var(--border-subtle)', fontSize: '0.75rem', padding: '0.45rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Zap size={13} color="#E8A33D" />
                    <span>Auto-Sum</span>
                  </button>
                </div>
              </div>

              {/* Total Reconciliation Banner */}
              <div style={{ 
                marginTop: '0.85rem', 
                padding: '0.5rem 0.75rem', 
                borderRadius: 'var(--radius-md)', 
                background: totalDifference === 0 && totalTarget > 0 
                  ? 'rgba(62, 166, 94, 0.1)' 
                  : totalDifference > 0 
                    ? 'rgba(232, 163, 61, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)',
                border: totalDifference === 0 && totalTarget > 0 
                  ? '1px solid rgba(62, 166, 94, 0.25)' 
                  : totalDifference > 0 
                    ? '1px solid rgba(232, 163, 61, 0.25)' 
                    : '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {totalDifference === 0 && totalTarget > 0 ? (
                    <Check size={14} color="#3EA65E" />
                  ) : (
                    <AlertTriangle size={14} color={totalDifference > 0 ? '#E8A33D' : '#EF4444'} />
                  )}
                  <span style={{ 
                    fontWeight: 500, 
                    color: totalDifference === 0 && totalTarget > 0 
                      ? '#3EA65E' 
                      : totalDifference > 0 
                        ? '#E8A33D' 
                        : 'var(--danger-red)' 
                  }}>
                    {totalDifference === 0 && totalTarget > 0 
                      ? `Balanced: Total target matches sum of programs (${totalTarget} videos).`
                      : totalDifference > 0 
                        ? `${totalDifference} video target(s) unallocated to any program.`
                        : `Programs exceed total target by ${Math.abs(totalDifference)} videos.`}
                  </span>
                </div>

                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  Sum of Programs: {sumPrograms}
                </span>
              </div>
            </div>

            {/* PROGRAMS & COURSES HIERARCHY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {programs.map((program) => {
                const sumCourses = program.courses.reduce((acc, c) => acc + (parseInt(c.target, 10) || 0), 0);
                const progDiff = program.target - sumCourses;

                return (
                  <div 
                    key={program.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Program Header Row */}
                    <div style={{ 
                      padding: '0.85rem 1.15rem', 
                      background: 'var(--bg-surface-elevated)', 
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      flexWrap: 'wrap', 
                      gap: '0.65rem' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: program.id.includes('cfa') ? '#3B82F6' : '#8B5CF6' 
                        }} />
                        <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {program.name}
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ({program.courses.length} courses)
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Program Target:</span>
                        <input 
                          type="number"
                          min="0"
                          className="form-input"
                          value={program.target}
                          onChange={(e) => handleProgramTargetChange(program.id, e.target.value)}
                          style={{ width: '85px', fontSize: '1rem', fontWeight: 700, textAlign: 'center', padding: '0.25rem' }}
                        />
                        <button 
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleAutoSumProgram(program.id)}
                          title="Auto-sum program target from courses"
                          style={{ border: '1px solid var(--border-subtle)', fontSize: '0.72rem', padding: '0.35rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Zap size={11} color="#E8A33D" />
                          <span>Auto</span>
                        </button>
                      </div>
                    </div>

                    {/* Program Reconciliation Note */}
                    {program.target > 0 && progDiff !== 0 && (
                      <div style={{ 
                        padding: '0.35rem 1.15rem', 
                        fontSize: '0.72rem', 
                        background: 'rgba(232, 163, 61, 0.05)', 
                        borderBottom: '1px solid var(--border-hairline)',
                        color: '#E8A33D',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <AlertTriangle size={11} />
                        <span>
                          {progDiff > 0 
                            ? `${progDiff} video targets unallocated among courses in this program.` 
                            : `Course targets exceed program target by ${Math.abs(progDiff)}.`}
                        </span>
                      </div>
                    )}

                    {/* Courses List */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {program.courses.map((course) => {
                        const sumSubjects = course.subjects.reduce((acc, s) => acc + (parseInt(s.target, 10) || 0), 0);
                        const courseDiff = course.target - sumSubjects;
                        const isExpanded = expandedCourses.has(course.id);

                        return (
                          <div 
                            key={course.id}
                            style={{ 
                              borderBottom: '1px solid var(--border-hairline)',
                              padding: '0.75rem 1.15rem',
                              background: isExpanded ? 'rgba(255,255,255,0.015)' : 'transparent'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleCourseExpand(course.id)}
                                  className="btn-ghost"
                                  style={{ padding: '2px 4px', color: 'var(--text-muted)' }}
                                  title={isExpanded ? "Collapse subjects" : "Expand subjects"}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <div>
                                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {course.name}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.45rem' }}>
                                    ({course.subjects.length} subjects)
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target:</span>
                                <input 
                                  type="number"
                                  min="0"
                                  className="form-input"
                                  value={course.target}
                                  onChange={(e) => handleCourseTargetChange(program.id, course.id, e.target.value)}
                                  style={{ width: '75px', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center', padding: '0.2rem' }}
                                />
                                {course.subjects.length > 0 && (
                                  <button 
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => handleAutoSumCourse(program.id, course.id)}
                                    title="Auto-sum course target from its subjects"
                                    style={{ border: '1px solid var(--border-subtle)', fontSize: '0.7rem', padding: '0.25rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                  >
                                    <Zap size={10} color="#E8A33D" />
                                    <span>Auto</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Subjects Sub-Accordion */}
                            {isExpanded && (
                              <div style={{ 
                                marginTop: '0.75rem', 
                                marginLeft: '1.5rem', 
                                paddingLeft: '0.75rem', 
                                borderLeft: '2px dashed var(--border-subtle)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.25rem' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    Subjects Outline Target Distribution
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleClearSubjects(program.id, course.id)}
                                    className="btn-ghost"
                                    style={{ fontSize: '0.68rem', padding: '1px 6px', color: 'var(--danger-red)' }}
                                  >
                                    Reset Subjects to 0
                                  </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                                  {course.subjects.map((sub) => (
                                    <div 
                                      key={sub.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.35rem 0.55rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-surface-elevated)',
                                        border: '1px solid var(--border-hairline)'
                                      }}
                                    >
                                      <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={sub.name}>
                                        {sub.name}
                                      </span>
                                      <input 
                                        type="number"
                                        min="0"
                                        className="form-input"
                                        value={sub.target}
                                        onChange={(e) => handleSubjectTargetChange(program.id, course.id, sub.id, e.target.value)}
                                        style={{ width: '60px', fontSize: '0.8rem', textAlign: 'center', padding: '0.15rem' }}
                                      />
                                    </div>
                                  ))}
                                </div>

                                {course.target > 0 && (
                                  <div style={{ fontSize: '0.7rem', color: courseDiff === 0 ? '#3EA65E' : '#E8A33D', marginTop: '0.2rem' }}>
                                    {courseDiff === 0 
                                      ? `✓ All ${course.target} videos allocated across subjects.`
                                      : courseDiff > 0 
                                        ? `${sumSubjects} of ${course.target} assigned to specific subjects (${courseDiff} unassigned).`
                                        : `Subjects sum (${sumSubjects}) exceeds course target (${course.target}) by ${Math.abs(courseDiff)}.`}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '1.25rem', 
          borderTop: '1px solid var(--border-hairline)', 
          paddingTop: '0.85rem' 
        }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Mode: <strong style={{ color: targetMode === 'add' ? '#3EA65E' : '#3B82F6' }}>
              {targetMode === 'add' ? 'Add to Existing' : 'Replace Existing'}
            </strong> · Total Target: <strong>{totalTarget}</strong> videos
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleInitiateSave} 
              disabled={saving || loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: targetMode === 'add' ? '#3EA65E' : '#3B82F6', borderColor: targetMode === 'add' ? '#3EA65E' : '#3B82F6' }}
            >
              <Target size={14} />
              <span>{saving ? 'Saving...' : (targetMode === 'add' ? 'Add to Targets' : 'Replace All Targets')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION WARNING MODAL (REQUIRED FOR BOTH MODES) */}
      {showWarningModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowWarningModal(false)}
          style={{ zIndex: 1300, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '1.5rem', borderRadius: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{ 
                background: targetMode === 'replace' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(232, 163, 61, 0.15)', 
                color: targetMode === 'replace' ? '#EF4444' : '#E8A33D', 
                padding: '10px', 
                borderRadius: '12px',
                flexShrink: 0
              }}>
                <AlertCircle size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {targetMode === 'replace' 
                    ? 'Warning: Replace Existing Targets' 
                    : 'Warning: Add to Existing Targets'}
                </h3>
                <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {targetMode === 'replace' ? (
                    <>
                      You are about to <strong style={{ color: 'var(--danger-red)' }}>OVERWRITE and REPLACE</strong> all existing course and curriculum targets with your newly entered numbers. Any previous target counts will be replaced permanently.
                    </>
                  ) : (
                    <>
                      You are about to <strong style={{ color: '#3EA65E' }}>ADD</strong> these entered numbers to your current targets. Existing course targets will increase by your specified quantities.
                    </>
                  )}
                </p>

                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Action:</span>
                    <strong style={{ color: targetMode === 'replace' ? '#EF4444' : '#3EA65E' }}>
                      {targetMode === 'replace' ? 'Full Target Replacement' : 'Additive Increment'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Video Target:</span>
                    <strong>{totalTarget} videos</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Courses Configured:</span>
                    <span>{affectedCoursesCount} courses</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Scope:</span>
                    <span>Curriculum-wide (Session-Independent)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button 
                    type="button" 
                    className="btn-ghost" 
                    onClick={() => setShowWarningModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={handleConfirmExecuteSave}
                    style={{ 
                      background: targetMode === 'replace' ? 'var(--danger-red)' : '#3EA65E', 
                      borderColor: targetMode === 'replace' ? 'var(--danger-red)' : '#3EA65E' 
                    }}
                  >
                    {targetMode === 'replace' ? 'Yes, Replace Targets' : 'Yes, Add to Targets'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
