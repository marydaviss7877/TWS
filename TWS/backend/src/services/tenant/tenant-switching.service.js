const TenantUser = require('../../models/tenant/TenantUser');
const Tenant = require('../../models/tenant/Tenant');
const User = require('../../models/users-auth/User');
const jwt = require('jsonwebtoken');

class TenantSwitchingService {
  
  // Get all tenants a user has access to
  async getUserTenants(userId) {
    try {
      const tenantUsers = await TenantUser.getUserTenants(userId);
      
      return tenantUsers.map(tu => ({
        tenantId: tu.tenantId._id,
        tenantName: tu.tenantId.name,
        tenantSlug: tu.tenantId.slug,
        status: tu.tenantId.status,
        plan: tu.tenantId.subscription.plan,
        userRole: tu.primaryRole,
        userStatus: tu.status,
        lastActivity: tu.lastActivity,
        isActive: tu.status === 'active'
      }));
    } catch (error) {
      throw new Error(`Failed to get user tenants: ${error.message}`);
    }
  }
  
  // Switch user to a specific tenant context
  async switchToTenant(userId, tenantId) {
    try {
      // Verify user has access to this tenant
      const tenantUser = await TenantUser.findOne({
        userId,
        tenantId,
        status: 'active'
      }).populate('tenantId userId');
      
      if (!tenantUser) {
        throw new Error('User does not have access to this tenant');
      }
      
      // Verify tenant is active
      if (tenantUser.tenantId.status !== 'active') {
        throw new Error('Tenant is not active');
      }
      
      // Update last activity
      await tenantUser.updateActivity();
      
      // Generate tenant-specific JWT token
      const token = this.generateTenantToken(userId, tenantId, tenantUser);
      
      return {
        token,
        tenant: {
          id: tenantUser.tenantId._id,
          name: tenantUser.tenantId.name,
          slug: tenantUser.tenantId.slug,
          plan: tenantUser.tenantId.subscription.plan
        },
        user: {
          role: tenantUser.primaryRole,
          permissions: tenantUser.allPermissions,
          settings: tenantUser.settings
        }
      };
    } catch (error) {
      throw new Error(`Failed to switch to tenant: ${error.message}`);
    }
  }
  
