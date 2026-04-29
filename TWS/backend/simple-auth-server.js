const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Simple auth server is running',
    timestamp: new Date().toISOString()
  });
});

// Simple GTS Admin login endpoint
app.post('/api/auth/gts-admin/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password });
  
  // Simple validation
  if (email === 'admin@gts.com' && password === 'admin123456') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: 'test-admin-id',
          email: 'admin@gts.com',
          fullName: 'GTS Administrator',
          role: 'super_admin',
          permissions: {
            tenantManagement: true,
            billingManagement: true,
            userManagement: true,
            systemSettings: true,
            analytics: true
          }
        },
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Master ERP stats endpoint (mock data)
app.get('/api/master-erp/stats/overview', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        activeTenants: 5,
        totalUsage: 120
      },
      {
        _id: 'legacy',
        activeTenants: 3,
        totalUsage: 80
      },
      {
        _id: 'software_house',
        activeTenants: 4,
        totalUsage: 90
      }
    ],
    message: 'Statistics fetched successfully'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Simple auth server running on port ${PORT}`);
  console.log(`🌍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/gts-admin/login`);
  console.log(`📊 Stats endpoint: http://localhost:${PORT}/api/master-erp/stats/overview`);
});
