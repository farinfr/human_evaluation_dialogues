import React from 'react';
import { useAuth } from '../context/AuthContext';

const AdminTest = () => {
  const { user } = useAuth();
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Status Debug</h2>
      <pre style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px' }}>
        {JSON.stringify(user, null, 2)}
      </pre>
      <p>is_admin value: {user?.is_admin?.toString()}</p>
      <p>is_admin type: {typeof user?.is_admin}</p>
      <p>is_admin === 1: {(user?.is_admin === 1).toString()}</p>
      <p>is_admin === true: {(user?.is_admin === true).toString()}</p>
      <p>is_admin == 1: {(user?.is_admin == 1).toString()}</p>
      <p>Can access admin: {(user && (user.is_admin === 1 || user.is_admin === true)).toString()}</p>
    </div>
  );
};

export default AdminTest;