  // Generate tenant-specific JWT token
  generateTenantToken(userId, tenantId, tenantUser) {
    const payload = {
      userId,
      tenantId,
      role: tenantUser.primaryRole,
      permissions: tenantUser.allPermissions,
      accessLevel: tenantUser.accessLevel,
      type: 'tenant_access'
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });
  }
  
  // Invite user to tenant
  async inviteUserToTenant(tenantId, userEmail, invitedBy, role = 'employee') {
    try {
      // Find or create user
      let user = await User.findOne({ email: userEmail });
      if (!user) {
        // Create new user account
        user = new User({
          email: userEmail,
          fullName: userEmail.split('@')[0], // Use email prefix as name
          password: 'temp_password_' + Math.random().toString(36).substr(2, 9),
          role: 'employee',
          orgId: tenantId // Set tenant as org
        });
        await user.save();
      }
      
      // Check if user is already a member
      const existingMembership = await TenantUser.findOne({
        userId: user._id,
        tenantId
      });
      
      if (existingMembership) {
        if (existingMembership.status === 'active') {
          throw new Error('User is already a member of this tenant');
        }
        if (existingMembership.status === 'pending') {
          throw new Error('User invitation is already pending');
        }
      }
      
      // Create invitation
      const tenantUser = await TenantUser.inviteUser(user._id, tenantId, invitedBy, role);
      
      // Send invitation email (this would integrate with email service)
      await this.sendInvitationEmail(user.email, tenantUser.tenantId.name, tenantUser.invitation.invitationToken);
      
      return tenantUser;
    } catch (error) {
      throw new Error(`Failed to invite user: ${error.message}`);
    }
  }
  
  // Accept tenant invitation
  async acceptInvitation(token) {
    try {
      const tenantUser = await TenantUser.acceptInvitation(token);
      
      // Send welcome email
      await this.sendWelcomeEmail(tenantUser.userId.email, tenantUser.tenantId.name);
      
      return tenantUser;
    } catch (error) {
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }
  }
  
  // Remove user from tenant
  async removeUserFromTenant(tenantId, userId, removedBy) {
    try {
      const tenantUser = await TenantUser.findOne({
        userId,
        tenantId
      });
      
      if (!tenantUser) {
        throw new Error('User is not a member of this tenant');
      }
      
      // Check if user is the last owner/admin
      if (tenantUser.hasRole('owner') || tenantUser.hasRole('admin')) {
        const adminCount = await TenantUser.countDocuments({
          tenantId,
          status: 'active',
          roles: { $elemMatch: { role: { $in: ['owner', 'admin'] } } }
        });
        
        if (adminCount <= 1) {
          throw new Error('Cannot remove the last owner/admin from tenant');
        }
      }
      
      tenantUser.status = 'inactive';
      await tenantUser.save();
      
      return { message: 'User removed from tenant successfully' };
    } catch (error) {
      throw new Error(`Failed to remove user: ${error.message}`);
    }
  }
  
  // Update user role in tenant
  async updateUserRole(tenantId, userId, newRole, updatedBy) {
    try {
      const tenantUser = await TenantUser.findOne({
        userId,
        tenantId,
        status: 'active'
      });
      
      if (!tenantUser) {
        throw new Error('User is not a member of this tenant');
      }
      
      // Remove old roles and add new role
      tenantUser.roles = [{
        role: newRole,
        permissions: this.getDefaultPermissions(newRole),
        assignedBy: updatedBy,
        assignedAt: new Date()
      }];

      await tenantUser.save();

      const { invalidateResolvedPermissions } = require('./permissionResolver.service');
      await invalidateResolvedPermissions(tenantId, userId);

      return tenantUser;
    } catch (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  }
  
  // Get default permissions for role
  getDefaultPermissions(role) {
    const rolePermissions = {
      owner: [
        { resource: 'tenant', actions: ['read', 'write', 'delete', 'admin'] },
        { resource: 'users', actions: ['read', 'write', 'delete', 'admin'] },
        { resource: 'projects', actions: ['read', 'write', 'delete', 'admin'] },
        { resource: 'billing', actions: ['read', 'write', 'delete', 'admin'] }
      ],
      admin: [
        { resource: 'tenant', actions: ['read', 'write'] },
        { resource: 'users', actions: ['read', 'write'] },
        { resource: 'projects', actions: ['read', 'write', 'delete'] },
        { resource: 'billing', actions: ['read', 'write'] }
      ],
      manager: [
        { resource: 'tenant', actions: ['read'] },
        { resource: 'users', actions: ['read'] },
        { resource: 'projects', actions: ['read', 'write'] },
        { resource: 'billing', actions: ['read'] }
      ],
      employee: [
        { resource: 'tenant', actions: ['read'] },
        { resource: 'projects', actions: ['read', 'write'] }
      ],
      client: [
        { resource: 'projects', actions: ['read'] }
      ],
      contractor: [
        { resource: 'projects', actions: ['read', 'write'] }
      ]
    };
    
    return rolePermissions[role] || rolePermissions.employee;
  }
  
  // Get tenant context for user
  async getTenantContext(userId, tenantId) {
    try {
      const tenantUser = await TenantUser.findOne({
        userId,
        tenantId,
        status: 'active'
      }).populate('tenantId userId');
      
      if (!tenantUser) {
        throw new Error('User does not have access to this tenant');
      }
      
      return {
        tenant: {
          id: tenantUser.tenantId._id,
          name: tenantUser.tenantId.name,
          slug: tenantUser.tenantId.slug,
          status: tenantUser.tenantId.status,
          plan: tenantUser.tenantId.subscription.plan,
          features: tenantUser.tenantId.features,
          branding: tenantUser.tenantId.branding
        },
        user: {
          id: tenantUser.userId._id,
          name: tenantUser.userId.fullName,
          email: tenantUser.userId.email,
          role: tenantUser.primaryRole,
          permissions: tenantUser.allPermissions,
          settings: tenantUser.settings,
          lastActivity: tenantUser.lastActivity
        }
      };
    } catch (error) {
      throw new Error(`Failed to get tenant context: ${error.message}`);
    }
  }
  
  // Send invitation email (placeholder - would integrate with email service)
  async sendInvitationEmail(email, tenantName, token) {
    console.log(`Sending invitation email to ${email} for tenant ${tenantName}`);
    console.log(`Invitation token: ${token}`);
    
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    // const emailService = require('./integrations/email.service');
    // await emailService.sendInvitationEmail(email, tenantName, token);
  }
  
  // Send welcome email (placeholder - would integrate with email service)
  async sendWelcomeEmail(email, tenantName) {
    console.log(`Sending welcome email to ${email} for tenant ${tenantName}`);
    
    // This would integrate with your email service
    // const emailService = require('./integrations/email.service');
    // await emailService.sendWelcomeEmail(email, tenantName);
  }
  
  // Get tenant statistics
  async getTenantStats(tenantId) {
    try {
      const totalUsers = await TenantUser.countDocuments({
        tenantId,
        status: 'active'
      });
      
      const pendingInvitations = await TenantUser.countDocuments({
        tenantId,
        status: 'pending'
      });
      
      const roleDistribution = await TenantUser.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'active' } },
        { $unwind: '$roles' },
        { $group: { _id: '$roles.role', count: { $sum: 1 } } }
      ]);
      
      return {
        totalUsers,
        pendingInvitations,
        roleDistribution
      };
    } catch (error) {
      throw new Error(`Failed to get tenant stats: ${error.message}`);
    }
  }
}

module.exports = new TenantSwitchingService();
