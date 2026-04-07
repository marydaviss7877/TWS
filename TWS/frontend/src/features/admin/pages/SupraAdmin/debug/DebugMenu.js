import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BugAntIcon, 
  CodeBracketIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  EyeIcon,
  TrashIcon,
  Cog6ToothIcon,
  ServerIcon,
  CircleStackIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { get, post } from '../../../../../shared/utils/apiClient';
import { createLogger } from '../../../../../shared/utils/logger';

const logger = createLogger('DebugMenu');

const DebugMenu = () => {
  const [logs, setLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState({});
  const [debugMode, setDebugMode] = useState(false);
  const [selectedLogLevel, setSelectedLogLevel] = useState('all');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const monitoringIntervalRef = useRef(null);

  // Fetch system info from API
  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await get('/api/supra-admin/debug/system-info');
      if (response.success && response.data) {
        setSystemInfo(response.data);
      }
    } catch (error) {
      logger.error('Failed to fetch system info', error);
      // Set default values on error
      setSystemInfo({
        nodeVersion: 'N/A',
        memoryUsage: { used: 'N/A', total: 'N/A', percentage: 0 },
        uptime: 'N/A',
        environment: process.env.NODE_ENV || 'unknown',
        database: { status: 'unknown', connections: 0, maxConnections: 0 },
        redis: { status: 'unknown', memory: 'N/A', keys: 0 },
        api: { requestsPerMinute: 0, averageResponseTime: 'N/A', errorRate: '0%' }
      });
    }
  }, []);

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    try {
      const response = await get('/api/supra-admin/debug/logs?limit=50');
      if (response.success && response.data) {
        const logsData = response.data.logs || response.data || [];
        setLogs(logsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (error) {
      logger.error('Failed to fetch logs', error);
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSystemInfo(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSystemInfo, fetchLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Fixed startMonitoring with proper closure handling
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Clear any existing interval
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    
    // Use ref to track monitoring state
    const monitoringActive = { current: true };
    
    monitoringIntervalRef.current = setInterval(async () => {
      if (!monitoringActive.current) {
        clearInterval(monitoringIntervalRef.current);
        return;
      }
      
      // Fetch new logs
      try {
        const response = await get('/api/supra-admin/debug/logs?limit=10&recent=true');
        if (response.success && response.data) {
          const newLogs = response.data.logs || response.data || [];
          setLogs(prev => {
            const combined = [...newLogs, ...prev];
            // Remove duplicates and keep last 100
            const unique = combined.filter((log, index, self) => 
              index === self.findIndex(l => l.id === log.id)
            );
            return unique.slice(0, 100);
          });
        }
      } catch (error) {
        logger.error('Failed to fetch logs during monitoring', error);
      }
    }, 2000);

    // Store cleanup function
    intervalRef.current = () => {
      monitoringActive.current = false;
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
    };
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      intervalRef.current();
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        intervalRef.current();
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  // Import getLogLevelColor from shared utils if needed, or keep local version
  const getLogLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'warn': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'info': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'debug': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'error': return <XCircleIcon className="w-4 h-4" />;
      case 'warn': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'info': return <InformationCircleIcon className="w-4 h-4" />;
      case 'debug': return <BugAntIcon className="w-4 h-4" />;
      default: return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  const filteredLogs = logs.filter(log => 
    selectedLogLevel === 'all' || log.level === selectedLogLevel
  );

  const executeDebugCommand = useCallback(async (command) => {
    try {
      const response = await post('/api/supra-admin/debug/execute', { command });
      
      if (response.success) {
        const newLog = {
          id: Date.now(),
          timestamp: new Date(),
          level: 'info',
          message: `Executed debug command: ${command}`,
          source: 'debug',
          result: response.result,
          userId: null,
          tenant: null
        };
        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
      } else {
        throw new Error(response.message || 'Command execution failed');
      }
    } catch (error) {
      logger.error('Failed to execute debug command', error);
      const errorLog = {
        id: Date.now(),
        timestamp: new Date(),
        level: 'error',
        message: `Failed to execute command: ${command} - ${error.message}`,
        source: 'debug',
        userId: null,
        tenant: null
      };
      setLogs(prev => [errorLog, ...prev.slice(0, 99)]);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-premium p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <BugAntIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debug Menu</h1>
              <p className="text-gray-600 dark:text-gray-400">System debugging and monitoring tools</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Debug Mode:</span>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  debugMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    debugMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isMonitoring 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isMonitoring ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
              <span>{isMonitoring ? 'Stop' : 'Start'} Monitoring</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ServerIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Information</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Node Version</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{systemInfo.nodeVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Environment</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{systemInfo.environment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{systemInfo.uptime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.memoryUsage?.used} / {systemInfo.memoryUsage?.total} ({systemInfo.memoryUsage?.percentage}%)
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CircleStackIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Database Status</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {systemInfo.database?.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Connections</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.database?.connections} / {systemInfo.database?.maxConnections}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Redis Status</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {systemInfo.redis?.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Redis Keys</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.redis?.keys}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Commands */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CodeBracketIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Debug Commands</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'Clear Cache',
            'Restart Services',
            'Check Health',
            'Generate Report',
            'Backup Database',
            'Test Connections',
            'Validate Config',
            'Clean Logs'
          ].map((command) => (
            <button
              key={command}
              onClick={() => executeDebugCommand(command)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              {command}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="glass-card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Logs</h2>
              <select
                value={selectedLogLevel}
                onChange={(e) => setSelectedLogLevel(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <div className="flex space-x-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 flex items-center space-x-1 disabled:opacity-50"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Refresh</span>
            </button>
              <button
                onClick={clearLogs}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log) => (
              <div key={log.id} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-start space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getLogLevelColor(log.level)}`}>
                    {getLogLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.timestamp.toLocaleString()}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        [{log.source}]
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{log.message}</p>
                    {log.userId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        User: {log.userId?._id || log.userId?.email || log.userId || ''} | Tenant: {log.tenant?._id || log.tenant?.name || log.tenant || ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugMenu;
