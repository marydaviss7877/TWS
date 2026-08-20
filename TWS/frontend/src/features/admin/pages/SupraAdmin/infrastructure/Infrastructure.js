import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  EyeIcon,
  Cog6ToothIcon,
  ServerStackIcon,
  CircleStackIcon,
  SignalIcon,
  ShieldExclamationIcon,
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  PlayCircleIcon,
  StopCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card/Card';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { Progress } from '../../../../../components/ui/Progress/Progress';
import { Alert, AlertTitle, AlertDescription } from '../../../../../components/ui/Alert/Alert';
import { Spinner } from '../../../../../components/ui/Spinner/Spinner';
import { Button } from '../../../../../components/ui/Button/Button';
import { DataTable } from '../../../../../components/ui/DataTable/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../../components/ui/Tabs/Tabs';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../../../../components/ui/Tooltip/Tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../components/ui/Dialog/Dialog';
import moment from 'moment';
import { get } from '../../../../../shared/utils/apiClient';
import { createLogger } from '../../../../../shared/utils/logger';
import { getStatusIcon, formatNumber } from '../../../../../shared/utils/statusUtils';

const logger = createLogger('Infrastructure');

const STATUS_BADGE_VARIANT = (status) => {
  const s = (status || '').toLowerCase();
  if (['healthy', 'active', 'running', 'valid', 'success', 'connected'].includes(s)) return 'success';
  if (['warning', 'idle', 'pending'].includes(s)) return 'warning';
  if (['error', 'unhealthy', 'stopped', 'critical', 'failed', 'disconnected'].includes(s)) return 'destructive';
  return 'secondary';
};

// Shared status-card shell for the Security / Monitoring / Networks tabs — each renders a
// Card with a status-icon + name header, a status Badge, and a set of dt/dd rows.
const DetailCard = ({ item, rows }) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between space-y-0">
      <CardTitle className="flex items-center gap-2 text-sm">
        {getStatusIcon(item.status)}
        {item.name}
      </CardTitle>
      <Badge variant={STATUS_BADGE_VARIANT(item.status)}>{item.status}</Badge>
    </CardHeader>
    <CardContent>
      <dl className="space-y-1.5 text-sm">
        {rows.filter(Boolean).map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-1.5 last:border-0 last:pb-0">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </CardContent>
  </Card>
);

