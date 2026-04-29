const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Mock GTS Admin data
const mockGTSAdmin = {
  _id: '68eb3cc636662c93eb7d1ded',
  email: 'admin@gts.com',
  fullName: 'GTS Administrator',
  role: 'super_admin',
  status: 'active'
};

// Mock dashboard data
const mockDashboardData = {
  overview: {
    totalTenants: 25,
    activeTenants: 18,
    totalRevenue: 125000,
    monthlyGrowth: 12.5,
    trialTenants: 7
  },
  tenantStats: {
    active: 18,
    trial: 7,
    suspended: 2,
    cancelled: 3
  },
  revenueStats: {
    monthly: [45000, 52000, 48000, 61000, 58000, 67000],
    yearly: [450000, 520000, 480000, 610000, 580000, 670000, 720000, 680000, 750000, 820000, 780000, 890000]
  },
  systemHealth: {
    uptime: 99.9,
    totalUsers: 1250,
    errorRate: 0.1,
    avgResponseTime: 120
  },
  recentActivity: {
    recentTenants: [
      { name: 'TechCorp Inc', createdAt: '2024-01-15T10:30:00Z' },
      { name: 'StartupXYZ', createdAt: '2024-01-14T14:20:00Z' },
      { name: 'Global Solutions', createdAt: '2024-01-13T09:15:00Z' },
      { name: 'Innovation Labs', createdAt: '2024-01-12T16:45:00Z' },
      { name: 'Digital Agency', createdAt: '2024-01-11T11:30:00Z' }
    ]
  },
  topTenants: {
    topRevenue: [
      { name: 'Enterprise Corp', slug: 'enterprise-corp', plan: 'Enterprise', revenue: 25000, status: 'active' },
      { name: 'TechStart Inc', slug: 'techstart-inc', plan: 'Professional', revenue: 18000, status: 'active' },
      { name: 'Global Solutions', slug: 'global-solutions', plan: 'Professional', revenue: 15000, status: 'active' },
      { name: 'Innovation Labs', slug: 'innovation-labs', plan: 'Standard', revenue: 12000, status: 'trial' },
      { name: 'Digital Agency', slug: 'digital-agency', plan: 'Standard', revenue: 10000, status: 'active' }
    ]
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Dashboard test server is running',
    timestamp: new Date().toISOString()
  });
});

// GTS Admin login
app.post('/api/auth/gts-admin/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@gts.com' && password === 'admin123456') {
    // Create token with the same structure as the real backend
    const tokenPayload = {
      userId: {
        _id: mockGTSAdmin._id,
        email: mockGTSAdmin.email,
        role: 'super_admin',
        type: 'gts_admin'
      },
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      aud: 'tws-frontend',
      iss: 'tws-backend'
    };
    
    const token = jwt.sign(tokenPayload, 'test-secret');
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: mockGTSAdmin,
        accessToken: token,
        refreshToken: 'mock-refresh-token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Auth check endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  try {
    const decoded = jwt.verify(token, 'test-secret');
    
    if (decoded.userId && decoded.userId.type === 'gts_admin') {
      res.json({
        success: true,
        data: {
          user: mockGTSAdmin
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// GTS Admin dashboard with proper data structure
app.get('/api/gts-admin/dashboard', (req, res) => {
  res.json({
    success: true,
    data: mockDashboardData
  });
});

// Master ERP endpoints
app.get('/api/master-erp', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Master ERPs fetched successfully'
  });
});

app.get('/api/master-erp/meta/industries', (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'software_house', label: 'Software House' },
    ]
  });
});

app.get('/api/master-erp/stats/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      totalERPs: 0,
      activeERPs: 0,
      totalTenants: 0
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Dashboard test server running on port ${PORT}`);
  console.log(`🌍 Environment: test`);
  console.log(`🔴 Redis: Disabled`);
  console.log(`⚡ BullMQ: Disabled`);
  console.log(`📊 Dashboard data structure: Complete`);
});
