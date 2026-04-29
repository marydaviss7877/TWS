const OnboardingChecklist = require('../models/admin-platform/OnboardingChecklist');
const Tenant = require('../models/tenant/Tenant');

// Default checklist items
const DEFAULT_CHECKLIST_ITEMS = [
  {
    id: 1,
    title: 'Complete Company Profile',
    description: 'Add company details, logo, and headquarters info',
    role: 'TENANT_ADMIN',
    order: 1,
    required: true,
    estimatedTime: '5 min',
    helpLink: '/settings/company-profile'
  },
  {
    id: 2,
    title: 'Configure Chart of Accounts',
    description: 'Set up GL accounts and account hierarchies',
    role: 'TENANT_ADMIN',
    order: 2,
    required: true,
    estimatedTime: '30 min',
    helpLink: '/finance/chart-of-accounts'
  },
  {
    id: 3,
    title: 'Create Locations/Cost Centers',
    description: 'Define organizational locations and cost centers',
    role: 'TENANT_ADMIN',
    order: 3,
    required: false,
    estimatedTime: '15 min',
    helpLink: '/settings/locations'
  },
  {
    id: 4,
    title: 'Invite Team Members',
    description: 'Add users and assign roles',
    role: 'TENANT_ADMIN',
    order: 4,
    required: true,
    estimatedTime: '10 min',
    helpLink: '/users/invite'
  },
  {
    id: 5,
    title: 'Configure Approval Workflows',
    description: 'Set up approval hierarchies for purchases and expenses',
    role: 'TENANT_ADMIN',
    order: 5,
    required: false,
    estimatedTime: '20 min',
    helpLink: '/settings/workflows'
  },
  {
    id: 6,
    title: 'Review Security Settings',
    description: 'Enable MFA, configure password policies, audit permissions',
    role: 'TENANT_ADMIN',
    order: 6,
    required: true,
    estimatedTime: '10 min',
    helpLink: '/settings/security'
  },
  {
    id: 7,
    title: 'Explore Industry Dashboard',
    description: 'Familiarize yourself with key reports and KPIs',
    role: 'TENANT_ADMIN',
    order: 7,
    required: false,
    estimatedTime: '15 min',
    helpLink: '/dashboard'
  },
  {
    id: 8,
    title: 'Schedule Support Onboarding Call',
    description: 'Book a session with customer success team',
    role: 'TENANT_ADMIN',
    order: 8,
    required: false,
    estimatedTime: '1 call',
    helpLink: '/support/schedule'
  }
];

class OnboardingChecklistService {
  /**
   * Initialize checklist for a tenant
   */
  async initializeChecklist(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check if checklist already exists
    const existing = await OnboardingChecklist.findOne({ tenantId });
    if (existing) {
      return await this.getChecklist(tenantId);
    }

    // Create checklist items
    const checklistItems = DEFAULT_CHECKLIST_ITEMS.map(item => ({
      tenantId,
      checklistItemId: item.id,
      title: item.title,
      description: item.description,
      role: item.role,
      order: item.order,
      required: item.required,
      estimatedTime: item.estimatedTime,
      helpLink: item.helpLink,
      completed: false
    }));

    await OnboardingChecklist.insertMany(checklistItems);

    return await this.getChecklist(tenantId);
  }

  /**
   * Get checklist for a tenant
   */
  async getChecklist(tenantId) {
    const items = await OnboardingChecklist.find({ tenantId })
      .sort({ order: 1 })
      .populate('completedBy', 'fullName email');

    const total = items.length;
    const completed = items.filter(item => item.completed).length;
    const required = items.filter(item => item.required);
    const requiredCompleted = required.filter(item => item.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const requiredProgress = required.length > 0 
      ? Math.round((requiredCompleted / required.length) * 100) 
      : 0;

    return {
      items,
      progress: {
        total,
        completed,
        remaining: total - completed,
        percentage: progress,
        required: {
          total: required.length,
          completed: requiredCompleted,
          remaining: required.length - requiredCompleted,
          percentage: requiredProgress
        }
      }
    };
  }

  /**
   * Mark checklist item as complete
   */
  async markComplete(tenantId, checklistItemId, userId) {
    const item = await OnboardingChecklist.findOne({
      tenantId,
      checklistItemId
    });

    if (!item) {
      throw new Error('Checklist item not found');
    }

    await item.markComplete(userId);

    // Check if all required items are complete
    const checklist = await this.getChecklist(tenantId);
    const allRequiredComplete = checklist.progress.required.remaining === 0;

    if (allRequiredComplete) {
      // Update tenant onboarding status
      await Tenant.findByIdAndUpdate(tenantId, {
        'onboarding.completed': true
      });
    }

    return await this.getChecklist(tenantId);
  }

  /**
   * Skip checklist item (only if not required)
   */
  async skipItem(tenantId, checklistItemId) {
    const item = await OnboardingChecklist.findOne({
      tenantId,
      checklistItemId
    });

    if (!item) {
      throw new Error('Checklist item not found');
    }

    await item.skip();
    return await this.getChecklist(tenantId);
  }

  /**
   * Get onboarding progress summary
   */
  async getProgress(tenantId) {
    const checklist = await this.getChecklist(tenantId);
    return checklist.progress;
  }
}

module.exports = new OnboardingChecklistService();
