import React, { useState } from 'react';
import { X, Calendar, CheckSquare, Sparkles, AlertCircle } from 'lucide-react';

const FORMAT_OPTIONS = [
  { id: 'Discussion', label: 'Discussion / Core Lecture', desc: 'Foundational topic lecture or concept breakdown' },
  { id: 'Question Solving', label: 'Question Solving / Q&A', desc: 'Practice problem sets, mock doubts & calculation drills' },
  { id: 'Revision', label: 'Revision / Marathon', desc: 'Rapid formula sprint or high-yield exam cram summary' },
  { id: 'General', label: 'General / Strategy', desc: 'Study sequence, tips, calculator shortcuts, or intro guide' }
];

export default function PlanTopicModal({
  topic,
  availableSessions = [],
  onClose,
  onSuccess
}) {
  const [selectedFormats, setSelectedFormats] = useState(['Discussion']);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleFormat = (fmt) => {
    setSelectedFormats(prev => 
      prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFormats.length === 0) {
      setError('Please select at least one format to plan.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/syllabus/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topic.id,
          formats: selectedFormats,
          session_id: selectedSessionId || null,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create planned video entries');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to plan videos');
    } finally {
      setIsSubmitting(false);
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
        maxWidth: '520px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#F3EEFF',
                color: '#7C3AED',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {topic.course_name} · {topic.subject_name}
              </span>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
              Plan Video for Topic
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {topic.name}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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
              gap: '8px',
              border: '1px solid rgba(225, 29, 72, 0.2)'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Formats Checkbox List */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Select Video Formats to Plan
            </label>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
              Checking multiple formats creates a separate Planned Video Entry for each format.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {FORMAT_OPTIONS.map(fmt => {
                const isChecked = selectedFormats.includes(fmt.id);
                return (
                  <div
                    key={fmt.id}
                    onClick={() => toggleFormat(fmt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isChecked ? '#7C3AED' : '#E2E8F0'}`,
                      background: isChecked ? '#FBF9FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ marginTop: '2px', accentColor: '#7C3AED', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: isChecked ? '#6D28D9' : '#1E293B' }}>
                        {fmt.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {fmt.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session Linkage */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Target Exam Session (Optional)
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#334155',
                backgroundColor: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="">No session / Open backlog</option>
              {(Array.isArray(availableSessions) ? availableSessions : []).map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_date} → {s.end_date})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Notes or Script Angle (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on Texas Instruments BA II Plus keystrokes"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#334155',
                outline: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
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
              disabled={isSubmitting || selectedFormats.length === 0}
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={15} />
              <span>{isSubmitting ? 'Creating Entries...' : `Create ${selectedFormats.length} Planned ${selectedFormats.length === 1 ? 'Entry' : 'Entries'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
