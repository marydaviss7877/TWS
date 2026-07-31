import React from 'react';
import { useSocket } from '../../../app/providers/SocketContext';
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const ConnectionStatusIndicator = () => {
  const { 
    isConnected, 
    connectionState, 
    connectionError, 
    reconnectAttempts, 
    reconnect 
  } = useSocket();

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: WifiIcon,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Connected',
          show: false // Don't show when connected
        };
      case 'connecting':
        return {
          icon: ArrowPathIcon,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Connecting...',
          show: true
        };
      case 'reconnecting':
        return {
          icon: ArrowPathIcon,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: `Reconnecting... (${reconnectAttempts})`,
          show: true
        };
      case 'error':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          text: 'Connection error',
          show: true
        };
      case 'failed':
        return {
          icon: XCircleIcon,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Connection failed',
          show: true
        };
      case 'disconnected':
        return {
          icon: XCircleIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Disconnected',
          show: true
        };
      default:
        return {
          icon: WifiIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Unknown',
          show: false
        };
    }
  };

  const statusConfig = getStatusConfig();

  if (!statusConfig.show) {
    return null;
  }

  const Icon = statusConfig.icon;

  return (
    <div className={`fixed top-4 right-4 z-50 ${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-lg p-3 shadow-lg max-w-sm`}>
      <div className="flex items-center space-x-3">
        <Icon className={`w-5 h-5 ${statusConfig.color} ${connectionState === 'reconnecting' ? 'tws-loading-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.text}
          </p>
          {connectionError && (
            <p className="text-xs text-gray-600 mt-1 truncate">
              {connectionError}
            </p>
          )}
        </div>
        {(connectionState === 'failed' || connectionState === 'error') && (
          <button
            onClick={reconnect}
            className={`text-xs px-2 py-1 rounded ${statusConfig.color} hover:bg-opacity-20 transition-colors`}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatusIndicator;
