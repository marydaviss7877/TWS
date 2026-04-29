const express = require('express');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ProjectTemplate = require('../../../models/project-delivery/ProjectTemplate');
const Project = require('../../../models/project-delivery/Project');
const ProjectBoard = require('../../../models/project-delivery/Board');
const ProjectList = require('../../../models/project-delivery/List');
const Card = require('../../../models/industry/Card');

const router = express.Router();
const templatesRead = requireErpAccess({ module: 'projects', action: ['read', 'read_own'], checkRevocation: false });
const templatesWrite = requireErpAccess({ module: 'projects', action: 'write', checkRevocation: false });
const templatesAdmin = requireErpAccess({ module: 'projects', action: 'admin', checkRevocation: false });
router.use(verifyERPToken);

// Get all templates
router.get('/', templatesRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { orgId } = req.user;
  
  const templates = await ProjectTemplate.find({ orgId })
    .populate('createdBy', 'fullName')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: templates
  });
}));

// Get template by ID
router.get('/:id', templatesRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId } = req.user;

  const template = await ProjectTemplate.findOne({ _id: id, orgId })
    .populate('createdBy', 'fullName');

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  res.json({
    success: true,
    data: template
  });
}));

// Create new template
router.post('/', templatesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { orgId, _id: userId } = req.user;
  const { name, description, category, boards, settings } = req.body;

  if (!name || !boards || boards.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Template name and boards are required'
    });
  }

  const template = new ProjectTemplate({
    name,
    description,
    category,
    boards,
    settings,
    orgId,
    createdBy: userId
  });

  await template.save();

  res.status(201).json({
    success: true,
    message: 'Template created successfully',
    data: template
  });
}));

// Update template
router.put('/:id', templatesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId } = req.user;
  const { name, description, category, boards, settings } = req.body;

  const template = await ProjectTemplate.findOne({ _id: id, orgId });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  template.name = name || template.name;
  template.description = description || template.description;
  template.category = category || template.category;
  template.boards = boards || template.boards;
  template.settings = settings || template.settings;
  template.updatedAt = new Date();

  await template.save();

  res.json({
    success: true,
    message: 'Template updated successfully',
    data: template
  });
}));

// Delete template
router.delete('/:id', templatesAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId } = req.user;

  const template = await ProjectTemplate.findOne({ _id: id, orgId });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  await ProjectTemplate.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Template deleted successfully'
  });
}));

// Create project from template
router.post('/:id/create-project', templatesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId, _id: userId } = req.user;
  const { name, description, clientId, startDate, endDate, budget } = req.body;

  const template = await ProjectTemplate.findOne({ _id: id, orgId });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  // Create the project
  const project = new Project({
    name,
    description,
    clientId,
    startDate,
    endDate,
    budget,
    templateId: template._id,
    orgId,
    createdBy: userId
  });

  await project.save();

  // Create boards from template
  for (const templateBoard of template.boards) {
    const board = new ProjectBoard({
      name: templateBoard.name,
      description: templateBoard.description,
      projectId: project._id,
      orgId,
      position: templateBoard.position || 0
    });

    await board.save();

    // Create lists from template
    for (const templateList of templateBoard.lists || []) {
      const list = new ProjectList({
        name: templateList.name,
        description: templateList.description,
        boardId: board._id,
        projectId: project._id,
        orgId,
        position: templateList.position || 0
      });

      await list.save();

      // Create cards from template
      for (const templateCard of templateList.cards || []) {
        const card = new Card({
          title: templateCard.title,
          description: templateCard.description,
          listId: list._id,
          boardId: board._id,
          projectId: project._id,
          orgId,
          priority: templateCard.priority || 'medium',
          labels: templateCard.labels || [],
          position: templateCard.position || 0,
          clientVisible: templateCard.clientVisible || false,
          isMilestone: templateCard.isMilestone || false
        });

        await card.save();
      }
    }
  }

  res.status(201).json({
    success: true,
    message: 'Project created from template successfully',
    data: project
  });
}));

// Get template categories
router.get('/categories/list', templatesRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { orgId } = req.user;

  const categories = await ProjectTemplate.distinct('category', { orgId });

  res.json({
    success: true,
    data: categories
  });
}));

// Duplicate template
router.post('/:id/duplicate', templatesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId, _id: userId } = req.user;
  const { name } = req.body;

  const originalTemplate = await ProjectTemplate.findOne({ _id: id, orgId });

  if (!originalTemplate) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  const duplicatedTemplate = new ProjectTemplate({
    name: name || `${originalTemplate.name} (Copy)`,
    description: originalTemplate.description,
    category: originalTemplate.category,
    boards: originalTemplate.boards,
    settings: originalTemplate.settings,
    orgId,
    createdBy: userId
  });

  await duplicatedTemplate.save();

  res.status(201).json({
    success: true,
    message: 'Template duplicated successfully',
    data: duplicatedTemplate
  });
}));

module.exports = router;
