const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const Tenant = require('../../../models/Tenant');
router.use(verifyERPToken);

// Get ERP statistics
router.get('/stats',  async (req, res) => {
  try {
    const tenants = await Tenant.find({});
    
    const erpCategories = [
      { key: 'software_house', name: 'Software House ERP', totalModules: 105 }
    ];
    
    const categoryStats = erpCategories.map(category => {
      const categoryTenants = tenants.filter(t => t.status === 'active' && t.erpCategory === category.key);
      return {
        ...category,
        activeTenants: categoryTenants.length,
        totalTenants: tenants.length,
        usagePercent: tenants.length > 0 ? Math.round((categoryTenants.length / tenants.length) * 100) : 0
      };
    });
    
    const stats = {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === 'active').length,
      totalCategories: erpCategories.length,
      totalModules: erpCategories.reduce((sum, cat) => sum + cat.totalModules, 0),
      categoryStats
    };

    res.json(stats);
  } catch (error) {
    console.error('ERP stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ERP statistics' 
    });
  }
});

// Get tenant ERP module details
router.get('/tenant-modules/:tenantId',  async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }

    const getModulesByCategory = (category) => {
      const moduleMap = {
        software_house: [
          { key: 'project_management', name: 'Project Management', status: 'active' },
          { key: 'bug_tracking', name: 'Bug Tracking', status: 'active' },
          { key: 'version_control', name: 'Version Control', status: 'active' },
          { key: 'testing_qa', name: 'Testing & QA', status: 'active' },
          { key: 'client_management', name: 'Client Management', status: 'active' },
          { key: 'hr_management', name: 'HR Management', status: 'active' },
          { key: 'finance_billing', name: 'Finance & Billing', status: 'active' },
          { key: 'time_tracking', name: 'Time Tracking', status: 'active' },
          { key: 'resource_planning', name: 'Resource Planning', status: 'active' },
          { key: 'documentation', name: 'Documentation', status: 'active' },
          { key: 'compliance', name: 'Compliance & Security', status: 'active' },
          { key: 'analytics', name: 'Analytics & Reports', status: 'active' }
        ]
      };
      return moduleMap[category] || moduleMap.software_house;
    };

    const modules = getModulesByCategory(tenant.erpCategory || 'software_house');

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          erpCategory: tenant.erpCategory || 'software_house'
        },
        modules
      }
    });
  } catch (error) {
    console.error('Tenant modules error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tenant modules' 
    });
  }
});

module.exports = router;
