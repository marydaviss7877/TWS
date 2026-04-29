const ProjectTemplate = require('../../../models/project-delivery/ProjectTemplate');

/**
 * Create default project templates
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function createDefaultProjectTemplates(tenant, organization, session) {
  try {
    const templates = [
      {
        name: 'Web Development',
        description: 'Standard web development project template',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        phases: [
          { name: 'Planning', duration: 5, description: 'Project planning and requirements gathering' },
          { name: 'Design', duration: 10, description: 'UI/UX design and prototyping' },
          { name: 'Development', duration: 20, description: 'Frontend and backend development' },
          { name: 'Testing', duration: 5, description: 'Quality assurance and testing' },
          { name: 'Deployment', duration: 2, description: 'Production deployment and launch' }
        ],
        defaultSettings: {
          allowClientAccess: true,
          clientCanComment: true,
          requireApproval: false
        },
        isDefault: true
      },
      {
        name: 'Mobile App Development',
        description: 'Mobile application development template',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        phases: [
          { name: 'Planning', duration: 7, description: 'App planning and wireframing' },
          { name: 'Design', duration: 14, description: 'UI/UX design and user flows' },
          { name: 'Development', duration: 30, description: 'Native app development' },
          { name: 'Testing', duration: 10, description: 'Device testing and bug fixes' },
          { name: 'App Store', duration: 5, description: 'App store submission and approval' }
        ],
        defaultSettings: {
          allowClientAccess: true,
          clientCanComment: true,
          requireApproval: true
        },
        isDefault: true
      }
    ];

    for (const templateData of templates) {
      const template = new ProjectTemplate(templateData);
      await template.save({ session });
    }
    
  } catch (error) {
    console.error('Error creating default project templates:', error);
    throw error;
  }
}

module.exports = {
  createDefaultProjectTemplates
};

