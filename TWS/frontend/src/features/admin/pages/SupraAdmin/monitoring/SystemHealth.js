import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Spin, 
  Alert, 
  Progress, 
  Tag, 
  Table, 
  Typography,
  Space,
  Button,
  Tooltip,
  Badge,
  Descriptions,
  message
} from 'antd';
import { 
  HeartOutlined, 
  DatabaseOutlined, 
  CloudOutlined,
  HddOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  ApiOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { get } from '../../../../../shared/utils/apiClient';
import { createLogger } from '../../../../../shared/utils/logger';
import { getStatusColor, getStatusIcon, formatBytes, getPercentageColor } from '../../../../../shared/utils/statusUtils';

const { Title, Text } = Typography;
const logger = createLogger('SystemHealth');

const REFRESH_INTERVAL = 30000; // 30 seconds

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
      message.error(errorMessage);
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

  const serviceColumns = [
    {
      title: 'Service',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {getStatusIcon(record.status)}
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (time) => `${time}ms`
    },
    {
      title: 'Uptime',
      dataIndex: 'uptime',
      key: 'uptime'
    }
  ];

  // Loading state
  if (loading && !healthData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Loading system health data...</p>
      </div>
    );
  }

  // Error state
  if (error && !healthData) {
    return (
      <Alert
        message="Error Loading Health Data"
        description={
          <div>
            <p>{error}</p>
            <Button 
              type="primary" 
              size="small" 
              onClick={fetchHealthData}
              style={{ marginTop: '8px' }}
            >
              Retry
            </Button>
          </div>
        }
        type="error"
        showIcon
        style={{ margin: '20px' }}
      />
    );
  }

  // No data state
  if (!healthData) {
    return (
      <Alert
        message="No Data Available"
        description="Unable to fetch system health data. Please check your connection and try again."
        type="info"
        showIcon
        style={{ margin: '20px' }}
        action={
          <Button size="small" onClick={fetchHealthData}>
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <HeartOutlined style={{ marginRight: '8px' }} />
            System Health
          </Title>
          <Text type="secondary">
            Overall system status and performance metrics
          </Text>
        </div>
        <Space>
          <Badge 
            status={systemStatus === 'healthy' ? 'processing' : 'error'} 
            text={lastUpdate ? `Last updated: ${moment(lastUpdate).fromNow()}` : 'Never updated'} 
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchHealthData} 
            loading={loading}
            disabled={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Overall Status */}
      <Alert
        message={`System Status: ${healthData.overall.status.toUpperCase()}`}
        description={`Uptime: ${healthData.overall.uptime} | Version: ${healthData.overall.version} | Environment: ${healthData.overall.environment}`}
        type={healthData.overall.status === 'healthy' ? 'success' : 'warning'}
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* System Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="CPU Usage"
              value={healthData.system?.cpu?.usage || 0}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: getPercentageColor(healthData.system?.cpu?.usage || 0) }}
            />
            <Progress 
              percent={healthData.system?.cpu?.usage || 0} 
              strokeColor={getPercentageColor(healthData.system?.cpu?.usage || 0)}
              showInfo={false}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {healthData.system?.cpu?.cores || 0} cores | Load: {healthData.system?.cpu?.loadAverage?.join(', ') || 'N/A'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Memory Usage"
              value={healthData.system?.memory ? (healthData.system.memory.used / healthData.system.memory.total * 100) : 0}
              precision={1}
              suffix="%"
              prefix={<HddOutlined />}
              valueStyle={{ color: getPercentageColor(healthData.system?.memory ? (healthData.system.memory.used / healthData.system.memory.total * 100) : 0) }}
            />
            <Progress 
              percent={healthData.system?.memory ? (healthData.system.memory.used / healthData.system.memory.total * 100) : 0} 
              strokeColor={getPercentageColor(healthData.system?.memory ? (healthData.system.memory.used / healthData.system.memory.total * 100) : 0)}
              showInfo={false}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {healthData.system?.memory ? `${formatBytes(healthData.system.memory.used)} / ${formatBytes(healthData.system.memory.total)}` : 'N/A'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Disk Usage"
              value={healthData.system?.disk ? (healthData.system.disk.used / healthData.system.disk.total * 100) : 0}
              precision={1}
              suffix="%"
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: getPercentageColor(healthData.system?.disk ? (healthData.system.disk.used / healthData.system.disk.total * 100) : 0) }}
            />
            <Progress 
              percent={healthData.system?.disk ? (healthData.system.disk.used / healthData.system.disk.total * 100) : 0} 
              strokeColor={getPercentageColor(healthData.system?.disk ? (healthData.system.disk.used / healthData.system.disk.total * 100) : 0)}
              showInfo={false}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {healthData.system?.disk ? `${formatBytes(healthData.system.disk.used * 1024 * 1024 * 1024)} / ${formatBytes(healthData.system.disk.total * 1024 * 1024 * 1024)}` : 'N/A'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Network I/O"
              value={healthData.system?.network ? (healthData.system.network.bytesIn + healthData.system.network.bytesOut) : 0}
              formatter={(value) => formatBytes(value)}
              prefix={<CloudOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {healthData.system?.network ? `In: ${formatBytes(healthData.system.network.bytesIn)} | Out: ${formatBytes(healthData.system.network.bytesOut)}` : 'N/A'}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Services Status */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={16}>
          <Card title="Services Status" extra={<CloudServerOutlined />}>
            <Table
              dataSource={servicesData}
              columns={serviceColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Performance Metrics" extra={<ApiOutlined />}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Avg Response Time">
                {healthData.performance?.responseTime?.avg ? `${healthData.performance.responseTime.avg.toFixed(1)}ms` : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="95th Percentile">
                {healthData.performance?.responseTime?.p95 ? `${healthData.performance.responseTime.p95.toFixed(1)}ms` : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="99th Percentile">
                {healthData.performance?.responseTime?.p99 ? `${healthData.performance.responseTime.p99.toFixed(1)}ms` : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Requests/sec">
                {healthData.performance?.throughput?.requestsPerSecond ? healthData.performance.throughput.requestsPerSecond.toFixed(0) : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Errors/sec">
                {healthData.performance?.throughput?.errorsPerSecond ? healthData.performance.throughput.errorsPerSecond.toFixed(2) : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Security Status */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Security Status" extra={<SafetyCertificateOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>SSL Certificate</Text>
                {healthData.security?.sslCertificate?.expiresAt ? (
                  <Tag color="green">Valid until {moment(healthData.security.sslCertificate.expiresAt).format('MMM DD, YYYY')}</Tag>
                ) : (
                  <Tag color="default">N/A</Tag>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Firewall</Text>
                {healthData.security?.firewall ? (
                  <Tag color="blue">Active ({healthData.security.firewall.blockedRequests || 0} blocked)</Tag>
                ) : (
                  <Tag color="default">N/A</Tag>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Vulnerabilities</Text>
                <Space>
                  {healthData.security?.vulnerabilities ? (
                    <>
                      {healthData.security.vulnerabilities.critical > 0 && (
                        <Tag color="red">Critical: {healthData.security.vulnerabilities.critical}</Tag>
                      )}
                      {healthData.security.vulnerabilities.high > 0 && (
                        <Tag color="orange">High: {healthData.security.vulnerabilities.high}</Tag>
                      )}
                      {healthData.security.vulnerabilities.medium > 0 && (
                        <Tag color="yellow">Medium: {healthData.security.vulnerabilities.medium}</Tag>
                      )}
                      {healthData.security.vulnerabilities.low > 0 && (
                        <Tag color="blue">Low: {healthData.security.vulnerabilities.low}</Tag>
                      )}
                      {Object.values(healthData.security.vulnerabilities).every(v => v === 0) && (
                        <Tag color="green">No vulnerabilities</Tag>
                      )}
                    </>
                  ) : (
                    <Tag color="default">N/A</Tag>
                  )}
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="System Information" extra={<InfoCircleOutlined />}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Version">
                {healthData.overall?.version || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Environment">
                <Tag color={healthData.overall?.environment === 'production' ? 'red' : 'blue'}>
                  {healthData.overall?.environment || 'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Uptime">
                {healthData.overall?.uptime || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Last Restart">
                {healthData.overall?.lastRestart ? moment(healthData.overall.lastRestart).fromNow() : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="CPU Cores">
                {healthData.system?.cpu?.cores || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Memory">
                {healthData.system?.memory?.total ? formatBytes(healthData.system.memory.total) : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemHealth;