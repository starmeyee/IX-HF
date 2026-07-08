import React, { useState } from 'react';
import { syllabusData } from '../data/syllabusData';
import { ChevronDown, ChevronRight, Plus, Image as ImageIcon, Send, Loader2, X } from 'lucide-react';
import { addStarBatchQuestion, getStarBatchQuestions, uploadImageToCloudinary } from '../services/starBatchSyllabusService';
import { useAuth } from '../auth/AuthContext';

export default function StarBatchSyllabus() {
  const { currentUser } = useAuth();
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});
  const [chapterQuestions, setChapterQuestions] = useState({});
  const [loadingChapters, setLoadingChapters] = useState({});

  // Modal State
  const [addingToChapter, setAddingToChapter] = useState(null); // chapter object
  const [topicName, setTopicName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleSection = (id) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleSubject = (id) => setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleChapter = async (id) => {
    const isExpanding = !expandedChapters[id];
    setExpandedChapters(prev => ({ ...prev, [id]: isExpanding }));
    
    if (isExpanding && !chapterQuestions[id]) {
      setLoadingChapters(prev => ({ ...prev, [id]: true }));
      try {
        const q = await getStarBatchQuestions(id);
        setChapterQuestions(prev => ({ ...prev, [id]: q }));
      } catch (err) {
        console.error("Failed to fetch questions", err);
      } finally {
        setLoadingChapters(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!topicName.trim()) return setError('Topic name is required');
    if (!questionText.trim() && !imageFile) return setError('Please add a question or upload an image');
    
    setIsSubmitting(true);
    setError('');
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary(imageFile);
      }
      await addStarBatchQuestion(addingToChapter.chapterId, topicName, questionText, imageUrl, currentUser);
      
      const q = await getStarBatchQuestions(addingToChapter.chapterId);
      setChapterQuestions(prev => ({ ...prev, [addingToChapter.chapterId]: q }));
      
      setAddingToChapter(null);
      setTopicName('');
      setQuestionText('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="star-syllabus">
      <style>{`
        .star-syllabus { margin-top: 2rem; color: #fff; }
        .star-section { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; margin-bottom: 1rem; overflow: hidden; }
        .star-section-header { padding: 1.2rem; display: flex; align-items: center; gap: 0.8rem; cursor: pointer; background: rgba(0,0,0,0.2); transition: background 0.2s; font-weight: 600; font-size: 1.1rem; }
        .star-section-header:hover { background: rgba(251, 191, 36, 0.05); }
        .star-subject { border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .star-subject-header { padding: 1rem 1.2rem 1rem 2.5rem; display: flex; align-items: center; gap: 0.8rem; cursor: pointer; background: rgba(0,0,0,0.1); transition: background 0.2s; font-weight: 500; }
        .star-subject-header:hover { background: rgba(251, 191, 36, 0.05); }
        .star-chapter { border-top: 1px solid rgba(255, 255, 255, 0.03); padding: 0.8rem 1.2rem 0.8rem 4rem; }
        .star-chapter-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .star-chapter-title { display: flex; align-items: center; gap: 0.6rem; color: #cbd5e1; font-size: 0.95rem; }
        .star-chapter-title:hover { color: #fbbf24; }
        .star-add-btn { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); color: #fbbf24; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .star-add-btn:hover { background: #fbbf24; color: #000; transform: scale(1.05); }
        .star-questions-list { margin-top: 1rem; padding-left: 1.5rem; border-left: 2px solid rgba(251, 191, 36, 0.2); display: flex; flexDirection: column; gap: 1rem; }
        .star-question-card { background: rgba(0,0,0,0.3); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 1rem; }
        .star-question-topic { font-weight: 600; color: #fbbf24; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
        .star-question-author { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 400; }
        .star-question-text { font-size: 0.9rem; color: #e2e8f0; line-height: 1.5; white-space: pre-wrap; }
        .star-question-img { max-width: 100%; border-radius: 6px; margin-top: 0.8rem; border: 1px solid rgba(255,255,255,0.1); }
        
        /* Modal Styles */
        .star-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .star-modal { background: #0f1115; border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 16px; width: 100%; max-width: 500px; padding: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .star-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .star-modal-title { font-size: 1.2rem; font-weight: 600; color: #fbbf24; margin: 0; }
        .star-input { width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.75rem; color: #fff; margin-bottom: 1rem; outline: none; transition: border-color 0.2s; }
        .star-input:focus { border-color: #fbbf24; }
        .star-textarea { min-height: 100px; resize: vertical; }
        .star-upload-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; color: #cbd5e1; transition: all 0.2s; font-size: 0.9rem; margin-bottom: 1rem; width: 100%; justify-content: center; }
        .star-upload-btn:hover { background: rgba(255,255,255,0.1); border-color: #fbbf24; color: #fbbf24; }
        .star-submit-btn { width: 100%; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; border: none; border-radius: 8px; padding: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .star-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      {syllabusData.map(section => (
        <div key={section.sectionId} className="star-section">
          <div className="star-section-header" onClick={() => toggleSection(section.sectionId)}>
            {expandedSections[section.sectionId] ? <ChevronDown size={20} color="#fbbf24" /> : <ChevronRight size={20} />}
            {section.sectionName}
          </div>
          
          {expandedSections[section.sectionId] && (
            <div className="star-section-content">
              {section.subjects.map(subject => (
                <div key={subject.subjectId} className="star-subject">
                  <div className="star-subject-header" onClick={() => toggleSubject(subject.subjectId)}>
                    {expandedSubjects[subject.subjectId] ? <ChevronDown size={18} color="#fbbf24" /> : <ChevronRight size={18} />}
                    {subject.subjectName}
                  </div>
                  
                  {expandedSubjects[subject.subjectId] && (
                    <div className="star-subject-content">
                      {subject.chapters.map(chapter => (
                        <div key={chapter.chapterId} className="star-chapter">
                          <div className="star-chapter-header">
                            <div className="star-chapter-title" onClick={() => toggleChapter(chapter.chapterId)}>
                              {expandedChapters[chapter.chapterId] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              {chapter.chapterName}
                            </div>
                            <button 
                              className="star-add-btn" 
                              title="Add Topic / Question"
                              onClick={(e) => { e.stopPropagation(); setAddingToChapter(chapter); }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          {expandedChapters[chapter.chapterId] && (
                            <div className="star-questions-list">
                              {loadingChapters[chapter.chapterId] ? (
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Loader2 size={14} className="spin" /> Loading topics...
                                </div>
                              ) : chapterQuestions[chapter.chapterId]?.length > 0 ? (
                                chapterQuestions[chapter.chapterId].map(q => (
                                  <div key={q.id} className="star-question-card">
                                    <div className="star-question-topic">
                                      {q.topicName}
                                      <span className="star-question-author">By {q.authorName}</span>
                                    </div>
                                    {q.questionText && <div className="star-question-text">{q.questionText}</div>}
                                    {q.imageUrl && <img src={q.imageUrl} alt="Topic" className="star-question-img" loading="lazy" />}
                                  </div>
                                ))
                              ) : (
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                  No topics added yet. Click the + button to add one.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add Question Modal */}
      {addingToChapter && (
        <div className="star-modal-overlay" onClick={() => !isSubmitting && setAddingToChapter(null)}>
          <div className="star-modal" onClick={e => e.stopPropagation()}>
            <div className="star-modal-header">
              <h3 className="star-modal-title">Add to {addingToChapter.chapterName}</h3>
              <button onClick={() => setAddingToChapter(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddQuestion}>
              <input
                type="text"
                className="star-input"
                placeholder="Topic Name (e.g. Important Numerical)"
                value={topicName}
                onChange={e => setTopicName(e.target.value)}
                required
              />
              
              <textarea
                className="star-input star-textarea"
                placeholder="Type your question or notes here..."
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
              />

              <label className="star-upload-btn">
                <ImageIcon size={18} />
                {imageFile ? imageFile.name : 'Upload Image (Optional)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </label>

              {imagePreview && (
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', padding: '0.25rem', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {error && <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', background: 'rgba(248,113,113,0.1)', padding: '0.5rem', borderRadius: '6px' }}>{error}</div>}

              <button type="submit" className="star-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={18} className="spin" /> Saving...</> : <><Send size={18} /> Add Topic</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
