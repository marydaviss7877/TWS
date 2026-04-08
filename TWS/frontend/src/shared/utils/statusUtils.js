/**
 * Shared Status Utility Functions
 * Common functions for status colors, icons, and formatting
 */

import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

/**
 * Get status color based on status string
 * @param {string} status - Status value (healthy, warning, error, etc.)
 * @returns {string} Color code
 */
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'active':
    case 'running':
    case 'valid':
    case 'success':
    case 'connected':
      return '#52c41a'; // Green
    case 'warning':
    case 'idle':
    case 'pending':
      return '#faad14'; // Orange
    case 'error':
    case 'unhealthy':
    case 'stopped':
    case 'critical':
    case 'failed':
    case 'disconnected':
      return '#ff4d4f'; // Red
    default:
      return '#d9d9d9'; // Gray
  }
};

/**
 * Get status icon component
 * @param {string} status - Status value
 * @returns {React.Component} Icon component
 */
export const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'active':
    case 'running':
    case 'valid':
    case 'success':
    case 'connected':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'warning':
    case 'idle':
    case 'pending':
      return <WarningOutlined style={{ color: '#faad14' }} />;
    case 'error':
    case 'unhealthy':
    case 'stopped':
    case 'critical':
    case 'failed':
    case 'disconnected':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    default:
      return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
  }
};

/**
 * Get severity color
 * @param {string} severity - Severity level (critical, high, medium, low)
 * @returns {string} Color code
 */
export const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return '#ff4d4f'; // Red
    case 'high':
      return '#ff7a45'; // Orange-red
    case 'medium':
      return '#faad14'; // Orange
    case 'low':
      return '#52c41a'; // Green
    default:
      return '#d9d9d9'; // Gray
  }
};

/**
 * Get log level color
 * @param {string} level - Log level (error, warn, info, debug)
 * @returns {string} Color code
 */
export const getLogLevelColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'error':
      return '#ff4d4f'; // Red
    case 'warn':
    case 'warning':
      return '#faad14'; // Orange
    case 'info':
      return '#1890ff'; // Blue
    case 'debug':
      return '#d9d9d9'; // Gray
    default:
      return '#d9d9d9'; // Gray
  }
};

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat().format(num);
};

/**
 * Get percentage color based on value and thresholds
 * @param {number} value - Current value
 * @param {number} goodThreshold - Good threshold (default 70)
 * @param {number} warningThreshold - Warning threshold (default 85)
 * @returns {string} Color code
 */
export const getPercentageColor = (value, goodThreshold = 70, warningThreshold = 85) => {
  if (value <= goodThreshold) return '#52c41a'; // Green
  if (value <= warningThreshold) return '#faad14'; // Orange
  return '#ff4d4f'; // Red
};

