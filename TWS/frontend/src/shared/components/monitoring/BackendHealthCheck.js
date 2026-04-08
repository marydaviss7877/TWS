import React, { useState, useEffect } from 'react';

const BackendHealthCheck = () => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [authStatus, setAuthStatus] = useState('checking');

  useEffect(() => {
    // Check backend health
    fetch('http://localhost:5000/api/health')
      .then(response => response.json())
      .then(data => {
        setBackendStatus('online');
      })
      .catch(error => {
        console.error('Backend health check failed:', error);
        setBackendStatus('offline');
      });

    // Check auth endpoint
    fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(response => {
        if (response.status === 401) {
          setAuthStatus('working (no token)');
        } else if (response.ok) {
          setAuthStatus('working');
        } else {
          setAuthStatus('error');
        }
      })
      .catch(error => {
        console.error('Auth endpoint check failed:', error);
        setAuthStatus('offline');
      });
  }, []);

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <h3 className="font-semibold text-gray-900 mb-2">Backend Status</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm">Backend:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            backendStatus === 'online' ? 'bg-green-100 text-green-800' :
            backendStatus === 'offline' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {backendStatus}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Auth API:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            authStatus === 'working' || authStatus === 'working (no token)' ? 'bg-green-100 text-green-800' :
            authStatus === 'offline' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {authStatus}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BackendHealthCheck;
