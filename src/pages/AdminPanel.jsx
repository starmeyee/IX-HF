import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Plus, Save, Database, Trash2 } from 'lucide-react';
import { addHomework, migrateLegacyData } from '../services/homeworkService';

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [date, setDate] = useState('');
  const [tasks, setTasks] = useState([{ subject: '', description: '', type: 'homework' }]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (currentUser === undefined) return;
    if (!currentUser || !currentUser.isAdmin) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser || !currentUser.isAdmin) return null;

  const handleAddTask = () => {
    setTasks([...tasks, { subject: '', description: '', type: 'homework' }]);
  };

  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || tasks.length === 0) return alert('Please enter date and at least one task');
    
    setLoading(true);
    try {
      await addHomework(date, tasks);
      alert('Homework added successfully!');
      setDate('');
      setTasks([{ subject: '', description: '', type: 'homework' }]);
    } catch (err) {
      console.error(err);
      alert('Failed to add homework: ' + err.message);
    }
    setLoading(false);
  };

  const handleMigrate = async () => {
    if (!window.confirm("Are you sure you want to migrate legacy data? This might duplicate if already done.")) return;
    setMigrating(true);
    try {
      const count = await migrateLegacyData();
      alert(`Successfully migrated ${count} legacy homework entries to Database!`);
    } catch (err) {
      console.error(err);
      alert('Migration failed: ' + err.message);
    }
    setMigrating(false);
  };

  return (
    <div className="animate-fade-in fade-in-up" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <ShieldAlert size={32} className="text-primary" />
        <h1 className="page-title text-gradient" style={{ margin: 0 }}>Admin Panel</h1>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Add Daily Homework
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)' }}>Tasks</label>
              <button type="button" onClick={handleAddTask} className="auth-btn secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                <Plus size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> Add Task
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tasks.map((task, index) => (
                <div key={index} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>Task {index + 1}</h4>
                    {tasks.length > 1 && (
                      <button type="button" onClick={() => handleRemoveTask(index)} style={{ background: 'none', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="Subject (e.g., Math, Science)"
                    value={task.subject}
                    onChange={e => handleTaskChange(index, 'subject', e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                  <textarea 
                    placeholder="Task Description..."
                    value={task.description}
                    onChange={e => handleTaskChange(index, 'description', e.target.value)}
                    required
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', resize: 'vertical' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-btn primary" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <Save size={18} /> {loading ? 'Saving...' : 'Save Homework'}
          </button>
        </form>
      </div>

      <div className="glass-card" style={{ border: '1px dashed var(--border)' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>System Actions</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Use this button ONLY ONCE to migrate old homework data from the local file into the Firestore database.
        </p>
        <button 
          onClick={handleMigrate} 
          disabled={migrating}
          className="auth-btn secondary" 
          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
        >
          <Database size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> 
          {migrating ? 'Migrating...' : 'Migrate Legacy Homework Data'}
        </button>
      </div>
    </div>
  );
}
