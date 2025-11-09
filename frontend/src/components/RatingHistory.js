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

const RatingHistory = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/ratings/history`);
      setRatings(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load rating history');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const Navbar = () => (
    <div className="navbar">
      <h1>Dialogue Evaluation System</h1>
      <div className="nav-links">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          Dashboard
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/history'); }}>
          Rating History
        </a>
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

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', color: '#667eea' }}>Loading history...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#667eea' }}>Your Rating History</h2>
          
          {error && <div className="error">{error}</div>}

          {ratings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>You haven't rated any dialogues yet.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
                style={{ marginTop: '20px' }}
              >
                Start Rating Dialogues
              </button>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Total ratings: {ratings.length}
              </p>
              
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  className="card"
                  style={{
                    marginBottom: '15px',
                    border: '1px solid #e0e0e0',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleExpand(rating.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ marginBottom: '10px', color: '#333' }}>
                        {rating.product_title || 'Dialogue'}
                      </h3>
                      <div style={{ marginBottom: '15px', fontSize: '14px', color: '#555' }}>
                        <strong>Kind:</strong>{' '}
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#e8eaf6',
                            color: '#3f51b5',
                            fontWeight: 600
                          }}
                        >
                          {rating.kind ?? rating.dialogue?.kind ?? 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div>
                          <strong>Realism:</strong>{' '}
                          <span style={{ color: '#667eea' }}>
                            {'★'.repeat(rating.ratings.realism || 0)}
                            {'☆'.repeat(5 - (rating.ratings.realism || 0))} {rating.ratings.realism || 0}/5
                          </span>
                        </div>
                        <div>
                          <strong>Conciseness:</strong>{' '}
                          <span style={{ color: '#667eea' }}>
                            {'★'.repeat(rating.ratings.conciseness || 0)}
                            {'☆'.repeat(5 - (rating.ratings.conciseness || 0))} {rating.ratings.conciseness || 0}/5
                          </span>
                        </div>
                        <div>
                          <strong>Coherence:</strong>{' '}
                          <span style={{ color: '#667eea' }}>
                            {'★'.repeat(rating.ratings.coherence || 0)}
                            {'☆'.repeat(5 - (rating.ratings.coherence || 0))} {rating.ratings.coherence || 0}/5
                          </span>
                        </div>
                        <div>
                          <strong>Overall Naturalness:</strong>{' '}
                          <span style={{ color: '#667eea' }}>
                            {'★'.repeat(rating.ratings.overall_naturalness || 0)}
                            {'☆'.repeat(5 - (rating.ratings.overall_naturalness || 0))} {rating.ratings.overall_naturalness || 0}/5
                          </span>
                        </div>
                        <div>
                          <strong>Utterance Realism:</strong>{' '}
                          <span style={{ color: '#667eea' }}>
                            {'★'.repeat(rating.ratings.utterance_realism || 0)}
                            {'☆'.repeat(5 - (rating.ratings.utterance_realism || 0))} {rating.ratings.utterance_realism || 0}/5
                          </span>
                        </div>
                        <div>
                          <strong>Script-following:</strong>{' '}
                          <span style={{ color: '#667eea' }}>
                            {'★'.repeat(rating.ratings.script_following || 0)}
                            {'☆'.repeat(5 - (rating.ratings.script_following || 0))} {rating.ratings.script_following || 0}/5
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                        Rated on: {new Date(rating.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', color: '#667eea' }}>
                      {expandedId === rating.id ? '▼' : '▶'}
                    </div>
                  </div>

                  {expandedId === rating.id && rating.dialogue && (
                    <div style={{
                      marginTop: '20px',
                      padding: '15px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <h4 style={{ marginBottom: '15px' }}>Dialogue:</h4>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {rating.dialogue.dialogue && rating.dialogue.dialogue.map((turn, index) => (
                          <div
                            key={index}
                            style={{
                              marginBottom: '10px',
                              padding: '10px',
                              borderRadius: '6px',
                              background: turn.role === 'user' ? '#e3f2fd' : '#f3e5f5',
                              borderLeft: `3px solid ${turn.role === 'user' ? '#2196f3' : '#9c27b0'}`
                            }}
                          >
                            <div style={{ 
                              fontWeight: '600', 
                              marginBottom: '5px',
                              fontSize: '14px',
                              color: turn.role === 'user' ? '#1976d2' : '#7b1fa2'
                            }}>
                              {turn.role === 'user' ? '👤 User' : '🤖 Assistant'}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RatingHistory;

