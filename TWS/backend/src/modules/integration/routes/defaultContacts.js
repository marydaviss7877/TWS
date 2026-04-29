const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
const { requireSupraAdminAccess } = require('../../../middleware/auth/rbac');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const DefaultContact = require('../../../models/org/DefaultContact');
const Tenant = require('../../../models/tenant/Tenant');
// Chat and Message models removed - messaging features have been removed
// const Chat = require('../../../models/Chat');
// const Message = require('../../../models/Message');
const User = require('../../../models/users-auth/User');

// Get all default contacts
router.get('/', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  
  try {
    let query = {};
    
    // Filter by status
    if (status) {
      query.isActive = status === 'active';
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { contactName: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } }
      ];
    }
    
    const contacts = await DefaultContact.find(query)
      .populate('tenantId', 'name status createdAt lastLogin')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await DefaultContact.countDocuments(query);
    
    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get default contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default contacts'
    });
  }
}));

// Get default contact by tenant ID
router.get('/tenant/:tenantId', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  
  try {
    const contact = await DefaultContact.findOne({ tenantId })
      .populate('tenantId', 'name status createdAt lastLogin')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Default contact not found for this tenant'
      });
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Get default contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default contact'
    });
  }
}));

// Create default contact for tenant
router.post('/', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const {
    tenantId,
    contactName,
    contactEmail,
    contactRole,
    welcomeMessage,
    availability,
    customSchedule,
    autoCreateChat,
    preferences,
    integrations
  } = req.body;
  
  try {
    // Check if tenant exists
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    // Check if default contact already exists
    const existingContact = await DefaultContact.findOne({ tenantId });
    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Default contact already exists for this tenant'
      });
    }
    
    // Create default contact
    const defaultContact = new DefaultContact({
      tenantId,
      contactName: contactName || 'Supra-Admin Support',
      contactEmail: contactEmail || 'support@supraadmin.com',
      contactRole: contactRole || 'System Administrator',
      welcomeMessage: welcomeMessage || `Welcome to ${tenant.name}! I'm your Supra-Admin contact. How can I help you today?`,
      availability: availability || '24/7',
      customSchedule: customSchedule || {},
      autoCreateChat: autoCreateChat !== undefined ? autoCreateChat : true,
      preferences: preferences || {},
      integrations: integrations || {},
      createdBy: req.user._id
    });
    
    await defaultContact.save();
    
    // Auto-create welcome chat disabled - messaging features have been removed
    if (defaultContact.autoCreateChat) {
      console.warn('⚠️ autoCreateChat is enabled but messaging features have been removed. Welcome chat will not be created.');
      // Don't fail the entire operation
    }
    
    // Populate the response
    await defaultContact.populate([
      { path: 'tenantId', select: 'name status createdAt lastLogin' },
      { path: 'createdBy', select: 'fullName email' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Default contact created successfully',
      data: defaultContact
    });
  } catch (error) {
    console.error('Create default contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create default contact'
    });
  }
}));

// Update default contact
router.put('/:contactId', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const updateData = req.body;
  
  try {
    const contact = await DefaultContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Default contact not found'
      });
    }
    
    // Update contact data
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        contact[key] = updateData[key];
      }
    });
    
    contact.updatedBy = req.user._id;
    contact.lastModified = new Date();
    
    await contact.save();
    
    // Populate the response
    await contact.populate([
      { path: 'tenantId', select: 'name status createdAt lastLogin' },
      { path: 'createdBy', select: 'fullName email' },
      { path: 'updatedBy', select: 'fullName email' }
    ]);
    
    res.json({
      success: true,
      message: 'Default contact updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Update default contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update default contact'
    });
  }
}));

// Delete default contact
router.delete('/:contactId', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  
  try {
    const contact = await DefaultContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Default contact not found'
      });
    }
    
    await DefaultContact.findByIdAndDelete(contactId);
    
    res.json({
      success: true,
      message: 'Default contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete default contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete default contact'
    });
  }
}));

