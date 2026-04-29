const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Enhanced test server with MongoDB integration
const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection (optional - will work without it)
let isMongoConnected = false;
const connectMongoDB = async () => {
  try {
    // Try different MongoDB connection options
    const mongoOptions = [
      'mongodb://127.0.0.1:27017/tws_test_db',
      'mongodb://localhost:27017/tws_test_db',
      process.env.MONGO_URI || 'mongodb://localhost:27017/tws_database'
    ];
    
    let connected = false;
    for (const uri of mongoOptions) {
      try {
        await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 3000,
          authSource: 'admin'
        });
        console.log(`✅ MongoDB connected successfully to ${uri}`);
        isMongoConnected = true;
        connected = true;
        
        // Seed some sample data if database is empty
        await seedSampleData();
        break;
      } catch (connError) {
        console.log(`⚠️ Failed to connect to ${uri}:`, connError.message);
        continue;
      }
    }
    
    if (!connected) {
      throw new Error('All MongoDB connection attempts failed');
    }
  } catch (error) {
    console.log('⚠️ MongoDB not available, using mock data:', error.message);
    isMongoConnected = false;
  }
};

// Seed sample data for testing
const seedSampleData = async () => {
  try {
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount === 0) {
      console.log('📊 Seeding sample tenant data...');
      const sampleTenants = [
        { name: 'TechCorp Solutions', slug: 'techcorp', status: 'active', plan: 'enterprise' },
        { name: 'Digital Innovations', slug: 'digital-inn', status: 'active', plan: 'professional' },
        { name: 'CloudTech Systems', slug: 'cloudtech', status: 'active', plan: 'enterprise' },
        { name: 'DataFlow Inc', slug: 'dataflow', status: 'active', plan: 'professional' },
        { name: 'NextGen Solutions', slug: 'nextgen', status: 'active', plan: 'starter' },
        { name: 'StartupHub', slug: 'startuphub', status: 'trial', plan: 'trial' },
        { name: 'InnovateLab', slug: 'innovatelab', status: 'suspended', plan: 'professional' }
      ];
      await Tenant.insertMany(sampleTenants);
      console.log('✅ Sample tenants created');
    }
    
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('📊 Seeding sample user data...');
      const sampleUsers = [
        { fullName: 'TWS Admin', email: 'admin@tws.com', role: 'super_admin', status: 'active' },
        { fullName: 'John Manager', email: 'john@techcorp.com', role: 'admin', status: 'active' },
        { fullName: 'Sarah Developer', email: 'sarah@digital.com', role: 'user', status: 'active' },
        { fullName: 'Mike Designer', email: 'mike@cloudtech.com', role: 'user', status: 'active' },
        { fullName: 'Lisa Analyst', email: 'lisa@dataflow.com', role: 'user', status: 'active' }
      ];
      await User.insertMany(sampleUsers);
      console.log('✅ Sample users created');
    }
  } catch (error) {
    console.log('⚠️ Error seeding data, falling back to mock data:', error.message);
    isMongoConnected = false;
  }
};

// Try to connect to MongoDB
connectMongoDB();

