const Project = require('../models/project-delivery/Project');
const Deliverable = require('../models/project-delivery/Deliverable');
const Task = require('../models/project-delivery/Task');
const Approval = require('../models/core/Approval');
const Workspace = require('../models/org/Workspace');

/**
 * Nucleus Template Service
 * 
 * Creates prebuilt project templates with:
 * - Deliverables (what clients see)
 * - Tasks (how team executes)
 * - Approval workflow setup
 * - Sample data for quick start
 */

class NucleusTemplateService {
  /**
   * Create project from Website template
   * @param {Object} workspace - Workspace object
   * @param {Object} config - Project configuration
   * @param {String} config.name - Project name
   * @param {String} config.clientId - Client ID (optional)
   * @param {String} config.devLeadId - Dev Lead User ID
   * @param {String} config.qaLeadId - QA Lead User ID
   * @param {String} config.clientEmail - Client email
   */
  async createWebsiteTemplate(workspace, config) {
    const { name, clientId, devLeadId, qaLeadId, clientEmail } = config;

    // Create project
    const project = new Project({
      workspaceId: workspace._id,
      orgId: workspace.orgId,
      name: name || 'Website Project',
      slug: (name || 'website-project').toLowerCase().replace(/\s+/g, '-'),
      description: 'Website development project created from template',
      projectType: 'web_application',
      methodology: workspace.methodology || 'agile',
      status: 'planning',
      clientId: clientId || null,
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      }
    });

    await project.save();

    // Create deliverables
    const deliverables = [
      {
        name: 'Homepage Design & Development',
        description: 'Complete homepage with hero section, features, and CTA',
        start_date: new Date(),
        target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'created',
        acceptance_criteria: [
          { description: 'Responsive design (mobile, tablet, desktop)', met: false },
          { description: 'SEO optimized meta tags', met: false },
          { description: 'Page load time < 3 seconds', met: false }
        ]
      },
      {
        name: 'Product Catalog',
        description: 'Product listing and detail pages',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        target_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35 days
        status: 'created',
        acceptance_criteria: [
          { description: 'Product filtering and search', met: false },
          { description: 'Product detail page with images', met: false },
          { description: 'Add to cart functionality', met: false }
        ]
      },
      {
        name: 'Checkout System',
        description: 'Shopping cart and payment processing',
        start_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        status: 'created',
        acceptance_criteria: [
          { description: 'Cart management (add, remove, update)', met: false },
          { description: 'Payment gateway integration', met: false },
          { description: 'Order confirmation email', met: false }
        ]
      },
      {
        name: 'User Authentication',
        description: 'Login, registration, and password reset',
        start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        target_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days
        status: 'created',
        acceptance_criteria: [
          { description: 'User registration with email verification', met: false },
          { description: 'Secure login with JWT', met: false },
          { description: 'Password reset functionality', met: false }
        ]
      }
    ];

    const createdDeliverables = [];
    for (const deliverableData of deliverables) {
      const deliverable = new Deliverable({
        project_id: project._id,
        workspaceId: workspace._id,
        orgId: workspace.orgId,
        tenantId: workspace.orgId.toString(),
        ...deliverableData
      });

      await deliverable.save();

      // Create sample tasks for each deliverable
      const tasks = this.getWebsiteTasksForDeliverable(deliverable.name);
      const createdTasks = [];
      
      for (const taskData of tasks) {
        const task = new Task({
          projectId: project._id,
          orgId: workspace.orgId,
          title: taskData.title,
          description: taskData.description,
          status: 'todo',
          category: taskData.category,
          estimatedHours: taskData.estimatedHours,
          milestoneId: deliverable._id
        });

        await task.save();
        createdTasks.push(task._id);
      }

      // Link tasks to deliverable
      deliverable.tasks = createdTasks;
      await deliverable.save();

      // Create approval chain if approvers provided
      if (devLeadId && qaLeadId && clientEmail) {
        await Approval.createApprovalChain(
          deliverable._id,
          workspace.orgId,
          workspace.orgId.toString(),
          workspace._id,
          {
            devLeadId,
            qaLeadId,
            clientEmail
          }
        );
      }

      createdDeliverables.push(deliverable);
    }

