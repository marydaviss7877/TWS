import { API_BASE_URL } from '../../../constants/apiEndpoints';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MonitoringSystemStatus = () => {
  const apiBaseUrl = process.env.REACT_APP_API_URL || '';
  const appBaseUrl = window.location.origin;
  const monitoringWsBase = apiBaseUrl
    ? apiBaseUrl.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
  const monitoringWsUrl = `${monitoringWsBase}/ws/monitoring`;
  const [backendStatus, setBackendStatus] = useState('checking');
  const [monitoringStatus, setMonitoringStatus] = useState('checking');
  const [websocketStatus, setWebsocketStatus] = useState('checking');
  const [redisStatus, setRedisStatus] = useState('checking');
  const [monitoringMessage, setMonitoringMessage] = useState('');

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    // Check backend health
    try {
      const response = await axios.get(`${apiBaseUrl}/health`);
      if (response.status === 200) {
        setBackendStatus('online');
        console.log('✅ Backend Health:', response.data);
      }
    } catch (error) {
      setBackendStatus('offline');
      console.error('❌ Backend Health Failed:', error.message);
    }

    // Check monitoring API
    try {
      const response = await axios.get(`${apiBaseUrl}/api/monitoring/health`);
      setMonitoringStatus(response.status === 200 ? 'online' : 'offline');
      setMonitoringMessage(response?.data?.message || '');
    } catch (error) {
      setMonitoringStatus('offline');
      setMonitoringMessage(error?.response?.data?.message || 'Monitoring telemetry unavailable');
    }

    // Check WebSocket
    try {
      const ws = new WebSocket(monitoringWsUrl);
      ws.onopen = () => {
        setWebsocketStatus('online');
        ws.close();
      };
      ws.onerror = () => {
        setWebsocketStatus('offline');
      };
    } catch (error) {
      setWebsocketStatus('offline');
    }

    // Redis status should never be assumed; expose as unknown unless telemetry includes it.
    setRedisStatus('checking');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-50 border-green-200';
      case 'offline': return 'text-red-600 bg-red-50 border-red-200';
      case 'checking': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return '✅';
      case 'offline': return '❌';
      case 'checking': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🚀 Real-Time Monitoring System Status
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={`p-6 rounded-lg border-2 ${getStatusColor(backendStatus)}`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              {getStatusIcon(backendStatus)} Backend Server
            </h3>
            <p className="text-sm">
              Status: <span className="font-medium">{backendStatus.toUpperCase()}</span>
            </p>
            <p className="text-sm mt-1">Endpoint: /health</p>
          </div>

          <div className={`p-6 rounded-lg border-2 ${getStatusColor(monitoringStatus)}`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              {getStatusIcon(monitoringStatus)} Monitoring API
            </h3>
            <p className="text-sm">
              Status: <span className="font-medium">{monitoringStatus.toUpperCase()}</span>
            </p>
            <p className="text-sm mt-1">Endpoint: /api/monitoring/health</p>
            {monitoringMessage ? <p className="text-xs mt-2 opacity-80">{monitoringMessage}</p> : null}
          </div>

          <div className={`p-6 rounded-lg border-2 ${getStatusColor(websocketStatus)}`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              {getStatusIcon(websocketStatus)} WebSocket
            </h3>
            <p className="text-sm">
              Status: <span className="font-medium">{websocketStatus.toUpperCase()}</span>
            </p>
            <p className="text-sm mt-1">URL: {monitoringWsUrl}</p>
          </div>

          <div className={`p-6 rounded-lg border-2 ${getStatusColor(redisStatus)}`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              {getStatusIcon(redisStatus)} Redis
            </h3>
            <p className="text-sm">
              Status: <span className="font-medium">{redisStatus.toUpperCase()}</span>
            </p>
            <p className="text-sm mt-1">Status reflects runtime telemetry only</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            🎯 How to Access the Monitoring System
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Option 1: Login as Supra-Admin</h3>
              <p className="text-blue-800 text-sm mb-2">
                1. Go to: <code className="bg-blue-100 px-2 py-1 rounded">{`${appBaseUrl}/supra-admin-login`}</code>
              </p>
              <p className="text-blue-800 text-sm mb-2">
                2. Login with your super_admin credentials
              </p>
              <p className="text-blue-800 text-sm">
                3. Navigate to: <code className="bg-blue-100 px-2 py-1 rounded">{`${appBaseUrl}/supra-admin/real-time-monitoring`}</code>
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Option 2: Test Route (No Auth Required)</h3>
              <p className="text-green-800 text-sm mb-2">
                Direct access: <code className="bg-green-100 px-2 py-1 rounded">{`${appBaseUrl}/test-monitoring`}</code>
              </p>
              <p className="text-green-800 text-sm">
                Then navigate to: <code className="bg-green-100 px-2 py-1 rounded">{`${appBaseUrl}/test-monitoring/real-time-monitoring`}</code>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg border-2 border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📊 Monitoring Features Available
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">🔴 Real-Time Metrics</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Shows only metrics returned by backend endpoints</li>
                <li>• Unavailable telemetry is surfaced as unavailable</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">🛡️ Security Monitoring</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Endpoint-driven, no simulated threat payloads</li>
                <li>• Explicit unavailable responses are shown as-is</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">⚡ Performance Analytics</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Data shown only when backend confirms availability</li>
                <li>• No hardcoded performance assumptions</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">🚨 Alert System</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Alerts/logs/threats use explicit backend availability state</li>
                <li>• No mock alert stream in UI</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={checkSystemStatus}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitoringSystemStatus;
