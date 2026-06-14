import { useState, useEffect } from 'react';
import { Calendar, Sun, Download, CheckCircle, FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { holidayData } from '../data/holidayData';
import { useAuth } from '../auth/AuthContext';
import { updateHolidayHomework, getHolidayHomework } from '../auth/authService';

// Build a flat list of all checkable items across every subject.
// Multi-file subjects get one entry per file; single-file and project subjects get one entry total.
function buildCheckItems() {
  const items = [];
  holidayData.forEach((task) => {
    if (task.files && task.files.length > 1) {
      // One checkbox per individual file
      task.files.forEach((fileObj, idx) => {
        items.push({ key: `${task.id}-file-${idx}`, taskId: task.id, fileIdx: idx });
      });
    } else {
      // Single checkbox for single-file or project tasks
      items.push({ key: `${task.id}`, taskId: task.id, fileIdx: null });
    }
  });
  return items;
}

const checkItems = buildCheckItems();
const totalItems = checkItems.length;

export default function HolidayHomework() {
  const { currentUser } = useAuth();
  const [completedKeys, setCompletedKeys] = useState(() => {
    const saved = localStorage.getItem('completedHolidayHomework_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });
  const [selectedProject, setSelectedProject] = useState(null);

  // Sync from DB if user logs in
  useEffect(() => {
    if (currentUser) {
      getHolidayHomework(currentUser.phone).then((keys) => {
        // If DB has data, overwrite local state
        if (keys && keys.length > 0) {
          setCompletedKeys(keys);
          localStorage.setItem('completedHolidayHomework_v2', JSON.stringify(keys));
        } else {
          // If DB is empty but we have local keys, sync local keys to DB
          const saved = localStorage.getItem('completedHolidayHomework_v2');
          let localKeys = [];
          if (saved) {
            try { localKeys = JSON.parse(saved); } catch { /* ignore */ }
          }
          if (localKeys.length > 0) {
            updateHolidayHomework(currentUser.phone, localKeys).catch(console.error);
          }
        }
      });
    }
  }, [currentUser]);

  // Handle Android hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedProject) setSelectedProject(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedProject]);

  const openProjectDetails = (task) => {
    setSelectedProject(task);
    window.history.pushState({ modalOpen: true }, '');
  };

  const closeProjectDetails = () => {
    setSelectedProject(null);
    if (window.history.state && window.history.state.modalOpen) {
      window.history.back();
    }
  };

  const toggleKey = (key) => {
    setCompletedKeys(prev => {
      const updated = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem('completedHolidayHomework_v2', JSON.stringify(updated));
      if (currentUser) {
        updateHolidayHomework(currentUser.phone, updated).catch(console.error);
      }
      return updated;
    });
  };

  // Helper: is every checklist key for a given taskId completed?
  const isTaskFullyDone = (task) => {
    const keys = checkItems.filter(item => item.taskId === task.id).map(i => i.key);
    return keys.length > 0 && keys.every(k => completedKeys.includes(k));
  };

  const completedCount = completedKeys.length;
  const progress = Math.round((completedCount / totalItems) * 100) || 0;

  return (
    <>
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
              {completedCount} / {totalItems} Completed
            </span>
          </div>
        </div>

        <div className="bento-grid">
          {holidayData.map((task) => {
            const fullyDone = isTaskFullyDone(task);
            const isMultiFile = task.files && task.files.length > 1;

            return (
              <div key={task.id} className="glass-card glow-hover" style={{
                borderTop: `4px solid ${fullyDone ? 'var(--success, #10B981)' : 'var(--tertiary)'}`,
                opacity: fullyDone ? 0.85 : 1,
                transition: 'all 0.3s ease'
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* For single-checkbox tasks, show the check button here */}
                    {!isMultiFile && (
                      <button
                        onClick={() => toggleKey(`${task.id}`)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          display: 'flex', alignItems: 'center',
                          color: completedKeys.includes(`${task.id}`) ? 'var(--success, #10B981)' : 'var(--text-secondary)',
                          transition: 'color 0.2s ease, transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title={completedKeys.includes(`${task.id}`) ? "Mark as pending" : "Mark as completed"}
                      >
                        <CheckCircle size={22}
                          fill={completedKeys.includes(`${task.id}`) ? 'var(--success, #10B981)' : 'none'}
                          color={completedKeys.includes(`${task.id}`) ? '#fff' : 'currentColor'} />
                      </button>
                    )}
                    <span className="badge holiday" style={{ display: 'inline-block' }}>{task.subject}</span>
                  </div>
                  <div className="task-date" style={{ flexShrink: 0 }}>
                    <Calendar size={14} /> Due: 22.06.2026
                  </div>
                </div>

                <h3 style={{
                  fontSize: '1.25rem', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif',
                  textDecoration: fullyDone ? 'line-through' : 'none',
                  color: fullyDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                  transition: 'all 0.3s ease'
                }}>
                  {task.subject} Assignment
                </h3>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  {task.message}
                </p>

                {/* Resources section */}
                {(task.files?.length > 0 || task.projectData) && (
                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Attached Resource{isMultiFile ? 's' : ''}:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {task.projectData ? (
                        <button onClick={() => openProjectDetails(task)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          background: 'var(--surface-hover)', border: '1px solid var(--border)',
                          padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)', cursor: 'pointer',
                          fontSize: '0.85rem', textAlign: 'left', transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                        >
                          <FileText size={16} color="var(--tertiary)" /> View Project Details
                        </button>
                      ) : isMultiFile ? (
                        // Multi-file: each file gets its own checkbox row
                        task.files.map((fileObj, idx) => {
                          const itemKey = `${task.id}-file-${idx}`;
                          const fileDone = completedKeys.includes(itemKey);
                          return (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              background: fileDone ? 'rgba(16,185,129,0.08)' : 'var(--surface-hover)',
                              border: `1px solid ${fileDone ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                              padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)',
                              transition: 'all 0.2s ease'
                            }}>
                              {/* Per-file checkbox */}
                              <button
                                onClick={() => toggleKey(itemKey)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                                  display: 'flex', alignItems: 'center',
                                  color: fileDone ? 'var(--success, #10B981)' : 'var(--text-secondary)',
                                  transition: 'color 0.2s ease, transform 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                title={fileDone ? "Mark as pending" : "Mark as done"}
                              >
                                <CheckCircle size={18}
                                  fill={fileDone ? 'var(--success, #10B981)' : 'none'}
                                  color={fileDone ? '#fff' : 'currentColor'} />
                              </button>
                              {/* Download link */}
                              <a href={fileObj.url} download style={{
                                flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem',
                                color: fileDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                                textDecoration: fileDone ? 'line-through' : 'none',
                                fontSize: '0.85rem', cursor: 'pointer',
                              }}>
                                <Download size={14} color={fileDone ? 'var(--success, #10B981)' : 'var(--tertiary)'} />
                                {fileObj.name}
                              </a>
                            </div>
                          );
                        })
                      ) : (
                        // Single file
                        task.files.map((fileObj, idx) => (
                          <a key={idx} href={fileObj.url} download style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'var(--surface-hover)', border: '1px solid var(--border)',
                            padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)', textDecoration: 'none',
                            fontSize: '0.85rem', transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                          >
                            <Download size={16} color={completedKeys.includes(`${task.id}`) ? 'var(--success, #10B981)' : 'var(--tertiary)'} /> {fileObj.name}
                          </a>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedProject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1.5rem', animation: 'fadeInUp 0.2s ease'
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '2rem',
            maxWidth: '600px', width: '100%', position: 'relative',
            maxHeight: '90vh', overflowY: 'auto',
            borderTop: '4px solid var(--tertiary)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <button
              onClick={closeProjectDetails}
              style={{
                position: 'absolute', top: '1.5rem', right: '1.5rem',
                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                borderRadius: '50%', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="badge holiday" style={{ display: 'inline-block' }}>{selectedProject.subject}</span>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>Project Details</h2>

            <div
              className="markdown-content"
              style={{
                background: 'var(--background)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '1.5rem',
                color: 'var(--text-primary)', lineHeight: '1.7', fontSize: '1rem'
              }}>
              <ReactMarkdown>{selectedProject.projectData}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
