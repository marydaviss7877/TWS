const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Tenant = require('../../../models/tenant/Tenant');
const Organization = require('../../../models/org/Organization');
const Department = require('../../../models/org/Department');
const User = require('../../../models/users-auth/User');
const Project = require('../../../models/project-delivery/Project');
const Task = require('../../../models/project-delivery/Task');
const TenantDataService = require('../../../services/tenant/tenant-data.service');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');

// Use simplified ERP token verification middleware (replaces verifyTenantOwner + TenantMiddleware.setTenantContext)
router.use(verifyERPToken);

const adminDashAccess = requireErpAccess({
  allowedRoles: ['owner', 'admin', 'super_admin', 'ceo', 'manager', 'project_manager', 'pmo']
});
const ownerAdminOnly = requireErpAccess({ allowedRoles: ['owner', 'admin', 'super_admin'] });

// Get tenant dashboard overview
router.get('/overview', adminDashAccess, async (req, res) => {
  try {
    const overview = await TenantDataService.getDashboardOverview(req.tenantId);
    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard overview' });
  }
});

// Get tenant departments with real-time data
router.get('/departments', async (req, res) => {
  try {
    const departments = await TenantDataService.getDepartments(req.tenantId);
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// Get tenant users with real-time data
router.get('/users', adminDashAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, department, status } = req.query;
    const result = await TenantDataService.getUsers(req.tenantId, { page, limit, department, status });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get tenant projects with real-time data
router.get('/projects', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, department } = req.query;
    const result = await TenantDataService.getProjects(req.tenantId, { page, limit, status, department });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
});

// Get recent activity
router.get('/activity', adminDashAccess, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activities = await TenantDataService.getRecentActivity(req.tenantId, limit);
    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
});

// Get analytics data
router.get('/analytics', adminDashAccess, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const analytics = await TenantDataService.getAnalytics(req.tenantId, period);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Get Finance dashboard data
router.get('/finance', adminDashAccess, async (req, res) => {
  try {
    const financeData = await TenantDataService.getFinanceDashboard(req.tenantId);
    res.json({ success: true, data: financeData });
  } catch (error) {
    console.error('Finance dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch finance dashboard data' });
  }
});

// Create sample data for tenant
router.post('/create-sample-data', ownerAdminOnly, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Create organization if it doesn't exist
    let organization = await Organization.findOne({ tenantId: req.tenantId });
    if (!organization) {
      organization = new Organization({
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description,
        industry: tenant.businessInfo?.industry,
        size: tenant.businessInfo?.companySize,
        tenantId: req.tenantId,
        status: 'active'
      });
      await organization.save();
    }

    const result = await TenantDataService.createSampleData(req.tenantId, organization._id);
    
    res.json({ 
      success: true, 
      message: 'Sample data created successfully',
      data: result
    });
  } catch (error) {
    console.error('Create sample data error:', error);
    res.status(500).json({ success: false, message: 'Failed to create sample data' });
  }
});

module.exports = router;