    return {
      project,
      deliverables: createdDeliverables
    };
  }

  /**
   * Create project from Mobile App template
   */
  async createMobileAppTemplate(workspace, config) {
    const { name, clientId, devLeadId, qaLeadId, clientEmail } = config;

    const project = new Project({
      workspaceId: workspace._id,
      orgId: workspace.orgId,
      name: name || 'Mobile App Project',
      slug: (name || 'mobile-app-project').toLowerCase().replace(/\s+/g, '-'),
      description: 'Mobile app development project created from template',
      projectType: 'mobile_app',
      methodology: workspace.methodology || 'agile',
      status: 'planning',
      clientId: clientId || null,
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) // 120 days
      }
    });

    await project.save();

    const deliverables = [
      {
        name: 'App Authentication',
        description: 'User login, registration, and social auth',
        start_date: new Date(),
        target_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: 'created',
        acceptance_criteria: [
          { description: 'Email/password login', met: false },
          { description: 'Social login (Google, Apple)', met: false },
          { description: 'Biometric authentication', met: false }
        ]
      },
      {
        name: 'Core Features',
        description: 'Main app functionality and navigation',
        start_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'created',
        acceptance_criteria: [
          { description: 'Bottom navigation bar', met: false },
          { description: 'Main feature screens', met: false },
          { description: 'State management setup', met: false }
        ]
      },
      {
        name: 'Payment Integration',
        description: 'In-app purchases and payment processing',
        start_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'created',
        acceptance_criteria: [
          { description: 'Payment gateway integration', met: false },
          { description: 'Subscription management', met: false },
          { description: 'Receipt generation', met: false }
        ]
      },
      {
        name: 'Push Notifications',
        description: 'Real-time notifications and alerts',
        start_date: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
        target_date: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        status: 'created',
        acceptance_criteria: [
          { description: 'Push notification setup', met: false },
          { description: 'Notification preferences', met: false },
          { description: 'Deep linking support', met: false }
        ]
      }
    ];

    const createdDeliverables = [];
    for (const deliverableData of deliverables) {
      const deliverable = new Deliverable({
        project_id: project._id,
        workspaceId: workspace._id,
        orgId: workspace.orgId,
        tenantId: workspace.orgId.toString(),
        ...deliverableData
      });

      await deliverable.save();

      // Create sample tasks
      const tasks = this.getMobileAppTasksForDeliverable(deliverable.name);
      const createdTasks = [];
      
      for (const taskData of tasks) {
        const task = new Task({
          projectId: project._id,
          orgId: workspace.orgId,
          title: taskData.title,
          description: taskData.description,
          status: 'todo',
          category: taskData.category,
          estimatedHours: taskData.estimatedHours,
          milestoneId: deliverable._id
        });

        await task.save();
        createdTasks.push(task._id);
      }

      deliverable.tasks = createdTasks;
      await deliverable.save();

      // Create approval chain
      if (devLeadId && qaLeadId && clientEmail) {
        await Approval.createApprovalChain(
          deliverable._id,
          workspace.orgId,
          workspace.orgId.toString(),
          workspace._id,
          {
            devLeadId,
            qaLeadId,
            clientEmail
          }
        );
      }

      createdDeliverables.push(deliverable);
    }

    return {
      project,
      deliverables: createdDeliverables
    };
  }

  /**
   * Create project from Custom template (minimal setup)
   */
  async createCustomTemplate(workspace, config) {
    const { name, clientId } = config;

    const project = new Project({
      workspaceId: workspace._id,
      orgId: workspace.orgId,
      name: name || 'Custom Project',
      slug: (name || 'custom-project').toLowerCase().replace(/\s+/g, '-'),
      description: 'Custom project created from template',
      projectType: 'general',
      methodology: workspace.methodology || 'agile',
      status: 'planning',
      clientId: clientId || null,
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      }
    });

    await project.save();

    // Create one sample deliverable
    const deliverable = new Deliverable({
      project_id: project._id,
      workspaceId: workspace._id,
      orgId: workspace.orgId,
      tenantId: workspace.orgId.toString(),
      name: 'First Deliverable',
      description: 'Get started by defining your first deliverable',
      start_date: new Date(),
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'created'
    });

    await deliverable.save();

    return {
      project,
      deliverables: [deliverable]
    };
  }

  /**
   * Get sample tasks for Website deliverable
   */
  getWebsiteTasksForDeliverable(deliverableName) {
    const taskMap = {
      'Homepage Design & Development': [
        { title: 'Design homepage mockup', description: 'Create Figma design', category: 'design', estimatedHours: 8 },
        { title: 'Implement responsive layout', description: 'HTML/CSS for all breakpoints', category: 'frontend', estimatedHours: 16 },
        { title: 'Add hero section animations', description: 'CSS animations and transitions', category: 'frontend', estimatedHours: 4 },
        { title: 'Optimize images and assets', description: 'Compress and optimize', category: 'optimization', estimatedHours: 4 }
      ],
      'Product Catalog': [
        { title: 'Design product grid layout', description: 'Figma design', category: 'design', estimatedHours: 6 },
        { title: 'Build product listing API', description: 'Backend API endpoint', category: 'backend', estimatedHours: 12 },
        { title: 'Implement product filtering', description: 'Search and filter functionality', category: 'frontend', estimatedHours: 8 },
        { title: 'Create product detail page', description: 'Individual product view', category: 'frontend', estimatedHours: 10 }
      ],
      'Checkout System': [
        { title: 'Design checkout flow', description: 'User flow and wireframes', category: 'design', estimatedHours: 6 },
        { title: 'Build cart API', description: 'Backend cart management', category: 'backend', estimatedHours: 10 },
        { title: 'Integrate payment gateway', description: 'Stripe/PayPal integration', category: 'integration', estimatedHours: 12 },
        { title: 'Implement order confirmation', description: 'Email and page confirmation', category: 'backend', estimatedHours: 6 }
      ],
      'User Authentication': [
        { title: 'Design login/register UI', description: 'Figma designs', category: 'design', estimatedHours: 4 },
        { title: 'Build auth API endpoints', description: 'Login, register, reset', category: 'backend', estimatedHours: 16 },
        { title: 'Implement JWT tokens', description: 'Token generation and validation', category: 'backend', estimatedHours: 8 },
        { title: 'Add email verification', description: 'Email sending and verification', category: 'backend', estimatedHours: 6 }
      ]
    };

    return taskMap[deliverableName] || [];
  }

  /**
   * Get sample tasks for Mobile App deliverable
   */
  getMobileAppTasksForDeliverable(deliverableName) {
    const taskMap = {
      'App Authentication': [
        { title: 'Design auth screens', description: 'Login/register UI', category: 'design', estimatedHours: 6 },
        { title: 'Implement auth API', description: 'Backend authentication', category: 'backend', estimatedHours: 12 },
        { title: 'Add social login', description: 'Google/Apple sign-in', category: 'integration', estimatedHours: 8 },
        { title: 'Biometric auth setup', description: 'Face ID / Touch ID', category: 'frontend', estimatedHours: 6 }
      ],
      'Core Features': [
        { title: 'Design app navigation', description: 'Bottom nav and screens', category: 'design', estimatedHours: 8 },
        { title: 'Setup state management', description: 'Redux/MobX setup', category: 'frontend', estimatedHours: 10 },
        { title: 'Build main screens', description: 'Core feature screens', category: 'frontend', estimatedHours: 24 },
        { title: 'API integration', description: 'Connect to backend', category: 'integration', estimatedHours: 12 }
      ],
      'Payment Integration': [
        { title: 'Design payment flow', description: 'UI/UX for payments', category: 'design', estimatedHours: 4 },
        { title: 'Integrate payment SDK', description: 'Stripe/Apple Pay', category: 'integration', estimatedHours: 12 },
        { title: 'Subscription management', description: 'Manage subscriptions', category: 'backend', estimatedHours: 10 },
        { title: 'Receipt handling', description: 'Generate and store receipts', category: 'backend', estimatedHours: 6 }
      ],
      'Push Notifications': [
        { title: 'Setup push notification service', description: 'Firebase/APNs setup', category: 'integration', estimatedHours: 8 },
        { title: 'Notification preferences UI', description: 'Settings screen', category: 'frontend', estimatedHours: 6 },
        { title: 'Deep linking implementation', description: 'Handle deep links', category: 'frontend', estimatedHours: 8 },
        { title: 'Notification scheduling', description: 'Schedule notifications', category: 'backend', estimatedHours: 6 }
      ]
    };

    return taskMap[deliverableName] || [];
  }
}

module.exports = new NucleusTemplateService();