// Toggle contact status (active/inactive)
router.patch('/:contactId/toggle-status', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  
  try {
    const contact = await DefaultContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Default contact not found'
      });
    }
    
    contact.isActive = !contact.isActive;
    contact.updatedBy = req.user._id;
    contact.lastModified = new Date();
    
    await contact.save();
    
    res.json({
      success: true,
      message: `Default contact ${contact.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        isActive: contact.isActive
      }
    });
  } catch (error) {
    console.error('Toggle contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle contact status'
    });
  }
}));

// Get contact statistics
router.get('/:contactId/stats', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const { timeRange = '7d' } = req.query;
  
  try {
    const contact = await DefaultContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Default contact not found'
      });
    }
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Messaging features have been removed - return empty stats
    res.json({
      success: true,
      data: {
        contact: {
          id: contact._id,
          name: contact.contactName,
          email: contact.contactEmail,
          status: contact.status,
          availability: contact.availability,
          isAvailable: contact.isAvailable()
        },
        stats: {
          totalMessages: 0,
          avgResponseTime: '0',
          lastActivity: contact.stats?.lastActivity || null,
          totalChats: 0,
          ...contact.stats,
          note: 'Messaging statistics unavailable - messaging features have been removed'
        }
      }
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics'
    });
  }
}));

// Bulk create default contacts for multiple tenants
router.post('/bulk-create', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { tenantIds, contactData } = req.body;
  
  try {
    if (!tenantIds || !Array.isArray(tenantIds) || tenantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tenant IDs array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const tenantId of tenantIds) {
      try {
        // Check if tenant exists
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
          errors.push({ tenantId, error: 'Tenant not found' });
          continue;
        }
        
        // Check if default contact already exists
        const existingContact = await DefaultContact.findOne({ tenantId });
        if (existingContact) {
          errors.push({ tenantId, error: 'Default contact already exists' });
          continue;
        }
        
        // Create default contact
        const defaultContact = new DefaultContact({
          tenantId,
          contactName: contactData.contactName || 'Supra-Admin Support',
          contactEmail: contactData.contactEmail || 'support@supraadmin.com',
          contactRole: contactData.contactRole || 'System Administrator',
          welcomeMessage: contactData.welcomeMessage || `Welcome to ${tenant.name}! I'm your Supra-Admin contact.`,
          availability: contactData.availability || '24/7',
          customSchedule: contactData.customSchedule || {},
          autoCreateChat: contactData.autoCreateChat !== undefined ? contactData.autoCreateChat : true,
          preferences: contactData.preferences || {},
          integrations: contactData.integrations || {},
          createdBy: req.user._id
        });
        
        await defaultContact.save();
        
        // Auto-create welcome chat disabled - messaging features have been removed
        if (defaultContact.autoCreateChat) {
          console.warn(`⚠️ autoCreateChat is enabled for tenant ${tenantId} but messaging features have been removed. Welcome chat will not be created.`);
          // Don't fail the entire operation
        }
        
        results.push({
          tenantId,
          contactId: defaultContact._id,
          success: true
        });
      } catch (error) {
        errors.push({ tenantId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk creation completed. ${results.length} successful, ${errors.length} failed.`,
      data: {
        successful: results,
        failed: errors
      }
    });
  } catch (error) {
    console.error('Bulk create default contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create default contacts'
    });
  }
}));

// Get default contact statistics summary
router.get('/stats/summary', authenticateToken, requireSupraAdminAccess, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const stats = await DefaultContact.getContactStats();
    
    // Get additional statistics
    const activeContacts = await DefaultContact.countDocuments({ isActive: true });
    const inactiveContacts = await DefaultContact.countDocuments({ isActive: false });
    
    // Get availability breakdown
    const availabilityStats = await DefaultContact.aggregate([
      {
        $group: {
          _id: '$availability',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        ...stats,
        activeContacts,
        inactiveContacts,
        availabilityBreakdown: availabilityStats
      }
    });
  } catch (error) {
    console.error('Get contact stats summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics summary'
    });
  }
}));

module.exports = router;