const Infrastructure = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [servers, setServers] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [apis, setApis] = useState([]);
  const [security, setSecurity] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [infrastructureStats, setInfrastructureStats] = useState({});
  const abortControllerRef = useRef(null);

  // Fetch infrastructure data from API
  const fetchInfrastructureData = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Fetch all infrastructure data
      const [statsResponse, serversResponse, databasesResponse, apisResponse, securityResponse, monitoringResponse, networksResponse] = await Promise.all([
        get('/api/supra-admin/infrastructure/stats', {
          signal: abortControllerRef.current.signal
        }),
        get('/api/supra-admin/infrastructure/servers', {
          signal: abortControllerRef.current.signal
        }),
        get('/api/supra-admin/infrastructure/databases', {
          signal: abortControllerRef.current.signal
        }),
        get('/api/supra-admin/infrastructure/apis', {
          signal: abortControllerRef.current.signal
        }),
        get('/api/supra-admin/infrastructure/security', {
          signal: abortControllerRef.current.signal
        }),
        get('/api/supra-admin/infrastructure/monitoring', {
          signal: abortControllerRef.current.signal
        }),
        get('/api/supra-admin/infrastructure/networks', {
          signal: abortControllerRef.current.signal
        })
      ]);

      if (statsResponse.success && statsResponse.data) {
        setInfrastructureStats(statsResponse.data);
      }

      if (serversResponse.success && serversResponse.data) {
        setServers(Array.isArray(serversResponse.data) ? serversResponse.data : serversResponse.data.servers || []);
      }

      if (databasesResponse.success && databasesResponse.data) {
        setDatabases(Array.isArray(databasesResponse.data) ? databasesResponse.data : databasesResponse.data.databases || []);
      }

      if (apisResponse.success && apisResponse.data) {
        setApis(Array.isArray(apisResponse.data) ? apisResponse.data : apisResponse.data.apis || []);
      }

      if (securityResponse.success && securityResponse.data) {
        setSecurity(Array.isArray(securityResponse.data) ? securityResponse.data : securityResponse.data.security || []);
      }

      if (monitoringResponse.success && monitoringResponse.data) {
        setMonitoring(Array.isArray(monitoringResponse.data) ? monitoringResponse.data : monitoringResponse.data.monitoring || []);
      }

      if (networksResponse.success && networksResponse.data) {
        setNetworks(Array.isArray(networksResponse.data) ? networksResponse.data : networksResponse.data.networks || []);
      }

      logger.info('Infrastructure data fetched successfully');

    } catch (error) {
      // Don't set error if request was aborted
      if (error.name === 'AbortError') {
        return;
      }

      const errorMessage = error.message || 'Failed to fetch infrastructure data. Please try again.';
      setError(errorMessage);
      logger.error('Failed to fetch infrastructure data', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchInfrastructureData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchInfrastructureData]);

  // Handle view details with proper data transformation
  const handleViewDetails = useCallback((item) => {
    // Transform item to safe format (avoid circular references)
    const safeItem = {
      ...item,
      // Remove any potential circular references
      _id: item._id || item.id,
      name: item.name,
      type: item.type,
      status: item.status,
      // Include only safe, serializable properties
    };

    // Remove functions and complex objects that might cause issues
    Object.keys(safeItem).forEach(key => {
      if (typeof safeItem[key] === 'function' ||
          (typeof safeItem[key] === 'object' && safeItem[key] !== null && !Array.isArray(safeItem[key]) && safeItem[key].constructor !== Object)) {
        delete safeItem[key];
      }
    });

    setSelectedItem(safeItem);
    setModalVisible(true);
  }, []);

  // Memoized table columns to prevent recreation on every render
  const serverColumns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Server',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.original.status)}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{row.original.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.type}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT(getValue())}>{(getValue() || 'unknown').toUpperCase()}</Badge>
    },
    {
      accessorKey: 'cpu',
      header: 'CPU',
      cell: ({ getValue }) => (
        <div className="min-w-[6rem]">
          <Progress value={getValue() || 0} className="h-1.5" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{getValue() || 0}%</p>
        </div>
      )
    },
    {
      accessorKey: 'memory',
      header: 'Memory',
      cell: ({ getValue }) => (
        <div className="min-w-[6rem]">
          <Progress value={getValue() || 0} className="h-1.5" indicatorClassName="bg-green-500" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{getValue() || 0}%</p>
        </div>
      )
    },
    {
      accessorKey: 'ip',
      header: 'IP Address',
      cell: ({ getValue }) => <code className="text-xs">{getValue()}</code>
    },
    { accessorKey: 'uptime', header: 'Uptime' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetails(row.original)}>
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Cog6ToothIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                  {row.original.status === 'running'
                    ? <StopCircleIcon className="h-4 w-4 text-red-500" />
                    : <PlayCircleIcon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Server power controls aren't available yet</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )
    }
  ], [handleViewDetails]);

  const databaseColumns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Database',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <CircleStackIcon className="h-4 w-4 text-gray-400" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{row.original.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.type} {row.original.version}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT(getValue())}>{(getValue() || 'unknown').toUpperCase()}</Badge>
    },
    {
      accessorKey: 'connections',
      header: 'Connections',
      cell: ({ row }) => {
        const { connections, maxConnections = 1 } = row.original;
        const pct = connections ? (connections / maxConnections) * 100 : 0;
        return (
          <div className="min-w-[7rem]">
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{connections || 0}/{maxConnections}</p>
          </div>
        );
      }
    },
    { accessorKey: 'size', header: 'Size' },
    {
      accessorKey: 'queries',
      header: 'Queries/min',
      cell: ({ getValue }) => formatNumber(getValue())
    },
    {
      accessorKey: 'replication',
      header: 'Replication',
      cell: ({ getValue }) => <Badge className="border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{getValue()}</Badge>
    }
  ], []);

  const apiColumns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'API',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.original.name}</p>
          <code className="text-xs text-gray-500 dark:text-gray-400">{row.original.endpoint}</code>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT(getValue())}>{(getValue() || 'unknown').toUpperCase()}</Badge>
    },
    {
      accessorKey: 'responseTime',
      header: 'Response Time',
      cell: ({ getValue }) => (getValue() ? `${getValue()}ms` : 'N/A')
    },
    {
      accessorKey: 'requests',
      header: 'Requests',
      cell: ({ getValue }) => formatNumber(getValue())
    },
    {
      accessorKey: 'errors',
      header: 'Errors',
      cell: ({ getValue }) => (
        <span className={(getValue() || 0) > 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
          {getValue() || 0}
        </span>
      )
    },
    { accessorKey: 'uptime', header: 'Uptime' },
    {
      accessorKey: 'version',
      header: 'Version',
      cell: ({ getValue }) => <Badge variant="secondary">{getValue()}</Badge>
    }
  ], []);

  if (loading && servers.length === 0 && databases.length === 0) {
    return (
      <div className="flex items-center justify-center gap-4 h-[400px]">
        <Spinner size="lg" />
        <p className="text-gray-600 dark:text-gray-400">Loading infrastructure data...</p>
      </div>
    );
  }

  if (error && servers.length === 0 && databases.length === 0) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Infrastructure Data</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <Button size="sm" className="mt-2" onClick={fetchInfrastructureData}>Retry</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <ServerStackIcon className="h-6 w-6" />
            Infrastructure Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and manage your infrastructure components</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchInfrastructureData} disabled={loading}>
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'tws-loading-pulse' : ''}`} />
            Refresh
          </Button>
          <Button>
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Servers</span>
              <ServerStackIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {infrastructureStats.activeServers || 0} <span className="text-sm text-gray-400 font-normal">/ {infrastructureStats.totalServers || 0}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Databases</span>
              <CircleStackIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {infrastructureStats.activeDatabases || 0} <span className="text-sm text-gray-400 font-normal">/ {infrastructureStats.totalDatabases || 0}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>APIs</span>
              <SignalIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">
              {infrastructureStats.activeAPIs || 0} <span className="text-sm text-gray-400 font-normal">/ {infrastructureStats.totalAPIs || 0}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Security Alerts</span>
              <ShieldExclamationIcon className="h-4 w-4" />
            </div>
            <p className={`text-2xl font-bold ${(infrastructureStats.securityAlerts || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {infrastructureStats.securityAlerts || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="servers">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="servers"><ServerStackIcon className="h-4 w-4 mr-1" />Servers</TabsTrigger>
          <TabsTrigger value="databases"><CircleStackIcon className="h-4 w-4 mr-1" />Databases</TabsTrigger>
          <TabsTrigger value="apis"><SignalIcon className="h-4 w-4 mr-1" />APIs</TabsTrigger>
          <TabsTrigger value="security"><ShieldExclamationIcon className="h-4 w-4 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="monitoring"><ComputerDesktopIcon className="h-4 w-4 mr-1" />Monitoring</TabsTrigger>
          <TabsTrigger value="networks"><GlobeAltIcon className="h-4 w-4 mr-1" />Networks</TabsTrigger>
        </TabsList>

        <TabsContent value="servers">
          <Card>
            <CardContent className="p-4">
              <DataTable columns={serverColumns} data={servers} pageSize={10} emptyMessage="No servers found" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="databases">
          <Card>
            <CardContent className="p-4">
              <DataTable columns={databaseColumns} data={databases} pageSize={10} emptyMessage="No databases found" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis">
          <Card>
            <CardContent className="p-4">
              <DataTable columns={apiColumns} data={apis} pageSize={10} emptyMessage="No APIs found" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {security.map((item) => (
              <DetailCard
                key={item.id}
                item={item}
                rows={[
                  ['Type', item.type],
                  item.expiresAt && ['Expires', moment(item.expiresAt).format('MMM DD, YYYY')],
                  item.rules !== undefined && ['Rules', item.rules],
                  item.threats !== undefined && ['Threats', item.threats],
                  item.lastScan && ['Last Scan', moment(item.lastScan).fromNow()],
                  item.blocked !== undefined && ['Blocked Requests', item.blocked],
                  item.allowed !== undefined && ['Allowed Requests', item.allowed],
                ]}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {monitoring.map((item) => (
              <DetailCard
                key={item.id}
                item={item}
                rows={[
                  ['Type', item.type],
                  item.checks && ['Checks', `${item.passed}/${item.checks} passed`],
                  item.avgResponseTime && ['Avg Response', `${item.avgResponseTime}ms`],
                  item.logsPerMinute !== undefined && ['Logs/min', formatNumber(item.logsPerMinute)],
                  item.threshold !== undefined && ['Threshold', `${item.threshold}ms`],
                  item.alerts !== undefined && ['Alerts', item.alerts],
                  item.lastCheck && ['Last Check', moment(item.lastCheck).fromNow()],
                ]}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="networks">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {networks.map((item) => {
              const hasBandwidthObj = item.bandwidth && typeof item.bandwidth === 'object';
              const utilizationPct = hasBandwidthObj && item.bandwidth.total
                ? Math.round(((item.bandwidth.used || 0) / item.bandwidth.total) * 100)
                : item.utilization;
              return (
                <DetailCard
                  key={item.id}
                  item={item}
                  rows={[
                    ['Type', item.type],
                    ['Subnet', item.subnet || 'N/A'],
                    ['Devices', item.devices || 0],
                    ['Bandwidth', hasBandwidthObj
                      ? `${item.bandwidth.used || 0} / ${item.bandwidth.total || 0} ${item.bandwidth.unit || 'Mbps'}`
                      : (item.bandwidth || 'N/A')],
                    ['Utilization', utilizationPct != null
                      ? <Progress value={utilizationPct} className="h-1.5 w-24" />
                      : 'N/A'],
                  ]}
                />
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {Object.entries(selectedItem)
                .filter(([key]) => !key.startsWith('_') && key !== 'id')
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-1.5">
                    <dt className="text-gray-500 dark:text-gray-400">{key.charAt(0).toUpperCase() + key.slice(1)}</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {value === null || value === undefined ? 'N/A' :
                       typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                       key === 'bandwidth' && typeof value === 'object' && !Array.isArray(value) ?
                         `${value.used || 0} / ${value.total || 0} ${value.unit || 'Mbps'}` :
                       typeof value === 'object' && !Array.isArray(value) ?
                         (value.toString ? value.toString() : JSON.stringify(value, null, 2)) :
                       Array.isArray(value) ? value.join(', ') :
                       String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Infrastructure;
