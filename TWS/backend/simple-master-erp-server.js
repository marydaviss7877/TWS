const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Set environment variables
process.env.MONGO_URI = 'mongodb+srv://subhan:U3SNm3nRjvtHMiN7@cluster0.rlfss7x.mongodb.net/wolfstack';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware for testing
const testAuth = (req, res, next) => {
  req.user = { userId: 'test-user', role: 'supra_admin' };
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Simple Master ERP server is running',
    timestamp: new Date().toISOString()
  });
});

// Master ERP endpoints
app.get('/api/master-erp', testAuth, async (req, res) => {
  try {
    const MasterERP = require('./src/models/MasterERP');
    const masterERPs = await MasterERP.find({});
    
    res.json({
      success: true,
      data: masterERPs,
      message: 'Master ERPs fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching Master ERPs',
      error: error.message
    });
  }
});

app.get('/api/master-erp/meta/industries', testAuth, (req, res) => {
  const industries = [
    { value: 'software_house', label: 'Software House', icon: 'CogIcon' },
    { value: 'finance', label: 'Finance', icon: 'BanknotesIcon' }
  ];
  
  res.json({
    success: true,
    data: industries,
    message: 'Industries fetched successfully'
  });
});

app.get('/api/master-erp/stats/overview', testAuth, async (req, res) => {
  try {
    const MasterERP = require('./src/models/MasterERP');
    const Tenant = require('./src/models/Tenant');
    
    const totalMasterERPs = await MasterERP.countDocuments();
    const activeMasterERPs = await MasterERP.countDocuments({ isActive: true });
    const totalTenants = await Tenant.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalMasterERPs,
        activeMasterERPs,
        totalTenants,
        industries: [
          { industry: 'software_house', count: await MasterERP.countDocuments({ industry: 'software_house' }) },
        ]
      },
      message: 'Statistics fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Simple Master ERP server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Master ERP API: http://localhost:${PORT}/api/master-erp`);
      console.log(`📈 Industries: http://localhost:${PORT}/api/master-erp/meta/industries`);
      console.log(`📊 Stats: http://localhost:${PORT}/api/master-erp/stats/overview`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
