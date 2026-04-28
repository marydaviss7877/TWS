const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ERPTemplate = require('../../../models/ERPTemplate');
const Tenant = require('../../../models/Tenant');
const SoftwareHouseRole = require('../../../models/SoftwareHouseRole');
const erpTemplateAdmin = requireErpAccess({ allowedRoles: ['supra_admin'], checkRevocation: false });
router.use(verifyERPToken);

// Get all ERP templates
router.get('/', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { category, isActive } = req.query;
  
  let query = {};
  
  if (category) {
    query.category = category;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  const templates = await ERPTemplate.find(query)
    .select('name category description version configuration isActive isDefault usageCount createdAt')
    .populate('createdBy', 'name email')
    .sort({ category: 1, isDefault: -1, usageCount: -1 });
  
  res.json({
    success: true,
    data: templates
  });
}));

// Get ERP template by ID
router.get('/:templateId', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  
  const template = await ERPTemplate.findById(templateId)
    .populate('createdBy', 'name email');
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'ERP template not found'
    });
  }
  
  res.json({
    success: true,
    data: template
  });
}));

// Create new ERP template
router.post('/', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const {
    name,
    category,
    description,
    configuration
  } = req.body;
  
  const template = new ERPTemplate({
    name,
    category,
    description,
    configuration,
    createdBy: req.user.userId
  });
  
  await template.save();
  
  res.status(201).json({
    success: true,
    data: template,
    message: 'ERP template created successfully'
  });
}));

// Update ERP template
router.put('/:templateId', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const updates = req.body;
  
  const template = await ERPTemplate.findByIdAndUpdate(
    templateId,
    { ...updates, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'ERP template not found'
    });
  }
  
  res.json({
    success: true,
    data: template,
    message: 'ERP template updated successfully'
  });
}));

// Delete ERP template
router.delete('/:templateId', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  
  const template = await ERPTemplate.findById(templateId);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'ERP template not found'
    });
  }
  
  if (template.isDefault) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete default template'
    });
  }
  
  await ERPTemplate.findByIdAndDelete(templateId);
  
  res.json({
    success: true,
    message: 'ERP template deleted successfully'
  });
}));

// Apply template to tenant
router.post('/:templateId/apply/:tenantId', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { templateId, tenantId } = req.params;
  const { createDefaultRoles = true } = req.body;
  
  const template = await ERPTemplate.findById(templateId);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'ERP template not found'
    });
  }
  
  const tenant = await Tenant.findById(tenantId);
  
  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Tenant not found'
    });
  }
  
  // Apply template configuration to tenant
  const templateConfig = template.applyToTenant(tenantId);
  
  tenant.erpCategory = templateConfig.erpCategory;
  tenant.erpModules = templateConfig.erpModules;
  tenant.softwareHouseConfig = templateConfig.softwareHouseConfig;
  
  await tenant.save();
  
  // Create default roles if requested
  let createdRoles = [];
  if (createDefaultRoles && template.configuration.defaultRoles.length > 0) {
    // Get tenant's first organization
    const Organization = require('../../../models/Organization');
    const organization = await Organization.findOne({ tenantId });
    
    if (organization) {
      const defaultRoles = template.createDefaultRoles(organization._id, tenantId, req.user.userId);
      createdRoles = await SoftwareHouseRole.insertMany(defaultRoles);
    }
  }
  
  // Update template usage count
  template.usageCount += 1;
  await template.save();
  
  res.json({
    success: true,
    data: {
      tenant,
      createdRoles,
      template: template.summary
    },
    message: 'Template applied to tenant successfully'
  });
}));

// Clone template
router.post('/:templateId/clone', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const { name, description } = req.body;
  
  const originalTemplate = await ERPTemplate.findById(templateId);
  
  if (!originalTemplate) {
    return res.status(404).json({
      success: false,
      message: 'Original template not found'
    });
  }
  
  const clonedTemplate = new ERPTemplate({
    ...originalTemplate.toObject(),
    _id: undefined,
    name: name || `${originalTemplate.name} (Copy)`,
    description: description || originalTemplate.description,
    isDefault: false,
    usageCount: 0,
    createdBy: req.user.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  await clonedTemplate.save();
  
  res.status(201).json({
    success: true,
    data: clonedTemplate,
    message: 'Template cloned successfully'
  });
}));

// Get template usage statistics
router.get('/:templateId/usage', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  
  const template = await ERPTemplate.findById(templateId);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'ERP template not found'
    });
  }
  
  // Get tenants using this template category
  const tenantsUsingCategory = await Tenant.find({ erpCategory: template.category })
    .select('name slug status createdAt')
    .sort({ createdAt: -1 });
  
  const usageStats = {
    template: {
      name: template.name,
      category: template.category,
      usageCount: template.usageCount
    },
    categoryUsage: {
      totalTenants: tenantsUsingCategory.length,
      activeTenants: tenantsUsingCategory.filter(t => t.status === 'active').length,
      recentTenants: tenantsUsingCategory.slice(0, 10)
    }
  };
  
  res.json({
    success: true,
    data: usageStats
  });
}));

