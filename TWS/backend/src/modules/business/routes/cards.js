const express = require('express');
const router = express.Router();
const Card = require('../../../models/Card');
const List = require('../../../models/List');
const Board = require('../../../models/Board');
const Project = require('../../../models/Project');
const ProjectMember = require('../../../models/ProjectMember');
const Activity = require('../../../models/Activity');
const Notification = require('../../../models/Notification');
const { TimeEntry } = require('../../../models/Finance');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
router.use(verifyERPToken);

function resolveWorkspaceId(list, reqUser, fallbackProject = null) {
  return (
    list?.workspaceId ||
    fallbackProject?.workspaceId ||
    reqUser?.workspaceId ||
    reqUser?.currentWorkspaceId ||
    null
  );
}

// Get cards (supports grouped status for legacy UI)
router.get('/', async (req, res) => {
  try {
    const { groupBy, projectId } = req.query;
    const orgId = req.user.orgId;

    if (groupBy !== 'status') {
      return res.status(400).json({
        success: false,
        message: 'Unsupported query. Use groupBy=status'
      });
    }

    const query = { archived: false };
    if (projectId) {
      const project = await Project.findOne({ _id: projectId, orgId }).select('_id');
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      query.projectId = projectId;
    }

    const cards = await Card.find(query)
      .populate('assignees', 'fullName email')
      .sort({ position: 1, createdAt: -1 })
      .lean();

    const grouped = {
      todo: cards.filter((c) => c.status === 'todo' || c.status === 'to-do'),
      in_progress: cards.filter((c) => c.status === 'in_progress' || c.status === 'in-progress'),
      under_review: cards.filter((c) => c.status === 'under_review' || c.status === 'under-review' || c.status === 'review'),
      completed: cards.filter((c) => c.status === 'completed' || c.status === 'done')
    };

    return res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching grouped cards',
      error: error.message
    });
  }
});

// Get cards for a list
router.get('/list/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    
    const list = await List.findById(listId)
      .populate('projectId', 'orgId');
    
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }
    
    // Check if user has access to this project
    const member = await ProjectMember.findOne({
      projectId: list.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this list'
      });
    }
    
    const cards = await Card.find({ listId, archived: false })
      .populate('assignees', 'fullName email')
      .populate('comments.userId', 'fullName email')
      .sort({ position: 1 });
    
    res.json({
      success: true,
      data: { cards }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cards',
      error: error.message
    });
  }
});

// Get single card
router.get('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const card = await Card.findById(cardId)
      .populate('assignees', 'fullName email')
      .populate('comments.userId', 'fullName email')
      .populate('attachments.uploadedBy', 'fullName email')
      .populate('approvals.userId', 'fullName email');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    // Check if user has access to this project
    const member = await ProjectMember.findOne({
      projectId: card.projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this card'
      });
    }
    
    const centralizedEntries = await TimeEntry.find({
      orgId: card.orgId,
      tags: `card:${card._id}`
    })
      .populate('employeeId', 'fullName email')
      .select('employeeId date hours billable description task status timer')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const centralizedSummary = centralizedEntries.reduce((acc, entry) => {
      const hours = Number(entry.hours || 0);
      acc.totalHours += hours;
      if (entry.billable) acc.billableHours += hours;
      return acc;
    }, { totalHours: 0, billableHours: 0 });

    res.json({
      success: true,
      data: {
        card,
        centralizedTimeTracking: {
          summary: centralizedSummary,
          entries: centralizedEntries
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching card',
      error: error.message
    });
  }
});

// Create new card
router.post('/', async (req, res) => {
  try {
    const { listId, title, description, assignees, dueDate, priority, labels } = req.body;
    
    const list = await List.findById(listId)
      .populate('projectId', 'orgId');
    
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: list.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !member.permissions.canCreateCards) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create cards'
        });
      }
    }
    
    // Get next position
    const lastCard = await Card.findOne({ listId })
      .sort({ position: -1 });
    const position = lastCard ? lastCard.position + 1 : 0;
    
    const project = await Project.findById(list.projectId._id).select('workspaceId');
    const workspaceId = resolveWorkspaceId(list, req.user, project);
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace context is required to create a card'
      });
    }

    const card = new Card({
      listId,
      boardId: list.boardId,
      workspaceId,
      projectId: list.projectId._id,
      orgId: list.projectId.orgId,
      title,
      description,
      assignees: assignees || [],
      dueDate,
      priority: priority || 'medium',
      labels: labels || [],
      position
    });
    
    await card.save();
    
    // Send notifications to assignees
    if (assignees && assignees.length > 0) {
      for (const assigneeId of assignees) {
        const notification = new Notification({
          userId: assigneeId,
          orgId: list.projectId.orgId,
          projectId: list.projectId._id,
          cardId: card._id,
          type: 'card_assigned',
          title: 'Card Assigned',
          message: `You have been assigned to "${title}"`,
          data: { cardId: card._id, cardTitle: title }
        });
        await notification.save();
      }
    }
    
    // Log activity
    const activity = new Activity({
      orgId: list.projectId.orgId,
      projectId: list.projectId._id,
      cardId: card._id,
      userId: req.user._id,
      entityType: 'card',
      entityId: card._id,
      action: 'created',
      details: { title: card.title }
    });
    await activity.save();
    
    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      data: { card }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating card',
      error: error.message
    });
  }
});

