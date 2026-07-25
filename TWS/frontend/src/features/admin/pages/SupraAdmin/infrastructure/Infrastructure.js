import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Modal, 
  message, 
  Tooltip, 
  Progress, 
  Statistic, 
  Tabs, 
  Typography, 
  Descriptions,
  Spin,
  Alert
} from 'antd';
import { 
  EyeOutlined, 
  SettingOutlined, 
  CloudServerOutlined, 
  DatabaseOutlined, 
  ApiOutlined, 
  SecurityScanOutlined, 
  MonitorOutlined, 
  ExportOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  StopOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { get } from '../../../../../shared/utils/apiClient';
import { createLogger } from '../../../../../shared/utils/logger';
import { getStatusColor, getStatusIcon, formatNumber, formatBytes } from '../../../../../shared/utils/statusUtils';

const { Title, Text } = Typography;
const logger = createLogger('Infrastructure');

const Infrastructure = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [servers, setServers] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [apis, setApis] = useState([]);
  const [security, setSecurity] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
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
      message.error(errorMessage);
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
      title: 'Server',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {getStatusIcon(record.status)}
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.type}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {(status || 'unknown').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'CPU',
      dataIndex: 'cpu',
      key: 'cpu',
      render: (cpu) => (
        <div>
          <Progress percent={cpu || 0} size="small" />
          <Text style={{ fontSize: '12px' }}>{cpu || 0}%</Text>
        </div>
      )
    },
    {
      title: 'Memory',
      dataIndex: 'memory',
      key: 'memory',
      render: (memory) => (
        <div>
          <Progress percent={memory || 0} size="small" strokeColor="#52c41a" />
          <Text style={{ fontSize: '12px' }}>{memory || 0}%</Text>
        </div>
      )
    },
    {
      title: 'IP Address',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip) => <Text code>{ip}</Text>
    },
    {
      title: 'Uptime',
      dataIndex: 'uptime',
      key: 'uptime'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetails(record)} />
          </Tooltip>
          <Tooltip title="Settings">
            <Button icon={<SettingOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Server power controls aren't available yet">
            <Button
              icon={record.status === 'running' ? <StopOutlined /> : <PlayCircleOutlined />}
              size="small"
              danger={record.status === 'running'}
              disabled
            />
          </Tooltip>
        </Space>
      )
    }
  ], [handleViewDetails]);

  const databaseColumns = useMemo(() => [
    {
      title: 'Database',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <DatabaseOutlined />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.type} {record.version}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {(status || 'unknown').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Connections',
      dataIndex: 'connections',
      key: 'connections',
      render: (connections, record) => {
        const maxConnections = record.maxConnections || 1;
        const connectionPercent = connections ? (connections / maxConnections) * 100 : 0;
        return (
          <div>
            <Progress 
              percent={connectionPercent} 
              size="small" 
              format={() => `${connections || 0}/${maxConnections}`}
            />
          </div>
        );
      }
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size'
    },
    {
      title: 'Queries/min',
      dataIndex: 'queries',
      key: 'queries',
      render: (queries) => formatNumber(queries)
    },
    {
      title: 'Replication',
      dataIndex: 'replication',
      key: 'replication',
      render: (replication) => (
        <Tag color="blue">{replication}</Tag>
      )
    }
  ], []);

  const apiColumns = useMemo(() => [
    {
      title: 'API',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text code style={{ fontSize: '12px' }}>{record.endpoint}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {(status || 'unknown').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (time) => time ? `${time}ms` : 'N/A'
    },
    {
      title: 'Requests',
      dataIndex: 'requests',
      key: 'requests',
      render: (requests) => formatNumber(requests)
    },
    {
      title: 'Errors',
      dataIndex: 'errors',
      key: 'errors',
      render: (errors) => (
        <Text type={(errors || 0) > 10 ? 'danger' : 'secondary'}>{errors || 0}</Text>
      )
    },
    {
      title: 'Uptime',
      dataIndex: 'uptime',
      key: 'uptime'
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (version) => <Tag>{version}</Tag>
    }
  ], []);

  if (loading && servers.length === 0 && databases.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: '16px' }}>Loading infrastructure data...</Text>
      </div>
    );
  }

  if (error && servers.length === 0 && databases.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error Loading Infrastructure Data"
          description={
            <div>
              <p>{error}</p>
              <Button 
                type="primary" 
                size="small" 
                onClick={fetchInfrastructureData}
                style={{ marginTop: '8px' }}
              >
                Retry
              </Button>
            </div>
          }
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <CloudServerOutlined style={{ marginRight: '8px' }} />
            Infrastructure Management
          </Title>
          <Text type="secondary">Monitor and manage your infrastructure components</Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchInfrastructureData} 
            loading={loading}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} type="primary">
            Export Report
          </Button>
        </Space>
      </div>

      {/* Overview Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Servers"
              value={infrastructureStats.activeServers || 0}
              suffix={`/ ${infrastructureStats.totalServers || 0}`}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Databases"
              value={infrastructureStats.activeDatabases || 0}
              suffix={`/ ${infrastructureStats.totalDatabases || 0}`}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="APIs"
              value={infrastructureStats.activeAPIs || 0}
              suffix={`/ ${infrastructureStats.totalAPIs || 0}`}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Security Alerts"
              value={infrastructureStats.securityAlerts || 0}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: (infrastructureStats.securityAlerts || 0) > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'servers',
            label: <span><CloudServerOutlined />Servers</span>,
            children: (
              <Card>
                <Table
                  dataSource={servers}
                  columns={serverColumns}
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} servers`
                  }}
                  scroll={{ x: 1200 }}
                  loading={loading}
                />
              </Card>
            )
          },
          {
            key: 'databases',
            label: <span><DatabaseOutlined />Databases</span>,
            children: (
              <Card>
                <Table
                  dataSource={databases}
                  columns={databaseColumns}
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} databases`
                  }}
                  loading={loading}
                />
              </Card>
            )
          },
          {
            key: 'apis',
            label: <span><ApiOutlined />APIs</span>,
            children: (
              <Card>
                <Table
                  dataSource={apis}
                  columns={apiColumns}
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} APIs`
                  }}
                  loading={loading}
                />
              </Card>
            )
          },
          {
            key: 'security',
            label: <span><SecurityScanOutlined />Security</span>,
            children: (
              <Row gutter={[16, 16]}>
                {security.map(item => (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                    <Card
                      title={
                        <Space>
                          {getStatusIcon(item.status)}
                          {item.name}
                        </Space>
                      }
                      extra={<Tag color={getStatusColor(item.status)}>{item.status}</Tag>}
                    >
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Type">{item.type}</Descriptions.Item>
                        {item.expiresAt && (
                          <Descriptions.Item label="Expires">
                            {moment(item.expiresAt).format('MMM DD, YYYY')}
                          </Descriptions.Item>
                        )}
                        {item.rules !== undefined && (
                          <Descriptions.Item label="Rules">{item.rules}</Descriptions.Item>
                        )}
                        {item.threats !== undefined && (
                          <Descriptions.Item label="Threats">{item.threats}</Descriptions.Item>
                        )}
                        {item.lastScan && (
                          <Descriptions.Item label="Last Scan">
                            {moment(item.lastScan).fromNow()}
                          </Descriptions.Item>
                        )}
                        {item.blocked !== undefined && (
                          <Descriptions.Item label="Blocked Requests">{item.blocked}</Descriptions.Item>
                        )}
                        {item.allowed !== undefined && (
                          <Descriptions.Item label="Allowed Requests">{item.allowed}</Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          },
          {
            key: 'monitoring',
            label: <span><MonitorOutlined />Monitoring</span>,
            children: (
              <Row gutter={[16, 16]}>
                {monitoring.map(item => (
                  <Col xs={24} sm={12} md={8} key={item.id}>
                    <Card
                      title={
                        <Space>
                          {getStatusIcon(item.status)}
                          {item.name}
                        </Space>
                      }
                      extra={<Tag color={getStatusColor(item.status)}>{item.status}</Tag>}
                    >
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Type">{item.type}</Descriptions.Item>
                        {item.checks && (
                          <Descriptions.Item label="Checks">
                            {item.passed}/{item.checks} passed
                          </Descriptions.Item>
                        )}
                        {item.avgResponseTime && (
                          <Descriptions.Item label="Avg Response">
                            {item.avgResponseTime}ms
                          </Descriptions.Item>
                        )}
                        {item.logsPerMinute !== undefined && (
                          <Descriptions.Item label="Logs/min">
                            {formatNumber(item.logsPerMinute)}
                          </Descriptions.Item>
                        )}
                        {item.avgResponseTime !== undefined && (
                          <Descriptions.Item label="Avg Response Time">
                            {item.avgResponseTime}ms
                          </Descriptions.Item>
                        )}
                        {item.threshold !== undefined && (
                          <Descriptions.Item label="Threshold">
                            {item.threshold}ms
                          </Descriptions.Item>
                        )}
                        {item.alerts !== undefined && (
                          <Descriptions.Item label="Alerts">
                            {item.alerts}
                          </Descriptions.Item>
                        )}
                        {item.lastCheck && (
                          <Descriptions.Item label="Last Check">
                            {moment(item.lastCheck).fromNow()}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          },
          {
            key: 'networks',
            label: <span><GlobalOutlined />Networks</span>,
            children: (
              <Row gutter={[16, 16]}>
                {networks.map(item => (
                  <Col xs={24} sm={12} md={8} key={item.id}>
                    <Card
                      title={
                        <Space>
                          {getStatusIcon(item.status)}
                          {item.name}
                        </Space>
                      }
                      extra={<Tag color={getStatusColor(item.status)}>{item.status}</Tag>}
                    >
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Type">{item.type}</Descriptions.Item>
                        <Descriptions.Item label="Subnet">{item.subnet || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Devices">{item.devices || 0}</Descriptions.Item>
                        <Descriptions.Item label="Bandwidth">
                          {item.bandwidth && typeof item.bandwidth === 'object' 
                            ? `${item.bandwidth.used || 0} / ${item.bandwidth.total || 0} ${item.bandwidth.unit || 'Mbps'}`
                            : item.bandwidth || 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Utilization">
                          {item.bandwidth && typeof item.bandwidth === 'object' && item.bandwidth.total
                            ? <Progress 
                                percent={Math.round(((item.bandwidth.used || 0) / item.bandwidth.total) * 100)} 
                                size="small" 
                              />
                            : item.utilization 
                              ? <Progress percent={item.utilization} size="small" />
                              : <Text type="secondary">N/A</Text>
                          }
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          }
        ]}
      />

      {/* Details Modal */}
      <Modal
        title={selectedItem?.name}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedItem && (
          <Descriptions bordered column={2}>
            {Object.entries(selectedItem)
              .filter(([key]) => !key.startsWith('_') && key !== 'id') // Filter out internal fields
              .map(([key, value]) => (
                <Descriptions.Item label={key.charAt(0).toUpperCase() + key.slice(1)} key={key}>
                  {value === null || value === undefined ? 'N/A' :
                   typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                   key === 'bandwidth' && typeof value === 'object' && !Array.isArray(value) ?
                     `${value.used || 0} / ${value.total || 0} ${value.unit || 'Mbps'}` :
                   typeof value === 'object' && !Array.isArray(value) ? 
                     (value.toString ? value.toString() : JSON.stringify(value, null, 2)) :
                   Array.isArray(value) ? value.join(', ') :
                   String(value)}
                </Descriptions.Item>
              ))}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Infrastructure;