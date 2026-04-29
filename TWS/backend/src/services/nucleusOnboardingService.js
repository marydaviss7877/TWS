const Workspace = require('../models/org/Workspace');
const Project = require('../models/project-delivery/Project');
const Deliverable = require('../models/project-delivery/Deliverable');
const templateService = require('./nucleusTemplateService');

/**
 * Nucleus Onboarding Service
 * 
 * Provides 10-minute "aha moment" onboarding flow:
 * 1. Create workspace
 * 2. Create first project from template
 * 3. Setup approval workflow
 * 4. Create sample deliverable
 * 5. Show client portal preview
 */

class NucleusOnboardingService {
  /**
   * Get onboarding checklist for workspace
   * @param {String} workspaceId - Workspace ID
   */
  async getOnboardingChecklist(workspaceId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const checklist = {
      workspace_created: true, // Already done
      project_created: false,
      deliverable_created: false,
      approval_workflow_setup: false,
      team_member_invited: false,
      client_portal_configured: false,
      first_approval_completed: false
    };

    // Check if project exists
    const projectCount = await Project.countDocuments({ workspaceId: workspace._id });
    checklist.project_created = projectCount > 0;

    // Check if deliverable exists
    if (checklist.project_created) {
      const projects = await Project.find({ workspaceId: workspace._id }).limit(1);
      if (projects.length > 0) {
        const deliverableCount = await Deliverable.countDocuments({
          project_id: projects[0]._id
        });
        checklist.deliverable_created = deliverableCount > 0;
      }
    }

    // Check approval workflow
    const workflow = workspace.getApprovalWorkflow();
    checklist.approval_workflow_setup = workflow.steps.length > 0;

    // Check team members
    checklist.team_member_invited = workspace.members.length > 1; // More than just owner

    // Check client portal
    checklist.client_portal_configured = workspace.settings.clientVisible === true;

    // Calculate progress
    const completed = Object.values(checklist).filter(v => v === true).length;
    const total = Object.keys(checklist).length;
    const progress = Math.round((completed / total) * 100);

    return {
      checklist,
      progress,
      completed,
      total,
      nextStep: this.getNextStep(checklist)
    };
  }

  /**
   * Get next step in onboarding
   */
  getNextStep(checklist) {
    if (!checklist.project_created) {
      return {
        action: 'create_project',
        title: 'Create Your First Project',
        description: 'Start by creating a project from a template',
        template: 'website' // Suggest website template
      };
    }

    if (!checklist.deliverable_created) {
      return {
        action: 'create_deliverable',
        title: 'Create Your First Deliverable',
        description: 'Define what you\'ll deliver to your client',
        template: null
      };
    }

    if (!checklist.approval_workflow_setup) {
      return {
        action: 'setup_approval_workflow',
        title: 'Setup Approval Workflow',
        description: 'Configure who approves deliverables (Dev → QA → Client)',
        template: null
      };
    }

    if (!checklist.team_member_invited) {
      return {
        action: 'invite_team_member',
        title: 'Invite Team Members',
        description: 'Add your team to start working on tasks',
        template: null
      };
    }

    if (!checklist.client_portal_configured) {
      return {
        action: 'configure_client_portal',
        title: 'Configure Client Portal',
        description: 'Enable client access to view deliverables and approve',
        template: null
      };
    }

    return {
      action: 'complete',
      title: 'Onboarding Complete!',
      description: 'You\'re all set. Start managing your projects.',
      template: null
    };
  }

  /**
   * Complete quick start onboarding
   * Creates workspace, project, and sample deliverable in one go
   * @param {Object} config - Onboarding configuration
   */
  async completeQuickStart(config) {
    const {
      workspaceName,
      projectName,
      templateType, // 'website', 'mobile_app', 'custom'
      ownerId,
      orgId,
      devLeadId,
      qaLeadId,
      clientEmail
    } = config;

    // Create workspace
    const workspace = new Workspace({
      name: workspaceName,
      slug: workspaceName.toLowerCase().replace(/\s+/g, '-'),
      orgId,
      ownerId,
      members: [{
        userId: ownerId,
        role: 'owner',
        status: 'active'
      }],
      settings: {
        approvalWorkflow: {
          steps: [
            { stepNumber: 1, approverType: 'dev_lead', required: true, order: 1 },
            { stepNumber: 2, approverType: 'qa_lead', required: true, order: 2 },
            { stepNumber: 3, approverType: 'client', required: true, order: 3 }
          ],
          defaultSteps: 'dev_qa_client'
        },
        timezone: 'UTC',
        currency: 'USD',
        clientVisible: true
      },
      subscription: {
        plan: 'starter',
        status: 'active'
      }
    });

    await workspace.save();

    // Create project from template
    let projectResult;
    switch (templateType) {
      case 'website':
        projectResult = await templateService.createWebsiteTemplate(workspace, {
          name: projectName,
          devLeadId,
          qaLeadId,
          clientEmail
        });
        break;
      case 'mobile_app':
        projectResult = await templateService.createMobileAppTemplate(workspace, {
          name: projectName,
          devLeadId,
          qaLeadId,
          clientEmail
        });
        break;
      default:
        projectResult = await templateService.createCustomTemplate(workspace, {
          name: projectName
        });
    }

    // Get onboarding checklist
    const checklist = await this.getOnboardingChecklist(workspace._id);

    return {
      workspace,
      project: projectResult.project,
      deliverables: projectResult.deliverables,
      checklist
    };
  }

  /**
   * Get onboarding progress percentage
   */
  async getOnboardingProgress(workspaceId) {
    const checklist = await this.getOnboardingChecklist(workspaceId);
    return checklist.progress;
  }
}

module.exports = new NucleusOnboardingService();