// Update card
router.patch('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const updates = req.body;
    
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: card.projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !member.permissions.canEditCards) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to edit cards'
        });
      }
    }
    
    // Handle list movement
    if (updates.listId && updates.listId !== card.listId) {
      const newList = await List.findById(updates.listId);
      if (!newList) {
        return res.status(404).json({
          success: false,
          message: 'Target list not found'
        });
      }
      
      // Update position in new list
      const lastCard = await Card.findOne({ listId: updates.listId })
        .sort({ position: -1 });
      updates.position = lastCard ? lastCard.position + 1 : 0;
      
      // Update board reference
      updates.boardId = newList.boardId;
    }
    
    Object.assign(card, updates);
    await card.save();
    
    // Send notifications for assignee changes
    if (updates.assignees) {
      const newAssignees = updates.assignees.filter(id => !card.assignees.includes(id));
      const removedAssignees = card.assignees.filter(id => !updates.assignees.includes(id));
      
      for (const assigneeId of newAssignees) {
        const notification = new Notification({
          userId: assigneeId,
          orgId: card.orgId,
          projectId: card.projectId,
          cardId: card._id,
          type: 'card_assigned',
          title: 'Card Assigned',
          message: `You have been assigned to "${card.title}"`,
          data: { cardId: card._id, cardTitle: card.title }
        });
        await notification.save();
      }
    }
    
    // Log activity
    const activity = new Activity({
      orgId: card.orgId,
      projectId: card.projectId,
      cardId: card._id,
      userId: req.user._id,
      entityType: 'card',
      entityId: card._id,
      action: 'updated',
      details: updates
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'Card updated successfully',
      data: { card }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating card',
      error: error.message
    });
  }
});

// Add comment to card
router.post('/:cardId/comments', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { text, mentions } = req.body;
    
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: card.projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this card'
        });
      }
    }
    
    const comment = {
      userId: req.user._id,
      text,
      mentions: mentions || [],
      createdAt: new Date()
    };
    
    card.comments.push(comment);
    await card.save();
    
    // Send notifications to mentions
    if (mentions && mentions.length > 0) {
      for (const mentionId of mentions) {
        const notification = new Notification({
          userId: mentionId,
          orgId: card.orgId,
          projectId: card.projectId,
          cardId: card._id,
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user.fullName} mentioned you in "${card.title}"`,
          data: { cardId: card._id, cardTitle: card.title, commentId: comment._id }
        });
        await notification.save();
      }
    }
    
    // Log activity
    const activity = new Activity({
      orgId: card.orgId,
      projectId: card.projectId,
      cardId: card._id,
      userId: req.user._id,
      entityType: 'comment',
      entityId: comment._id,
      action: 'created',
      details: { text: comment.text }
    });
    await activity.save();
    
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
});

// Complete card
router.patch('/:cardId/complete', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: card.projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !member.permissions.canEditCards) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to complete cards'
        });
      }
    }
    
    card.completed = true;
    card.completedAt = new Date();
    card.completedBy = req.user._id;
    await card.save();
    
    // Send notifications to assignees
    for (const assigneeId of card.assignees) {
      if (assigneeId.toString() !== req.user._id.toString()) {
        const notification = new Notification({
          userId: assigneeId,
          orgId: card.orgId,
          projectId: card.projectId,
          cardId: card._id,
          type: 'card_completed',
          title: 'Card Completed',
          message: `"${card.title}" has been completed`,
          data: { cardId: card._id, cardTitle: card.title }
        });
        await notification.save();
      }
    }
    
    // Log activity
    const activity = new Activity({
      orgId: card.orgId,
      projectId: card.projectId,
      cardId: card._id,
      userId: req.user._id,
      entityType: 'card',
      entityId: card._id,
      action: 'completed',
      details: { title: card.title }
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'Card completed successfully',
      data: { card }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing card',
      error: error.message
    });
  }
});

// Delete card
router.delete('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: card.projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !member.permissions.canDeleteCards) {
      if (!['super_admin', 'org_manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete cards'
        });
      }
    }
    
    // Soft delete - archive the card
    card.archived = true;
    card.archivedAt = new Date();
    card.archivedBy = req.user._id;
    await card.save();
    
    // Log activity
    const activity = new Activity({
      orgId: card.orgId,
      projectId: card.projectId,
      cardId: card._id,
      userId: req.user._id,
      entityType: 'card',
      entityId: card._id,
      action: 'deleted',
      details: { title: card.title }
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting card',
      error: error.message
    });
  }
});

module.exports = router;
