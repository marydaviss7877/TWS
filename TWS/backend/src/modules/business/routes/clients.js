const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ProjectClient = require('../../../models/industry/Client');
const Project = require('../../../models/project-delivery/Project');

const clientsRead = requireErpAccess({ module: 'clients', action: ['read', 'read_own'], checkRevocation: false });
const clientsWrite = requireErpAccess({ module: 'clients', action: 'write', checkRevocation: false });
const clientsAdmin = requireErpAccess({ module: 'clients', action: 'admin', checkRevocation: false });

router.use(verifyERPToken);

// Get all clients for organization
router.get('/', clientsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const orgId = req.user.orgId;
  
  let query = { orgId };
  
  if (status) {
    query.status = status;
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'contact.primary.email': { $regex: search, $options: 'i' } },
      { 'company.name': { $regex: search, $options: 'i' } }
    ];
  }
  
  const clients = await ProjectClient.find(query)
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: { clients }
  });
}));

// Get single client
router.get('/:clientId', clientsRead, async (req, res) => {
  try {
    const { clientId } = req.params;
    const orgId = req.user.orgId;
    
    const client = await ProjectClient.findOne({ _id: clientId, orgId });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'ProjectClient not found'
      });
    }
    
    // Get client's projects
    const projects = await Project.find({ clientId, orgId })
      .select('name status timeline budget')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { 
        client,
        projects 
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching client',
      error: error.message
    });
  }
});

// Create new client
router.post('/', clientsWrite, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const {
      name,
      type = 'company',
      contact,
      company,
      address,
      billing,
      portal,
      notes,
      tags,
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Client name is required'
      });
    }
    
    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const client = new ProjectClient({
      orgId,
      name,
      slug,
      type,
      contact,
      company,
      address,
      status,
      billing: {
        currency: 'USD',
        paymentTerms: 'net_30',
        taxRate: 0,
        discount: 0,
        ...billing
      },
      portal: {
        enabled: true,
        accessLevel: 'approve',
        ...portal
      },
      notes,
      tags: tags || []
    });
    
    await client.save();
    
    res.status(201).json({
      success: true,
      message: 'ProjectClient created successfully',
      data: { client }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating client',
      error: error.message
    });
  }
});

// Update client
router.patch('/:clientId', clientsWrite, async (req, res) => {
  try {
    const { clientId } = req.params;
    const orgId = req.user.orgId;
    const updates = req.body;
    
    const client = await ProjectClient.findOne({ _id: clientId, orgId });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'ProjectClient not found'
      });
    }
    
    if (updates.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    
    Object.assign(client, updates);
    await client.save();
    
    res.json({
      success: true,
      message: 'ProjectClient updated successfully',
      data: { client }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating client',
      error: error.message
    });
  }
});

// Delete client
router.delete('/:clientId', clientsAdmin, async (req, res) => {
  try {
    const { clientId } = req.params;
    const orgId = req.user.orgId;
    
    const client = await ProjectClient.findOne({ _id: clientId, orgId });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'ProjectClient not found'
      });
    }
    
    // Check if client has active projects
    const activeProjects = await Project.countDocuments({
      clientId,
      orgId,
      status: { $in: ['planning', 'active', 'on_hold'] }
    });
    
    if (activeProjects > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete client with active projects'
      });
    }
    
    // Actually delete the client
    await ProjectClient.findByIdAndDelete(clientId);
    
    res.json({
      success: true,
      message: 'ProjectClient deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting client',
      error: error.message
    });
  }
});

// Get client portal access
router.get('/:clientId/portal', clientsRead, async (req, res) => {
  try {
    const { clientId } = req.params;
    const orgId = req.user.orgId;
    
    const client = await ProjectClient.findOne({ _id: clientId, orgId });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'ProjectClient not found'
      });
    }
    
    // Get client's projects with boards and cards
    const projects = await Project.find({ clientId, orgId })
      .populate({
        path: 'boards',
        match: { archived: false, 'settings.clientVisible': true },
        populate: {
          path: 'lists',
          match: { archived: false, 'settings.clientVisible': true },
          populate: {
            path: 'cards',
            match: { archived: false },
            select: 'title description dueDate priority labels completed'
          }
        }
      })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { 
        client,
        projects 
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching client portal',
      error: error.message
    });
  }
});

module.exports = router;
