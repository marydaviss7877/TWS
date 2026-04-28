const express = require('express');
const router = express.Router();
const ProjectBoard = require('../../../models/Board');
const List = require('../../../models/List');
const Card = require('../../../models/Card');
const Project = require('../../../models/Project');
const ProjectMember = require('../../../models/ProjectMember');
const Activity = require('../../../models/Activity');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
router.use(verifyERPToken);

function resolveWorkspaceId(project, reqUser) {
  return (
    project?.workspaceId ||
    reqUser?.workspaceId ||
    reqUser?.currentWorkspaceId ||
    null
  );
}

// Get boards for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = req.user.orgId;
    
    // Verify project exists and user has access
    const project = await Project.findOne({ _id: projectId, orgId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user has access to this project
    const member = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project'
      });
    }
    
    const boards = await ProjectBoard.find({ projectId, archived: false })
      .sort({ order: 1 });
    
    // Get lists for each board
    const boardsWithLists = await Promise.all(
      boards.map(async (board) => {
        const lists = await List.find({ boardId: board._id, archived: false })
          .sort({ order: 1 });
        
        // Get cards for each list
        const listsWithCards = await Promise.all(
          lists.map(async (list) => {
            const cards = await Card.find({ listId: list._id, archived: false })
              .populate('assignees', 'fullName email')
              .sort({ position: 1 });
            
            return {
              ...list.toObject(),
              cards
            };
          })
        );
        
        return {
          ...board.toObject(),
          lists: listsWithCards
        };
      })
    );
    
    res.json({
      success: true,
      data: { boards: boardsWithLists }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching boards',
      error: error.message
    });
  }
});

// Get single board
router.get('/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const board = await ProjectBoard.findById(boardId)
      .populate('projectId', 'name orgId');
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'ProjectBoard not found'
      });
    }
    
    // Check if user has access to this project
    const member = await ProjectMember.findOne({
      projectId: board.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this board'
      });
    }
    
    const lists = await List.find({ boardId, archived: false })
      .sort({ order: 1 });
    
    const listsWithCards = await Promise.all(
      lists.map(async (list) => {
        const cards = await Card.find({ listId: list._id, archived: false })
          .populate('assignees', 'fullName email')
          .sort({ position: 1 });
        
        return {
          ...list.toObject(),
          cards
        };
      })
    );
    
    res.json({
      success: true,
      data: { 
        board: {
          ...board.toObject(),
          lists: listsWithCards
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching board',
      error: error.message
    });
  }
});

// Create new board
router.post('/', async (req, res) => {
  try {
    const { projectId, name, description, type, settings } = req.body;
    const orgId = req.user.orgId;
    
    // Verify project exists and user has access
    const project = await Project.findOne({ _id: projectId, orgId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !['owner', 'manager'].includes(member.role)) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create board'
        });
      }
    }
    
    // Get next order
    const lastProjectBoard = await ProjectBoard.findOne({ projectId })
      .sort({ order: -1 });
    const order = lastProjectBoard ? lastProjectBoard.order + 1 : 0;
    
    const workspaceId = resolveWorkspaceId(project, req.user);
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace context is required to create a board'
      });
    }

    const board = new ProjectBoard({
      workspaceId,
      projectId,
      name,
      description,
      type: type || 'kanban',
      order,
      settings: {
        allowMemberInvites: true,
        clientVisible: true,
        ...settings
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
        projectId,
        ...listData
      });
      await list.save();
    }
    
    // Log activity
    const activity = new Activity({
      orgId,
      projectId,
      userId: req.user._id,
      entityType: 'board',
      entityId: board._id,
      action: 'created',
      details: { name: board.name }
    });
    await activity.save();
    
    res.status(201).json({
      success: true,
      message: 'ProjectBoard created successfully',
      data: { board }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating board',
      error: error.message
    });
  }
});

// Update board
router.patch('/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    const updates = req.body;
    
    const board = await ProjectBoard.findById(boardId)
      .populate('projectId', 'orgId');
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'ProjectBoard not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: board.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !['owner', 'manager'].includes(member.role)) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update board'
        });
      }
    }
    
    Object.assign(board, updates);
    await board.save();
    
    // Log activity
    const activity = new Activity({
      orgId: board.projectId.orgId,
      projectId: board.projectId._id,
      userId: req.user._id,
      entityType: 'board',
      entityId: board._id,
      action: 'updated',
      details: updates
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'ProjectBoard updated successfully',
      data: { board }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating board',
      error: error.message
    });
  }
});

// Delete board
router.delete('/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const board = await ProjectBoard.findById(boardId)
      .populate('projectId', 'orgId');
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'ProjectBoard not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId: board.projectId._id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || member.role !== 'owner') {
      if (!['super_admin', 'org_manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete board'
        });
      }
    }
    
    // Archive the board
    board.archived = true;
    board.archivedAt = new Date();
    board.archivedBy = req.user._id;
    await board.save();
    
    // Log activity
    const activity = new Activity({
      orgId: board.projectId.orgId,
      projectId: board.projectId._id,
      userId: req.user._id,
      entityType: 'board',
      entityId: board._id,
      action: 'deleted',
      details: { name: board.name }
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'ProjectBoard deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting board',
      error: error.message
    });
  }
});

module.exports = router;