// Initialize default templates
router.post('/initialize-defaults', erpTemplateAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const defaultTemplates = [
    {
      name: 'Standard Business ERP',
      category: 'business',
      description: 'Standard ERP template for general business operations',
      configuration: {
        defaultModules: ['hr', 'finance', 'projects', 'operations', 'reports', 'messaging'],
        defaultRoles: [
          {
            name: 'Administrator',
            roleType: 'admin',
            level: 'manager',
            hourlyRate: 0,
            permissions: {
              projectAccess: { canView: true, canEdit: true, canDelete: true, canManage: true },
              moduleAccess: {
                hr_management: true,
                finance: true,
                projects: true,
                operations: true,
                inventory: false,
                reports: true,
                time_attendance: true,
                communication: true,
                role_management: true,
                system_settings: true
              }
            }
          }
        ]
      },
      isDefault: true
    },
    {
      name: 'Software House ERP',
      category: 'software_house',
      description: 'Comprehensive ERP template for software development companies',
      configuration: {
        defaultModules: ['hr', 'finance', 'projects', 'operations', 'clients', 'reports', 'messaging', 'attendance', 'roles'],
        softwareHouseConfig: {
          defaultMethodology: 'agile',
          supportedMethodologies: ['agile', 'scrum', 'kanban'],
          techStack: {
            frontend: ['React', 'Vue.js', 'Angular'],
            backend: ['Node.js', 'Python', 'Java'],
            database: ['MongoDB', 'PostgreSQL', 'Redis'],
            cloud: ['AWS', 'Azure', 'Google Cloud'],
            tools: ['Git', 'Docker', 'Jenkins']
          },
          supportedProjectTypes: ['web_application', 'mobile_app', 'api_development'],
          developmentSettings: {
            defaultSprintDuration: 14,
            storyPointScale: 'fibonacci',
            codeQualityTracking: true
          },
          billingConfig: {
            defaultHourlyRate: 75,
            currency: 'USD',
            billingCycle: 'monthly',
            invoiceTemplate: 'standard',
            autoInvoiceGeneration: false
          },
          teamConfig: {
            maxTeamSize: 50,
            allowRemoteWork: true,
            requireTimeTracking: true,
            allowOvertime: true,
            maxOvertimeHours: 20
          },
          qualityConfig: {
            codeReviewRequired: true,
            testingRequired: true,
            documentationRequired: true,
            minCodeCoverage: 80,
            maxTechnicalDebt: 20
          }
        },
        defaultRoles: [
          {
            name: 'Senior Developer',
            roleType: 'developer',
            level: 'senior',
            hourlyRate: 75,
            permissions: {
              projectAccess: { canView: true, canEdit: true, canDelete: false, canManage: false },
              moduleAccess: {
                hr_management: true,
                finance: false,
                projects: true,
                operations: false,
                inventory: false,
                reports: false,
                time_attendance: true,
                communication: true,
                role_management: false,
                system_settings: false
              }
            }
          },
          {
            name: 'Tech Lead',
            roleType: 'tech_lead',
            level: 'lead',
            hourlyRate: 95,
            permissions: {
              projectAccess: { canView: true, canEdit: true, canDelete: false, canManage: true },
              moduleAccess: {
                hr_management: true,
                finance: false,
                projects: true,
                operations: false,
                inventory: false,
                reports: true,
                time_attendance: true,
                communication: true,
                role_management: false,
                system_settings: false
              }
            }
          },
          {
            name: 'Project Manager',
            roleType: 'project_manager',
            level: 'manager',
            hourlyRate: 85,
            permissions: {
              projectAccess: { canView: true, canEdit: true, canDelete: false, canManage: true },
              moduleAccess: {
                hr_management: true,
                finance: true,
                projects: true,
                operations: false,
                inventory: false,
                reports: true,
                time_attendance: true,
                communication: true,
                role_management: false,
                system_settings: false
              }
            }
          }
        ]
      },
      isDefault: true
    }
  ];
  
  const createdTemplates = [];
  
  for (const templateData of defaultTemplates) {
    const existingTemplate = await ERPTemplate.findOne({ 
      category: templateData.category, 
      isDefault: true 
    });
    
    if (!existingTemplate) {
      const template = new ERPTemplate({
        ...templateData,
        createdBy: req.user.userId
      });
      
      await template.save();
      createdTemplates.push(template);
    }
  }
  
  res.json({
    success: true,
    data: createdTemplates,
    message: `Initialized ${createdTemplates.length} default templates`
  });
}));

module.exports = router;
