/**
 * Tenant Database Usage Examples
 * 
 * This file demonstrates how to use tenant database functionality in routes
 */

const express = require('express');
const router = express.Router();
const TenantMiddleware = require('../middleware/tenant/tenantMiddleware');
const { getOrCreateModelOnConnection } = require('../utils/modelSchemaHelper');
const User = require('../models/users-auth/User');
const Project = require('../models/project-delivery/Project');
const Organization = require('../models/org/Organization');

// ==================== EXAMPLE 1: Basic Route with Tenant Database ====================

/**
 * Get users for current tenant
 * Automatically uses tenant database if available
 */
router.get('/users', 
  TenantMiddleware.tenantUserRequired(), // Includes database setup
  async (req, res) => {
    try {
      // Check if tenant has separate database
      if (req.tenantContext.hasSeparateDatabase && req.tenantConnection) {
        // Use tenant database
        const UserModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'User',
          User
        );
        
        // Query tenant database (no tenantId filter needed)
        const users = await UserModel.find({}).select('-password');
        res.json({ success: true, data: users });
      } else {
        // Use shared database with tenantId filter
        const users = await User.find({ 
          tenantId: req.tenantContext.tenantId 
        }).select('-password');
        res.json({ success: true, data: users });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==================== EXAMPLE 2: Using Helper Function ====================

/**
 * Get projects for current tenant
 * Uses helper function for cleaner code
 */
router.get('/projects',
  TenantMiddleware.tenantUserRequired(),
  async (req, res) => {
    try {
      const { getModelForTenant } = require('../utils/tenantModelHelper');
      const ProjectModel = await getModelForTenant(
        req.tenantContext.tenantId,
        'Project',
        Project,
        Project.schema
      );
      
      // Query automatically uses correct database
      const projects = await ProjectModel.find({});
      res.json({ success: true, data: projects });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==================== EXAMPLE 3: Create Record in Tenant Database ====================

/**
 * Create a new user in tenant database
 */
router.post('/users',
  TenantMiddleware.tenantUserRequired(),
  async (req, res) => {
    try {
      let UserModel = User;
      
      // Get tenant-specific model if separate database exists
      if (req.tenantContext.hasSeparateDatabase && req.tenantConnection) {
        UserModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'User',
          User
        );
      }
      
      // Create user (tenantId added automatically if shared database)
      const userData = {
        ...req.body,
        // tenantId will be added automatically if using shared database
        // No tenantId needed if using separate database
      };
      
      // Add tenantId only if using shared database
      if (!req.tenantContext.hasSeparateDatabase) {
        userData.tenantId = req.tenantContext.tenantId;
      }
      
      const user = new UserModel(userData);
      await user.save();
      
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==================== EXAMPLE 4: Complex Query with Multiple Models ====================

/**
 * Get dashboard data using multiple models
 */
router.get('/dashboard',
  TenantMiddleware.tenantUserRequired(),
  async (req, res) => {
    try {
      // Get models based on database type
      let UserModel = User;
      let ProjectModel = Project;
      let OrganizationModel = Organization;
      
      if (req.tenantContext.hasSeparateDatabase && req.tenantConnection) {
        // Use tenant database models
        UserModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'User',
          User
        );
        ProjectModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'Project',
          Project
        );
        OrganizationModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'Organization',
          Organization
        );
      }
      
      // Build query based on database type
      const userQuery = req.tenantContext.hasSeparateDatabase 
        ? {} 
        : { tenantId: req.tenantContext.tenantId };
      
      const projectQuery = req.tenantContext.hasSeparateDatabase
        ? {}
        : { tenantId: req.tenantContext.tenantId };
      
      const orgQuery = req.tenantContext.hasSeparateDatabase
        ? {}
        : { tenantId: req.tenantContext.tenantId };
      
      // Execute queries in parallel
      const [users, projects, organization] = await Promise.all([
        UserModel.find(userQuery).select('-password'),
        ProjectModel.find(projectQuery),
        OrganizationModel.findOne(orgQuery)
      ]);
      
      res.json({
        success: true,
        data: {
          users: users.length,
          projects: projects.length,
          organization: organization
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==================== EXAMPLE 5: Using TenantDataService ====================

/**
 * Get tenant dashboard overview
 * Uses TenantDataService which handles database routing automatically
 */
router.get('/overview',
  TenantMiddleware.tenantUserRequired(),
  async (req, res) => {
    try {
      const TenantDataService = require('../services/tenantDataService');
      
      // TenantDataService automatically uses tenant database if available
      const overview = await TenantDataService.getDashboardOverview(
        req.tenantContext.tenantId
      );
      
      res.json({ success: true, data: overview });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==================== EXAMPLE 6: Update Record in Tenant Database ====================

/**
 * Update user in tenant database
 */
router.put('/users/:userId',
  TenantMiddleware.tenantUserRequired(),
  async (req, res) => {
    try {
      let UserModel = User;
      
      // Get tenant-specific model if separate database exists
      if (req.tenantContext.hasSeparateDatabase && req.tenantConnection) {
        UserModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'User',
          User
        );
      }
      
      // Build query based on database type
      const query = req.tenantContext.hasSeparateDatabase
        ? { _id: req.params.userId }
        : { _id: req.params.userId, tenantId: req.tenantContext.tenantId };
      
      const user = await UserModel.findOneAndUpdate(
        query,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==================== EXAMPLE 7: Delete Record from Tenant Database ====================

/**
 * Delete user from tenant database
 */
router.delete('/users/:userId',
  TenantMiddleware.tenantUserRequired(),
  async (req, res) => {
    try {
      let UserModel = User;
      
      // Get tenant-specific model if separate database exists
      if (req.tenantContext.hasSeparateDatabase && req.tenantConnection) {
        UserModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'User',
          User
        );
      }
      
      // Build query based on database type
      const query = req.tenantContext.hasSeparateDatabase
        ? { _id: req.params.userId }
        : { _id: req.params.userId, tenantId: req.tenantContext.tenantId };
      
      const user = await UserModel.findOneAndDelete(query);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==================== EXAMPLE 8: Aggregation Query ====================

/**
 * Get statistics using aggregation
 */
router.get('/stats',
  TenantMiddleware.tenantUserRequired(),
  async (req, res) => {
    try {
      let UserModel = User;
      let ProjectModel = Project;
      
      if (req.tenantContext.hasSeparateDatabase && req.tenantConnection) {
        UserModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'User',
          User
        );
        ProjectModel = getOrCreateModelOnConnection(
          req.tenantConnection,
          'Project',
          Project
        );
      }
      
      // Build match stage based on database type
      const matchStage = req.tenantContext.hasSeparateDatabase
        ? {}
        : { tenantId: req.tenantContext.tenantId };
      
      // Aggregation pipeline
      const userStats = await UserModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const projectStats = await ProjectModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      res.json({
        success: true,
        data: {
          users: userStats,
          projects: projectStats
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

