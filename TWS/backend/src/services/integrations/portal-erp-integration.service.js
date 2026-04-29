const Workspace = require('../../models/org/Workspace');
const PortalUser = require('../../models/users-auth/PortalUser');
const Project = require('../../models/project-delivery/Project');
const ProjectBoard = require('../../models/project-delivery/Board');
const List = require('../../models/project-delivery/List');
const Card = require('../../models/industry/Card');
const Activity = require('../../models/analytics/Activity');
const Notification = require('../../models/notifications/Notification');

class ERPIntegrationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Create a workspace from an ERP project
   */
  async createWorkspaceFromProject(projectData) {
    try {
      // Check if workspace already exists for this project
      const existingWorkspace = await Workspace.findOne({
        'integrations.erpProjectId': projectData._id
      });

      if (existingWorkspace) {
        return existingWorkspace;
      }

      // Generate unique slug
      let slug = projectData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      let counter = 1;
      let originalSlug = slug;

      while (await Workspace.findOne({ slug, orgId: projectData.orgId })) {
        slug = `${originalSlug}-${counter}`;
        counter++;
      }

      const workspace = new Workspace({
        orgId: projectData.orgId,
        name: projectData.name,
        description: projectData.description,
        slug,
        type: 'client',
        settings: {
          allowMemberInvites: true,
          clientVisible: true,
          autoArchive: false,
          archiveAfterDays: 30,
          requireApproval: projectData.settings?.requireApproval || false
        },
        integrations: {
          erpSync: true,
          erpProjectId: projectData._id
        }
      });

      await workspace.save();

      // Create default board
      await this.createDefaultBoard(workspace._id, projectData);

      // Add project manager as workspace owner
      if (projectData.projectManager) {
        const portalUser = new PortalUser({
          userId: projectData.projectManager,
          workspaceId: workspace._id,
          role: 'owner',
          status: 'active',
          joinedAt: new Date()
        });
        await portalUser.save();
      }

      // Log activity
      const activity = new Activity({
        orgId: projectData.orgId,
        workspaceId: workspace._id,
        projectId: projectData._id,
        userId: projectData.projectManager,
        entityType: 'workspace',
        entityId: workspace._id,
        action: 'created',
        details: { 
          name: workspace.name,
          source: 'erp_integration'
        }
      });
      await activity.save();

      console.log(`Created workspace ${workspace.name} for ERP project ${projectData.name}`);
      return workspace;

    } catch (error) {
      console.error('Error creating workspace from ERP project:', error);
      throw error;
    }
  }

  /**
   * Create default board for a workspace
   */
  async createDefaultBoard(workspaceId, projectData) {
    try {
      const board = new ProjectBoard({
        workspaceId,
        projectId: projectData._id,
        name: 'Main Board',
        description: `Main project board for ${projectData.name}`,
        type: 'main',
        order: 0,
        settings: {
          allowMemberInvites: true,
          clientVisible: true,
          autoArchiveCompleted: false,
          archiveAfterDays: 7,
          requireApproval: projectData.settings?.requireApproval || false
        }
      });

      await board.save();

      // Create default lists
      const defaultLists = [
        { name: 'Backlog', order: 0, color: '#6B7280' },
        { name: 'In Progress', order: 1, color: '#3B82F6' },
        { name: 'Review', order: 2, color: '#F59E0B' },
        { name: 'Done', order: 3, color: '#10B981' }
      ];

      for (const listData of defaultLists) {
        const list = new List({
          boardId: board._id,
          workspaceId,
          projectId: projectData._id,
          ...listData
        });
        await list.save();
      }

      return board;

    } catch (error) {
      console.error('Error creating default board:', error);
      throw error;
    }
  }

  /**
   * Sync project status from ERP to Portal
   */
  async syncProjectStatus(projectId, status) {
    try {
      const workspace = await Workspace.findOne({
        'integrations.erpProjectId': projectId
      });

      if (!workspace) {
        console.log(`No workspace found for ERP project ${projectId}`);
        return;
      }

      // Update Portal project status
      await Project.updateOne(
        { workspaceId: workspace._id },
        { status }
      );

      // Emit real-time update
      if (this.io) {
        this.io.to(workspace._id.toString()).emit('project:status_updated', {
          projectId,
          status,
          workspaceId: workspace._id
        });
      }

      // Log activity
      const activity = new Activity({
        orgId: workspace.orgId,
        workspaceId: workspace._id,
        projectId,
        userId: null, // System action
        entityType: 'project',
        entityId: projectId,
        action: 'status_updated',
        details: { 
          status,
          source: 'erp_sync'
        }
      });
      await activity.save();

      console.log(`Synced project status for ${projectId}: ${status}`);

    } catch (error) {
      console.error('Error syncing project status:', error);
      throw error;
    }
  }

  /**
   * Sync project budget from ERP to Portal
   */
  async syncProjectBudget(projectId, budgetData) {
    try {
      const workspace = await Workspace.findOne({
        'integrations.erpProjectId': projectId
      });

      if (!workspace) {
        console.log(`No workspace found for ERP project ${projectId}`);
        return;
      }

      // Update Portal project budget
      await Project.updateOne(
        { workspaceId: workspace._id },
        { 
          budget: {
            total: budgetData.total,
            spent: budgetData.spent,
            remaining: budgetData.remaining,
            currency: budgetData.currency || 'USD'
          }
        }
      );

      // Emit real-time update
      if (this.io) {
        this.io.to(workspace._id.toString()).emit('project:budget_updated', {
          projectId,
          budget: budgetData,
          workspaceId: workspace._id
        });
      }

      console.log(`Synced project budget for ${projectId}`);

    } catch (error) {
      console.error('Error syncing project budget:', error);
      throw error;
    }
  }

  /**
   * Sync project timeline from ERP to Portal
   */
  async syncProjectTimeline(projectId, timelineData) {
    try {
      const workspace = await Workspace.findOne({
        'integrations.erpProjectId': projectId
      });

      if (!workspace) {
        console.log(`No workspace found for ERP project ${projectId}`);
        return;
      }

      // Update Portal project timeline
      await Project.updateOne(
        { workspaceId: workspace._id },
        { 
          timeline: {
            startDate: timelineData.startDate,
            endDate: timelineData.endDate,
            estimatedHours: timelineData.estimatedHours,
            actualHours: timelineData.actualHours || 0
          }
        }
      );

      // Emit real-time update
      if (this.io) {
        this.io.to(workspace._id.toString()).emit('project:timeline_updated', {
          projectId,
          timeline: timelineData,
          workspaceId: workspace._id
        });
      }

      console.log(`Synced project timeline for ${projectId}`);

    } catch (error) {
      console.error('Error syncing project timeline:', error);
      throw error;
    }
  }

  /**
   * Sync client information from ERP to Portal
   */
  async syncClientInfo(projectId, clientData) {
    try {
      const workspace = await Workspace.findOne({
        'integrations.erpProjectId': projectId
      });

      if (!workspace) {
        console.log(`No workspace found for ERP project ${projectId}`);
        return;
      }

      // Update Portal project client info
      await Project.updateOne(
        { workspaceId: workspace._id },
        { 
          clientId: clientData._id,
          'settings.clientCanComment': clientData.canComment,
          'settings.clientCanApprove': clientData.canApprove,
          'settings.allowClientAccess': clientData.allowAccess
        }
      );

      // Add client users to workspace if they don't exist
      if (clientData.users && clientData.users.length > 0) {
        for (const clientUser of clientData.users) {
          const existingMember = await PortalUser.findOne({
            userId: clientUser._id,
            workspaceId: workspace._id
          });

          if (!existingMember) {
            const portalUser = new PortalUser({
              userId: clientUser._id,
              workspaceId: workspace._id,
              role: clientUser.role || 'client_viewer',
              status: 'active',
              joinedAt: new Date()
            });
            await portalUser.save();
          }
        }
      }

      console.log(`Synced client info for project ${projectId}`);

    } catch (error) {
      console.error('Error syncing client info:', error);
      throw error;
    }
  }

  /**
   * Create card from ERP task
   */
  async createCardFromTask(taskData, projectId) {
    try {
      const workspace = await Workspace.findOne({
        'integrations.erpProjectId': projectId
      });

      if (!workspace) {
        console.log(`No workspace found for ERP project ${projectId}`);
        return;
      }

      // Find the appropriate board and list
      const board = await ProjectBoard.findOne({
        workspaceId: workspace._id,
        type: 'main'
      });

      if (!board) {
        console.log(`No main board found for workspace ${workspace._id}`);
        return;
      }

      const list = await List.findOne({
        boardId: board._id,
        name: 'Backlog' // Default to backlog
      });

      if (!list) {
        console.log(`No backlog list found for board ${board._id}`);
        return;
      }

      // Get next position
      const lastCard = await Card.findOne({ listId: list._id })
        .sort({ position: -1 });
      const position = lastCard ? lastCard.position + 1 : 0;

      const card = new Card({
        listId: list._id,
        boardId: board._id,
        workspaceId: workspace._id,
        projectId,
        orgId: workspace.orgId,
        title: taskData.title,
        description: taskData.description,
        assignees: taskData.assignees || [],
        dueDate: taskData.dueDate,
        priority: taskData.priority || 'medium',
        labels: taskData.labels || [],
        clientVisible: taskData.clientVisible !== false,
        position
      });

      await card.save();

      // Send notifications to assignees
      if (taskData.assignees && taskData.assignees.length > 0) {
        for (const assigneeId of taskData.assignees) {
          const notification = new Notification({
            userId: assigneeId,
            orgId: workspace.orgId,
            workspaceId: workspace._id,
            projectId,
            cardId: card._id,
            type: 'card_assigned',
            title: 'Card Assigned',
            message: `You have been assigned to "${taskData.title}"`,
            data: { cardId: card._id, cardTitle: taskData.title }
          });
          await notification.save();
        }
      }

      // Emit real-time update
      if (this.io) {
        this.io.to(workspace._id.toString()).emit('card:created', {
          card,
          listId: list._id,
          boardId: board._id,
          workspaceId: workspace._id
        });
      }

      console.log(`Created card from ERP task: ${taskData.title}`);
      return card;

    } catch (error) {
      console.error('Error creating card from ERP task:', error);
      throw error;
    }
  }

  /**
   * Sync card status from Portal to ERP
   */
  async syncCardStatusToERP(cardId, status) {
    try {
      const card = await Card.findById(cardId)
        .populate('workspaceId', 'integrations');

      if (!card || !card.workspaceId.integrations.erpSync) {
        return;
      }

      // Here you would make an API call to your ERP system
      // to update the corresponding task status
      console.log(`Syncing card ${cardId} status ${status} to ERP`);

      // Example ERP API call (replace with your actual ERP integration)
      /*
      const erpResponse = await fetch(`${process.env.ERP_API_URL}/tasks/${card.erpTaskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.ERP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      */

    } catch (error) {
      console.error('Error syncing card status to ERP:', error);
      throw error;
    }
  }

  /**
   * Handle webhook from ERP
   */
  async handleERPWebhook(webhookData) {
    try {
      const { event, data } = webhookData;

      switch (event) {
        case 'project.created':
          await this.createWorkspaceFromProject(data);
          break;

        case 'project.updated':
          if (data.status) {
            await this.syncProjectStatus(data._id, data.status);
          }
          if (data.budget) {
            await this.syncProjectBudget(data._id, data.budget);
          }
          if (data.timeline) {
            await this.syncProjectTimeline(data._id, data.timeline);
          }
          if (data.client) {
            await this.syncClientInfo(data._id, data.client);
          }
          break;

        case 'task.created':
          await this.createCardFromTask(data.task, data.projectId);
          break;

        case 'task.updated':
          // Handle task updates
          break;

        default:
          console.log(`Unhandled ERP webhook event: ${event}`);
      }

    } catch (error) {
      console.error('Error handling ERP webhook:', error);
      throw error;
    }
  }

  /**
   * Get Portal data for ERP sync
   */
  async getPortalDataForERP(projectId) {
    try {
      const workspace = await Workspace.findOne({
        'integrations.erpProjectId': projectId
      });

      if (!workspace) {
        return null;
      }

      const project = await Project.findOne({ workspaceId: workspace._id });
      const boards = await ProjectBoard.find({ workspaceId: workspace._id });
      const cards = await Card.find({ workspaceId: workspace._id });

      return {
        workspace,
        project,
        boards,
        cards
      };

    } catch (error) {
      console.error('Error getting Portal data for ERP:', error);
      throw error;
    }
  }
}

module.exports = ERPIntegrationService;
