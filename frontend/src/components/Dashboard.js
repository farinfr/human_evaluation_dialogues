import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dialogue, setDialogue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState({
    reality: 3,
    user_friendly: 3,
    helpfulness: 3,
    naturalness: 3,
    overall: 3
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
      setDialogue(response.data);
      // Reset ratings when loading new dialogue
      setRatings({
        reality: 3,
        user_friendly: 3,
        helpfulness: 3,
        naturalness: 3,
        overall: 3
      });
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

  const StarRating = ({ value, onChange, label }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
        {label}: {value} / 5
      </label>
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
            <button onClick={loadRandomDialogue} className="btn btn-primary" style={{ marginTop: '20px' }}>
              Try Again
            </button>
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
                      <div style={{ color: '#333' }}>{turn.text}</div>
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
                  border: '1px solid #ffc107'
                }}>
                  <strong>Summary:</strong> {dialogue.dialogue_summary}
                </div>
              )}
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>Rate this Dialogue</h2>
              
              <form onSubmit={handleSubmit}>
                <StarRating
                  label="Reality"
                  value={ratings.reality}
                  onChange={(value) => handleRatingChange('reality', value)}
                />
                <StarRating
                  label="User-Friendly"
                  value={ratings.user_friendly}
                  onChange={(value) => handleRatingChange('user_friendly', value)}
                />
                <StarRating
                  label="Helpfulness"
                  value={ratings.helpfulness}
                  onChange={(value) => handleRatingChange('helpfulness', value)}
                />
                <StarRating
                  label="Naturalness"
                  value={ratings.naturalness}
                  onChange={(value) => handleRatingChange('naturalness', value)}
                />
                <StarRating
                  label="Overall"
                  value={ratings.overall}
                  onChange={(value) => handleRatingChange('overall', value)}
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

