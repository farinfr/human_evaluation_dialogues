import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [dialogues, setDialogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check if user is admin (handle both 1 and true)
    const isAdmin = user && (user.is_admin === 1 || user.is_admin === true || user.is_admin === '1');
    if (!isAdmin) {
      console.log('Admin access denied. User:', user);
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes, ratingsRes, dialoguesRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`),
        axios.get(`${API_URL}/admin/users`),
        axios.get(`${API_URL}/admin/ratings?limit=50`),
        axios.get(`${API_URL}/admin/dialogues`)
      ]);
      
      setStats(statsRes.data || {});
      setUsers(usersRes.data || []);
      setRatings(ratingsRes.data || []);
      setDialogues(dialoguesRes.data || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load admin data';
      setError(errorMessage);
      // Set empty defaults on error
      setStats({ totalUsers: 0, totalRatings: 0, totalDialogues: 0, averageRatings: {}, ratingsByDate: [] });
      setUsers([]);
      setRatings([]);
      setDialogues([]);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon }) => (
    <div className="card" style={{ 
      flex: '1', 
      minWidth: '200px', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>{value}</div>
      <div style={{ fontSize: '14px', opacity: 0.9 }}>{title}</div>
    </div>
  );

  if (loading) {
    return (
      <div>
        <Navbar user={user} logout={logout} />
        <div className="container">
          <div className="card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', color: '#667eea' }}>Loading admin dashboard...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar user={user} logout={logout} />
      <div className="container">
        {error && <div className="error">{error}</div>}

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '20px',
          borderBottom: '2px solid #e0e0e0'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            className="btn"
            style={{
              background: activeTab === 'overview' ? '#667eea' : '#f0f0f0',
              color: activeTab === 'overview' ? 'white' : '#333',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px 8px 0 0'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className="btn"
            style={{
              background: activeTab === 'users' ? '#667eea' : '#f0f0f0',
              color: activeTab === 'users' ? 'white' : '#333',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px 8px 0 0'
            }}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('ratings')}
            className="btn"
            style={{
              background: activeTab === 'ratings' ? '#667eea' : '#f0f0f0',
              color: activeTab === 'ratings' ? 'white' : '#333',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px 8px 0 0'
            }}
          >
            Ratings
          </button>
          <button
            onClick={() => setActiveTab('dialogues')}
            className="btn"
            style={{
              background: activeTab === 'dialogues' ? '#667eea' : '#f0f0f0',
              color: activeTab === 'dialogues' ? 'white' : '#333',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px 8px 0 0'
            }}
          >
            Dialogues
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <>
            {error && (
              <div className="error" style={{ marginBottom: '20px' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <StatCard title="Total Users" value={stats.totalUsers} icon="👥" />
              <StatCard title="Total Ratings" value={stats.totalRatings} icon="⭐" />
              <StatCard title="Total Dialogues" value={stats.totalDialogues} icon="💬" />
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>Average Ratings by Metric</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {stats.averageRatings && Object.entries(stats.averageRatings).map(([metric, value]) => (
                  <div key={metric} style={{
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '5px', textTransform: 'capitalize' }}>
                      {metric.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '24px', color: '#667eea', fontWeight: 'bold' }}>
                      {value} / 5
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {stats.ratingsByDate && stats.ratingsByDate.length > 0 && (
              <div className="card">
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>Ratings Over Time (Last 30 Days)</h2>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end', height: '200px' }}>
                  {stats.ratingsByDate.slice().reverse().map((item, index) => {
                    const maxCount = Math.max(...stats.ratingsByDate.map(d => d.count));
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          height: `${height}%`,
                          minHeight: item.count > 0 ? '5px' : '0',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: '5px'
                        }} title={`${item.date}: ${item.count} ratings`} />
                        <div style={{ fontSize: '10px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px', color: '#667eea' }}>All Users</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Username</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Admin</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Ratings</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '12px' }}>{u.id}</td>
                      <td style={{ padding: '12px' }}>{u.username}</td>
                      <td style={{ padding: '12px' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>{u.is_admin ? '✅' : '❌'}</td>
                      <td style={{ padding: '12px' }}>{u.rating_count || 0}</td>
                      <td style={{ padding: '12px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px', color: '#667eea' }}>All Ratings</h2>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {ratings.map((rating) => (
                <div key={rating.id} style={{
                  marginBottom: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <strong>User:</strong> {rating.username} | <strong>Product:</strong> {rating.product_title}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(rating.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {Object.entries(rating.ratings).map(([metric, value]) => (
                      <div key={metric} style={{ fontSize: '14px' }}>
                        <strong>{metric.replace('_', ' ')}:</strong> {value}/5
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dialogues Tab */}
        {activeTab === 'dialogues' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px', color: '#667eea' }}>All Dialogues</h2>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {dialogues.map((dialogue) => (
                <div key={dialogue.id} style={{
                  marginBottom: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>{dialogue.product_title}</strong> (ID: {dialogue.product_id})
                  </div>
                  <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                    <strong>Rating Count:</strong> {dialogue.rating_count} | 
                    <strong> Dialogue ID:</strong> {dialogue.dialogue_id}
                  </div>
                  {dialogue.average_ratings && (
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {Object.entries(dialogue.average_ratings).map(([metric, value]) => (
                        value !== null && (
                          <div key={metric} style={{ fontSize: '14px' }}>
                            <strong>{metric.replace('_', ' ')}:</strong> {value}/5
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Navbar = ({ user, logout }) => {
  const navigate = useNavigate();
  
  return (
    <div className="navbar">
      <h1>Admin Dashboard</h1>
      <div className="nav-links">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          User Dashboard
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin'); }}>
          Admin Dashboard
        </a>
        <span className="user-info">Admin: {user?.username}</span>
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

export default AdminDashboard;