// Simple models for basic functionality
const TenantSchema = new mongoose.Schema({
  name: String,
  slug: String,
  status: { type: String, default: 'active' },
  plan: { type: String, default: 'professional' },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  role: String,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

let Tenant, User;
if (mongoose.models.Tenant) {
  Tenant = mongoose.models.Tenant;
} else {
  Tenant = mongoose.model('Tenant', TenantSchema);
}

if (mongoose.models.User) {
  User = mongoose.models.User;
} else {
  User = mongoose.model('User', UserSchema);
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Test routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TWS Backend Test Server is running',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Enhanced Supra Admin Dashboard endpoint with database integration
app.get('/api/supra-admin/dashboard', async (req, res) => {
  console.log('Dashboard endpoint called');
  
  try {
    let dashboardData;
    
    if (isMongoConnected) {
      // Use real database data
      console.log('📊 Fetching real data from database...');
      
      try {
        const totalTenants = await Tenant.countDocuments();
        const activeTenants = await Tenant.countDocuments({ status: 'active' });
        const trialTenants = await Tenant.countDocuments({ plan: 'trial' });
        const suspendedTenants = await Tenant.countDocuments({ status: 'suspended' });
        const cancelledTenants = await Tenant.countDocuments({ status: 'cancelled' });
        
        const recentTenants = await Tenant.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name createdAt')
          .lean();
        
        const topTenants = await Tenant.find({ status: 'active' })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name slug plan')
          .lean();
        
        const totalUsers = await User.countDocuments();
      
      // Calculate mock revenue based on plan
      const topTenantsWithRevenue = topTenants.map((tenant, index) => ({
        ...tenant,
        totalRevenue: tenant.plan === 'enterprise' ? 150000 - (index * 10000) : 
                     tenant.plan === 'professional' ? 80000 - (index * 5000) : 
                     30000 - (index * 2000),
        invoiceCount: tenant.plan === 'enterprise' ? 45 - (index * 5) : 
                     tenant.plan === 'professional' ? 30 - (index * 3) : 
                     15 - (index * 2),
        status: 'Active'
      }));
      
      dashboardData = {
        overview: {
          totalTenants,
          activeTenants,
          totalRevenue: topTenantsWithRevenue.reduce((sum, t) => sum + t.totalRevenue, 0),
          monthlyGrowth: 12.5,
          trialTenants
        },
        tenantStats: {
          active: activeTenants,
          trial: trialTenants,
          suspended: suspendedTenants,
          cancelled: cancelledTenants
        },
        systemHealth: {
          uptime: 99.9,
          totalUsers,
          errorRate: 0.1,
          avgResponseTime: 120
        },
        recentActivity: {
          recentTenants: recentTenants.map(t => ({
            name: t.name,
            createdAt: t.createdAt
          }))
        },
        topTenants: {
          topRevenue: topTenantsWithRevenue
        }
      };
      
        console.log('✅ Real database data fetched successfully');
      } catch (dbError) {
        console.log('⚠️ Database query failed, falling back to mock data:', dbError.message);
        isMongoConnected = false;
        // Fall through to mock data section
      }
    }
    
    if (!isMongoConnected) {
      // Fallback to mock data
      console.log('📊 Using mock data (database not available)');
      dashboardData = {
        overview: {
          totalTenants: 24,
          activeTenants: 18,
          totalRevenue: 125000,
          monthlyGrowth: 12.5,
          trialTenants: 6
        },
        tenantStats: {
          active: 18,
          trial: 6,
          suspended: 2,
          cancelled: 1
        },
        systemHealth: {
          uptime: 99.9,
          totalUsers: 1250,
          errorRate: 0.1,
          avgResponseTime: 120
        },
        recentActivity: {
          recentTenants: [
            { name: 'TechCorp Solutions', createdAt: new Date().toISOString() },
            { name: 'Digital Innovations', createdAt: new Date(Date.now() - 86400000).toISOString() },
            { name: 'CloudTech Systems', createdAt: new Date(Date.now() - 172800000).toISOString() },
            { name: 'DataFlow Inc', createdAt: new Date(Date.now() - 259200000).toISOString() },
            { name: 'NextGen Solutions', createdAt: new Date(Date.now() - 345600000).toISOString() }
          ]
        },
        topTenants: {
          topRevenue: [
            { name: 'TechCorp Solutions', slug: 'techcorp', plan: 'Enterprise', totalRevenue: 125000, invoiceCount: 45, status: 'Active' },
            { name: 'Digital Innovations', slug: 'digital-inn', plan: 'Professional', totalRevenue: 89000, invoiceCount: 32, status: 'Active' },
            { name: 'CloudTech Systems', slug: 'cloudtech', plan: 'Enterprise', totalRevenue: 156000, invoiceCount: 67, status: 'Active' },
            { name: 'DataFlow Inc', slug: 'dataflow', plan: 'Professional', totalRevenue: 78000, invoiceCount: 28, status: 'Active' },
            { name: 'NextGen Solutions', slug: 'nextgen', plan: 'Starter', totalRevenue: 34000, invoiceCount: 15, status: 'Active' }
          ]
        }
      };
    }
    
    res.json(dashboardData);
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

// Mock Supra Admin Tenants endpoint
app.get('/api/supra-admin/tenants', (req, res) => {
  console.log('Supra Admin tenants endpoint called');
  
  const mockTenants = [
    {
      _id: 'tenant1',
      name: 'TechCorp Solutions',
      slug: 'techcorp',
      status: 'active',
      plan: 'enterprise',
      industry: 'software_house',
      createdAt: new Date().toISOString(),
      adminEmail: 'admin@techcorp.com',
      revenue: 125000,
      users: 45,
      storage: 2500,
      lastActive: new Date().toISOString()
    },
    {
      _id: 'tenant2',
      name: 'Digital Innovations',
      slug: 'digital-inn',
      status: 'active',
      plan: 'professional',
      industry: 'software_house',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      adminEmail: 'admin@digital.com',
      revenue: 89000,
      users: 32,
      storage: 1800,
      lastActive: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: 'tenant3',
      name: 'CloudTech Systems',
      slug: 'cloudtech',
      status: 'active',
      plan: 'enterprise',
      industry: 'software_house',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      adminEmail: 'admin@cloudtech.com',
      revenue: 156000,
      users: 67,
      storage: 3200,
      lastActive: new Date(Date.now() - 7200000).toISOString()
    },
    {
      _id: 'tenant4',
      name: 'StartupHub Inc',
      slug: 'startuphub',
      status: 'active',
      plan: 'trial',
      industry: 'software_house',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      adminEmail: 'admin@startuphub.com',
      revenue: 0,
      users: 8,
      storage: 250,
      lastActive: new Date(Date.now() - 10800000).toISOString()
    },
    {
      _id: 'tenant5',
      name: 'EduTech Solutions',
      slug: 'edutech',
      status: 'active',
      plan: 'trial',
      industry: 'legacy',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      adminEmail: 'admin@edutech.com',
      revenue: 0,
      users: 12,
      storage: 180,
      lastActive: new Date(Date.now() - 14400000).toISOString()
    },
  ];
  
  // Calculate stats from mock data
  const stats = {
    total: mockTenants.length,
    active: mockTenants.filter(t => t.status === 'active').length,
    trial: mockTenants.filter(t => t.plan === 'trial').length,
    suspended: mockTenants.filter(t => t.status === 'suspended').length,
    cancelled: mockTenants.filter(t => t.status === 'cancelled').length
  };
  
  res.json({
    success: true,
    tenants: mockTenants,
    summary: stats,
    total: mockTenants.length,
    message: 'Tenants fetched successfully'
  });
});

// Mock Supra Admin ERP Stats endpoint
app.get('/api/supra-admin/erp/stats', (req, res) => {
  console.log('Supra Admin ERP stats endpoint called');
  
  const erpStats = {
    totalERPInstances: 24,
    activeInstances: 22,
    industryBreakdown: {
      software_house: 8,
      legacy: 4,
      finance: 2
    },
    performanceMetrics: {
      averageUptime: 99.5,
      averageResponseTime: 120,
      errorRate: 0.1
    }
  };
  
  res.json({
    success: true,
    data: erpStats,
    message: 'ERP statistics fetched successfully'
  });
});

// Mock GTS Admin Dashboard endpoint (for backward compatibility)
app.get('/api/gts-admin/dashboard', (req, res) => {
  console.log('GTS Dashboard endpoint called (redirecting to supra-admin)');
  // Redirect to supra-admin endpoint
  res.redirect('/api/supra-admin/dashboard');
});

// Industry-specific data seeding function
async function seedIndustrySpecificData(masterERPConfig, tenantId) {
  const industry = masterERPConfig.industry;
  let seededData = { totalRecords: 0, categories: [] };
  
  try {
    switch (industry) {
      case 'software_house':
        seededData = {
          totalRecords: 47,
          categories: [
            { name: 'Project Types', count: 5, items: ['Web Application', 'Mobile App', 'API Development', 'Desktop Software', 'E-commerce Platform'] },
            { name: 'Methodologies', count: 3, items: ['Agile', 'Scrum', 'Kanban'] },
            { name: 'Tech Stack', count: 15, items: ['React', 'Node.js', 'MongoDB', 'Express', 'Vue.js', 'Angular', 'Python', 'Django', 'PostgreSQL', 'MySQL', 'Docker', 'AWS', 'Azure', 'Git', 'Jenkins'] },
            { name: 'Roles', count: 8, items: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'Project Manager', 'QA Engineer', 'DevOps Engineer', 'Tech Lead'] },
            { name: 'Default Settings', count: 12, items: ['Sprint Duration: 14 days', 'Story Point Scale: Fibonacci', 'Time Tracking: Enabled', 'Code Review: Required', 'Automated Testing: Optional', 'Client Portal: Enabled'] },
            { name: 'Sample Projects', count: 4, items: ['Company Website Redesign', 'Mobile App MVP', 'API Integration Project', 'E-commerce Platform'] }
          ]
        };
        break;
        
      case 'legacy':
        seededData = {
          totalRecords: 38,
          categories: [
            { name: 'Academic Years', count: 1, items: ['2024-2025'] },
            { name: 'Grade Levels', count: 12, items: ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
            { name: 'Subjects', count: 10, items: ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Art', 'Music', 'Physical Education', 'Computer Science', 'Foreign Language'] },
            { name: 'Roles', count: 6, items: ['Principal', 'Vice Principal', 'Teacher', 'Counselor', 'Librarian', 'Administrative Staff'] },
            { name: 'Departments', count: 5, items: ['Elementary', 'Middle School', 'High School', 'Administration', 'Support Services'] },
            { name: 'Default Settings', count: 4, items: ['Grading System: Percentage', 'Academic Year: September-June', 'Attendance Tracking: Daily', 'Parent Portal: Enabled'] }
          ]
        };
        break;
        
      case 'finance':
        seededData = {
          totalRecords: 33,
          categories: [
            { name: 'Account Types', count: 6, items: ['Checking', 'Savings', 'Investment', 'Loan', 'Credit', 'Business'] },
            { name: 'Roles', count: 7, items: ['Branch Manager', 'Loan Officer', 'Financial Advisor', 'Teller', 'Customer Service', 'Compliance Officer', 'Risk Analyst'] },
            { name: 'Transaction Types', count: 8, items: ['Deposit', 'Withdrawal', 'Transfer', 'Payment', 'Investment', 'Loan Disbursement', 'Interest Credit', 'Fee Deduction'] },
            { name: 'Compliance Standards', count: 5, items: ['SOX Compliance', 'Basel III', 'GDPR', 'PCI DSS', 'Anti-Money Laundering'] },
            { name: 'Investment Products', count: 4, items: ['Mutual Funds', 'Bonds', 'Stocks', 'CDs'] },
            { name: 'Default Settings', count: 3, items: ['Compliance Tracking: Enabled', 'Audit Trail: Complete', 'Risk Assessment: Daily'] }
          ]
        };
        break;
        
      default: // generic
        seededData = {
          totalRecords: 20,
          categories: [
            { name: 'Departments', count: 5, items: ['Administration', 'Operations', 'Finance', 'Human Resources', 'IT'] },
            { name: 'Roles', count: 6, items: ['Manager', 'Supervisor', 'Employee', 'Coordinator', 'Specialist', 'Assistant'] },
            { name: 'Project Types', count: 4, items: ['Internal Project', 'Client Project', 'Research', 'Maintenance'] },
            { name: 'Default Settings', count: 5, items: ['Currency: USD', 'Timezone: UTC', 'Language: English', 'Date Format: MM/DD/YYYY', 'Number Format: US'] }
          ]
        };
    }
    
    // Simulate data seeding delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`📊 Seeded ${industry} data: ${seededData.totalRecords} records across ${seededData.categories.length} categories`);
    
    return seededData;
  } catch (error) {
    console.error('Error seeding data:', error);
    return { totalRecords: 0, categories: [], error: error.message };
  }
}

// Mock Master ERP endpoints
app.get('/api/master-erp', (req, res) => {
  console.log('Master ERP list endpoint called');
  console.log('Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  
  // Mock Master ERP data
  const mockMasterERPs = [
    {
      _id: 'software_house',
      name: 'Software House ERP',
      industry: 'software_house',
      description: 'Complete ERP solution for software development companies',
      configuration: {
        coreModules: ['employees', 'projects', 'finance', 'reports'],
        industryModules: ['development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal']
      },
      icon: '💻'
    },
    {
      _id: 'legacy',
      name: 'Education ERP',
      industry: 'legacy',
      description: 'Comprehensive ERP for schools, colleges, and universities',
      configuration: {
        coreModules: ['employees', 'finance', 'reports'],
        industryModules: ['students', 'teachers', 'classes', 'grades', 'courses', 'exams', 'admissions']
      },
      icon: '🎓'
    },
    {
      _id: 'finance',
      name: 'Finance ERP',
      industry: 'finance',
      description: 'ERP for banks and financial institutions',
      configuration: {
        coreModules: ['employees', 'reports'],
        industryModules: ['accounts', 'transactions', 'loans', 'investments', 'compliance', 'reporting']
      },
      icon: '🏦'
    }
  ];
  
  try {
    res.json({
      success: true,
      data: mockMasterERPs,
      message: 'Master ERPs fetched successfully'
    });
  } catch (error) {
    console.error('Error in Master ERP endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Master ERPs',
      error: error.message
    });
  }
});

// Mock Master ERP meta/industries endpoint
app.get('/api/master-erp/meta/industries', (req, res) => {
  console.log('Master ERP industries endpoint called');
  
  const industries = [
    {
      value: 'software_house',
      label: 'Software House',
      description: 'IT companies, software development firms, tech startups',
      icon: '💻',
      modules: ['development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal']
    },
    {
      value: 'legacy',
      label: 'Education',
      description: 'Schools, colleges, universities, legacyal institutions',
      icon: '🎓',
      modules: ['students', 'teachers', 'classes', 'grades', 'courses', 'academic_year', 'exams', 'admissions']
    },
    {
      value: 'finance',
      label: 'Finance',
      description: 'Banks, financial institutions, investment firms',
      icon: '🏦',
      modules: ['accounts', 'transactions', 'loans', 'investments', 'compliance', 'reporting']
    }
  ];
  
  res.json({
    success: true,
    data: industries,
    message: 'Industries fetched successfully'
  });
});

// Mock Master ERP stats/overview endpoint
app.get('/api/master-erp/stats/overview', (req, res) => {
  console.log('Master ERP stats endpoint called');
  
  const stats = {
    totalTemplates: 6,
    activeTemplates: 6,
    totalTenants: 24,
    tenantsCreatedThisMonth: 5,
    mostPopularIndustry: 'software_house',
    industryBreakdown: {
      software_house: 8,
      legacy: 4,
      finance: 2
    },
    recentActivity: [
      { action: 'Template Created', industry: 'software_house', timestamp: new Date().toISOString() },
      { action: 'Tenant Created', industry: 'legacy', timestamp: new Date(Date.now() - 86400000).toISOString() }
    ]
  };
  
  res.json({
    success: true,
    data: stats,
    message: 'Statistics fetched successfully'
  });
});

app.post('/api/master-erp/:id/create-tenant', async (req, res) => {
  console.log('Create tenant from Master ERP endpoint called', req.params.id);
  const { id } = req.params;
  const tenantData = req.body;
  
  try {
    // Get Master ERP configuration
    const masterERPConfigs = {
      generic: {
        industry: 'other',
        erpModules: ['employees', 'projects', 'finance', 'reports'],
        settings: {
          defaultCurrency: 'USD',
          defaultTimezone: 'UTC',
          defaultLanguage: 'en'
        }
      },
      software_house: {
        industry: 'software_house',
        erpModules: ['employees', 'projects', 'finance', 'reports', 'development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal'],
        settings: {
          defaultMethodology: 'agile',
          supportedMethodologies: ['agile', 'scrum', 'kanban'],
          defaultSprintDuration: 14,
          timeTrackingEnabled: true,
          codeQualityTracking: true,
          clientPortalEnabled: true
        }
      },
      legacy: {
        industry: 'legacy',
        erpModules: ['employees', 'finance', 'reports', 'students', 'teachers', 'classes', 'grades', 'courses', 'exams', 'admissions'],
        settings: {
          academicYearStart: 'september',
          gradingSystem: 'percentage',
          attendanceTracking: true,
          parentPortalEnabled: true
        }
      },
      finance: {
        industry: 'finance',
        erpModules: ['employees', 'reports', 'accounts', 'transactions', 'loans', 'investments', 'compliance', 'reporting'],
        settings: {
          complianceTracking: true,
          auditTrail: true,
          riskAssessment: true,
          regulatoryReporting: true
        }
      }
    };
    
    const masterERPConfig = masterERPConfigs[id] || masterERPConfigs.generic;
    const slug = tenantData.slug || tenantData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create complete tenant with ERP provisioning
    const mockTenant = {
      _id: `tenant_${Date.now()}`,
      tenantId: tenantId,
      name: tenantData.name,
      slug: slug,
      industry: masterERPConfig.industry,
      erpCategory: masterERPConfig.industry,
      erpModules: masterERPConfig.erpModules,
      settings: {
        ...masterERPConfig.settings,
        currency: tenantData.currency || 'USD',
        timezone: tenantData.timezone || 'UTC',
        language: tenantData.language || 'en'
      },
      database: {
        name: `tws_${slug}`,
        connectionString: `mongodb://localhost:27017/tws_${slug}`,
        status: 'provisioned',
        createdAt: new Date().toISOString()
      },
      status: 'active',
      plan: 'trial',
      createdAt: new Date().toISOString(),
      onboarding: {
        completed: false,
        currentStep: 'erp_setup',
        steps: [
          { step: 'tenant_created', completed: true, completedAt: new Date().toISOString() },
          { step: 'database_provisioned', completed: true, completedAt: new Date().toISOString() },
          { step: 'erp_modules_assigned', completed: true, completedAt: new Date().toISOString() },
          { step: 'admin_user_created', completed: true, completedAt: new Date().toISOString() },
          { step: 'erp_setup', completed: false },
          { step: 'data_seeding', completed: false },
          { step: 'welcome_email_sent', completed: false }
        ]
      }
    };
    
    const mockAdminUser = {
      _id: `admin_${Date.now()}`,
      tenantId: tenantId,
      fullName: tenantData.adminUser?.fullName || 'Admin User',
      email: tenantData.adminUser?.email || 'admin@example.com',
      role: 'tenant_admin',
      permissions: ['all'],
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    const mockOrganization = {
      _id: `org_${Date.now()}`,
      tenantId: tenantId,
      name: tenantData.name,
      type: 'company',
      industry: masterERPConfig.industry,
      settings: masterERPConfig.settings,
      adminUsers: [mockAdminUser._id],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    // Seed industry-specific default data
    const seededData = await seedIndustrySpecificData(masterERPConfig, tenantId);
    
    // Log the successful provisioning
    console.log(`✅ Tenant provisioned successfully:`);
    console.log(`   - Tenant ID: ${tenantId}`);
    console.log(`   - Industry: ${masterERPConfig.industry}`);
    console.log(`   - ERP Modules: ${masterERPConfig.erpModules.length} modules assigned`);
    console.log(`   - Database: ${mockTenant.database.name} provisioned`);
    console.log(`   - Data Seeded: ${seededData.totalRecords} default records created`);
    
    res.status(201).json({
      success: true,
      data: {
        tenant: mockTenant,
        adminUser: mockAdminUser,
        organization: mockOrganization
      },
      message: id === 'generic' ? 'Generic organization created with ERP provisioning' : `${masterERPConfig.industry.replace('_', ' ').toUpperCase()} ERP organization created successfully`,
      provisioning: {
        modulesAssigned: masterERPConfig.erpModules.length,
        databaseProvisioned: true,
        industryConfigured: true,
        dataSeeded: {
          totalRecords: seededData.totalRecords,
          categories: seededData.categories.length,
          details: seededData.categories
        },
        nextSteps: [
          'Complete ERP setup wizard',
          'Configure industry-specific settings',
          'Invite team members',
          'Import existing data (optional)'
        ]
      }
    });
    
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant with ERP provisioning',
      error: error.message
    });
  }
});

// ERP Setup Wizard endpoint
app.get('/api/tenant/:tenantId/erp/setup-wizard', (req, res) => {
  console.log('ERP Setup Wizard endpoint called for tenant:', req.params.tenantId);
  
  const setupWizard = {
    currentStep: 1,
    totalSteps: 5,
    steps: [
      {
        step: 1,
        title: 'Welcome & Overview',
        description: 'Introduction to your ERP system',
        completed: true,
        data: {
          welcomeMessage: 'Welcome to your industry-specific ERP system!',
          overview: 'Your ERP has been pre-configured with industry-specific modules and settings.'
        }
      },
      {
        step: 2,
        title: 'Module Configuration',
        description: 'Enable/disable ERP modules',
        completed: false,
        data: {
          availableModules: [
            { id: 'employees', name: 'Employee Management', enabled: true, required: true },
            { id: 'projects', name: 'Project Management', enabled: true, required: true },
            { id: 'finance', name: 'Financial Management', enabled: true, required: true },
            { id: 'reports', name: 'Reporting & Analytics', enabled: true, required: true },
            { id: 'time_tracking', name: 'Time Tracking', enabled: true, required: false },
            { id: 'client_portal', name: 'Client Portal', enabled: false, required: false }
          ]
        }
      },
      {
        step: 3,
        title: 'Industry Settings',
        description: 'Configure industry-specific settings',
        completed: false,
        data: {
          industrySettings: [
            { key: 'defaultMethodology', label: 'Default Methodology', value: 'agile', options: ['agile', 'scrum', 'kanban'] },
            { key: 'sprintDuration', label: 'Sprint Duration (days)', value: 14, type: 'number' },
            { key: 'timeTrackingEnabled', label: 'Enable Time Tracking', value: true, type: 'boolean' }
          ]
        }
      },
      {
        step: 4,
        title: 'Team Setup',
        description: 'Invite team members and assign roles',
        completed: false,
        data: {
          availableRoles: [
            'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 
            'UI/UX Designer', 'Project Manager', 'QA Engineer', 'DevOps Engineer', 'Tech Lead'
          ],
          inviteTemplate: {
            subject: 'Welcome to our ERP system',
            message: 'You have been invited to join our organization\'s ERP system.'
          }
        }
      },
      {
        step: 5,
        title: 'Final Review',
        description: 'Review and complete setup',
        completed: false,
        data: {
          summary: 'Review all configurations before completing setup'
        }
      }
    ]
  };
  
  res.json({
    success: true,
    data: setupWizard,
    message: 'ERP setup wizard data retrieved successfully'
  });
});

// Complete ERP setup wizard step
app.post('/api/tenant/:tenantId/erp/setup-wizard/step/:stepId', (req, res) => {
  console.log(`ERP Setup step ${req.params.stepId} completed for tenant:`, req.params.tenantId);
  
  const { stepId } = req.params;
  const stepData = req.body;
  
  res.json({
    success: true,
    data: {
      stepId: parseInt(stepId),
      completed: true,
      nextStep: parseInt(stepId) + 1,
      data: stepData
    },
    message: `Setup step ${stepId} completed successfully`
  });
});

// Tenant ERP Dashboard endpoint
app.get('/api/tenant/:tenantId/erp/dashboard', (req, res) => {
  console.log('Tenant ERP Dashboard endpoint called for tenant:', req.params.tenantId);
  
  const erpDashboard = {
    tenantInfo: {
      tenantId: req.params.tenantId,
      name: 'Test Software House',
      industry: 'software_house',
      status: 'active',
      setupCompleted: 75
    },
    modules: {
      active: 8,
      total: 10,
      list: [
        { id: 'employees', name: 'Employee Management', status: 'active', usage: 85 },
        { id: 'projects', name: 'Project Management', status: 'active', usage: 92 },
        { id: 'finance', name: 'Financial Management', status: 'active', usage: 67 },
        { id: 'reports', name: 'Reporting & Analytics', status: 'active', usage: 78 },
        { id: 'time_tracking', name: 'Time Tracking', status: 'active', usage: 89 },
        { id: 'code_quality', name: 'Code Quality', status: 'active', usage: 73 },
        { id: 'client_portal', name: 'Client Portal', status: 'active', usage: 45 },
        { id: 'tech_stack', name: 'Tech Stack Management', status: 'active', usage: 56 },
        { id: 'development_methodology', name: 'Development Methodology', status: 'inactive', usage: 0 },
        { id: 'project_types', name: 'Project Types', status: 'inactive', usage: 0 }
      ]
    },
    quickStats: {
      totalUsers: 12,
      activeProjects: 8,
      completedTasks: 156,
      revenue: 89500,
      growth: '+12%'
    },
    recentActivity: [
      { type: 'project', message: 'New project "Mobile App MVP" created', timestamp: new Date().toISOString() },
      { type: 'user', message: 'John Doe joined as Frontend Developer', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { type: 'task', message: '5 tasks completed in "Website Redesign"', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { type: 'finance', message: 'Invoice #INV-001 paid ($5,500)', timestamp: new Date(Date.now() - 10800000).toISOString() }
    ],
    notifications: [
      { type: 'setup', message: 'Complete your ERP setup (2 steps remaining)', priority: 'high', link: '/erp/setup-wizard' },
      { type: 'update', message: 'New features available in Project Management module', priority: 'medium', link: '/modules/projects' },
      { type: 'billing', message: 'Your trial expires in 15 days', priority: 'medium', link: '/billing' }
    ]
  };
  
  res.json({
    success: true,
    data: erpDashboard,
    message: 'Tenant ERP dashboard data retrieved successfully'
  });
});

// Module activation/deactivation endpoint
app.post('/api/tenant/:tenantId/erp/modules/:moduleId/:action', (req, res) => {
  console.log(`Module ${req.params.action} for ${req.params.moduleId} in tenant:`, req.params.tenantId);
  
  const { tenantId, moduleId, action } = req.params;
  const validActions = ['activate', 'deactivate'];
  
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Use activate or deactivate.'
    });
  }
  
  res.json({
    success: true,
    data: {
      tenantId,
      moduleId,
      action,
      status: action === 'activate' ? 'active' : 'inactive',
      timestamp: new Date().toISOString()
    },
    message: `Module ${moduleId} ${action}d successfully`
  });
});

// Mock authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@tws.com' && password === 'admin123') {
    res.json({
      success: true,
      token: 'mock_jwt_token_for_development',
      user: {
        _id: '507f1f77bcf86cd799439015',
        id: '507f1f77bcf86cd799439015',
        email: 'admin@tws.com',
        fullName: 'TWS Admin',
        role: 'super_admin',
        status: 'active',
        orgId: '507f1f77bcf86cd799439012',
        permissions: ['*']
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ TWS Backend Test Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/supra-admin/dashboard`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth/login`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});