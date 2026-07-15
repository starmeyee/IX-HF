import React, { useState } from 'react';
import { Users, UserCircle, ShieldCheck, Copy, Check } from 'lucide-react';
import { ROUTINE_TABLE } from '../data/routine';

import { rollList as students } from '../auth/rollList';

const monitors = [];

const routine = ROUTINE_TABLE;

/**
 * Class overview content (teacher, student count, monitors, weekly
 * routine, and the full student register). Relocated from the old
 * homepage into the Profile page.
 */
export default function ClassInfo() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = students.map(s => `${s.rollNo}. ${s.name}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="bento-grid mb-2">
        <div className="bento-item glass-card stat-card glow-hover">
          <div className="stat-icon primary-grad"><UserCircle size={32} /></div>
          <div className="stat-info">
            <h3>Class Teacher</h3>
            <p>Abhay Sinha</p>
          </div>
        </div>

        <div className="bento-item glass-card stat-card glow-hover">
          <div className="stat-icon secondary-grad"><Users size={32} /></div>
          <div className="stat-info">
            <h3>Total Students</h3>
            <p>{students.length}</p>
          </div>
        </div>

        <div className="bento-item glass-card glow-hover col-span-2">
          <div className="monitor-header">
            <div className="stat-icon tertiary-grad" style={{ width: 40, height: 40, borderRadius: 8 }}>
              <ShieldCheck size={20} />
            </div>
            <h3>Class Monitors</h3>
          </div>
          <div className="monitor-tags">
            {monitors.map(m => <span key={m} className="monitor-badge">{m}</span>)}
          </div>
        </div>
      </div>

      <div className="bento-section">
        <h2 className="section-title">Weekly Routine</h2>
        <div className="glass-card table-card p-0 glow-hover">
          <div className="routine-grid-real">
            <div className="routine-cell header">Day</div>
            <div className="routine-cell header">1st</div>
            <div className="routine-cell header">2nd</div>
            <div className="routine-cell header">3rd</div>
            <div className="routine-cell header">4th</div>
            <div className="routine-cell header">5th</div>
            <div className="routine-cell header">6th</div>

            {routine.map((row) => (
              <React.Fragment key={row.day}>
                <div className="routine-cell header day-label">{row.day}</div>
                {row.periods.map((subject, index) => (
                  <div key={index} className="routine-cell subject">{subject}</div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="bento-section mt-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Student Register</h2>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: copied ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-hover)',
              color: copied ? '#10b981' : 'var(--text-primary)',
              border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontWeight: 500, transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy List'}
          </button>
        </div>
        <div className="glass-card table-card glow-hover">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr><th>Roll No</th><th>Student Name</th></tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.rollNo}>
                    <td><span className="roll-badge">{student.rollNo}</span></td>
                    <td className="student-name">{student.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
