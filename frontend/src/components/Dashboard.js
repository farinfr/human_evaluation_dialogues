import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Helper function to format text with proper bidirectional support
const formatText = (text) => {
  if (!text) return '';
  
  // Split text by English words/patterns and Persian text
  const englishPattern = /([a-zA-Z0-9][a-zA-Z0-9\s\.\,\:\;\!\?\-\(\)]*[a-zA-Z0-9]|[a-zA-Z0-9])/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = englishPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isEnglish: false
      });
    }
    
    parts.push({
      text: match[0],
      isEnglish: true
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isEnglish: false
    });
  }
  
  if (parts.length === 0) {
    return text;
  }
  
  return parts.map((part, index) => {
    if (part.isEnglish) {
      return (
        <span key={index} dir="ltr" style={{ display: 'inline-block', unicodeBidi: 'embed' }}>
          {part.text}
        </span>
      );
    }
    return <span key={index}>{part.text}</span>;
  });
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dialogue, setDialogue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState({
    realism: 3,
    conciseness: 3,
    coherence: 3,
    overall_naturalness: 3,
    utterance_realism: 3,
    script_following: 3
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadRandomDialogue();
  }, []);

  const loadRandomDialogue = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.get(`${API_URL}/dialogue/random`);
      
      // Check if user has rated all dialogues
      if (response.data.all_rated === true || response.data.dialogue === null) {
        setDialogue(null);
        setError('You have rated all available dialogues! There are no more dialogues to rate.');
        return;
      }
      
      // Check if response has dialogue data (normal response)
      if (response.data.dialogue_id) {
        setDialogue(response.data);
        // Reset ratings when loading new dialogue
        setRatings({
          realism: 3,
          conciseness: 3,
          coherence: 3,
          overall_naturalness: 3,
          utterance_realism: 3,
          script_following: 3
        });
      } else {
        // Unexpected response format
        setDialogue(null);
        setError('Unexpected response from server');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dialogue');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (metric, value) => {
    setRatings(prev => ({
      ...prev,
      [metric]: parseInt(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_URL}/rating`, {
        dialogue_id: dialogue.dialogue_id,
        ...ratings
      });

      setSuccess('Rating submitted successfully!');
      setTimeout(() => {
        loadRandomDialogue();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label, description }) => (
    <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '16px', color: '#333' }}>
        {label}: {value} / 5
      </label>
      {description && (
        <div style={{ 
          marginBottom: '12px', 
          fontSize: '14px', 
          color: '#666',
          lineHeight: '1.5',
          fontStyle: 'italic'
        }}>
          {description}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              fontSize: '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: star <= value ? '#ffc107' : '#e0e0e0',
              transition: 'transform 0.2s',
              padding: '5px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div>
        <Navbar user={user} logout={logout} />
        <div className="container">
          <div className="card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', color: '#667eea' }}>Loading dialogue...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !dialogue) {
    return (
      <div>
        <Navbar user={user} logout={logout} />
        <div className="container">
          <div className="card">
            <div className="error">{error}</div>
            {error.includes('rated all available') ? (
              <div style={{ marginTop: '20px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
                <h3 style={{ color: '#1976d2', marginBottom: '10px' }}>🎉 Congratulations!</h3>
                <p>You have completed rating all available dialogues. Thank you for your participation!</p>
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                  You can view your rating history in the "Rating History" section.
                </p>
              </div>
            ) : (
              <button onClick={loadRandomDialogue} className="btn btn-primary" style={{ marginTop: '20px' }}>
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar user={user} logout={logout} />
      <div className="container">
        {dialogue && (
          <>
            <div className="card">
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
                {dialogue.product_title || 'Dialogue Evaluation'}
              </h2>
              
              {dialogue.product_details && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  background: '#f8f9fa', 
                  borderRadius: '8px' 
                }}>
                  <h3 style={{ marginBottom: '10px', fontSize: '18px' }}>Product Details</h3>
                  <p><strong>Brand:</strong> {dialogue.brand}</p>
                  <p><strong>Category:</strong> {dialogue.category}</p>
                  {dialogue.price && <p><strong>Price:</strong> {dialogue.price.toLocaleString()} تومان</p>}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Dialogue</h3>
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  {dialogue.dialogue && dialogue.dialogue.map((turn, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '15px',
                        padding: '12px',
                        borderRadius: '8px',
                        background: turn.role === 'user' ? '#e3f2fd' : '#f3e5f5',
                        borderLeft: `4px solid ${turn.role === 'user' ? '#2196f3' : '#9c27b0'}`
                      }}
                    >
                      <div style={{ 
                        fontWeight: '600', 
                        marginBottom: '5px',
                        color: turn.role === 'user' ? '#1976d2' : '#7b1fa2'
                      }}>
                        {turn.role === 'user' ? '👤 User' : '🤖 Assistant'}
                      </div>
                      <div style={{ 
                        color: '#333',
                        direction: 'rtl',
                        textAlign: 'right',
                        unicodeBidi: 'plaintext'
                      }}>
                        {formatText(turn.text)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {dialogue.dialogue_summary && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  background: '#fff3cd', 
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                  direction: 'rtl',
                  textAlign: 'right',
                  unicodeBidi: 'plaintext'
                }}>
                  <strong>Summary:</strong> {formatText(dialogue.dialogue_summary)}
                </div>
              )}
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>Rate this Dialogue</h2>
              
              <form onSubmit={handleSubmit}>
                <StarRating
                  label="Realism"
                  description="واقعیت‌گرایی: آیا گفتگو احتمال دارد در دنیای واقعی از نظر منطقی رخ دهد؟"
                  value={ratings.realism}
                  onChange={(value) => handleRatingChange('realism', value)}
                />
                <StarRating
                  label="Conciseness"
                  description="مختصر بودن: آیا گفتگو بیش از حد طولانی و پرحرف است؟"
                  value={ratings.conciseness}
                  onChange={(value) => handleRatingChange('conciseness', value)}
                />
                <StarRating
                  label="Coherence"
                  description="انسجام: آیا گفتگو روان و منسجم است و با تاریخچه گفتگو از ابتدا همخوانی دارد؟"
                  value={ratings.coherence}
                  onChange={(value) => handleRatingChange('coherence', value)}
                />
                <StarRating
                  label="Overall Naturalness"
                  description="طبیعی بودن کلی: ارزیابی کلی ذهنی از گفتگو و اینکه آیا طبیعی به نظر می‌رسد؟"
                  value={ratings.overall_naturalness}
                  onChange={(value) => handleRatingChange('overall_naturalness', value)}
                />
                <StarRating
                  label="Utterance-level Realism"
                  description="واقعیت‌گرایی در سطح گفتار: آیا هر گفتار احتمال دارد در دنیای واقعی از نظر منطقی بیان شود؟"
                  value={ratings.utterance_realism}
                  onChange={(value) => handleRatingChange('utterance_realism', value)}
                />
                <StarRating
                  label="Script-following"
                  description="پیروی از اسکریپت: آیا گفتارها با ویژگی‌های محصول و ترجیحات مشتری سازگار هستند؟"
                  value={ratings.script_following}
                  onChange={(value) => handleRatingChange('script_following', value)}
                />

                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Rating'}
                  </button>
                  <button
                    type="button"
                    onClick={loadRandomDialogue}
                    className="btn btn-secondary"
                    disabled={submitting}
                  >
                    Skip to Next Dialogue
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Navbar = ({ user, logout }) => {
  const navigate = useNavigate();
  
  return (
    <div className="navbar">
      <h1>Dialogue Evaluation System</h1>
      <div className="nav-links">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          Dashboard
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/history'); }}>
          Rating History
        </a>
        {(user?.is_admin === 1 || user?.is_admin === true || user?.is_admin === '1') && (
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin'); }}>
            Admin Dashboard
          </a>
        )}
        <span className="user-info">Welcome, {user?.username}</span>
        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

