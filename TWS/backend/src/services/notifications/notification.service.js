const Notification = require('../../models/notifications/Notification');
const User = require('../../models/users-auth/User');
const NotificationPreference = require('../../models/notifications/NotificationPreference');
const emailService = require('../integrations/email.service');

class NotificationService {
  // Create and send notification
  static async createNotification({
    userIds,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
    createdBy,
    orgId,
    projectId,
    sendEmail = false
  }) {
    try {
      const notifications = [];
      const userIdsArray = Array.isArray(userIds) ? userIds : [userIds];

      for (const userId of userIdsArray) {
        const user = await User.findById(userId).select('preferences organization orgId email fullName');
        if (!user) continue;

        // Determine orgId: use provided orgId, or get from user, or derive from related entities
        let finalOrgId = orgId;
        if (!finalOrgId) {
          // Try to get from user's organization
          if (user.organization) {
            finalOrgId = user.organization;
          } else if (user.orgId) {
            finalOrgId = user.orgId;
          }
        }

        // If still no orgId, try to get from related entities
        if (!finalOrgId && relatedEntityType && relatedEntityId) {
          try {
            if (relatedEntityType === 'project' || relatedEntityType === 'deliverable' || relatedEntityType === 'approval' || relatedEntityType === 'change_request') {
              // For project-related entities, get orgId from project
              const Project = require('../../models/project-delivery/Project');
              const Deliverable = require('../../models/project-delivery/Deliverable');
              
              if (relatedEntityType === 'project') {
                const project = await Project.findById(relatedEntityId).select('orgId');
                if (project?.orgId) finalOrgId = project.orgId;
              } else if (relatedEntityType === 'deliverable') {
                const deliverable = await Deliverable.findById(relatedEntityId).select('project_id');
                if (deliverable?.project_id) {
                  const project = await Project.findById(deliverable.project_id).select('orgId');
                  if (project?.orgId) finalOrgId = project.orgId;
                }
              } else if (relatedEntityType === 'approval') {
                const Approval = require('../../models/core/Approval');
                const approval = await Approval.findById(relatedEntityId).select('deliverable_id orgId');
                if (approval?.orgId) {
                  finalOrgId = approval.orgId;
                } else if (approval?.deliverable_id) {
                  const deliverable = await Deliverable.findById(approval.deliverable_id).select('project_id');
                  if (deliverable?.project_id) {
                    const project = await Project.findById(deliverable.project_id).select('orgId');
                    if (project?.orgId) finalOrgId = project.orgId;
                  }
                }
              } else if (relatedEntityType === 'change_request') {
                const ChangeRequest = require('../../models/project-delivery/ChangeRequest');
                const changeRequest = await ChangeRequest.findById(relatedEntityId).select('deliverable_id orgId');
                if (changeRequest?.orgId) {
                  finalOrgId = changeRequest.orgId;
                } else if (changeRequest?.deliverable_id) {
                  const deliverable = await Deliverable.findById(changeRequest.deliverable_id).select('project_id');
                  if (deliverable?.project_id) {
                    const project = await Project.findById(deliverable.project_id).select('orgId');
                    if (project?.orgId) finalOrgId = project.orgId;
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error deriving orgId from related entity:', error);
          }
        }

        // If still no orgId, try to get from createdBy user
        if (!finalOrgId && createdBy) {
          try {
            const creator = await User.findById(createdBy).select('organization orgId');
            if (creator?.organization) {
              finalOrgId = creator.organization;
            } else if (creator?.orgId) {
              finalOrgId = creator.orgId;
            }
          } catch (error) {
            console.error('Error getting orgId from creator:', error);
          }
        }

        // If we still don't have orgId, log error and skip
        if (!finalOrgId) {
          console.error(`Cannot create notification: orgId not found for userId ${userId}, type ${type}`);
          continue;
        }

        const pref = await NotificationPreference.getOrCreate(userId, finalOrgId);
        if (pref.shouldSendEmail && pref.shouldSendEmail(type) === false && sendEmail) {
          // User disabled this event type for email; still create in-app if inApp enabled
        }
        const skipInApp = pref.inApp && pref.inApp.enabled === false;

        const notification = new Notification({
          userId,
          orgId: finalOrgId,
          projectId: projectId || null,
          type,
          title,
          message,
          relatedEntityType,
          relatedEntityId,
          createdBy
        });

        await notification.save();
        if (!skipInApp) {
          notifications.push(notification);
        }

        if (sendEmail && pref.shouldSendEmail(type)) {
          await this.sendEmailNotification(user, notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating notifications:', error);
      throw error;
    }
  }

  // Send email notification via email.service
  static async sendEmailNotification(user, notification) {
    try {
      const email = user.email || (user._id && (await User.findById(user._id).select('email').lean())?.email);
      if (!email) return false;
      const subject = notification.title || 'Notification';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6366f1; padding: 16px; text-align: center;">
            <h2 style="color: white; margin: 0;">${subject}</h2>
          </div>
          <div style="padding: 24px; background: #f9fafb;">
            <p style="font-size: 14px; color: #374151;">${(notification.message || '').replace(/\n/g, '<br>')}</p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">TWS ERP Notification</p>
          </div>
        </div>
      `;
      await emailService.sendEmail(email, subject, html);
      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  // Project-related notifications
  static async notifyProjectCreated(project, createdBy) {
    const projectMembers = await this.getProjectMembers(project._id);
    
    return await this.createNotification({
      userIds: projectMembers.map(member => member.userId),
      type: 'projectUpdates',
      title: 'New Project Created',
      message: `A new project "${project.name}" has been created.`,
      relatedEntityType: 'project',
      relatedEntityId: project._id,
      createdBy,
      sendEmail: true
    });
  }

  static async notifyProjectUpdated(project, updatedBy, changes) {
    const projectMembers = await this.getProjectMembers(project._id);
    
    return await this.createNotification({
      userIds: projectMembers.map(member => member.userId),
      type: 'projectUpdates',
      title: 'Project Updated',
      message: `Project "${project.name}" has been updated: ${changes.join(', ')}.`,
      relatedEntityType: 'project',
      relatedEntityId: project._id,
      createdBy: updatedBy,
      sendEmail: false
    });
  }

  // Task/Card-related notifications
  static async notifyTaskAssigned(card, assigneeIds, assignedBy) {
    return await this.createNotification({
      userIds: assigneeIds,
      type: 'taskAssignments',
      title: 'Task Assigned',
      message: `You have been assigned to "${card.title}".`,
      relatedEntityType: 'card',
      relatedEntityId: card._id,
      createdBy: assignedBy,
      sendEmail: true
    });
  }

  static async notifyTaskUpdated(card, updatedBy, changes) {
    const assignees = card.assignees || [];
    
    return await this.createNotification({
      userIds: assignees,
      type: 'taskAssignments',
      title: 'Task Updated',
      message: `Task "${card.title}" has been updated: ${changes.join(', ')}.`,
      relatedEntityType: 'card',
      relatedEntityId: card._id,
      createdBy: updatedBy,
      sendEmail: false
    });
  }

  static async notifyTaskComment(card, commenterId, commentText) {
    const assignees = card.assignees || [];
    const commenter = await User.findById(commenterId);
    
    return await this.createNotification({
      userIds: assignees.filter(id => id.toString() !== commenterId.toString()),
      type: 'comments',
      title: 'New Comment',
      message: `${commenter.fullName} commented on "${card.title}": ${commentText.substring(0, 100)}...`,
      relatedEntityType: 'card',
      relatedEntityId: card._id,
      createdBy: commenterId,
      sendEmail: false
    });
  }

  // Deadline notifications
  static async notifyDeadlineApproaching(card, daysUntilDeadline) {
    const assignees = card.assignees || [];
    
    return await this.createNotification({
      userIds: assignees,
      type: 'deadlineReminders',
      title: 'Deadline Approaching',
      message: `Task "${card.title}" is due in ${daysUntilDeadline} day(s).`,
      relatedEntityType: 'card',
      relatedEntityId: card._id,
      sendEmail: true
    });
  }

  static async notifyDeadlineOverdue(card) {
    const assignees = card.assignees || [];
    
    return await this.createNotification({
      userIds: assignees,
      type: 'deadlineReminders',
      title: 'Deadline Overdue',
      message: `Task "${card.title}" is overdue.`,
      relatedEntityType: 'card',
      relatedEntityId: card._id,
      sendEmail: true
    });
  }

  // Approval notifications
  static async notifyApprovalRequested(card, approverIds, requesterId) {
    return await this.createNotification({
      userIds: approverIds,
      type: 'approvals',
      title: 'Approval Required',
      message: `Approval is required for "${card.title}".`,
      relatedEntityType: 'card',
      relatedEntityId: card._id,
      createdBy: requesterId,
      sendEmail: true
    });
  }

  static async notifyApprovalDecision(card, approved, approverId) {
    const assignees = card.assignees || [];
    
    return await this.createNotification({
      userIds: assignees,
      type: 'approvals',
      title: 'Approval Decision',
      message: `Task "${card.title}" has been ${approved ? 'approved' : 'rejected'}.`,
      relatedEntityType: 'card',
      relatedEntityId: card._id,
      createdBy: approverId,
      sendEmail: false
    });
  }

  // Invoice notifications
  static async notifyInvoiceCreated(invoice, createdBy) {
    const client = await this.getClientById(invoice.clientId);
    
    return await this.createNotification({
      userIds: [createdBy],
      type: 'projectUpdates',
      title: 'Invoice Created',
      message: `Invoice ${invoice.invoiceNumber} has been created for ${client.name}.`,
      relatedEntityType: 'invoice',
      relatedEntityId: invoice._id,
      createdBy,
      sendEmail: false
    });
  }

  static async notifyInvoiceOverdue(invoice) {
    let userIds = [];
    if (invoice.projectId) {
      const projectMembers = await this.getProjectMembers(invoice.projectId);
      userIds = projectMembers.map(m => m.userId);
    }
    if (userIds.length === 0 && invoice.orgId) {
      const User = require('../../models/users-auth/User');
      const financeUsers = await User.find({ orgId: invoice.orgId, role: { $in: ['owner', 'admin', 'accountant', 'finance'] } })
        .select('_id')
        .limit(10)
        .lean();
      userIds = financeUsers.map(u => u._id);
    }
    if (userIds.length === 0) return [];
    return await this.createNotification({
      userIds,
      type: 'invoice_overdue',
      title: 'Invoice Overdue',
      message: `Invoice ${invoice.invoiceNumber} is overdue.`,
      relatedEntityType: 'invoice',
      relatedEntityId: invoice._id,
      orgId: invoice.orgId,
      sendEmail: true
    });
  }

  static async notifyBudget80Warning(project, orgId) {
    let userIds = [];
    const projectMembers = await this.getProjectMembers(project._id);
    userIds = projectMembers.filter(m => m.userId).map(m => m.userId);
    if (userIds.length === 0 && orgId) {
      const User = require('../../models/users-auth/User');
      const admins = await User.find({ orgId, role: { $in: ['owner', 'admin'] } }).select('_id').limit(10).lean();
      userIds = admins.map(u => u._id);
    }
    if (userIds.length === 0) return [];
    const spent = project.budget?.spent ?? project.spent ?? 0;
    const total = project.budget?.total ?? project.budget ?? 0;
    const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
    return await this.createNotification({
      userIds,
      type: 'budget_warning',
      title: 'Budget 80% Warning',
      message: `Project "${project.name}" has used ${pct}% of budget (${spent} / ${total}).`,
      relatedEntityType: 'project',
      relatedEntityId: project._id,
      orgId: orgId || project.orgId,
      sendEmail: true
    });
  }

  // Helper methods
  static async getProjectMembers(projectId) {
    if (!projectId) return [];
    try {
      const ProjectMember = require('../../models/project-delivery/ProjectMember');
      const members = await ProjectMember.find({ projectId, status: 'active' })
        .select('userId')
        .lean();
      return members.map(m => ({ userId: m.userId }));
    } catch (e) {
      console.error('getProjectMembers error:', e);
      return [];
    }
  }

  static async getClientById(clientId) {
    // This would typically query the ProjectClient model
    // For now, return a mock object
    return { name: 'Client' };
  }

  // Daily notification check (to be run as a cron job)
  static async checkDeadlineNotifications() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find cards due tomorrow
      const Card = require('../../models/industry/Card');
      const cardsDueTomorrow = await Card.find({
        dueDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow
        },
        status: { $nin: ['done', 'cancelled'] }
      }).populate('assignees');

      for (const card of cardsDueTomorrow) {
        await this.notifyDeadlineApproaching(card, 1);
      }

      // Find overdue cards
      const overdueCards = await Card.find({
        dueDate: { $lt: new Date() },
        status: { $nin: ['done', 'cancelled'] }
      }).populate('assignees');

      for (const card of overdueCards) {
        await this.notifyDeadlineOverdue(card);
      }

      console.log(`Checked ${cardsDueTomorrow.length} cards due tomorrow and ${overdueCards.length} overdue cards`);
    } catch (error) {
      console.error('Error checking deadline notifications:', error);
    }
  }

  /**
   * Notify when client portal access changes
   * SECURITY: Sends notifications to clients when portal access is enabled/disabled
   */
  static async notifyClientPortalAccessChange(project, oldSettings, newSettings, changedBy) {
    try {
      const Client = require('../../models/industry/Client');
      const ClientPortalUser = require('../../models/ClientPortalUser');
      
      // Only notify if access was disabled or enabled
      const wasEnabled = oldSettings?.allowClientPortal || false;
      const isEnabled = newSettings?.allowClientPortal || false;
      
      if (wasEnabled === isEnabled) {
        return; // No change, no notification needed
      }
      
      // Get client and portal users
      if (!project.clientId) {
        return; // No client associated
      }
      
      const client = await Client.findById(project.clientId)
        .select('name email portalUsers');
      
      if (!client) {
        return;
      }
      
      // Get all portal users for this client
      const portalUsers = await ClientPortalUser.find({ clientId: client._id })
        .select('email fullName userId');
      
      if (portalUsers.length === 0) {
        return; // No portal users to notify
      }
      
      const changedByName = changedBy?.email || changedBy?.fullName || 'Administrator';
      const changedAt = new Date().toISOString();
      
      // Notify if access was disabled
      if (wasEnabled && !isEnabled) {
        const notifications = portalUsers.map(user => ({
          userId: user.userId || user._id,
          type: 'client_portal_disabled',
          title: 'Portal Access Disabled',
          message: `Client portal access has been disabled for project: ${project.name}`,
          relatedEntityType: 'project',
          relatedEntityId: project._id,
          createdBy: changedBy?._id || null,
          sendEmail: true
        }));
        
        // Create in-app notifications
        await Promise.all(notifications.map(notif => 
          this.createNotification(notif).catch(err => {
            console.error('Failed to create notification:', err);
          })
        ));
        
        // Send email notifications
        for (const user of portalUsers) {
          try {
            await this.sendEmailNotification(
              { email: user.email, fullName: user.fullName },
              {
                title: `Portal Access Disabled: ${project.name}`,
                message: `Client portal access has been disabled for project "${project.name}" by ${changedByName} at ${changedAt}. Please contact support if you have questions.`,
                type: 'client_portal_disabled'
              }
            );
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
      
      // Notify if access was enabled
      if (!wasEnabled && isEnabled) {
        const notifications = portalUsers.map(user => ({
          userId: user.userId || user._id,
          type: 'client_portal_enabled',
          title: 'Portal Access Enabled',
          message: `You now have access to project: ${project.name}`,
          relatedEntityType: 'project',
          relatedEntityId: project._id,
          createdBy: changedBy?._id || null,
          sendEmail: true
        }));
        
        // Create in-app notifications
        await Promise.all(notifications.map(notif => 
          this.createNotification(notif).catch(err => {
            console.error('Failed to create notification:', err);
          })
        ));
        
        // Send email notifications
        for (const user of portalUsers) {
          try {
            await this.sendEmailNotification(
              { email: user.email, fullName: user.fullName },
              {
                title: `Portal Access Enabled: ${project.name}`,
                message: `You now have access to project "${project.name}" in the client portal.`,
                type: 'client_portal_enabled'
              }
            );
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send client portal notification:', error);
      // Don't throw - notification failure shouldn't break the operation
    }
  }
}

module.exports = NotificationService;
