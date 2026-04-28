import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  AttachMoney,
  Assessment,
  Warning,
  CheckCircle,
  Refresh,
  Download,
  FilterList,
  MoreVert
} from '@mui/icons-material';
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../shared/components/feedback/EmptyState';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const ExecutiveDashboard = () => {
  const apiBaseUrl = process.env.REACT_APP_API_URL || '';
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('monthly');
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch comprehensive analytics overview
      const response = await fetch(`${apiBaseUrl}/api/analytics/overview?period=${selectedTimeframe}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInsightClick = (insight) => {
    setSelectedInsight(insight);
    setInsightsDialogOpen(true);
  };

  const handleExportData = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/analytics/export?type=overview&format=json`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const data = await response.json();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading executive dashboard..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="Executive dashboard error" message={error} onRetry={fetchDashboardData} />;
  }

  if (!dashboardData) {
    return <EmptyState title="No dashboard data" message="No executive dashboard data is available yet." className="max-w-3xl mx-auto mt-10" />;
  }

  const { summary, profitability, hrPerformance, clientHealth } = dashboardData;

  // Chart data for revenue trend
  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [45000, 52000, 48000, 61000, 55000, 67000],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
  };

  // Chart data for project profitability
  const profitabilityChartData = {
    labels: ['High Margin', 'Medium Margin', 'Low Margin', 'Loss'],
    datasets: [
      {
        data: [45, 30, 20, 5],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Chart data for employee productivity
  const productivityChartData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Average Productivity',
        data: [75, 82, 78, 85],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Revenue Trend'
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Executive Command Center
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => {/* Handle filter */}}
          >
            Filter
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportData}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    ${summary.totalRevenue?.toLocaleString() || '0'}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" ml={0.5}>
                      +12.5%
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Projects
                  </Typography>
                  <Typography variant="h4">
                    {summary.totalProjects || 0}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" ml={0.5}>
                      +8.2%
                    </Typography>
                  </Box>
                </Box>
                <Assessment color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Team Size
                  </Typography>
                  <Typography variant="h4">
                    {summary.totalEmployees || 0}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" ml={0.5}>
                      +15.3%
                    </Typography>
                  </Box>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Profit Margin
                  </Typography>
                  <Typography variant="h4">
                    {summary.marginPercentage?.toFixed(1) || 0}%
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" ml={0.5}>
                      +2.1%
                    </Typography>
                  </Box>
                </Box>
                <TrendingUp color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Trend
              </Typography>
              <Box height={300}>
                <Line data={revenueChartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Profitability Distribution
              </Typography>
              <Box height={300}>
                <Doughnut data={profitabilityChartData} options={doughnutOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Tables */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Projects
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Margin</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profitability.projectBreakdown?.slice(0, 5).map((project, index) => (
                      <TableRow key={index}>
                        <TableCell>{project.projectName}</TableCell>
                        <TableCell>{project.clientName}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${project.marginPercentage.toFixed(1)}%`}
                            color={project.marginPercentage > 20 ? 'success' : 
                                   project.marginPercentage > 10 ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.status}
                            color={project.status === 'completed' ? 'success' : 'primary'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Employee Productivity
              </Typography>
              <Box height={300} mb={2}>
                <Bar data={productivityChartData} options={chartOptions} />
              </Box>
              <Typography variant="body2" color="textSecondary">
                Average Productivity: {summary.averageProductivity?.toFixed(1) || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts and Insights */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Critical Alerts
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {summary.highRiskClients > 0 && (
                  <Alert severity="warning" action={
                    <Button color="inherit" size="small" onClick={() => handleInsightClick({
                      type: 'client-risk',
                      message: `${summary.highRiskClients} clients are at high risk of churning`
                    })}>
                      View Details
                    </Button>
                  }>
                    {summary.highRiskClients} clients at high churn risk
                  </Alert>
                )}
                
                {summary.marginPercentage < 15 && (
                  <Alert severity="error" action={
                    <Button color="inherit" size="small" onClick={() => handleInsightClick({
                      type: 'profitability',
                      message: 'Overall profit margin is below target'
                    })}>
                      View Details
                    </Button>
                  }>
                    Profit margin below target (15%)
                  </Alert>
                )}

                {summary.averageProductivity < 70 && (
                  <Alert severity="warning" action={
                    <Button color="inherit" size="small" onClick={() => handleInsightClick({
                      type: 'productivity',
                      message: 'Average team productivity is below target'
                    })}>
                      View Details
                    </Button>
                  }>
                    Team productivity below target (70%)
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Insights
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="body2">
                    <CheckCircle fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Revenue growth is 12.5% above target
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                  <Typography variant="body2">
                    <Assessment fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Project delivery rate is 95% on-time
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <Typography variant="body2">
                    <Warning fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Consider expanding team capacity
                  </Typography>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights Dialog */}
      <Dialog
        open={insightsDialogOpen}
        onClose={() => setInsightsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Insight Details
        </DialogTitle>
        <DialogContent>
          {selectedInsight && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedInsight.type.replace('-', ' ').toUpperCase()}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedInsight.message}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This insight was generated based on current data analysis and trends.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsightsDialogOpen(false)}>
            Close
          </Button>
          <Button variant="contained" onClick={() => setInsightsDialogOpen(false)}>
            Take Action
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExecutiveDashboard;
