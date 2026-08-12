const Tenant = require('../../models/tenant/Tenant');
const emailService = require('../integrations/email.service');

/**
 * Send welcome email to admin user
 * @param {Object} tenant - Tenant record
 * @param {Object} adminUser - Admin user
 */
async function sendWelcomeEmail(tenant, adminUser) {
  try {
    const baseDomain = (process.env.BASE_DOMAIN || 'housesbase.com').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const subdomain = `${tenant.slug}.${baseDomain}`;
    
    // Use the main email service
    await emailService.sendTenantWelcomeEmail(adminUser, tenant, subdomain);
    
    // Update tenant onboarding status
    await Tenant.findByIdAndUpdate(tenant._id, {
      'onboarding.welcomeEmailSent': true
    });
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error - email failure shouldn't stop provisioning
  }
}

module.exports = {
  sendWelcomeEmail
};

