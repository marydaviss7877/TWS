const express = require('express');
const router = express.Router();
const ProjectList = require('../../../models/List');
const ProjectBoard = require('../../../models/Board');
const Project = require('../../../models/Project');
const ProjectMember = require('../../../models/ProjectMember');
const Activity = require('../../../models/Activity');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
router.use(verifyERPToken);

// Create new list
router.post('/', async (req, res) => {
  try {
    const { boardId, name, description, color } = req.body;
    
    const board = await ProjectBoard.findById(boardId)
      .populate('projectId', 'orgId');
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: board.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !member.permissions.canCreateCards) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create lists'
        });
      }
    }
    
    // Get next order
    const lastProjectList = await ProjectList.findOne({ boardId })
      .sort({ order: -1 });
    const order = lastProjectList ? lastProjectList.order + 1 : 0;
    
    const list = new ProjectList({
      boardId,
      projectId: board.projectId._id,
      name,
      description,
      color: color || '#3B82F6',
      order
    });
    
    await list.save();
    
    // Log activity
    const activity = new Activity({
      orgId: board.projectId.orgId,
      projectId: board.projectId._id,
      userId: req.user._id,
      entityType: 'list',
      entityId: list._id,
      action: 'created',
      details: { name: list.name }
    });
    await activity.save();
    
    res.status(201).json({
      success: true,
      message: 'ProjectList created successfully',
      data: { list }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating list',
      error: error.message
    });
  }
});

// Update list
router.patch('/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    const updates = req.body;
    
    const list = await ProjectList.findById(listId)
      .populate('projectId', 'orgId');
    
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'ProjectList not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: list.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !member.permissions.canEditCards) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update lists'
        });
      }
    }
    
    Object.assign(list, updates);
    await list.save();
    
    // Log activity
    const activity = new Activity({
      orgId: list.projectId.orgId,
      projectId: list.projectId._id,
      userId: req.user._id,
      entityType: 'list',
      entityId: list._id,
      action: 'updated',
      details: updates
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'ProjectList updated successfully',
      data: { list }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating list',
      error: error.message
    });
  }
});

// Delete list
router.delete('/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    
    const list = await ProjectList.findById(listId)
      .populate('projectId', 'orgId');
    
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'ProjectList not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: list.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !member.permissions.canDeleteCards) {
      if (!['super_admin', 'org_manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete lists'
        });
      }
    }
    
    // Soft delete - archive the list
    list.archived = true;
    list.archivedAt = new Date();
    list.archivedBy = req.user._id;
    await list.save();
    
    // Log activity
    const activity = new Activity({
      orgId: list.projectId.orgId,
      projectId: list.projectId._id,
      userId: req.user._id,
      entityType: 'list',
      entityId: list._id,
      action: 'deleted',
      details: { name: list.name }
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'ProjectList deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting list',
      error: error.message
    });
  }
});

module.exports = router;
