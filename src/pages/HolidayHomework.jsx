import React, { useState, useEffect } from 'react';
import { Calendar, Sun, Download, CheckCircle, FileText, X } from 'lucide-react';
import { holidayData } from '../data/holidayData';

export default function HolidayHomework() {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

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
              
              {(task.file || task.projectData) && (
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attached Resource:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {task.projectData ? (
                      <button onClick={() => setSelectedProject(task)} style={{
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
                        textAlign: 'left',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                      >
                        <FileText size={16} color="var(--tertiary)" /> View Project Details
                      </button>
                    ) : (
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
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedProject && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="glass-card" style={{
            maxWidth: '600px',
            width: '100%',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderTop: '4px solid var(--tertiary)'
          }}>
            <button 
              onClick={() => setSelectedProject(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={18} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="badge holiday" style={{ display: 'inline-block' }}>{selectedProject.subject}</span>
            </div>
            
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>Project Details</h2>
            
            <div style={{ 
              background: 'var(--surface-hover)', 
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              color: 'var(--text-primary)',
              lineHeight: '1.7',
              fontSize: '1rem'
            }}>
              {selectedProject.projectData.split(/(?=\d\))/).map((point, i) => (
                <div key={i} style={{ marginBottom: i > 0 ? '1rem' : '0' }}>
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
