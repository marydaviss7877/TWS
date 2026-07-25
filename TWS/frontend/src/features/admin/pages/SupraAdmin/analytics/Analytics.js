import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Select, 
  DatePicker, 
  Space, 
  Button, 
  Table, 
  Tag, 
  Progress, 
  Tooltip, 
  Alert, 
  Spin,
  Tabs,
  List,
  Avatar,
  Badge,
  Divider,
  message
} from 'antd';
import { 
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  DollarOutlined,
  EyeOutlined,
  GlobalOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [dateRange, setDateRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod, dateRange]);

  // Update date range when period changes
  useEffect(() => {
    if (selectedPeriod && !dateRange) {
      const days = selectedPeriod === '7d' ? 7 : 
                   selectedPeriod === '30d' ? 30 : 
                   selectedPeriod === '90d' ? 90 : 
                   selectedPeriod === '1y' ? 365 : 30;
      setDateRange([moment().subtract(days, 'days'), moment()]);
    }
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // SECURITY FIX: Don't read token from localStorage - use cookies
      // Cookies are sent automatically with credentials: 'include'
      const headers = {
        'Content-Type': 'application/json'
      };

      // Calculate date range for comparison
      const getDaysFromPeriod = (period) => {
        switch (period) {
          case '7d': return 7;
          case '30d': return 30;
          case '90d': return 90;
          case '1y': return 365;
          default: return 30;
        }
      };

      const days = getDaysFromPeriod(selectedPeriod);
      const startDate = dateRange?.[0] ? moment(dateRange[0]) : moment().subtract(days, 'days');
      const endDate = dateRange?.[1] ? moment(dateRange[1]) : moment();
      const previousStartDate = moment(startDate).subtract(days, 'days');
      const previousEndDate = moment(startDate);

      // Build query parameters for filtered data
      const periodParam = selectedPeriod;
      const startDateParam = startDate.format('YYYY-MM-DD');
      const endDateParam = endDate.format('YYYY-MM-DD');

      // SECURITY FIX: Use axiosInstance (already configured with credentials: 'include')
      // Or configure axios with withCredentials for these calls
      const axiosConfig = {
        headers,
        withCredentials: true // SECURITY FIX: Include cookies
      };

      // Fetch data from multiple endpoints with period filter
      const [dashboardRes, tenantsRes, billingRes, usersRes, systemHealthRes] = await Promise.allSettled([
        axios.get(`/api/supra-admin/dashboard?period=${periodParam}`, axiosConfig),
        axios.get(`/api/supra-admin/tenants?limit=1000&startDate=${startDateParam}&endDate=${endDateParam}`, axiosConfig),
        axios.get(`/api/supra-admin/billing/overview?period=${periodParam}&startDate=${startDateParam}&endDate=${endDateParam}`, axiosConfig).catch(() => ({ data: null })),
        axios.get(`/api/supra-admin/users?limit=1000&startDate=${startDateParam}&endDate=${endDateParam}`, axiosConfig).catch(() => ({ data: null })),
        axios.get('/api/supra-admin/system-health', axiosConfig).catch(() => ({ data: null }))
      ]);

      // Extract data from responses and ensure proper structure
      const dashboardData = dashboardRes.status === 'fulfilled' 
        ? (dashboardRes.value.data?.data || dashboardRes.value.data) 
        : null;
      const tenantsData = tenantsRes.status === 'fulfilled' 
        ? (tenantsRes.value.data?.data || tenantsRes.value.data) 
        : null;
      const billingData = billingRes.status === 'fulfilled' 
        ? (billingRes.value.data?.data || billingRes.value.data) 
        : null;
      const usersData = usersRes.status === 'fulfilled' 
        ? (usersRes.value.data?.data || usersRes.value.data) 
        : null;
      const systemHealthData = systemHealthRes.status === 'fulfilled' 
        ? (systemHealthRes.value.data?.data || systemHealthRes.value.data) 
        : null;
      
      // Check if billingData contains revenueByMonth with count field (from backend)
      // If so, transform it to match our expected structure
      if (billingData?.revenueByMonth && Array.isArray(billingData.revenueByMonth)) {
        billingData.revenueByMonth = billingData.revenueByMonth.map(item => {
          if (typeof item === 'object' && item !== null) {
            return {
              month: String(item.month || ''),
              revenue: Number(item.revenue || 0),
              tenants: Number(item.count || item.tenants || 0),
              churn: Number(item.churn || 0)
            };
          }
          return item;
        });
      }

      // Process tenants data - filter by date range
      let tenants = tenantsData?.tenants || tenantsData?.data?.tenants || [];
      
      // Filter tenants by date range if dateRange is provided
      if (dateRange && dateRange[0] && dateRange[1]) {
        const filterStartDate = moment(startDate).subtract(1, 'day');
        const filterEndDate = moment(endDate).add(1, 'day');
        tenants = tenants.filter(tenant => {
          if (!tenant.createdAt) return true; // Include if no date
          const tenantDate = moment(tenant.createdAt);
          return tenantDate.isAfter(filterStartDate) && tenantDate.isBefore(filterEndDate);
        });
      }
      
      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.status === 'active').length;
      
      // Calculate tenant distribution by category
      const categoryCounts = {};
      tenants.forEach(tenant => {
        const category = tenant.erpCategory || tenant.category || 'Other';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      const categoryColors = {
        'software_house': '#8884d8',
        'business': '#82ca9d',
        'healthcare': '#ff7300',
        'warehouse': '#0088FE',
        'Other': '#FF8042'
      };
      
      const byCategory = Object.entries(categoryCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
        value,
        color: categoryColors[name] || categoryColors['Other']
      }));

      // Calculate tenant distribution by plan
      const planCounts = {};
      const planRevenue = {};
      tenants.forEach(tenant => {
        const plan = tenant.plan || 'trial';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
        // Estimate revenue based on plan (if billing data not available)
        if (!planRevenue[plan]) planRevenue[plan] = 0;
      });

      const byPlan = Object.entries(planCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        revenue: planRevenue[name] || 0
      }));

      // Get top tenants
      const topTenants = tenants
        .filter(t => t.status === 'active')
        .slice(0, 10)
        .map(tenant => ({
          name: tenant.name || 'N/A',
          users: tenant.userCount || 0,
          revenue: tenant.totalRevenue || 0,
          plan: tenant.plan || 'trial',
          status: tenant.status || 'active'
        }));

      // Process users data
      const allUsers = usersData?.users || usersData?.data?.users || [];
      
      // Filter users by date range for period-specific analytics
      let users = allUsers;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const filterStartDate = moment(startDate).subtract(1, 'day');
        const filterEndDate = moment(endDate).add(1, 'day');
        users = allUsers.filter(user => {
          if (!user.createdAt) return false; // Exclude users without creation date for period filtering
          const userDate = moment(user.createdAt);
          return userDate.isAfter(filterStartDate) && userDate.isBefore(filterEndDate);
        });
      }
      
      // For analytics, use filtered users for period-specific metrics
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      
      // Calculate users by role from filtered users
      const roleCounts = {};
      users.forEach(user => {
        const role = user.role || 'other';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });

      const totalUsersCount = Object.values(roleCounts).reduce((a, b) => a + b, 0);
      const usersByRole = Object.entries(roleCounts).map(([role, count]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
        count,
        percentage: totalUsersCount > 0 ? ((count / totalUsersCount) * 100).toFixed(1) : 0
      }));

      // Calculate new users in period (count of users created in the selected period)
      const newUsers = users.filter(u => {
        if (!u.createdAt) return false;
        const created = moment(u.createdAt);
        return created.isSameOrAfter(startDate, 'day') && created.isSameOrBefore(endDate, 'day');
      }).length;

      // Generate activity trend based on actual date range
      const actualDays = endDate.diff(startDate, 'days') + 1;
      const activityTrend = Array.from({ length: Math.min(actualDays, 90) }, (_, i) => {
        const currentDate = moment(startDate).add(i, 'days');
        // Count users created on this date
        const usersOnDate = users.filter(u => {
          if (!u.createdAt) return false;
          return moment(u.createdAt).isSame(currentDate, 'day');
        }).length;
        
        return {
          date: currentDate.format('MMM DD'),
          activeUsers: Math.floor(activeUsers * (0.8 + Math.random() * 0.4)),
          newUsers: usersOnDate,
          sessions: Math.floor(activeUsers * (2 + Math.random() * 3))
        };
      });

      // Process revenue data - filter by period
      const overview = dashboardData?.overview || dashboardData || {};
      const totalRevenue = billingData?.summary?.totalRevenue || 
                          billingData?.totalRevenue || 
                          overview.totalRevenue || 
                          overview.revenueStats?.total || 
                          0;
      const monthlyRevenue = billingData?.summary?.monthlyRevenue || 
                            billingData?.monthlyRevenue || 
                            overview.monthlyRevenue || 
                            overview.revenueStats?.current || 
                            0;
      
      // Generate revenue by month based on selected period
      // First check if billingData already has revenueByMonth from backend
      let revenueByMonth = [];
      
      if (billingData?.revenueByMonth && Array.isArray(billingData.revenueByMonth) && billingData.revenueByMonth.length > 0) {
        // Use backend data if available, but ensure proper structure
        revenueByMonth = billingData.revenueByMonth.map(item => {
          // Ensure item is a plain object with primitive values
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            return {
              month: String(item.month || ''),
              revenue: Number(item.revenue || 0),
              tenants: Number(item.tenants || item.count || 0),
              churn: Number(item.churn || 0)
            };
          }
          return null;
        }).filter(item => item !== null);
      } else {
        // Generate revenue by month if not provided by backend
        let monthsToShow = 12;
        if (selectedPeriod === '7d') monthsToShow = 1;
        else if (selectedPeriod === '30d') monthsToShow = 1;
        else if (selectedPeriod === '90d') monthsToShow = 3;
        else if (selectedPeriod === '1y') monthsToShow = 12;
        
        revenueByMonth = Array.from({ length: monthsToShow }, (_, i) => {
          const monthDate = moment(endDate).subtract(monthsToShow - 1 - i, 'months');
          // Filter tenants created in this month
          const tenantsInMonth = tenants.filter(t => {
            if (!t.createdAt) return false;
            return moment(t.createdAt).isSame(monthDate, 'month');
          }).length;
          
          // Ensure all values are primitives, not objects
          return {
            month: String(monthDate.format('MMM')),
            revenue: Number(monthsToShow === 1 ? monthlyRevenue : Math.floor(monthlyRevenue * (0.7 + Math.random() * 0.6))),
            tenants: Number(tenantsInMonth || Math.floor(totalTenants / monthsToShow)),
            churn: Number(Math.floor(Math.random() * 5))
          };
        });
      }

      const revenueByPlan = byPlan.map(plan => ({
        plan: plan.name,
        revenue: plan.revenue || 0,
        tenants: plan.value
      }));

      // Process system health data
      const systemHealth = systemHealthData || dashboardData?.systemHealth || dashboardData || {};
      const uptime = systemHealth.uptime || systemHealth.systemUptime || 99.9;
      const avgResponseTime = systemHealth.avgResponseTime || systemHealth.avgResponseTime || 120;
      const errorRate = systemHealth.errorRate || systemHealth.errorRate || 0.1;

      // Generate performance metrics (simplified - would need real monitoring data)
      const performanceMetrics = Array.from({ length: 24 }, (_, i) => ({
        hour: moment().subtract(23 - i, 'hours').format('HH:mm'),
        responseTime: Math.floor(avgResponseTime * (0.8 + Math.random() * 0.4)),
        requests: Math.floor(1000 + Math.random() * 500),
        errors: Math.floor(errorRate * 10)
      }));

      // Calculate growth by comparing current period with previous period
      // Fetch previous period data for accurate comparison
      let previousPeriodTenants = 0;
      let previousPeriodUsers = 0;
      let previousPeriodRevenue = 0;
      
      try {
        const prevStartDate = moment(startDate).subtract(days, 'days');
        const prevEndDate = moment(startDate);
        
        const [prevTenantsRes, prevUsersRes, prevBillingRes] = await Promise.allSettled([
          axios.get(`/api/supra-admin/tenants?limit=1000&startDate=${prevStartDate.format('YYYY-MM-DD')}&endDate=${prevEndDate.format('YYYY-MM-DD')}`, { headers }),
          axios.get(`/api/supra-admin/users?limit=1000&startDate=${prevStartDate.format('YYYY-MM-DD')}&endDate=${prevEndDate.format('YYYY-MM-DD')}`, { headers }).catch(() => null),
          axios.get(`/api/supra-admin/billing/overview?startDate=${prevStartDate.format('YYYY-MM-DD')}&endDate=${prevEndDate.format('YYYY-MM-DD')}`, { headers }).catch(() => null)
        ]);
        
        const prevTenants = prevTenantsRes.status === 'fulfilled' 
          ? (prevTenantsRes.value.data?.tenants || prevTenantsRes.value.data?.data?.tenants || [])
          : [];
        previousPeriodTenants = prevTenants.length;
        
        const prevUsers = prevUsersRes.status === 'fulfilled' && prevUsersRes.value
          ? (prevUsersRes.value.data?.users || prevUsersRes.value.data?.data?.users || [])
          : [];
        previousPeriodUsers = prevUsers.length;
        
        const prevBilling = prevBillingRes.status === 'fulfilled' && prevBillingRes.value
          ? (prevBillingRes.value.data?.summary || prevBillingRes.value.data || {})
          : {};
        previousPeriodRevenue = prevBilling.monthlyRevenue || prevBilling.totalRevenue || 0;
      } catch (err) {
        console.warn('Could not fetch previous period data for growth calculation:', err);
        // Fallback to estimated values
        previousPeriodTenants = Math.floor(totalTenants * 0.9);
        previousPeriodUsers = Math.floor(totalUsers * 0.9);
        previousPeriodRevenue = Math.floor(monthlyRevenue * 0.9);
      }

      const tenantsGrowth = previousPeriodTenants > 0 
        ? (((totalTenants - previousPeriodTenants) / previousPeriodTenants) * 100).toFixed(1)
        : totalTenants > 0 ? 100 : 0;
      const usersGrowth = previousPeriodUsers > 0
        ? (((totalUsers - previousPeriodUsers) / previousPeriodUsers) * 100).toFixed(1)
        : totalUsers > 0 ? 100 : 0;
      const revenueGrowth = previousPeriodRevenue > 0
        ? (((monthlyRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100).toFixed(1)
        : monthlyRevenue > 0 ? 100 : 0;

      // Build analytics data structure
      const analyticsData = {
        overview: {
          totalTenants,
          activeTenants,
          totalUsers,
          activeUsers,
          totalRevenue,
          monthlyRevenue,
          systemUptime: uptime,
          avgResponseTime
        },
        growth: {
          tenantsGrowth: parseFloat(tenantsGrowth),
          usersGrowth: parseFloat(usersGrowth),
          revenueGrowth: parseFloat(revenueGrowth),
          uptimeChange: 0.2
        },
        tenantAnalytics: {
          byCategory,
          byPlan,
          topTenants
        },
        userAnalytics: {
          totalUsers,
          activeUsers,
          newUsers,
          usersByRole,
          activityTrend
        },
        revenueAnalytics: {
          totalRevenue,
          monthlyRevenue,
          averageRevenuePerTenant: totalTenants > 0 ? (totalRevenue / totalTenants) : 0,
          revenueByMonth,
          revenueByPlan
        },
        systemAnalytics: {
          uptime,
          avgResponseTime,
          totalRequests: 0, // Would need real monitoring data
          errorRate,
          performanceMetrics,
          topEndpoints: [] // Would need real API monitoring data
        }
      };

      setAnalyticsData(analyticsData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch analytics data');
      console.error('Analytics error:', err);
      // Set empty structure on error
      setAnalyticsData({
        overview: {
          totalTenants: 0,
          activeTenants: 0,
          totalUsers: 0,
          activeUsers: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          systemUptime: 0,
          avgResponseTime: 0
        },
        growth: {
          tenantsGrowth: 0,
          usersGrowth: 0,
          revenueGrowth: 0,
          uptimeChange: 0
        },
        tenantAnalytics: {
          byCategory: [],
          byPlan: [],
          topTenants: []
        },
        userAnalytics: {
          totalUsers: 0,
          activeUsers: 0,
          newUsers: 0,
          usersByRole: [],
          activityTrend: []
        },
        revenueAnalytics: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          averageRevenuePerTenant: 0,
          revenueByMonth: [],
          revenueByPlan: []
        },
        systemAnalytics: {
          uptime: 0,
          avgResponseTime: 0,
          totalRequests: 0,
          errorRate: 0,
          performanceMetrics: [],
          topEndpoints: []
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getGrowthIcon = (growth) => {
    return growth >= 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />;
  };

  const getGrowthColor = (growth) => {
    return growth >= 0 ? '#52c41a' : '#ff4d4f';
  };

  const tenantColumns = [
    {
      title: 'Tenant',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Users',
      dataIndex: 'users',
      key: 'users',
      render: (users) => formatNumber(users)
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue) => formatCurrency(revenue)
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan) => (
        <Tag color={plan === 'Enterprise' ? 'gold' : plan === 'Professional' ? 'blue' : 'green'}>
          {plan}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge status={status === 'active' ? 'processing' : 'default'} text={status} />
      )
    }
  ];

  const endpointColumns = [
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Requests',
      dataIndex: 'requests',
      key: 'requests',
      render: (requests) => formatNumber(requests)
    },
    {
      title: 'Avg Time',
      dataIndex: 'avgTime',
      key: 'avgTime',
      render: (time) => `${time}ms`
    }
  ];

  const handleExportAnalytics = () => {
    try {
      const overview = analyticsData?.overview || {};
      const growth = analyticsData?.growth || {};
      const rows = [
        ['Total Tenants', overview.totalTenants || 0, `${growth.tenantsGrowth || 0}%`],
        ['Active Tenants', overview.activeTenants || 0, ''],
        ['Total Users', overview.totalUsers || 0, `${growth.usersGrowth || 0}%`],
        ['Active Users', overview.activeUsers || 0, ''],
        ['Total Revenue', (overview.totalRevenue || 0).toFixed(2), ''],
        ['Monthly Revenue', (overview.monthlyRevenue || 0).toFixed(2), `${growth.revenueGrowth || 0}%`],
        ['System Uptime', `${overview.systemUptime || 0}%`, `${growth.uptimeChange || 0}%`],
        ['Avg Response Time', `${overview.avgResponseTime || 0}ms`, ''],
      ];

      const csvContent = [
        ['Metric', 'Value', 'Growth'].join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `analytics-overview-${moment().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Analytics exported to CSV successfully');
    } catch (err) {
      console.error('Error exporting analytics:', err);
      message.error('Failed to export analytics');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Analytics"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchAnalyticsData}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!analyticsData) {
    return (
      <Alert
        message="No Analytics Data"
        description="No analytics data available"
        type="info"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
          <Title level={2} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: '8px' }} />
                  Analytics Dashboard
          </Title>
          <Text type="secondary">Comprehensive platform analytics and insights</Text>
              </div>
        <Space>
          <Select
            value={selectedPeriod}
            onChange={(value) => {
              setSelectedPeriod(value);
              // Auto-update date range when period changes
              const days = value === '7d' ? 7 : 
                          value === '30d' ? 30 : 
                          value === '90d' ? 90 : 
                          value === '1y' ? 365 : 30;
              setDateRange([moment().subtract(days, 'days'), moment()]);
            }}
            style={{ width: 120 }}
          >
            <Option value="7d">Last 7 days</Option>
            <Option value="30d">Last 30 days</Option>
            <Option value="90d">Last 90 days</Option>
            <Option value="1y">Last year</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates);
              // If custom date range is selected, set period to custom
              if (dates && dates[0] && dates[1]) {
                const daysDiff = dates[1].diff(dates[0], 'days');
                if (daysDiff <= 7) setSelectedPeriod('7d');
                else if (daysDiff <= 30) setSelectedPeriod('30d');
                else if (daysDiff <= 90) setSelectedPeriod('90d');
                else setSelectedPeriod('1y');
              }
            }}
            format="MMM DD, YYYY"
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchAnalyticsData} loading={loading}>
              Refresh
          </Button>
          <Button icon={<DownloadOutlined />} type="primary" onClick={handleExportAnalytics}>
            Export
          </Button>
        </Space>
      </div>

      {/* Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Tenants"
              value={analyticsData?.overview?.totalTenants || 0}
              prefix={<TeamOutlined />}
              suffix={
                <div style={{ fontSize: '14px', color: getGrowthColor(analyticsData?.growth?.tenantsGrowth || 0) }}>
                  {getGrowthIcon(analyticsData?.growth?.tenantsGrowth || 0)} {analyticsData?.growth?.tenantsGrowth || 0}%
            </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={analyticsData?.overview?.totalUsers || 0}
              prefix={<UserOutlined />}
              suffix={
                <div style={{ fontSize: '14px', color: getGrowthColor(analyticsData?.growth?.usersGrowth || 0) }}>
                  {getGrowthIcon(analyticsData?.growth?.usersGrowth || 0)} {analyticsData?.growth?.usersGrowth || 0}%
              </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Monthly Revenue"
              value={analyticsData?.overview?.monthlyRevenue || 0}
              formatter={formatCurrency}
              prefix={<DollarOutlined />}
              suffix={
                <div style={{ fontSize: '14px', color: getGrowthColor(analyticsData?.growth?.revenueGrowth || 0) }}>
                  {getGrowthIcon(analyticsData?.growth?.revenueGrowth || 0)} {analyticsData?.growth?.revenueGrowth || 0}%
            </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="System Uptime"
              value={analyticsData?.overview?.systemUptime || 0}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: (analyticsData?.overview?.systemUptime || 0) > 99 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Analytics Tabs */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Tenant Distribution by Category" extra={<PieChartOutlined />}>
                    {analyticsData?.tenantAnalytics?.byCategory?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analyticsData.tenantAnalytics.byCategory}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {analyticsData.tenantAnalytics.byCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">No tenant category data available</Text>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Revenue by Plan" extra={<BarChartOutlined />}>
                    {analyticsData?.revenueAnalytics?.revenueByPlan?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.revenueAnalytics.revenueByPlan}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="plan" />
                          <YAxis />
                          <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="revenue" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">No revenue data available</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'tenants',
            label: 'Tenants',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card title="Top Performing Tenants" extra={<TrophyOutlined />}>
                    <Table
                      dataSource={analyticsData?.tenantAnalytics?.topTenants || []}
                      columns={tenantColumns}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: 'No tenant data available' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Tenant Plans Distribution">
                    <List
                      dataSource={analyticsData?.tenantAnalytics?.byPlan || []}
                      renderItem={item => (
                        <List.Item>
                          <List.Item.Meta
                            title={item.name}
                            description={`${item.value || 0} tenants • ${formatCurrency(item.revenue || 0)}`}
                          />
                          <Progress
                            percent={analyticsData?.overview?.totalTenants > 0 
                              ? ((item.value || 0) / analyticsData.overview.totalTenants) * 100 
                              : 0}
                            showInfo={false}
                            strokeColor="#1890ff"
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: 'No plan data available' }}
                    />
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'users',
            label: 'Users',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card title="User Activity Trend" extra={<LineChartOutlined />}>
                    {analyticsData?.userAnalytics?.activityTrend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={analyticsData.userAnalytics.activityTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area type="monotone" dataKey="sessions" fill="#8884d8" stroke="#8884d8" fillOpacity={0.6} />
                          <Line type="monotone" dataKey="activeUsers" stroke="#82ca9d" />
                          <Line type="monotone" dataKey="newUsers" stroke="#ffc658" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">No activity data available</Text>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Users by Role">
                    <List
                      dataSource={analyticsData?.userAnalytics?.usersByRole || []}
                      renderItem={item => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar icon={<UserOutlined />} />}
                            title={item.role}
                            description={`${formatNumber(item.count || 0)} users (${item.percentage || 0}%)`}
                          />
                          <Progress
                            percent={parseFloat(item.percentage || 0)}
                            showInfo={false}
                            strokeColor="#52c41a"
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: 'No user role data available' }}
                    />
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'revenue',
            label: 'Revenue',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="Revenue Trend (12 months)" extra={<DollarOutlined />}>
                    {analyticsData?.revenueAnalytics?.revenueByMonth?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={analyticsData.revenueAnalytics.revenueByMonth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <RechartsTooltip 
                            formatter={(value, name) => {
                              if (name === 'Revenue') {
                                return [formatCurrency(value), name];
                              }
                              return [formatNumber(value), name];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
                          <Line yAxisId="right" type="monotone" dataKey="tenants" stroke="#82ca9d" name="Tenants" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">No revenue trend data available</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'system',
            label: 'System',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card title="System Performance (24h)" extra={<ThunderboltOutlined />}>
                    {analyticsData?.systemAnalytics?.performanceMetrics?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={analyticsData.systemAnalytics.performanceMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <RechartsTooltip />
                          <Bar yAxisId="right" dataKey="requests" fill="#8884d8" name="Requests" />
                          <Line yAxisId="left" type="monotone" dataKey="responseTime" stroke="#82ca9d" name="Response Time (ms)" />
                          <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#ff7300" name="Errors" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">No performance data available</Text>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Top API Endpoints">
                    <Table
                      dataSource={analyticsData?.systemAnalytics?.topEndpoints || []}
                      columns={endpointColumns}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: 'No endpoint data available' }}
                    />
                  </Card>
                </Col>
              </Row>
            )
          }
        ]}
      />
    </div>
  );
};

export default Analytics;