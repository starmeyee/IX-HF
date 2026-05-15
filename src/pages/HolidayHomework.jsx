import React from 'react';
import { Calendar, Sun, Download } from 'lucide-react';
import { holidayData } from '../data/holidayData';

export default function HolidayHomework() {
  return (
    <div className="animate-fade-in fade-in-up">
      <div className="flex-center" style={{ flexDirection: 'column', marginBottom: '3rem' }}>
        <Sun size={48} color="var(--tertiary)" className="mb-1" />
        <h1 className="page-title text-gradient" style={{ marginBottom: 0 }}>Holiday Homework</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Summer Vacation Assignments 2026</p>
      </div>
      
      <div className="bento-grid">
        {holidayData.map((task) => (
          <div key={task.id} className="glass-card glow-hover" style={{ borderTop: '4px solid var(--tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span className="badge holiday" style={{ display: 'inline-block' }}>{task.subject}</span>
              <div className="task-date" style={{ flexShrink: 0 }}>
                <Calendar size={14} /> Due: 22.06.2026
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}>{task.subject} Assignment</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {task.message}
            </p>
            
            {task.file && (
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attached Resource:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <a href={task.downloadUrl} download style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  >
                    <Download size={16} color="var(--tertiary)" /> {task.file}
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
