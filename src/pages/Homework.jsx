
import { Calendar, CheckCircle2, Lock } from 'lucide-react';
import { homeworkData } from '../data/homeworkData';
import { useAuth } from '../auth/AuthContext';

export default function Homework() {
  const { currentUser, openModal } = useAuth();

  if (!currentUser) {
    return (
      <div className="animate-fade-in fade-in-up" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <Lock size={48} color="var(--tertiary)" style={{ margin: '0 auto 1rem auto' }} />
        <h1 className="page-title text-gradient">Locked Portal</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          You must be logged in to access the Homework portal.
        </p>
        <button className="auth-btn primary" onClick={openModal} style={{ margin: '0 auto' }}>
          Login / Register
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in fade-in-up">
      <h1 className="page-title text-gradient">Homework</h1>
      
      <div className="task-list">
        {homeworkData.map((day) => (
          <div key={day.id} className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="section-title text-gradient" style={{ fontSize: '1.3rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <Calendar size={22} className="text-primary" /> {day.date.replace(/_/g, '').replace(/Date:/i, '').trim()}
            </h2>
            
            <div className="day-tasks" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {day.tasks.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No homework details found.</p>
              )}
              
              {day.tasks.map((task, idx) => (
                <div key={idx} className="task-item" style={{
                  padding: '1rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--primary)',
                  position: 'relative'
                }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                    {task.subject !== 'General' ? task.subject : 'Homework Tasks'}
                    <span className="badge homework">Homework</span>
                  </h3>
                  <p className="task-desc" style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {task.description}
                  </p>
                  
                  <button style={{ 
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
