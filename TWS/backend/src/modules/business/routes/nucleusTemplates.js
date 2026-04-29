const express = require('express');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { verifyWorkspaceAccess, requireWorkspaceRole } = require('../../../middleware/auth/workspaceIsolation');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Workspace = require('../../../models/org/Workspace');
const templateService = require('../../../services/nucleusTemplateService');
const onboardingService = require('../../../services/nucleusOnboardingService');

const router = express.Router();
router.use(verifyERPToken);

/**
 * Nucleus Template Routes
 * 
 * Provides endpoints for:
 * - Creating projects from prebuilt templates
 * - Onboarding flow management
 * - Template selection
 */

/**
 * POST /api/nucleus-templates/workspaces/:workspaceId/projects/from-template
 * Create project from prebuilt template
 */
router.post(
  '/workspaces/:workspaceId/projects/from-template',
  verifyWorkspaceAccess,
  requireWorkspaceRole(['owner', 'admin']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { templateType, projectName, clientId, devLeadId, qaLeadId, clientEmail } = req.body;

    if (!templateType || !['website', 'mobile_app', 'custom'].includes(templateType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid template type. Must be: website, mobile_app, or custom'
      });
    }

    if (!projectName) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    const workspace = await Workspace.findById(workspaceId);

    let result;
    switch (templateType) {
      case 'website':
        result = await templateService.createWebsiteTemplate(workspace, {
          name: projectName,
          clientId,
          devLeadId,
          qaLeadId,
          clientEmail
        });
        break;
      case 'mobile_app':
        result = await templateService.createMobileAppTemplate(workspace, {
          name: projectName,
          clientId,
          devLeadId,
          qaLeadId,
          clientEmail
        });
        break;
      case 'custom':
        result = await templateService.createCustomTemplate(workspace, {
          name: projectName,
          clientId
        });
        break;
    }

    res.status(201).json({
      success: true,
      message: `Project created from ${templateType} template successfully`,
      data: {
        project: result.project,
        deliverables: result.deliverables.map(d => ({
          _id: d._id,
          name: d.name,
          description: d.description,
          target_date: d.target_date,
          status: d.status
        }))
      }
    });
  })
);

/**
 * GET /api/nucleus-templates/workspaces/:workspaceId/onboarding/checklist
 * Get onboarding checklist and progress
 */
router.get(
  '/workspaces/:workspaceId/onboarding/checklist',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const checklist = await onboardingService.getOnboardingChecklist(workspaceId);

    res.json({
      success: true,
      data: checklist
    });
  })
);

/**
 * POST /api/nucleus-templates/onboarding/quick-start
 * Complete quick start onboarding (creates workspace + project)
 */
router.post(
  '/onboarding/quick-start',
  ErrorHandler.asyncHandler(async (req, res) => {
    const {
      workspaceName,
      projectName,
      templateType,
      devLeadId,
      qaLeadId,
      clientEmail
    } = req.body;

    if (!workspaceName || !projectName || !templateType) {
      return res.status(400).json({
        success: false,
        message: 'workspaceName, projectName, and templateType are required'
      });
    }

    if (!['website', 'mobile_app', 'custom'].includes(templateType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid template type. Must be: website, mobile_app, or custom'
      });
    }

    const result = await onboardingService.completeQuickStart({
      workspaceName,
      projectName,
      templateType,
      ownerId: req.user._id || req.user.id,
      orgId: req.user.orgId,
      devLeadId,
      qaLeadId,
      clientEmail
    });

    res.status(201).json({
      success: true,
      message: 'Quick start onboarding completed successfully',
      data: {
        workspace: {
          _id: result.workspace._id,
          name: result.workspace.name,
          slug: result.workspace.slug
        },
        project: {
          _id: result.project._id,
          name: result.project.name,
          slug: result.project.slug
        },
        deliverables_count: result.deliverables.length,
        checklist: result.checklist
      }
    });
  })
);

/**
 * GET /api/nucleus-templates/workspaces/:workspaceId/onboarding/progress
 * Get onboarding progress percentage
 */
router.get(
  '/workspaces/:workspaceId/onboarding/progress',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const progress = await onboardingService.getOnboardingProgress(workspaceId);
    const checklist = await onboardingService.getOnboardingChecklist(workspaceId);

    res.json({
      success: true,
      data: {
        progress,
        nextStep: checklist.nextStep
      }
    });
  })
);

/**
 * GET /api/nucleus-templates/templates/list
 * Get list of available templates
 */
router.get(
  '/templates/list',
  ErrorHandler.asyncHandler(async (req, res) => {
    const templates = [
      {
        id: 'website',
        name: 'Website',
        description: 'Complete website development template with homepage, product catalog, checkout, and authentication',
        category: 'web_development',
        deliverables_count: 4,
        estimated_duration: '60-90 days',
        features: [
          'Homepage Design & Development',
          'Product Catalog',
          'Checkout System',
          'User Authentication'
        ]
      },
      {
        id: 'mobile_app',
        name: 'Mobile App',
        description: 'Mobile app development template with authentication, core features, payments, and notifications',
        category: 'mobile_development',
        deliverables_count: 4,
        estimated_duration: '90-120 days',
        features: [
          'App Authentication',
          'Core Features',
          'Payment Integration',
          'Push Notifications'
        ]
      },
      {
        id: 'custom',
        name: 'Custom',
        description: 'Start with a blank project and build your own structure',
        category: 'custom',
        deliverables_count: 1,
        estimated_duration: 'Flexible',
        features: [
          'Blank project structure',
          'Custom deliverables',
          'Flexible timeline'
        ]
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  })
);

module.exports = router;
