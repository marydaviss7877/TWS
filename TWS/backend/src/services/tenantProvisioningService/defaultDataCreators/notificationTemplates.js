const Notification = require('../../../models/notifications/Notification');

/**
 * Create default notification templates
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function createDefaultNotificationTemplates(tenant, organization, session) {
  try {
    const templates = [
      {
        name: 'Project Deadline Reminder',
        description: 'Reminder for upcoming project deadlines',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        type: 'project',
        trigger: 'deadline_approaching',
        template: 'Project "{projectName}" deadline is approaching on {deadline}',
        isDefault: true,
        status: 'active'
      },
      {
        name: 'Payment Overdue',
        description: 'Notification for overdue invoices',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        type: 'finance',
        trigger: 'invoice_overdue',
        template: 'Payment for {clientName} is overdue',
        isDefault: true,
        status: 'active'
      },
      {
        name: 'New Task Assignment',
        description: 'Notification for new task assignments',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        type: 'task',
        trigger: 'task_assigned',
        template: 'You have been assigned a new task: {taskName}',
        isDefault: true,
        status: 'active'
      }
    ];

    for (const templateData of templates) {
      const notification = new Notification(templateData);
      await notification.save({ session });
    }
    
  } catch (error) {
    console.error('Error creating default notification templates:', error);
    throw error;
  }
}

module.exports = {
  createDefaultNotificationTemplates
};

