import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HeartIcon,
  CircleStackIcon,
  CloudIcon,
  ServerIcon,
  ArrowPathIcon,
  ServerStackIcon,
  SignalIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card/Card';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { Progress } from '../../../../../components/ui/Progress/Progress';
import { Alert, AlertTitle, AlertDescription } from '../../../../../components/ui/Alert/Alert';
import { Spinner } from '../../../../../components/ui/Spinner/Spinner';
import { Button } from '../../../../../components/ui/Button/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../../components/ui/Table/Table';
import moment from 'moment';
import { get } from '../../../../../shared/utils/apiClient';
import { createLogger } from '../../../../../shared/utils/logger';
import { getStatusIcon, formatBytes, getPercentageColor } from '../../../../../shared/utils/statusUtils';

const logger = createLogger('SystemHealth');

const REFRESH_INTERVAL = 30000; // 30 seconds

// getPercentageColor returns a hex string (green/orange/red) for inline style use —
// this maps the same thresholds to Tailwind text-color classes for the Statistic numbers.
const percentTextClass = (value) => {
  const hex = getPercentageColor(value);
  if (hex === '#52c41a') return 'text-green-600 dark:text-green-400';
  if (hex === '#faad14') return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const percentBarClass = (value) => {
  const hex = getPercentageColor(value);
  if (hex === '#52c41a') return 'bg-green-500';
  if (hex === '#faad14') return 'bg-amber-500';
  return 'bg-red-500';
};

const SystemHealth = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Memoized system status
  const systemStatus = useMemo(() => {
    return healthData?.overall?.status || 'unknown';
  }, [healthData]);

  // Fetch health data with proper error handling
  const fetchHealthData = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setError(null);
      setLoading(true);

      // Fetch health data from API
      const healthResponse = await get('/api/supra-admin/system-health', {
        signal: abortControllerRef.current.signal
      });

      if (healthResponse.success && healthResponse.data) {
        setHealthData(healthResponse.data);
      } else {
        throw new Error(healthResponse.message || 'Failed to fetch health data');
      }

      setLastUpdate(new Date());
      logger.info('Health data fetched successfully');

    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError') {
        return;
      }

      const errorMessage = err.message || 'Failed to fetch system health data. Please try again.';
      setError(errorMessage);
      logger.error('Failed to fetch health data', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Setup interval with proper cleanup
  useEffect(() => {
    fetchHealthData();

    intervalRef.current = setInterval(() => {
      fetchHealthData();
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHealthData]);

  // Memoized services data for table
  const servicesData = useMemo(() => {
    if (!healthData?.services) return [];
    return Object.entries(healthData.services).map(([name, service]) => ({
      key: name,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      ...service
    }));
  }, [healthData]);

  // Loading state
  if (loading && !healthData) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner size="lg" label="Loading system health data…" />
      </div>
    );
  }

  // Error state
  if (error && !healthData) {
    return (
      <Alert variant="destructive" className="m-5">
        <AlertTitle>Error Loading Health Data</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <Button size="sm" className="mt-2" onClick={fetchHealthData}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!healthData) {
    return (
      <Alert className="m-5">
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Unable to fetch system health data. Please check your connection and try again.</span>
          <Button size="sm" onClick={fetchHealthData}>Refresh</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const cpuUsage = healthData.system?.cpu?.usage || 0;
  const memoryUsage = healthData.system?.memory
    ? (healthData.system.memory.used / healthData.system.memory.total * 100)
    : 0;
  const diskUsage = healthData.system?.disk
    ? (healthData.system.disk.used / healthData.system.disk.total * 100)
    : 0;
  const networkTotal = healthData.system?.network
    ? (healthData.system.network.bytesIn + healthData.system.network.bytesOut)
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <HeartIcon className="h-6 w-6" />
            System Health
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overall system status and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`h-2 w-2 rounded-full ${systemStatus === 'healthy' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} />
            {lastUpdate ? `Last updated: ${moment(lastUpdate).fromNow()}` : 'Never updated'}
          </span>
          <Button onClick={fetchHealthData} disabled={loading}>
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Alert variant={healthData.overall.status === 'healthy' ? 'success' : 'warning'} className="mb-6">
        <AlertTitle>System Status: {healthData.overall.status.toUpperCase()}</AlertTitle>
        <AlertDescription>
          Uptime: {healthData.overall.uptime} | Version: {healthData.overall.version} | Environment: {healthData.overall.environment}
        </AlertDescription>
      </Alert>

      {/* System Metrics */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>CPU Usage</span>
              <CpuChipIcon className="h-4 w-4" />
            </div>
            <p className={`text-2xl font-bold ${percentTextClass(cpuUsage)}`}>{cpuUsage.toFixed(1)}%</p>
            <Progress value={cpuUsage} className="h-1.5 mt-2" indicatorClassName={percentBarClass(cpuUsage)} />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {healthData.system?.cpu?.cores || 0} cores | Load: {healthData.system?.cpu?.loadAverage?.join(', ') || 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Memory Usage</span>
              <ServerIcon className="h-4 w-4" />
            </div>
            <p className={`text-2xl font-bold ${percentTextClass(memoryUsage)}`}>{memoryUsage.toFixed(1)}%</p>
            <Progress value={memoryUsage} className="h-1.5 mt-2" indicatorClassName={percentBarClass(memoryUsage)} />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {healthData.system?.memory
                ? `${formatBytes(healthData.system.memory.used)} / ${formatBytes(healthData.system.memory.total)}`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Disk Usage</span>
              <CircleStackIcon className="h-4 w-4" />
            </div>
            <p className={`text-2xl font-bold ${percentTextClass(diskUsage)}`}>{diskUsage.toFixed(1)}%</p>
            <Progress value={diskUsage} className="h-1.5 mt-2" indicatorClassName={percentBarClass(diskUsage)} />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {healthData.system?.disk
                ? `${formatBytes(healthData.system.disk.used * 1024 * 1024 * 1024)} / ${formatBytes(healthData.system.disk.total * 1024 * 1024 * 1024)}`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Network I/O</span>
              <CloudIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytes(networkTotal)}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {healthData.system?.network
                ? `In: ${formatBytes(healthData.system.network.bytesIn)} | Out: ${formatBytes(healthData.system.network.bytesOut)}`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Services Status</CardTitle>
            <ServerStackIcon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Uptime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesData.length ? servicesData.map((service) => (
                  <TableRow key={service.key}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 font-medium">
                        {getStatusIcon(service.status)}
                        {service.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ['healthy', 'active', 'running'].includes(service.status?.toLowerCase())
                            ? 'success'
                            : ['warning', 'idle', 'pending'].includes(service.status?.toLowerCase())
                              ? 'warning'
                              : 'destructive'
                        }
                      >
                        {service.status?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{service.responseTime}ms</TableCell>
                    <TableCell>{service.uptime}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-gray-500 dark:text-gray-400">
                      No services reported
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Performance Metrics</CardTitle>
            <SignalIcon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {[
                ['Avg Response Time', healthData.performance?.responseTime?.avg != null ? `${healthData.performance.responseTime.avg.toFixed(1)}ms` : 'N/A'],
                ['95th Percentile', healthData.performance?.responseTime?.p95 != null ? `${healthData.performance.responseTime.p95.toFixed(1)}ms` : 'N/A'],
                ['99th Percentile', healthData.performance?.responseTime?.p99 != null ? `${healthData.performance.responseTime.p99.toFixed(1)}ms` : 'N/A'],
                ['Requests/sec', healthData.performance?.throughput?.requestsPerSecond != null ? healthData.performance.throughput.requestsPerSecond.toFixed(0) : 'N/A'],
                ['Errors/sec', healthData.performance?.throughput?.errorsPerSecond != null ? healthData.performance.throughput.errorsPerSecond.toFixed(2) : 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-2 last:border-0 last:pb-0">
                  <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Security Status</CardTitle>
            <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">SSL Certificate</span>
              {healthData.security?.sslCertificate?.expiresAt ? (
                <Badge variant="success">Valid until {moment(healthData.security.sslCertificate.expiresAt).format('MMM DD, YYYY')}</Badge>
              ) : (
                <Badge variant="secondary">N/A</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Firewall</span>
              {healthData.security?.firewall ? (
                <Badge className="border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  Active ({healthData.security.firewall.blockedRequests || 0} blocked)
                </Badge>
              ) : (
                <Badge variant="secondary">N/A</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Vulnerabilities</span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {healthData.security?.vulnerabilities ? (
                  <>
                    {healthData.security.vulnerabilities.critical > 0 && (
                      <Badge variant="destructive">Critical: {healthData.security.vulnerabilities.critical}</Badge>
                    )}
                    {healthData.security.vulnerabilities.high > 0 && (
                      <Badge className="border-transparent bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        High: {healthData.security.vulnerabilities.high}
                      </Badge>
                    )}
                    {healthData.security.vulnerabilities.medium > 0 && (
                      <Badge variant="warning">Medium: {healthData.security.vulnerabilities.medium}</Badge>
                    )}
                    {healthData.security.vulnerabilities.low > 0 && (
                      <Badge className="border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        Low: {healthData.security.vulnerabilities.low}
                      </Badge>
                    )}
                    {Object.values(healthData.security.vulnerabilities).every((v) => v === 0) && (
                      <Badge variant="success">No vulnerabilities</Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="secondary">N/A</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>System Information</CardTitle>
            <InformationCircleIcon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                <dt className="text-gray-500 dark:text-gray-400">Version</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{healthData.overall?.version || 'N/A'}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                <dt className="text-gray-500 dark:text-gray-400">Environment</dt>
                <dd>
                  <Badge variant={healthData.overall?.environment === 'production' ? 'destructive' : 'secondary'}>
                    {healthData.overall?.environment || 'N/A'}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                <dt className="text-gray-500 dark:text-gray-400">Uptime</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{healthData.overall?.uptime || 'N/A'}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                <dt className="text-gray-500 dark:text-gray-400">Last Restart</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {healthData.overall?.lastRestart ? moment(healthData.overall.lastRestart).fromNow() : 'N/A'}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                <dt className="text-gray-500 dark:text-gray-400">CPU Cores</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{healthData.system?.cpu?.cores || 'N/A'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Total Memory</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {healthData.system?.memory?.total ? formatBytes(healthData.system.memory.total) : 'N/A'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemHealth;
