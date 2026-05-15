import React, { useState, useEffect } from 'react';
import { Calendar, Sun, Download, CheckCircle } from 'lucide-react';
import { holidayData } from '../data/holidayData';

export default function HolidayHomework() {
  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('completedHolidayHomework');
    if (saved) {
      try {
        setCompletedTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing completed homework", e);
      }
    }
  }, []);

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => {
      const isCompleted = prev.includes(taskId);
      const updated = isCompleted ? prev.filter(id => id !== taskId) : [...prev, taskId];
      localStorage.setItem('completedHolidayHomework', JSON.stringify(updated));
      return updated;
    });
  };

  const progress = Math.round((completedTasks.length / holidayData.length) * 100) || 0;

  return (
    <div className="animate-fade-in fade-in-up">
      <div className="flex-center" style={{ flexDirection: 'column', marginBottom: '3rem' }}>
        <Sun size={48} color="var(--tertiary)" className="mb-1" />
        <h1 className="page-title text-gradient" style={{ marginBottom: 0 }}>Holiday Homework</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Summer Vacation Assignments 2026</p>
        
        <div style={{ marginTop: '1rem', background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '100px', height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--success, #10B981)', transition: 'width 0.3s ease' }}></div>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {completedTasks.length} / {holidayData.length} Completed
          </span>
        </div>
      </div>
      
      <div className="bento-grid">
        {holidayData.map((task) => {
          const isCompleted = completedTasks.includes(task.id);
          
          return (
            <div key={task.id} className="glass-card glow-hover" style={{ 
              borderTop: `4px solid ${isCompleted ? 'var(--success, #10B981)' : 'var(--tertiary)'}`,
              opacity: isCompleted ? 0.85 : 1,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button 
                    onClick={() => toggleTask(task.id)}
                    style={{ 
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
                      color: isCompleted ? 'var(--success, #10B981)' : 'var(--text-secondary)',
                      transition: 'color 0.2s ease, transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title={isCompleted ? "Mark as pending" : "Mark as completed"}
                  >
                    <CheckCircle size={22} fill={isCompleted ? 'var(--success, #10B981)' : 'none'} color={isCompleted ? '#fff' : 'currentColor'} />
                  </button>
                  <span className="badge holiday" style={{ display: 'inline-block' }}>{task.subject}</span>
                </div>
                <div className="task-date" style={{ flexShrink: 0 }}>
                  <Calendar size={14} /> Due: 22.06.2026
                </div>
              </div>
              
              <h3 style={{ 
                fontSize: '1.25rem', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif',
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                transition: 'all 0.3s ease'
              }}>
                {task.subject} Assignment
              </h3>
              
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
                      <Download size={16} color={isCompleted ? 'var(--success, #10B981)' : 'var(--tertiary)'} /> {task.file}
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
